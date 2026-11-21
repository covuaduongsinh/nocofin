import type { Application } from '@nocobase/app-server/application';

/**
 * Behind Traefik (Dokploy) a WebSocket handshake arrives with `X-Forwarded-Proto: wss`, not `https`. The framework
 * builds the request URL from that header, so the URL becomes `wss://host/ws` while the browser's Origin is
 * `https://host`, and the realtime handler rejects the same-origin check with 403. The page then shows
 * "Không thể kết nối" after sign-in.
 *
 * This maps the WebSocket schemes back to the HTTP ones before the handler runs. It changes nothing else: headers,
 * cookies and the abort signal are passed through, and a request already on http/https is untouched. Remove it once
 * @nocobase/app-websocket normalises ws/wss itself.
 */
const HTTP_SCHEME_FOR: Record<string, string> = {
  'ws:': 'http:',
  'wss:': 'https:',
};

export function normaliseWebSocketRequestScheme(request: Request): Request {
  const url = new URL(request.url);
  const scheme = HTTP_SCHEME_FOR[url.protocol];
  if (!scheme) return request;
  return new Request(url.href.replace(url.protocol, scheme), {
    method: request.method,
    headers: request.headers,
    signal: request.signal,
  });
}

export function acceptForwardedWebSocketSchemes(app: Application): void {
  const handle = app.websocket;
  const normalised: typeof handle = (request, ...rest) =>
    handle(normaliseWebSocketRequestScheme(request), ...rest);
  // `websocket` is readonly in the type only; replacing the instance property keeps the default realtime provider,
  // which passing a custom `websocket` factory to the Application would switch off.
  Object.defineProperty(app, 'websocket', {
    configurable: true,
    enumerable: true,
    value: normalised,
  });
}
