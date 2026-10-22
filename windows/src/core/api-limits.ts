export interface ApiLimitBucket { kind: string; limit: number; remaining: number; reset: string | null }
export interface ApiLimitSnapshot { provider: string; model: string; at: number; source: string; buckets: ApiLimitBucket[] }
export function remainingPercent(bucket: ApiLimitBucket): number | null {
  if (![bucket.limit,bucket.remaining].every(Number.isFinite) || bucket.limit < 0 || bucket.remaining < 0) return null;
  if (bucket.limit === 0) return 0;
  return Math.max(0,Math.min(100,bucket.remaining/bucket.limit*100));
}
export function staleLimit(at: number, now=Date.now()): boolean { return !Number.isFinite(at) || at > now || now-at>120000; }
export function lowQuota(snapshot:ApiLimitSnapshot,provider:string,model:string,now=Date.now()):boolean {
  return snapshot.provider===provider && (snapshot.source==="key" || snapshot.model===model) && !staleLimit(snapshot.at,now) && snapshot.buckets.some(b=>{const p=remainingPercent(b);return p!==null && p<=15;});
}
