import { invoke } from '@tauri-apps/api/core';
import { CoreHealthError } from '@reed/client';
import type { CoreHealthErrorCode, HealthTransport } from '@reed/client';

const nativeCodes = new Set<CoreHealthErrorCode>([
  'network', 'http', 'timeout', 'invalid-response', 'incompatible-protocol',
]);

export function createNativeHealthTransport(
  read: () => Promise<unknown> = () => invoke<unknown>('core_health'),
): HealthTransport {
  return async () => {
    try {
      return await read();
    } catch (error) {
      const code = typeof error === 'string' && nativeCodes.has(error as CoreHealthErrorCode)
        ? error as CoreHealthErrorCode : 'network';
      throw new CoreHealthError(code);
    }
  };
}
