import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { WorkbenchRoot } from '../src/index';
import { createMockWorkbenchRuntime } from '../src/mock';

vi.mock('../src/workbench/SettingsControl.jsx', () => ({
  SettingsControl: ({ openConfiguration }: { openConfiguration?: () => void }) => (
    <button disabled={!openConfiguration}>task-type-maintenance-entry</button>
  ),
}));

it('makes task type maintenance reachable through the workbench settings', () => {
  const html = renderToStaticMarkup(
    <WorkbenchRoot
      runtime={createMockWorkbenchRuntime({ storage: { getItem: () => null, setItem() {} } })}
      initialLocale="zh-CN"
    />,
  );
  expect(html).toContain('<button>task-type-maintenance-entry</button>');
});
