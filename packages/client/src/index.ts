import { CORE_PROTOCOL_VERSION } from './generated/CoreHealth.js';
import type { CoreHealth } from './generated/CoreHealth.js';

export type { CoreHealth } from './generated/CoreHealth.js';
export type HealthTransport = (options?: { signal?: AbortSignal }) => Promise<unknown>;
export type CoreHealthErrorCode = 'network' | 'timeout' | 'http' | 'invalid-response' | 'incompatible-protocol' | 'cancelled';

export class CoreHealthError extends Error {
  constructor(public readonly code: CoreHealthErrorCode, options?: ErrorOptions) {
    super(code, options);
    this.name = 'CoreHealthError';
  }
}

function classifyError(error: unknown, signal?: AbortSignal): CoreHealthError {
  if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
    return new CoreHealthError('cancelled');
  }
  return error instanceof CoreHealthError ? error : new CoreHealthError('network', { cause: error });
}

function validateHealth(value: unknown): CoreHealth {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new CoreHealthError('invalid-response');
  }
  const health = value as Record<string, unknown>;
  if (health.service !== 'reed-core' || health.mode !== 'foundation'
    || typeof health.version !== 'string' || health.version.trim().length === 0
    || !Array.isArray(health.capabilities) || !health.capabilities.every((item) => typeof item === 'string')
    || !Object.hasOwn(health, 'protocolVersion')) {
    throw new CoreHealthError('invalid-response');
  }
  if (health.protocolVersion !== CORE_PROTOCOL_VERSION) {
    throw new CoreHealthError('incompatible-protocol');
  }
  return {
    service: health.service,
    version: health.version,
    protocolVersion: health.protocolVersion,
    mode: health.mode,
    capabilities: [...health.capabilities],
  };
}

async function withCancellation<T>(operation: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  if (signal?.aborted) throw new CoreHealthError('cancelled');
  let onAbort: (() => void) | undefined;
  try {
    return await new Promise<T>((resolve, reject) => {
      onAbort = () => reject(new CoreHealthError('cancelled'));
      signal?.addEventListener('abort', onAbort, { once: true });
      Promise.resolve(operation()).then(resolve, reject);
    });
  } finally {
    if (onAbort) signal?.removeEventListener('abort', onAbort);
  }
}

async function readBoundedJson(response: Response, signal: AbortSignal): Promise<unknown> {
  if (!response.body) throw new CoreHealthError('invalid-response');
  const reader = response.body.getReader();
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let size = 0;
    let json = '';
    while (true) {
      if (signal.aborted) throw new CoreHealthError('cancelled');
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16 * 1024) {
        cancel();
        throw new CoreHealthError('invalid-response');
      }
      json += decoder.decode(value, { stream: true });
    }
    json += decoder.decode();
    return JSON.parse(json) as unknown;
  } catch (error) {
    if (signal.aborted) throw new CoreHealthError('cancelled');
    throw error instanceof CoreHealthError ? error : new CoreHealthError('invalid-response', { cause: error });
  } finally {
    signal.removeEventListener('abort', cancel);
    reader.releaseLock();
  }
}

export function createHttpHealthTransport(options: { fetch?: typeof globalThis.fetch } = {}): HealthTransport {
  return async ({ signal } = {}) => {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 3000);
    try {
      return await withCancellation(async () => {
        const fetchHealth = options.fetch ?? globalThis.fetch;
        const response = await fetchHealth('/core/health', {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
          cache: 'no-store',
          credentials: 'omit',
          redirect: 'error',
        });
        if (!response.ok) {
          void response.body?.cancel().catch(() => {});
          throw new CoreHealthError('http');
        }
        return readBoundedJson(response, controller.signal);
      }, controller.signal);
    } catch (error) {
      if (timedOut && !signal?.aborted) throw new CoreHealthError('timeout');
      throw classifyError(error, signal);
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
    }
  };
}

export async function getCoreHealth(options: { transport?: HealthTransport; signal?: AbortSignal } = {}): Promise<CoreHealth> {
  const { signal, transport = createHttpHealthTransport() } = options;
  try {
    // Native invocation may continue, but cancellation still ends this client's wait.
    const value = await withCancellation(() => transport({ signal }), signal);
    if (signal?.aborted) throw new CoreHealthError('cancelled');
    return validateHealth(value);
  } catch (error) {
    throw classifyError(error, signal);
  }
}
