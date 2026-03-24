// ===========================================================
// TEMPORARY STATIC EXPORT STUB
// Restore original POST handler when reverting to SSR mode:
//   1. Remove output: 'export' from next.config.ts
//   2. Restore firebase.json frameworksBackend block
//   3. Uncomment the original POST handler below and remove this stub
// ===========================================================
export const dynamic = 'force-static';
export function GET() {
  return Response.json(
    { disabled: true, reason: 'IPFS endpoint requires SSR. Re-enable frameworksBackend to restore.' },
    { status: 503 }
  );
}

/* ---- ORIGINAL POST HANDLER (restore when switching back to SSR) ----
import {NextRequest, NextResponse} from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({error: 'Invalid request body'}, {status: 400});
    }
    const data = body as Record<string, unknown>;

    const ipfsUrl = process.env.IPFS_URL || 'https://ipfs.infura.io:5001';
    const isInfura = /infura\.io/.test(ipfsUrl);
    const authHeaderFromEnv = process.env.IPFS_AUTH_HEADER?.trim();
    const infuraProjectId = process.env.IPFS_INFURA_PROJECT_ID?.trim();
    const infuraProjectSecret = process.env.IPFS_INFURA_PROJECT_SECRET?.trim();

    let authorization = authHeaderFromEnv;
    if (!authorization && infuraProjectId && infuraProjectSecret) {
      const credentials = Buffer.from(`${infuraProjectId}:${infuraProjectSecret}`).toString('base64');
      authorization = `Basic ${credentials}`;
    }

    if (isInfura && !authorization) {
      return NextResponse.json({error: 'IPFS auth not configured'}, {status: 503});
    }

    const {create} = await import('kubo-rpc-client');
    const ipfs = create({
      url: ipfsUrl,
      headers: authorization ? {authorization} : undefined
    });

    const result = await ipfs.add(JSON.stringify({...data, timestamp: new Date().toISOString()}));
    const cid = result.cid.toString();

    return NextResponse.json({cid});
  } catch (e: unknown) {
    console.error('IPFS route error:', e instanceof Error ? e.message : String(e));
    return NextResponse.json({error: 'IPFS upload failed'}, {status: 500});
  }
}
---- END ORIGINAL POST HANDLER ---- */
