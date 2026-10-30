import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMockWorkbenchRuntime } from '../src/mock';
import type { WorkbenchStorage } from '../src/workbench/ports';

type Snapshot = {
  tasks: Array<{ id: string; title: string; stage: number; docs: Array<{ body: string }> }>;
  connectors: Array<Record<string, unknown>>;
};
const snapshotOf = (value: unknown) => value as Snapshot;
const memoryStorage = (content: string | null = null): WorkbenchStorage => ({
  getItem: vi.fn(() => content),
  setItem: vi.fn(),
});

afterEach(() => vi.restoreAllMocks());

describe('mock workbench runtime', () => {
  it('does not access browser storage during module import or factory construction', async () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const access = vi.fn(() => {
      throw new Error('Browser storage is unavailable');
    });
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: access });
    try {
      vi.resetModules();
      const { createMockWorkbenchRuntime: createRuntime } = await import('../src/mock');
      const runtime = createRuntime();
      expect(runtime.mode).toBe('mock');
      runtime.createInitialState();
      expect(access).not.toHaveBeenCalled();
      expect(snapshotOf(runtime.load()).tasks.length).toBeGreaterThan(0);
      expect(access).toHaveBeenCalledTimes(1);
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original);
      else Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });

  it('restores version 2 drafts under the existing key without resetting user content', () => {
    const draft = snapshotOf(createMockWorkbenchRuntime().createInitialState());
    draft.tasks[0].title = '用户保留的标题';
    const storage = memoryStorage(JSON.stringify({ version: 2, model: draft }));
    const runtime = createMockWorkbenchRuntime({ storage });
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(runtime.load()).toEqual(draft);
    expect(storage.getItem).toHaveBeenCalledExactlyOnceWith('reed-demo-v2');
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it.each([
    ['missing', null],
    ['corrupt JSON', '{'],
    ['old version', '{"version":1,"model":{"tasks":[{}]}}'],
    ['empty tasks', '{"version":2,"model":{"tasks":[]}}'],
    ['unusable model', '{"version":2,"model":{"tasks":[null]}}'],
  ])('falls back to the original samples for %s storage', (_name, content) => {
    const runtime = createMockWorkbenchRuntime({ storage: memoryStorage(content) });
    expect(runtime.load()).toEqual(runtime.createInitialState());
  });

  it('falls back to samples when an injected storage read throws', () => {
    const storage = memoryStorage();
    vi.mocked(storage.getItem).mockImplementation(() => {
      throw new Error('read denied');
    });
    const runtime = createMockWorkbenchRuntime({ storage });
    expect(runtime.load()).toEqual(runtime.createInitialState());
  });

  it('saves the version 3 envelope and does not mutate the in-memory snapshot', () => {
    const storage = memoryStorage();
    const runtime = createMockWorkbenchRuntime({ storage });
    const snapshot = runtime.createInitialState();
    const before = structuredClone(snapshot);
    expect(runtime.save(snapshot)).toBe(true);
    expect(storage.setItem).toHaveBeenCalledExactlyOnceWith(
      'reed-demo-v2',
      JSON.stringify({ version: 3, model: snapshot }),
    );
    expect(snapshot).toEqual(before);
  });

  it('returns false on write failure while preserving the current in-memory content', () => {
    const storage = memoryStorage();
    vi.mocked(storage.setItem).mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    const runtime = createMockWorkbenchRuntime({ storage });
    const snapshot = snapshotOf(
      runtime.reduce(runtime.createInitialState(), {
        type: 'UPDATE_TASK',
        taskId: 'REQ-1042',
        title: '尚未存盘的编辑',
      }),
    );
    const before = structuredClone(snapshot);
    expect(runtime.save(snapshot)).toBe(false);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(snapshot).toEqual(before);
    expect(snapshot.tasks[0].title).toBe('尚未存盘的编辑');
  });

  it('retains the old reducer stage acceptance and rejection guards', () => {
    const runtime = createMockWorkbenchRuntime();
    const state = snapshotOf(runtime.createInitialState());
    const before = structuredClone(state);
    expect(() =>
      runtime.reduce(state, { type: 'MOVE_BOARD', taskId: 'REQ-1039', target: 'done' }),
    ).toThrow(/task.check-review-state/);
    expect(state).toEqual(before);
    const accepted = snapshotOf(
      runtime.reduce(state, { type: 'ACCEPT_STAGE', taskId: 'REQ-1042' }),
    );
    expect(accepted.tasks[0].stage).toBe(2);
    expect(state).toEqual(before);
    const noOutput = structuredClone(state);
    noOutput.tasks[0].docs = [];
    expect(() => runtime.reduce(noOutput, { type: 'ACCEPT_STAGE', taskId: 'REQ-1042' })).toThrow(
      /产出|正文|验收/,
    );
  });

  it('provides the model and connector helpers needed by the workbench through services', () => {
    const { services } = createMockWorkbenchRuntime();
    expect(services.STAGES).toEqual(['需求', '设计', '开发', '验证']);
    for (const name of [
      'getBoardColumn',
      'getStageReview',
      'getBoardMove',
      'normalizeState',
      'getOriginInfo',
      'createDemoConnector',
      'mappingIssues',
      'mockConnectionCheck',
      'canReadConnector',
      'canWriteConnector',
      'applyConnectorAction',
      'getMockDiscoveryCandidates',
      'createDiscoveredDraft',
      'findMatchingConnector',
      'connectorReadable',
      'connectorWritable',
      'connectorStatus',
    ]) {
      expect(services[name], name).toBeTypeOf('function');
    }
    expect(services.connectorReadable).toBe(services.canReadConnector);
    expect(services.connectorWritable).toBe(services.canWriteConnector);
  });

  it('preserves connector status formatting and the identity default translator', () => {
    const runtime = createMockWorkbenchRuntime();
    const status = runtime.services.connectorStatus as (
      connector: Record<string, unknown>,
      t?: (value: string) => string,
    ) => string;
    const connector = snapshotOf(runtime.createInitialState()).connectors[0];
    expect(status(connector)).toBe('模拟读写就绪');
    expect(status({ ...connector, syncMode: 'read_only' })).toBe('模拟可读取');
    expect(status({ ...connector, legacy: true })).toBe('历史来源待确认');
    expect(status({ ...connector, enabled: false })).toBe('已停用');
    for (const [value, label] of [
      ['disconnected', '等待检测'],
      ['error', '模拟检测未通过'],
      ['unconfigured', '待配置'],
      ['unexpected', '待核查'],
    ]) {
      expect(status({ ...connector, status: value }, (text) => `translated:${text}`)).toBe(
        `translated:${label}`,
      );
    }
  });
});

