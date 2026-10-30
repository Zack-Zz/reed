import { useWorkbenchRuntime } from './runtime-context.js';
import { useI18n } from './i18n.jsx';
import { YunxiaoMark } from './YunxiaoMark.jsx';
import { Select } from './Select.jsx';
import { useEffect, useRef, useState } from 'react';
import {
  Plugs,
  Plus,
  CheckCircle,
  WarningCircle,
  ArrowClockwise,
  PencilSimple,
  Power,
  Cloud,
  TerminalWindow,
  ArrowRight,
  Check,
  Circle,
  SpinnerGap,
  CaretLeft,
  ArrowSquareOut,
} from '@phosphor-icons/react';
import { Modal, Field } from './ui.jsx';

const steps = ['连接身份', '连接检测', '同步范围', '状态映射'];

function sourceCounts(model, id) {
  const linked = (entity) =>
    entity.origin?.kind === 'connector' && entity.origin.connectorId === id;
  return {
    tasks: model.tasks.filter(linked).length,
    documents: model.tasks.flatMap((task) => task.docs).filter(linked).length,
    sessions: model.sessions.filter(linked).length,
    branches: model.branches.filter(linked).length,
  };
}

export function ConnectorSettings({ ctx, selectedId }) {
  const { connectorReadable, connectorWritable, connectorStatus } = useWorkbenchRuntime().services;
  const { EDITIONS, WORK_ITEM_TYPES, DEFAULT_ENDPOINT } = useWorkbenchRuntime().services;
  const { t } = useI18n();
  const [editing, setEditing] = useState(null),
    [testing, setTesting] = useState(null),
    rows = useRef({});
  const { model, act } = ctx;
  useEffect(() => {
    if (selectedId) rows.current[selectedId]?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);
  const live = model.connectors.filter((connector) => !connector.legacy);
  return (
    <section className="page connectors-page">
      <header className="page-heading">
        <div>
          <h1>{t('连接器')}</h1>
          <p>{t('把不同来源的工作，带入同一条流。')}</p>
        </div>
        <button className="primary" onClick={() => ctx.openConnectors()}>
          <Plus size={16} />
          {t('添加连接')}
        </button>
      </header>
      <div className="connector-overview">
        <div>
          <span className="eyebrow">{t('已连接的来源')}</span>
          <p>
            <strong>{live.length}</strong>
            {t('个连接')}
            <span>{t('各自配置，独立同步')}</span>
          </p>
        </div>
        <div className="connector-driver">
          <TerminalWindow size={19} />
          <span>
            {t('云效官方 CLI')}
            <small>aliyun · aliyun-cli-devops</small>
          </span>
          <span className="demo-pill">{t('模拟')}</span>
        </div>
      </div>
      <div className="connector-demo-note">
        <Plugs size={21} />
        <span>
          {t('完整流程，本地演示')}
          <small>
            {t('使用演示凭据与固定数据模拟检测，不执行 CLI、不发送请求，也不接收真实 Token。')}
          </small>
        </span>
      </div>
      <div className="connector-list">
        {model.connectors.map((connector) => {
          const counts = sourceCounts(model, connector.id);
          const pendingWrite =
            connectorReadable(connector) &&
            connector.syncMode === 'bidirectional' &&
            !connectorWritable(connector);
          return (
            <article
              key={connector.id}
              ref={(element) => {
                rows.current[connector.id] = element;
              }}
              className={`connector-row ${connector.id === selectedId ? 'selected' : ''}`}
            >
              <div className="connector-row-heading">
                <div className="connector-symbol">
                  <YunxiaoMark size={36} />
                </div>
                <div>
                  <h2>{connector.name}</h2>
                  <p>
                    {t('云效 ·')} {t(EDITIONS[connector.edition]) || t('历史连接')} ·{' '}
                    {connector.organizationName ||
                      connector.organizationId ||
                      connector.endpoint ||
                      t('原身份未记录')}
                    {connector.principal ? ` · ${connector.principal}` : ''}
                  </p>
                </div>
                <span
                  className={`connection-status ${connectorReadable(connector) ? 'connected' : 'muted'}`}
                >
                  {connectorReadable(connector) ? (
                    <CheckCircle size={14} />
                  ) : (
                    <WarningCircle size={14} />
                  )}
                  {connectorStatus(connector, t)}
                </span>
              </div>
              <div className="connector-row-detail">
                <span>
                  <small>{t('项目范围')}</small>
                  {connector.projects.join(t('、')) || t('旧存档未记录')}
                </span>
                <span>
                  <small>{t('同步模式')}</small>
                  {connector.syncMode === 'bidirectional' ? t('双向同步') : t('仅拉取')}
                </span>
                <span>
                  <small>{t('来源数据')}</small>
                  {t('{tasks} 任务 · {documents} 文档', {
                    tasks: counts.tasks,
                    documents: counts.documents,
                  })}
                </span>
              </div>
              {!connector.legacy && (
                <div
                  className="connector-check-strip"
                  aria-label={t('{name} 检测概览', { name: connector.name })}
                >
                  {['cli', 'auth', 'projects', 'mapping', 'write'].map((key) => {
                    const item = connector.checks?.find((check) => check.id === key);
                    return (
                      <span key={key} className={item?.status || 'pending'} title={t(item?.detail)}>
                        <Circle size={5} weight="fill" />
                        {
                          {
                            cli: 'CLI',
                            auth: t('身份'),
                            projects: t('读取'),
                            mapping: t('映射'),
                            write: t('写入'),
                          }[key]
                        }
                      </span>
                    );
                  })}
                </div>
              )}
              {pendingWrite && (
                <p className="connector-pending">
                  <WarningCircle size={14} />
                  {t('读取已就绪，回写前还需完成映射和写入检测。')}
                  <button className="text-link" onClick={() => setEditing(connector.id)}>
                    {t('继续配置')}
                  </button>
                </p>
              )}
              {connector.legacy && (
                <p className="connector-legacy">
                  {t('旧版本未记录连接身份，历史数据单独保留。新增连接不会接管这些数据。')}
                </p>
              )}
              <footer>
                <button className="quiet" onClick={() => setEditing(connector.id)}>
                  <PencilSimple size={15} />
                  {connector.legacy ? t('修改显示名称') : t('配置')}
                </button>
                {!connector.legacy && (
                  <>
                    <button
                      className="quiet"
                      onClick={() => setTesting(connector.id)}
                      disabled={!connector.enabled}
                    >
                      <ArrowClockwise size={15} />
                      {t('检测连接')}
                    </button>
                    <button
                      className="quiet"
                      onClick={() =>
                        act(
                          { type: 'TOGGLE_CONNECTOR', connectorId: connector.id },
                          connector.enabled ? '连接已停用，来源与历史保留' : '连接已启用',
                        )
                      }
                    >
                      <Power size={15} />
                      {connector.enabled ? t('停用') : t('启用')}
                    </button>
                  </>
                )}
                <button className="text-link" onClick={() => ctx.openConnectorTasks(connector.id)}>
                  {t('查看来源任务')}
                  <ArrowSquareOut size={13} />
                </button>
                {connectorReadable(connector) && (
                  <button
                    className="secondary"
                    onClick={() => ctx.setModal({ type: 'import', connectorId: connector.id })}
                  >
                    {t('导入{type}', {
                      type: t(
                        WORK_ITEM_TYPES.find((item) => item.id === connector.workItemType)?.label ||
                          t('工作项'),
                      ),
                    })}
                  </button>
                )}
              </footer>
              {!connector.legacy && (
                <details className="connector-more">
                  <summary>{t('连接详情与映射')}</summary>
                  <dl>
                    <dt>Connector ID</dt>
                    <dd className="mono">{connector.id}</dd>
                    <dt>{t('组织版本')}</dt>
                    <dd>{t(EDITIONS[connector.edition])}</dd>
                    <dt>{t('账号身份')}</dt>
                    <dd>{t('{principal}（模拟）', { principal: connector.principal })}</dd>
                    <dt>{connector.edition === 'region' ? t('实例地址') : t('组织 ID')}</dt>
                    <dd className="mono">
                      {connector.edition === 'region'
                        ? connector.endpoint
                        : connector.organizationId}
                    </dd>
                    <dt>{t('服务地址')}</dt>
                    <dd className="mono">{connector.endpoint || DEFAULT_ENDPOINT}</dd>
                    <dt>{t('工作项类型')}</dt>
                    <dd>
                      {t(WORK_ITEM_TYPES.find((item) => item.id === connector.workItemType)?.label)}
                    </dd>
                    <dt>{t('配置来处')}</dt>
                    <dd>
                      {connector.setupSource?.kind === 'discovered'
                        ? t(connector.setupSource.label)
                        : connector.setupSource?.kind === 'manual'
                          ? t('自定义配置')
                          : t('历史配置未记录')}
                    </dd>
                    <dt>{t('凭据')}</dt>
                    <dd>{t('演示 PAT，不包含真实令牌')}</dd>
                  </dl>
                  <MappingSummary connector={connector} />
                </details>
              )}
            </article>
          );
        })}
      </div>
      <p className="footnote">
        {t(
          '每条数据按 Connector ID 记录来源。改名或停用连接会保留关联；切换组织、实例或账号请添加新连接。',
        )}
      </p>
      {editing && (
        <ConnectorForm
          key={editing}
          ctx={ctx}
          connector={model.connectors.find((item) => item.id === editing)}
          close={() => setEditing(null)}
        />
      )}
      {testing && (
        <DetectionDialog
          key={testing}
          ctx={ctx}
          connector={model.connectors.find((item) => item.id === testing)}
          close={() => setTesting(null)}
          configure={() => {
            setEditing(testing);
            setTesting(null);
          }}
        />
      )}
    </section>
  );
}

function useMockCheck() {
  const { mockConnectionCheck } = useWorkbenchRuntime().services;
  const [result, setResult] = useState(null),
    [visible, setVisible] = useState(0),
    [running, setRunning] = useState(false);
  const timers = useRef([]);
  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const reset = () => {
    clear();
    setResult(null);
    setVisible(0);
    setRunning(false);
  };
  const run = (connector, complete) => {
    clear();
    const next = mockConnectionCheck(connector);
    setResult(next);
    setVisible(0);
    setRunning(true);
    next.checks.forEach((_, index) =>
      timers.current.push(
        setTimeout(
          () => {
            setVisible(index + 1);
            if (index === next.checks.length - 1) {
              setRunning(false);
              complete?.(next);
            }
          },
          (index + 1) * 180,
        ),
      ),
    );
  };
  return { result, visible, running, run, reset };
}
function CheckResults({ detection, connectionOnly = false }) {
  const { t } = useI18n();
  const items = detection.result?.checks.filter(
    (item) => !connectionOnly || !['mapping', 'write'].includes(item.id),
  );
  return (
    <div className="detection-results" aria-live="polite">
      {(
        items ||
        ['cli', 'auth', 'identity', 'projects'].map((id) => ({
          id,
          label: {
            cli: t('官方 CLI 与插件'),
            auth: t('令牌与账号'),
            identity: t('组织／实例身份'),
            projects: '项目读取权限',
          }[id],
        }))
      ).map((item, index) => {
        const revealed = index < detection.visible,
          status = revealed ? item.status : 'pending';
        return (
          <div key={item.id} className={`detection-step ${status}`}>
            <span className="detection-icon">
              {status === 'passed' ? (
                <CheckCircle size={19} />
              ) : status === 'failed' ? (
                <WarningCircle size={19} />
              ) : detection.running && index === detection.visible ? (
                <SpinnerGap size={19} className="spin" />
              ) : (
                <Circle size={18} />
              )}
            </span>
            <div>
              <strong>{t(item.label)}</strong>
              <small>
                {revealed ? t(item.detail) : detection.running ? t('等待检测') : t('尚未检测')}
              </small>
            </div>
            <span className="detection-state">
              {
                {
                  passed: t('通过'),
                  failed: t('未通过'),
                  blocked: t('未执行'),
                  not_required: t('无需写入'),
                  pending: t('待检测'),
                }[status]
              }
            </span>
          </div>
        );
      })}
    </div>
  );
}
function DetectionDialog({ ctx, connector, close, configure }) {
  const { EDITIONS } = useWorkbenchRuntime().services;
  const { t } = useI18n();
  const detection = useMockCheck();
  return (
    <Modal title={t('检测连接')} close={close}>
      <div className="modal-body">
        <div className="detection-title">
          <YunxiaoMark size={32} />
          <div>
            <strong>{connector.name}</strong>
            <small>
              {t('{edition} · {principal} · 模拟', {
                edition: t(EDITIONS[connector.edition]),
                principal: connector.principal,
              })}
            </small>
          </div>
        </div>
        <CheckResults detection={detection} />
        <p className="footnote">
          {t('分步模拟 CLI、认证、读取、映射及写权限。不创建远端测试数据。')}
        </p>
        {detection.result && !detection.running && (
          <p className="scope-note">
            {detection.result.checks.every((item) =>
              ['passed', 'not_required'].includes(item.status),
            )
              ? t('模拟检测完成，当前配置已就绪。')
              : detection.result.status === 'connected'
                ? t('可以读取；请处理映射或权限问题后再回写。')
                : t('连接未就绪；请调整配置或演示场景后重试。')}
          </p>
        )}
      </div>
      <footer className="modal-actions">
        <button className="quiet" onClick={configure}>
          {t('调整配置')}
        </button>
        <button
          className="primary"
          disabled={detection.running}
          onClick={() =>
            detection.run(connector, () =>
              ctx.act({ type: 'TEST_CONNECTOR', connectorId: connector.id, outcome: 'connected' }),
            )
          }
        >
          {detection.running ? t('检测中…') : detection.result ? t('重新检测') : t('开始模拟检测')}
        </button>
      </footer>
    </Modal>
  );
}
function MappingSummary({ connector }) {
  const { PROGRESS_STATES, remoteStatuses } = useWorkbenchRuntime().services;
  const { t } = useI18n();
  return (
    <div className="mapping-summary">
      {connector.projects.map((project) => (
        <div key={project}>
          <strong>{project}</strong>
          <span>
            {PROGRESS_STATES.map(
              (state) =>
                `${t(state.label)} → ${remoteStatuses(connector.edition, connector.workItemType).find((item) => item.id === connector.statusMappings?.[project]?.[state.id])?.name || t('未映射')}`,
            ).join('　·　')}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ConnectorForm({ ctx, connector, initialDraft, close, onSaved }) {
  const {
    projectFixtures,
    mappingIssues,
    EDITIONS,
    DEFAULT_ENDPOINT,
    MOCK_ACCESS,
    WORK_ITEM_TYPES,
    suggestedMappings,
    PROGRESS_STATES,
    remoteStatuses,
  } = useWorkbenchRuntime().services;
  const { t } = useI18n();
  const [step, setStep] = useState(0),
    [error, setError] = useState('');
  const [draft, setDraft] = useState(() =>
    connector
      ? structuredClone(connector)
      : initialDraft
        ? structuredClone(initialDraft)
        : {
            setupSource: { kind: 'manual' },
            name: '',
            edition: 'center',
            organizationId: '',
            organizationName: '',
            endpoint: '',
            principal: 'demo.member',
            projects: ['成员中心'],
            workItemType: 'requirement',
            syncMode: 'read_only',
            mockAccess: 'full',
            mockCli: 'ready',
            statusMappings: {},
          },
  );
  const detection = useMockCheck();
  const counts = connector
    ? sourceCounts(ctx.model, connector.id)
    : { tasks: 0, documents: 0, sessions: 0, branches: 0 };
  const identityLocked = Boolean(connector && Object.values(counts).some(Boolean));
  const update = (fields) => {
    setDraft((previous) => ({ ...previous, ...fields }));
    detection.reset();
    setError('');
  };
  const ready = detection.result?.status === 'connected' && !detection.running;
  const projects = [...new Set([...projectFixtures(draft.edition), ...draft.projects])];
  const issues = mappingIssues(draft);
  function save() {
    setError('');
    if (!connector?.legacy && draft.syncMode === 'bidirectional' && issues.length) {
      setError(issues[0]);
      return;
    }
    const fields = connector?.legacy
      ? { name: draft.name }
      : Object.fromEntries(
          [
            'name',
            'edition',
            'organizationId',
            'organizationName',
            'endpoint',
            'principal',
            'projects',
            'workItemType',
            'syncMode',
            'mockAccess',
            'mockCli',
            'statusMappings',
            'setupSource',
          ].map((key) => [key, draft[key]]),
        );
    const next = ctx.act(
      {
        type: connector ? 'UPDATE_CONNECTOR' : 'CREATE_CONNECTOR',
        ...(connector ? { connectorId: connector.id } : {}),
        ...fields,
      },
      '',
      setError,
    );
    if (!next) return;
    if (!connector?.legacy && detection.result && !detection.running)
      ctx.act({
        type: 'TEST_CONNECTOR',
        connectorId: connector?.id || next.connectors.at(-1).id,
        outcome: 'connected',
      });
    ctx.notify('连接配置已保存；来源与历史保持关联');
    (onSaved || close)();
  }
  return (
    <Modal
      title={
        connector?.legacy
          ? t('修改历史来源名称')
          : connector
            ? t('配置云效连接')
            : initialDraft
              ? t('编辑发现的默认配置')
              : t('添加云效连接')
      }
      close={close}
      wide
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setError('');
          if (connector?.legacy || step === 3) save();
          else setStep(step + 1);
        }}
      >
        {!connector?.legacy && (
          <ol className="connector-stepper">
            {steps.map((label, index) => (
              <li
                key={label}
                className={step === index ? 'current' : step > index ? 'complete' : ''}
                aria-current={step === index ? 'step' : undefined}
              >
                <span>{step > index ? <Check size={13} /> : index + 1}</span>
                {t(label)}
              </li>
            ))}
          </ol>
        )}
        <div className="modal-body connector-form wizard-body">
          {!connector && draft.setupSource?.kind === 'discovered' && (
            <div className="discovered-draft-note">
              <TerminalWindow size={18} />
              <span>
                {t('已从本机配置生成默认草稿')}
                <small>
                  {t('{source} · 字段可修改；保存并检测后才成为可用连接。', {
                    source: t(draft.setupSource.label),
                  })}
                </small>
              </span>
            </div>
          )}
          {error && (
            <p className="scope-note" role="alert">
              {t(error)}
            </p>
          )}
          {(connector?.legacy || step === 0) && (
            <>
              <div className="wizard-section-title">
                <span className="eyebrow">{t('为工作找到归处')}</span>
                <h3>{t('先给这个来源一个名字。')}</h3>
                <p>{t('同一个平台，可以有不同的组织、账号和连接。')}</p>
              </div>
              <Field
                label={t('连接名称')}
                name="name"
                required
                value={draft.name}
                onChange={(event) => update({ name: event.target.value })}
                placeholder={t('例如：云效 · 产品团队')}
              />
              {!connector?.legacy && (
                <>
                  <div className="edition-switch" role="group" aria-label={t('云效组织版本')}>
                    {Object.entries(EDITIONS).map(([edition, label]) => (
                      <button
                        type="button"
                        key={edition}
                        disabled={identityLocked}
                        className={draft.edition === edition ? 'selected' : ''}
                        aria-pressed={draft.edition === edition}
                        onClick={() =>
                          update({
                            edition,
                            organizationId: '',
                            endpoint: '',
                            projects: projectFixtures(edition).slice(0, 1),
                            statusMappings: {},
                          })
                        }
                      >
                        <Cloud size={19} />
                        <strong>{t(label)}</strong>
                        <small>
                          {edition === 'center'
                            ? t('统一接入点 · 使用组织 ID')
                            : t('独立实例 · 使用实例地址')}
                        </small>
                        {draft.edition === edition && <CheckCircle size={16} />}
                      </button>
                    ))}
                  </div>
                  <div className="form-row">
                    <Field
                      label={draft.edition === 'center' ? t('组织 ID') : t('实例地址')}
                      name="identity"
                      required
                      type={draft.edition === 'center' ? 'text' : 'url'}
                      readOnly={identityLocked}
                      value={draft.edition === 'center' ? draft.organizationId : draft.endpoint}
                      onChange={(event) =>
                        update({
                          [draft.edition === 'center' ? 'organizationId' : 'endpoint']:
                            event.target.value,
                        })
                      }
                      placeholder={
                        draft.edition === 'center'
                          ? t('例如：demo-team')
                          : 'https://demo-region.example.test'
                      }
                    />
                    <Field
                      label={t('组织显示名称（可选）')}
                      value={draft.organizationName}
                      onChange={(event) => update({ organizationName: event.target.value })}
                      placeholder={t('例如：产品团队')}
                    />
                  </div>
                  {draft.edition === 'center' && (
                    <p className="inline-hint">
                      {t('服务地址使用 {endpoint}，无需配置阿里云 AK/SK。', {
                        endpoint: DEFAULT_ENDPOINT,
                      })}
                    </p>
                  )}
                  <Field
                    label={t('模拟账号')}
                    required
                    readOnly={identityLocked}
                    value={draft.principal}
                    onChange={(event) => update({ principal: event.target.value })}
                  />
                  {identityLocked && (
                    <p className="inline-hint">
                      {t(
                        '该连接已有来源数据，账号、版本、组织与实例身份已固定。切换身份请添加新连接。',
                      )}
                    </p>
                  )}
                  <div className="credential-preview">
                    <Plugs size={19} />
                    <span>
                      {t('个人访问令牌 · 演示凭据')}
                      <small>
                        {t(
                          'Demo 内置模拟 PAT，不输入真实令牌。正式接入时由本地服务管理系统凭据库。',
                        )}
                      </small>
                    </span>
                  </div>
                  <div className="form-row simulation-fields">
                    <label className="field">
                      {t('演示权限')}
                      <Select
                        aria-label={t('演示权限')}
                        value={draft.mockAccess}
                        onChange={(event) => update({ mockAccess: event.target.value })}
                      >
                        {Object.entries(MOCK_ACCESS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {t(label)}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label className="field">
                      {t('CLI 环境')}
                      <Select
                        aria-label={t('CLI 环境')}
                        value={draft.mockCli}
                        onChange={(event) => update({ mockCli: event.target.value })}
                      >
                        <option value="ready">{t('已安装官方 CLI 与插件')}</option>
                        <option value="missing">{t('模拟 CLI 或插件不可用')}</option>
                      </Select>
                    </label>
                  </div>
                </>
              )}
            </>
          )}
          {!connector?.legacy && step === 1 && (
            <>
              <div className="wizard-section-title">
                <span className="eyebrow">{t('逐项确认')}</span>
                <h3>{t('确认这条连接能读到工作。')}</h3>
                <p>{t('CLI 可用、认证成功和项目可读，分别核对。')}</p>
              </div>
              <div className="connection-identity-line">
                <TerminalWindow size={18} />
                <span>{t('官方 CLI · {edition}', { edition: t(EDITIONS[draft.edition]) })}</span>
                <span className="demo-pill">{t('模拟检测')}</span>
              </div>
              <CheckResults detection={detection} connectionOnly />
              <button
                className="secondary check-connection-button"
                type="button"
                disabled={detection.running}
                onClick={() => detection.run(draft)}
              >
                <ArrowClockwise size={16} className={detection.running ? 'spin' : ''} />
                {detection.running
                  ? t('正在模拟检测…')
                  : detection.result
                    ? t('重新检测')
                    : t('开始模拟检测')}
              </button>
              {detection.result && !detection.running && !ready && (
                <div className="scope-note">
                  {t('检测未通过。返回上一步调整演示权限或 CLI 环境，再重新检测。')}
                </div>
              )}
              <p className="footnote">
                {t('没有读取本机 CLI 或云效账号。检测结果仅属于当前演示连接。')}
              </p>
            </>
          )}
          {!connector?.legacy && step === 2 && (
            <>
              <div className="wizard-section-title">
                <span className="eyebrow">{t('选择同步内容')}</span>
                <h3>{t('只同步你关心的工作。')}</h3>
                <p>{t('以下项目和类型来自本地模拟目录。')}</p>
              </div>
              <label className="field">{t('项目范围')}</label>
              <div className="project-selection">
                {projects.map((project) => (
                  <label key={project}>
                    <input
                      type="checkbox"
                      checked={draft.projects.includes(project)}
                      onChange={(event) =>
                        update({
                          projects: event.target.checked
                            ? [...draft.projects, project]
                            : draft.projects.filter((item) => item !== project),
                        })
                      }
                    />
                    <span>
                      <strong>{project}</strong>
                      <small>
                        {t(EDITIONS[draft.edition])} ·{' '}
                        {draft.organizationName || draft.organizationId || t('独立实例')}
                      </small>
                    </span>
                  </label>
                ))}
              </div>
              <label className="field">
                {t('工作项类型')}
                <Select
                  aria-label={t('工作项类型')}
                  value={draft.workItemType}
                  onChange={(event) =>
                    update({ workItemType: event.target.value, statusMappings: {} })
                  }
                >
                  {WORK_ITEM_TYPES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {t(item.label)}
                    </option>
                  ))}
                </Select>
              </label>
              <div className="sync-mode-options">
                {[
                  ['read_only', '仅拉取', '导入来源数据，本地编辑留在 Reed。'],
                  ['bidirectional', '双向同步', '允许回写已配置字段，检测写权限与状态映射。'],
                ].map(([value, label, description]) => (
                  <label key={value} className={draft.syncMode === value ? 'selected' : ''}>
                    <input
                      type="radio"
                      name="syncMode"
                      value={value}
                      checked={draft.syncMode === value}
                      onChange={() => update({ syncMode: value })}
                    />
                    <span>
                      <strong>{t(label)}</strong>
                      <small>{t(description)}</small>
                    </span>
                  </label>
                ))}
              </div>
              <p className="inline-hint">
                {t(
                  '首期演示回写标题和进展状态；需求、设计、开发、验证仍是 Reed 独立的工作流阶段。',
                )}
              </p>
            </>
          )}
          {!connector?.legacy && step === 3 && (
            <>
              <div className="wizard-section-title">
                <span className="eyebrow">{t('不同状态，同一条流')}</span>
                <h3>{t('让两边的状态彼此理解。')}</h3>
                <p>{t('按项目与工作项类型映射；保存准确的云效状态 ID。')}</p>
              </div>
              <div className="mapping-toolbar">
                <span>
                  {t(WORK_ITEM_TYPES.find((item) => item.id === draft.workItemType)?.label)} ·{' '}
                  {draft.syncMode === 'bidirectional' ? t('双向同步') : t('仅拉取')}
                </span>
                <button
                  type="button"
                  className="text-link"
                  onClick={() =>
                    update({
                      statusMappings: suggestedMappings(
                        draft.edition,
                        draft.projects,
                        draft.workItemType,
                      ),
                    })
                  }
                >
                  {t('使用建议映射')}
                </button>
              </div>
              {draft.projects.map((project) => (
                <section className="mapping-project" key={project}>
                  <h4>
                    {project}
                    <small>{t('模拟工作流')}</small>
                  </h4>
                  <div className="mapping-table-heading">
                    <span>{t('Reed 进展')}</span>
                    <span />
                    <span>{t('云效状态')}</span>
                  </div>
                  {PROGRESS_STATES.map((state) => (
                    <div className="mapping-row" key={state.id}>
                      <span>
                        <Circle size={7} weight={state.id === 'done' ? 'fill' : 'regular'} />
                        {t(state.label)}
                      </span>
                      <ArrowRight size={15} />
                      <label>
                        <span className="sr-only">
                          {t('{project} · {state}映射', { project, state: t(state.label) })}
                        </span>
                        <Select
                          aria-label={t('{project} · {state}映射', {
                            project,
                            state: t(state.label),
                          })}
                          value={draft.statusMappings?.[project]?.[state.id] || ''}
                          onChange={(event) =>
                            update({
                              statusMappings: {
                                ...draft.statusMappings,
                                [project]: {
                                  ...draft.statusMappings?.[project],
                                  [state.id]: event.target.value,
                                },
                              },
                            })
                          }
                        >
                          <option value="">{t('选择云效状态')}</option>
                          {remoteStatuses(draft.edition, draft.workItemType).map((remote) => (
                            <option key={remote.id} value={remote.id}>
                              {remote.name}
                            </option>
                          ))}
                        </Select>
                        <small className="mono">
                          {draft.statusMappings?.[project]?.[state.id] || t('未配置')}
                        </small>
                      </label>
                    </div>
                  ))}
                </section>
              ))}
              <div className="mapping-rule">
                <CheckCircle size={18} />
                <span>
                  {t('流程条件始终有效')}
                  <small>
                    {t(
                      '拖到评审中／完成，仍需检查本阶段产出与验收。拉取云效状态只更新来源事实，不自动验收 Reed 阶段。',
                    )}
                  </small>
                </span>
              </div>
              {issues.length > 0 && (
                <p className="inline-hint">
                  {draft.syncMode === 'bidirectional'
                    ? t('还有 {count} 项映射待完善，完成后才能保存双向配置。', {
                        count: issues.length,
                      })
                    : t('仅拉取可保留未映射状态，后续开启回写前需补齐。')}
                </p>
              )}
              <button
                type="button"
                className="secondary check-connection-button"
                disabled={detection.running}
                onClick={() => detection.run(draft)}
              >
                <ArrowClockwise size={16} className={detection.running ? 'spin' : ''} />
                {detection.running ? t('检测中…') : t('检查完整配置')}
              </button>
              {detection.result && <CheckResults detection={detection} />}
              {detection.result &&
                !detection.running &&
                detection.result.checks.some(
                  (item) => item.id === 'write' && item.status === 'failed',
                ) && (
                  <p className="scope-note">
                    {t('可以保存并读取。模拟令牌缺少写权限，回写入口会保持禁用。')}
                  </p>
                )}
            </>
          )}
        </div>
        <footer className="modal-actions wizard-actions">
          <button type="button" className="quiet" onClick={close}>
            {t('取消')}
          </button>
          {!connector?.legacy && step > 0 && (
            <button
              type="button"
              className="quiet"
              disabled={detection.running}
              onClick={() => {
                setStep(step - 1);
                setError('');
              }}
            >
              <CaretLeft size={14} />
              {t('上一步')}
            </button>
          )}
          {!connector?.legacy &&
            step === 1 &&
            detection.result?.status === 'error' &&
            !detection.running && (
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  const next = ctx.act(
                    {
                      type: connector ? 'UPDATE_CONNECTOR' : 'CREATE_CONNECTOR',
                      ...(connector ? { connectorId: connector.id } : {}),
                      ...Object.fromEntries(
                        [
                          'name',
                          'edition',
                          'organizationId',
                          'organizationName',
                          'endpoint',
                          'principal',
                          'projects',
                          'workItemType',
                          'syncMode',
                          'mockAccess',
                          'mockCli',
                          'statusMappings',
                          'setupSource',
                        ].map((key) => [key, draft[key]]),
                      ),
                    },
                    '',
                    setError,
                  );
                  if (next) {
                    ctx.act({
                      type: 'TEST_CONNECTOR',
                      connectorId: connector?.id || next.connectors.at(-1).id,
                      outcome: 'connected',
                    });
                    ctx.notify('已保存未就绪配置，可以稍后继续');
                    (onSaved || close)();
                  }
                }}
              >
                {t('保存待处理配置')}
              </button>
            )}
          <button
            type="submit"
            className="primary"
            disabled={
              detection.running ||
              (!connector?.legacy &&
                ((step === 1 && !ready) ||
                  (step === 2 && !draft.projects.length) ||
                  (step === 3 && !detection.result)))
            }
          >
            {connector?.legacy || step === 3 ? (
              t('保存配置')
            ) : (
              <>
                {step === 1 ? t('选择同步范围') : t('下一步')}
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
