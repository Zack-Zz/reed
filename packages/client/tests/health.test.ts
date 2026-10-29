import { describe, expect, it, vi } from 'vitest';
import { CoreHealthError, createHttpHealthTransport, getCoreHealth } from '../src/index';

const health = { service: 'reed-core', version: '0.1.0', protocolVersion: 1, mode: 'foundation', capabilities: [] };
const transportFor = (value: unknown) => async () => value;

describe('Core health contract', () => {
  it('accepts the foundation health response from an injected transport', async () => {
    await expect(getCoreHealth({ transport: transportFor(health) })).resolves.toEqual(health);
  });
  it.each([2, 0, '1'])('rejects an incompatible protocol version %s', async (protocolVersion) => {
    await expect(getCoreHealth({ transport: transportFor({ ...health, protocolVersion }) })).rejects.toMatchObject({ code: 'incompatible-protocol' });
  });
  it.each([null, [], {}, { ...health, service: 'other-core' }, { ...health, mode: 'production' }, { ...health, version: '' }, { ...health, capabilities: [2] }])('rejects malformed or foreign response %j', async (value) => {
    await expect(getCoreHealth({ transport: transportFor(value) })).rejects.toMatchObject({ code: 'invalid-response' });
  });
  it('maps transport failures into a typed network error', async () => {
    await expect(getCoreHealth({ transport: async () => { throw new TypeError('offline'); } })).rejects.toBeInstanceOf(CoreHealthError);
    await expect(getCoreHealth({ transport: async () => { throw new TypeError('offline'); } })).rejects.toMatchObject({ code: 'network' });
  });
  it('does not start a transport if the signal is already aborted', async () => {
    const controller = new AbortController(); controller.abort();
    const transport = vi.fn(transportFor(health));
    await expect(getCoreHealth({ transport, signal: controller.signal })).rejects.toMatchObject({ code: 'cancelled' });
    expect(transport).not.toHaveBeenCalled();
  });
  it('forwards cancellation and rejects even when an adapter cannot abort its operation', async () => {
    const controller = new AbortController();
    let resolve!: (value: unknown) => void;
    const transport = vi.fn(() => new Promise<unknown>((done) => { resolve = done; }));
    const result = getCoreHealth({ transport, signal: controller.signal });
    controller.abort(); resolve(health);
    await expect(result).rejects.toMatchObject({ code: 'cancelled' });
    expect(transport).toHaveBeenCalledWith({ signal: controller.signal });
  });
});

describe('HTTP health transport', () => {
  it('fetches only the same-origin diagnostic endpoint and forwards the signal', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify(health)));
    const controller = new AbortController();
    await expect(getCoreHealth({ transport: createHttpHealthTransport({ fetch }), signal: controller.signal })).resolves.toEqual(health);
    expect(fetch).toHaveBeenCalledWith('/core/health', expect.objectContaining({ signal: expect.any(AbortSignal), cache: 'no-store', credentials: 'omit' }));
  });
  it('reports an unsuccessful HTTP status without accepting its JSON', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify(health), { status: 503 }));
    await expect(getCoreHealth({ transport: createHttpHealthTransport({ fetch }) })).rejects.toMatchObject({ code: 'http' });
  });
  it('reports invalid JSON as an invalid response', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response('not json'));
    await expect(getCoreHealth({ transport: createHttpHealthTransport({ fetch }) })).rejects.toMatchObject({ code: 'invalid-response' });
  });
  it('classifies a fetch AbortError as cancellation', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockRejectedValue(new DOMException('Aborted', 'AbortError'));
    await expect(getCoreHealth({ transport: createHttpHealthTransport({ fetch }) })).rejects.toMatchObject({ code: 'cancelled' });
  });
});


describe('bounded HTTP diagnostics', () => {
  it('ends an unanswered fetch after three seconds', async () => {
    vi.useFakeTimers();
    try {
      const fetch = vi.fn<typeof globalThis.fetch>(() => new Promise(() => {}));
      let outcome = 'pending';
      const result = getCoreHealth({ transport: createHttpHealthTransport({ fetch }) });
      void result.then(() => { outcome = 'resolved'; }, (error) => { outcome = error.code; });
      await vi.advanceTimersByTimeAsync(3000);
      expect(outcome).toBe('timeout');
      expect(fetch.mock.calls[0][1]?.signal?.aborted).toBe(true);
    } finally { vi.useRealTimers(); }
  });
  it('also bounds waiting for the response body', async () => {
    vi.useFakeTimers();
    try {
      const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(new ReadableStream()));
      let outcome = 'pending';
      void getCoreHealth({ transport: createHttpHealthTransport({ fetch }) }).then(
        () => { outcome = 'resolved'; }, (error) => { outcome = error.code; },
      );
      await vi.advanceTimersByTimeAsync(3000);
      expect(outcome).toBe('timeout');
    } finally { vi.useRealTimers(); }
  });
  it('rejects a streamed body over 16 KiB without trusting content-length', async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(JSON.stringify({ ...health, capabilities: ['中'.repeat(6000)] })));
        controller.close();
      },
    });
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(body, { headers: { 'content-length': '12' } }));
    const assertion = expect(getCoreHealth({ transport: createHttpHealthTransport({ fetch }) })).rejects.toMatchObject({ code: 'invalid-response' });
    await assertion;
  });
  it('accepts a complete valid body at the 16 KiB limit', async () => {
    const json = JSON.stringify(health);
    const body = json + ' '.repeat(16 * 1024 - new TextEncoder().encode(json).length);
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(body));
    await expect(getCoreHealth({ transport: createHttpHealthTransport({ fetch }) })).resolves.toEqual(health);
  });
});