describe('mock draft structural boundary', () => {
  it.each([
    ['missing collections', { tasks: [{ id: 'retained-but-incomplete' }] }],
    ['incomplete task', { tasks: [{}], sessions: [], branches: [], events: [] }],
  ])('rejects %s before an unusable snapshot reaches the workbench', (_name, model) => {
    const runtime = createMockWorkbenchRuntime({
      storage: memoryStorage(JSON.stringify({ version: 2, model })),
    });
    expect(runtime.load()).toEqual(runtime.createInitialState());
  });
});

describe('optional local context restoration', () => {
  it.each([
    { description: { broken: true } },
    { references: { broken: true } },
    { references: [{ kind: 'file', name: 'missing location' }] },
  ])('does not pass corrupt optional context to the shared UI: %j', (fields) => {
    const snapshot = snapshotOf(createMockWorkbenchRuntime().createInitialState());
    Object.assign(snapshot.tasks[0], fields);
    const runtime = createMockWorkbenchRuntime({
      storage: memoryStorage(JSON.stringify({ version: 2, model: snapshot })),
    });
    expect(runtime.load()).toEqual(runtime.createInitialState());
  });
});

describe('task model preview migration', () => {
  it('preserves legacy content without treating old step completion as task acceptance', () => {
    const draft = snapshotOf(createMockWorkbenchRuntime().createInitialState()) as any;
    const legacy = draft.tasks[0];
    for (const key of [
      'taskType',
      'workflow',
      'goal',
      'criteria',
      'scopeRevision',
      'review',
      'reviews',
      'completions',
    ])
      delete legacy[key];
    legacy.status = 'completed';
    legacy.accepted = [true, true, true, true];
    const oldDocs = structuredClone(legacy.docs);
    const storage = memoryStorage(JSON.stringify({ version: 2, model: draft }));
    const restored = snapshotOf(createMockWorkbenchRuntime({ storage }).load()) as any;
    expect(restored.tasks[0].status).toBe('in_progress');
    expect(restored.tasks[0].legacyState.status).toBe('completed');
    expect(restored.tasks[0].completions).toEqual([]);
    expect(restored.tasks[0].docs).toEqual(oldDocs);
    expect(restored.tasks[0].migrationNotice).toBe('task.migration-review');
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('keeps historical Done while marking changed accepted evidence pending on reload', () => {
    const draft = snapshotOf(createMockWorkbenchRuntime().createInitialState()) as any;
    const completed = draft.tasks.find((task: any) => task.status === 'done');
    completed.docs[0].body = 'changed after completion';
    const runtime = createMockWorkbenchRuntime({
      storage: memoryStorage(JSON.stringify({ version: 3, model: draft })),
    });
    const restored = (snapshotOf(runtime.load()) as any).tasks.find(
      (task: any) => task.id === completed.id,
    );
    expect(restored.status).toBe('done');
    expect(restored.completions.at(-1).applicability).toBe('pending');
  });

  it.each([
    { goal: [] },
    { criteria: {} },
    { criteria: [{ id: 'x' }] },
    { workflow: { templateId: 'bad', stepLabels: [] } },
  ])('does not render an unusable new task draft: %j', (fields) => {
    const draft = snapshotOf(createMockWorkbenchRuntime().createInitialState());
    Object.assign(draft.tasks[0], fields);
    const runtime = createMockWorkbenchRuntime({
      storage: memoryStorage(JSON.stringify({ version: 3, model: draft })),
    });
    expect(runtime.load()).toEqual(runtime.createInitialState());
  });
});

it('does not render a corrupt relation note as a React child', () => {
  const runtime = createMockWorkbenchRuntime();
  const state: any = runtime.reduce(runtime.createInitialState(), {
    type: 'ADD_RELATION_EXAMPLES',
  });
  state.relations[0].reason = { broken: true };
  const invalid = createMockWorkbenchRuntime({
    storage: memoryStorage(JSON.stringify({ version: 3, model: state })),
  });
  expect(invalid.load()).toEqual(invalid.createInitialState());
});

it.each([{ requiredRelations: {} }, { requiredRelations: [{ taskId: 'missing-bindings' }] }])(
  'rejects corrupt nested required-result bindings: %j',
  (fields) => {
    const runtime = createMockWorkbenchRuntime();
    const snapshot: any = runtime.createInitialState();
    Object.assign(
      snapshot.tasks.find((task: any) => task.status === 'done').completions[0],
      fields,
    );
    const invalid = createMockWorkbenchRuntime({
      storage: memoryStorage(JSON.stringify({ version: 3, model: snapshot })),
    });
    expect(invalid.load()).toEqual(invalid.createInitialState());
  },
);
