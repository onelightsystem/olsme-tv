import {NextRequest, NextResponse} from 'next/server';
import {createIpfsClient} from '@lib/ipfs/kubo-client';

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

    const ipfs = await createIpfsClient({
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
