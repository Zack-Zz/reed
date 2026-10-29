import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { FoundationApp } from '../src/index';

describe('Foundation status page', () => {
  it('shows the stage, unconnected Core and manual refresh in English', () => {
    const html = renderToStaticMarkup(<FoundationApp initialLocale="en" />);
    expect(html).toContain('Reed');
    expect(html).toContain('Foundation stage');
    expect(html).toContain('Not connected');
    expect(html).toContain('Refresh status');
    expect(html).toContain('No tasks, storage or connectors are enabled.');
  });
  it('has a complete Chinese presentation from central locale resources', () => {
    const html = renderToStaticMarkup(<FoundationApp initialLocale="zh-CN" />);
    expect(html).toContain('基础工程阶段');
    expect(html).toContain('未连接');
    expect(html).toContain('刷新状态');
    expect(html).toContain('尚未启用任务、存储或连接器。');
    expect(html).not.toContain('undefined');
  });
  it('does not call Core while rendering the initial page', () => {
    const healthTransport = vi.fn(async () => null);
    renderToStaticMarkup(<FoundationApp healthTransport={healthTransport} />);
    expect(healthTransport).not.toHaveBeenCalled();
  });
});
