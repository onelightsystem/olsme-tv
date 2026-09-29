// src/lib/ipfs/kubo-client.ts
// Single seam for kubo-rpc-client so a future major bump touches only this file.

export interface KuboClientOptions {
  url: string;
  headers?: Record<string, string>;
}

export interface KuboAddResult {
  cid: {toString(): string};
}

export interface KuboClient {
  add: (data: string) => Promise<KuboAddResult>;
}

export async function createIpfsClient(options: KuboClientOptions): Promise<KuboClient> {
  const {create} = await import('kubo-rpc-client');
  return create(options);
}
