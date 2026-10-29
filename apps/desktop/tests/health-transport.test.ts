import { describe, it, expect } from 'vitest';
import { getCoreHealth } from '@reed/client';
import { createNativeHealthTransport } from '../src/health-transport';

describe('native shell error boundary', () => {
  it.each(['network', 'http', 'timeout', 'invalid-response', 'incompatible-protocol'])('preserves native diagnostic %s', async (code) => {
    const transport = createNativeHealthTransport(async () => { throw code; });
    await expect(getCoreHealth({ transport })).rejects.toMatchObject({ code });
  });
  it('sanitizes unrecognized native errors', async () => {
    const transport = createNativeHealthTransport(async () => { throw { privatePath: '/private/diagnostic' }; });
    await expect(getCoreHealth({ transport })).rejects.toMatchObject({ code: 'network' });
  });
});
