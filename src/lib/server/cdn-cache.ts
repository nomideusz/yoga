// Shared CDN cache policy for anonymous public pages. Browsers always
// revalidate (max-age=0); the CDN serves for 5 min and revalidates in the
// background for up to a day. Cloudflare only honours this once a Cache Rule
// marks HTML as eligible for cache — origin headers then control the TTL.
export const CDN_CACHE_HEADER = {
  'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400',
};
