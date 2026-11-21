import { describe, expect, it } from 'vitest';

import { normaliseWebSocketRequestScheme } from '../../server/websocket-forwarded-proto.js';

describe('normaliseWebSocketRequestScheme', () => {
  it('maps wss to https so a Traefik-forwarded handshake matches the browser Origin', () => {
    const request = new Request('wss://nocofin.dsc.edu.vn/ws?x=1', {
      headers: { origin: 'https://nocofin.dsc.edu.vn', cookie: 'a=b' },
    });
    const normalised = normaliseWebSocketRequestScheme(request);
    expect(new URL(normalised.url).origin).toBe('https://nocofin.dsc.edu.vn');
    expect(normalised.url).toBe('https://nocofin.dsc.edu.vn/ws?x=1');
    expect(normalised.headers.get('cookie')).toBe('a=b');
  });

  it('maps ws to http', () => {
    const normalised = normaliseWebSocketRequestScheme(
      new Request('ws://localhost:13000/ws'),
    );
    expect(normalised.url).toBe('http://localhost:13000/ws');
  });

  it('leaves http and https requests untouched', () => {
    const request = new Request('https://nocofin.dsc.edu.vn/ws');
    expect(normaliseWebSocketRequestScheme(request)).toBe(request);
  });
});
