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
    const {turnstileToken} = (await request.json()) as VerifyTurnstileRequestBody;

    if (!turnstileToken) {
      return NextResponse.json({error: 'Verification failed'}, {status: 400});
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
