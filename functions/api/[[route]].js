// ============================================================
// NEON BULL — Cloudflare Pages Function
// Transparent proxy: /api/* → Worker
//
// The Worker URL lives ONLY in Cloudflare Pages env vars.
// Never in any file. Never visible to the browser.
// ============================================================

export async function onRequest(context) {
  const { request, env } = context;

  // WORKER_URL is set as a Cloudflare Pages environment variable
  const workerBase = env.WORKER_URL;
  if (!workerBase) {
    return new Response(JSON.stringify({ error: "Service not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Strip /api prefix, forward the rest to Worker
  const url      = new URL(request.url);
  const path     = url.pathname.replace(/^\/api/, "") || "/";
  const target   = `${workerBase.replace(/\/$/, "")}${path}${url.search}`;

  // Forward the request — pass through method, headers, body
  const forwarded = new Request(target, {
    method:  request.method,
    headers: request.headers,
    body:    ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
  });

  const response = await fetch(forwarded);

  // Return Worker response with CORS headers added
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Cache-Control", "no-store");

  return new Response(response.body, {
    status:  response.status,
    headers,
  });
}
