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

// Valid widget actions. The action label is informational only — security comes
// from the token being cryptographically bound to the sitekey + hostname.
const VALID_ACTIONS = new Set(['signup', 'gate', '']);

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
    // score is only available on Cloudflare Turnstile Enterprise; default to 1 (pass) on free tier.
    const score = typeof verification.score === 'number' ? verification.score : 1;
    // action is the label set via data-action on the widget — informational, not a security gate.
    const action = typeof verification.action === 'string' ? verification.action : '';

    if (verification.success && score >= 0.3 && VALID_ACTIONS.has(action)) {
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

    return NextResponse.json({error: 'Verification failed'}, {status: 400});
  } catch {
    return NextResponse.json({error: 'Verification failed'}, {status: 400});
  }
}
