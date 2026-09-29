import {NextResponse} from 'next/server';

type VerifyTurnstileResponse = {
  success?: boolean;
  score?: number;
  action?: string;
  metadata?: {['result_with_testing_key']?: boolean};
  ['error-codes']?: string[];
};

type VerifyTurnstileAction = 'signup' | 'gate';

type VerifyTurnstileRequestBody = {
  turnstileToken?: string;
  expectedAction?: VerifyTurnstileAction;
};

// Runtime guard for untrusted JSON input before comparing the verified action.
const VALID_ACTIONS = new Set<VerifyTurnstileAction>(['signup', 'gate']);

// Distinct client-facing error codes so the UI can tell "you never sent a token"
// apart from "Cloudflare rejected the token" apart from infra failures.
type VerifyTurnstileErrorCode =
  | 'missing_token'
  | 'invalid_request'
  | 'server_misconfigured'
  | 'rejected'
  | 'network_error';

function errorResponse(code: VerifyTurnstileErrorCode, status: number, errorCodes?: string[]) {
  return NextResponse.json(
    {
      success: false,
      error: 'Verification failed',
      code,
      // Cloudflare's own error-codes (e.g. "action-mismatch", "timeout-or-duplicate") are safe to
      // return — they're diagnostic reason codes, not secrets — so live Network tab debugging works
      // in production too.
      ...(errorCodes && errorCodes.length ? {errorCodes} : {}),
    },
    {status}
  );
}

const DUMMY_KEY_PREFIX = '1x0000';
function classifyTurnstileKey(value: string | undefined): 'dummy' | 'real' | 'unset' {
  if (!value) return 'unset';
  return value.startsWith(DUMMY_KEY_PREFIX) ? 'dummy' : 'real';
}

export async function POST(request: Request) {
  try {
    const requestBody = (await request.json()) as Record<string, unknown> & VerifyTurnstileRequestBody;
    const {turnstileToken, expectedAction} = requestBody;

    if (!turnstileToken || !expectedAction || !VALID_ACTIONS.has(expectedAction)) {
      return errorResponse('missing_token', 400);
    }

    // Security: Only accept turnstileToken; reject if credentials are in body.
    // This prevents credential leakage to the verify endpoint.
    if (requestBody.email || requestBody.password || requestBody.name) {
      return errorResponse('invalid_request', 400);
    }

    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
      return errorResponse('server_misconfigured', 500);
    }

    // Server-only diagnostic (Cloud Function logs, never sent to the client): confirms the site
    // key and secret key are from the same Cloudflare Turnstile pair. A dummy site key paired with
    // a real secret (or vice versa) makes siteverify reject every token — see docs/DEPLOY.md.
    const siteKeyKind = classifyTurnstileKey(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
    const secretKeyKind = classifyTurnstileKey(secret);
    if (siteKeyKind !== secretKeyKind) {
      console.error(
        `[verify-turnstile] KEY PAIR MISMATCH: site key is "${siteKeyKind}", secret key is "${secretKeyKind}". Both must be from the same Cloudflare Turnstile widget.`
      );
    } else {
      console.log(`[verify-turnstile] key pair check: both "${siteKeyKind}"`);
    }

    const body = new URLSearchParams({
      secret,
      response: turnstileToken,
    });

    const verifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
      cache: 'no-store',
    });

    if (!verifyResponse.ok) {
      return errorResponse('network_error', 400);
    }

    const verification = (await verifyResponse.json()) as VerifyTurnstileResponse;
    // score is only available on Cloudflare Turnstile Enterprise; on the free tier,
    // a successful verification will effectively pass this score check because no score is returned.
    const score = typeof verification.score === 'number' ? verification.score : 1;
    const action = typeof verification.action === 'string' ? verification.action : '';
    // Cloudflare's dummy test keys (e.g. 1x00000000000000000000AA) never echo back an
    // `action`, and flag the response with metadata.result_with_testing_key instead —
    // skip the action match in that case so local dev with the documented test pair works.
    const isTestingKeyResponse = verification.metadata?.result_with_testing_key === true;
    const actionMatches = isTestingKeyResponse || action === expectedAction;

    if (verification.success && score >= 0.3 && actionMatches) {
      const response = NextResponse.json({success: true});
      // Set a short-lived httpOnly cookie for optional future server-side gate checks.
      response.cookies.set('olsme_gate', '1', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 8, // 8 hours
        path: '/',
      });
      return response;
    }

    // Server-only diagnostic (Cloud Function logs, never sent to the client): logged in every
    // environment, including production, since this is the primary signal for live rejection bugs.
    console.error('[verify-turnstile] rejected:', {
      success: verification.success,
      score,
      action,
      expectedAction,
      isTestingKeyResponse,
      errorCodes: verification['error-codes'],
    });

    return errorResponse('rejected', 400, verification['error-codes']);
  } catch {
    return errorResponse('network_error', 400);
  }
}
