// @ts-check
/// <reference types="node" />
const http = require('node:http');

/** @param {import('http').IncomingHttpHeaders} input */
function forwardedHeaders(input) {
  /** @type {import('http').IncomingHttpHeaders} */
  const headers = { ...input, host: '127.0.0.1:3000' };
  delete headers.connection;
  delete headers['proxy-connection'];
  delete headers['transfer-encoding'];
  const configured = [process.env.EXPO_WEB_PREVIEW_URL, process.env.EXPO_PACKAGER_PROXY_URL];
  const declared = input['x-sayarty-origin'];
  let declaredOrigin = null;
  try {
    const parsed = new URL(typeof declared === 'string' ? declared : '');
    if (parsed.protocol === 'https:' && !['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)) declaredOrigin = parsed.origin;
  } catch { /* Ignore malformed browser-origin declarations. */ }
  const trustedDeclaration = typeof declaredOrigin === 'string' && (configured.some(value => {
    try { return new URL(value || '').origin === declared; } catch { return false; }
  }) || (input.origin === 'http://127.0.0.1:8081' || input.origin === 'http://localhost:8081'));
  for (const hint of [input.origin, input.referer, trustedDeclaration ? declared : undefined]) {
    if (typeof hint !== 'string') continue;
    try {
      const origin = new URL(hint);
      if (origin.protocol === 'https:' && (configured.some(value => {
        try { return new URL(value || '').origin === origin.origin; } catch { return false; }
      }) || (trustedDeclaration && declaredOrigin === origin.origin))) {
        headers['x-forwarded-proto'] = 'https';
        headers['x-forwarded-host'] = origin.host;
        break;
      }
    } catch { /* Ignore malformed browser-origin hints. */ }
  }
  // Ingress rebases Origin and strips Referer. A same-origin AJAX header preserves the
  // app's public origin for both the actual request and its preflight. Cross-origin AJAX
  // cannot make the internal-origin condition above true, and simple cross-site forms
  // cannot add this header.
  if (trustedDeclaration && declaredOrigin
    && (input.origin === 'http://127.0.0.1:8081' || input.origin === 'http://localhost:8081')) {
    headers.origin = declaredOrigin;
  }
  return headers;
}

/**
 * @param {(req: import('http').IncomingMessage, res: import('http').ServerResponse, next?: Function) => any} middleware
 */
function createApiProxy(middleware) {
  /** @param {import('http').IncomingMessage} req @param {import('http').ServerResponse} res @param {Function} [next] */
  return function apiProxy(req, res, next) {
    const url = req.url || '/';
    if (!url.startsWith('/api/') && !url.startsWith('/manus-storage/')) return middleware(req, res, next);
    // Target is fixed and loopback-only. Client input never controls the upstream host/port.
    const upstream = http.request({ hostname: '127.0.0.1', port: 3000, method: req.method, path: url, headers: forwardedHeaders(req.headers) });
    upstream.on('response', response => {
      res.writeHead(response.statusCode || 502, response.headers);
      response.on('error', () => res.destroy());
      response.pipe(res);
    });
    upstream.on('error', () => {
      if (res.destroyed) return;
      if (res.headersSent) { res.destroy(); return; }
      res.writeHead(502, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ error: 'خادم التطبيق غير متاح مؤقتاً', code: 'API_UNAVAILABLE' }));
    });
    upstream.setTimeout(30000, () => upstream.destroy());
    req.on('aborted', () => upstream.destroy());
    res.on('close', () => { if (!res.writableEnded) upstream.destroy(); });
    req.pipe(upstream);
  };
}

module.exports = { createApiProxy };
