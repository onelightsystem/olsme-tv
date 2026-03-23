// ===========================================================
// TEMPORARY STATIC EXPORT STUB
// Restore original POST handler when reverting to SSR mode:
//   1. Remove output: 'export' from next.config.ts
//   2. Restore firebase.json frameworksBackend block
//   3. Uncomment original POST handler below and remove this stub
// ===========================================================
export const dynamic = 'force-static';
export function GET() {
  return Response.json(
    { disabled: true, reason: 'Turnstile endpoint requires SSR. Re-enable frameworksBackend to restore.' },
    { status: 503 }
  );
}

/* ---- ORIGINAL POST HANDLER (restore when switching back to SSR) ----
import {NextResponse} from 'next/server';

type VerifyTurnstileResponse = {
  success?: boolean;
  score?: number;
  action?: string;
  ['error-codes']?: string[];
};

type VerifyTurnstileRequestBody = {
  turnstileToken?: string;
};

export async function POST(request: Request) {
  try {
    const requestBody = (await request.json()) as Record<string, unknown> & VerifyTurnstileRequestBody;
    const {turnstileToken} = requestBody;

    if (!turnstileToken) {
      return NextResponse.json({error: 'Verification failed'}, {status: 400});
    }

    // Security: Only accept turnstileToken; reject if credentials are in body.
    // This prevents credential leakage to the verify endpoint.
    if (requestBody.email || requestBody.password || requestBody.name) {
      return NextResponse.json(
        {error: 'Invalid request: credentials must not be sent to this endpoint'},
        {status: 400}
      );
    }

    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({error: 'Verification failed'}, {status: 500});
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
      return NextResponse.json({error: 'Verification failed'}, {status: 400});
    }

    const verification = (await verifyResponse.json()) as VerifyTurnstileResponse;
    const score = typeof verification.score === 'number' ? verification.score : 1;
    const action = typeof verification.action === 'string' ? verification.action : '';

    if (verification.success && score >= 0.3 && action === 'signup') {
      return NextResponse.json({success: true});
    }

    return NextResponse.json({error: 'Verification failed'}, {status: 400});
  } catch {
    return NextResponse.json({error: 'Verification failed'}, {status: 400});
  }
}
---- END ORIGINAL POST HANDLER ---- */
