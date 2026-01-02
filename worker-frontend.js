// Cloudflare Worker for serving static frontend assets
import { getAssetFromKV } from '@cloudflare/kv-asset-handler';
import manifestJSON from '__STATIC_CONTENT_MANIFEST';

const assetManifest = JSON.parse(manifestJSON);

export default {
  async fetch(request, env, ctx) {
    try {
      // Serve static assets from KV
      return await getAssetFromKV(
        {
          request,
          waitUntil: ctx.waitUntil.bind(ctx),
        },
        {
          ASSET_NAMESPACE: env.__STATIC_CONTENT,
          ASSET_MANIFEST: assetManifest,
          cacheControl: {
            bypassCache: false,
          },
          mapRequestToAsset: (req) => {
            const url = new URL(req.url);
            // For SPA routing - map all non-asset paths to index.html
            if (!url.pathname.includes('.') && !url.pathname.startsWith('/assets/')) {
              url.pathname = '/index.html';
            }
            return new Request(url.toString(), req);
          },
        }
      ).then((response) => {
        // Add CORS and security headers
        const headers = new Headers(response.headers);
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        headers.set('X-Content-Type-Options', 'nosniff');
        headers.set('X-Frame-Options', 'DENY');
        headers.set('X-XSS-Protection', '1; mode=block');

        // Cache static assets
        if (request.url.includes('/assets/')) {
          headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (request.url.endsWith('.html')) {
          headers.set('Cache-Control', 'public, max-age=3600');
        }

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      });
    } catch (e) {
      return new Response(`Error: ${e.message}`, { status: 500 });
    }
  },
};
