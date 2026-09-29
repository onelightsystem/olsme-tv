// src/app/api/ipfs-upload/route.ts
// Server-side route that proxies IPFS uploads so credentials never reach the browser.
import {NextRequest, NextResponse} from 'next/server';
import {createIpfsClient} from '@lib/ipfs/kubo-client';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({error: 'Invalid JSON body'}, {status: 400});
  }

  const ipfsUrl = process.env.IPFS_URL || 'https://ipfs.infura.io:5001';
  const authHeaderFromEnv = process.env.IPFS_AUTH_HEADER?.trim();
  const infuraProjectId = process.env.IPFS_INFURA_PROJECT_ID?.trim();
  const infuraProjectSecret = process.env.IPFS_INFURA_PROJECT_SECRET?.trim();

  let authorization = authHeaderFromEnv;
  if (!authorization && infuraProjectId && infuraProjectSecret) {
    const credentials = Buffer.from(`${infuraProjectId}:${infuraProjectSecret}`).toString('base64');
    authorization = `Basic ${credentials}`;
  }

  const isInfura = /infura\.io/.test(ipfsUrl);
  if (isInfura && !authorization) {
    return NextResponse.json(
      {
        disabled: true,
        reason: 'IPFS auth not configured',
      },
      {status: 200}
    );
  }

  try {
    const ipfs = await createIpfsClient({
      url: ipfsUrl,
      headers: authorization ? {authorization} : undefined
    });
    const payload = JSON.stringify({...(body as Record<string, unknown>), timestamp: new Date().toISOString()});
    const maxAttempts = 3;
    let lastErr: unknown;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const result = await ipfs.add(payload);
        return NextResponse.json({cid: result.cid.toString()});
      } catch (err: unknown) {
        lastErr = err;
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('401') || message.toLowerCase().includes('unauthorized')) {
          return NextResponse.json({error: message}, {status: 401});
        }
        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }
    const message = lastErr instanceof Error ? lastErr.message : String(lastErr);
    return NextResponse.json({error: message}, {status: 500});
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({error: message}, {status: 500});
  }
}
