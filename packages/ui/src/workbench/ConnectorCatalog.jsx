import { useWorkbenchRuntime } from './runtime-context.js';
import { useI18n } from './i18n.jsx';
import { YunxiaoMark } from './YunxiaoMark.jsx';
import { Select } from './Select.jsx';
import { useEffect, useRef, useState } from 'react';
import {
  PencilSimple,
  MagnifyingGlass,
  CaretRight,
  ArrowLeft,
  ArrowClockwise,
  TerminalWindow,
  CheckCircle,
  WarningCircle,
  SpinnerGap,
  Plugs,
  GearSix,
  ArrowRight,
} from '@phosphor-icons/react';
import { Modal } from './ui.jsx';
import { ConnectorForm } from './ConnectorSettings.jsx';

export function ConnectorCatalog({ ctx, close, initialConnectorId }) {
  const {
    getMockDiscoveryCandidates,
    findMatchingConnector,
    createDiscoveredDraft,
    EDITIONS,
    connectorStatus,
  } = useWorkbenchRuntime().services;
  const { t } = useI18n();
  const initial = ctx.model.connectors.find((item) => item.id === initialConnectorId);
  const [mode, setMode] = useState(initial ? 'form' : 'catalog');
  const [editor, setEditor] = useState(initial ? { connectorId: initial.id } : null);
  const [returnMode, setReturnMode] = useState('catalog');
  const [scenario, setScenario] = useState('found');
  const [discovery, setDiscovery] = useState({ status: 'idle', candidates: [], error: '' });
  const timer = useRef(null),
    entryFocus = useRef(document.activeElement);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (entryFocus.current instanceof HTMLElement && entryFocus.current.isConnected)
        entryFocus.current.focus();
    },
    [],
  );
  const edit = (connectorId, from = 'catalog') => {
    setReturnMode(from);
    setEditor({ connectorId });
    setMode('form');
  };
  const custom = () => {
    setReturnMode('catalog');
    setEditor({ draft: null });
    setMode('form');
  };
  const showCatalog = () => {
    clearTimeout(timer.current);
    setMode('catalog');
    setEditor(null);
  };
  const discover = () => {
    clearTimeout(timer.current);
    setDiscovery({ status: 'running', candidates: [], error: '' });
    timer.current = setTimeout(() => {
      try {
        const candidates = getMockDiscoveryCandidates(scenario);
        setDiscovery({ status: candidates.length ? 'found' : 'empty', candidates, error: '' });
      } catch (error) {
        setDiscovery({ status: 'error', candidates: [], error: error.message });
      }
    }, 650);
  };
  const openCandidate = (candidate) => {
    const existing = findMatchingConnector(candidate, ctx.model.connectors);
    if (existing) {
      edit(existing.id, 'discovery');
      return;
    }
    try {
      const draft = createDiscoveredDraft(candidate, ctx.model.connectors);
      setReturnMode('discovery');
      setEditor({ draft });
      setMode('form');
    } catch (error) {
      ctx.notify(error.message);
    }
  };
  if (mode === 'form')
    return (
      <ConnectorForm
        key={editor?.connectorId || editor?.draft?.setupSource?.candidateId || 'manual'}
        ctx={ctx}
        connector={ctx.model.connectors.find((item) => item.id === editor?.connectorId)}
        initialDraft={editor?.draft}
        close={() => setMode(returnMode)}
        onSaved={showCatalog}
      />
    );

  if (mode === 'discovery')
    return (
      <Modal key="discovery" title={t('发现本机配置')} close={close} wide>
        <div className="modal-body connector-discovery-body">
          <button className="quiet connector-back" onClick={showCatalog}>
            <ArrowLeft size={15} />
            {t('连接器列表')}
          </button>
          <div className="catalog-intro">
            <span className="eyebrow">{t('从已有配置开始')}</span>
            <h3>{t('从已经配置好的地方开始。')}</h3>
            <p>{t('识别云效 CLI 的已有配置，生成默认草稿，再按你的需要编辑。')}</p>
          </div>
          <div className="discovery-scope">
            <TerminalWindow size={20} />
            <span>
              {t('云效官方 CLI 配置')}
              <small>{t('识别组织 ID／实例地址及账号；生成只读默认配置，仍需检测与确认。')}</small>
            </span>
            <span className="demo-pill">{t('模拟发现')}</span>
          </div>
          {discovery.status === 'idle' && (
            <div className="discovery-empty">
              <MagnifyingGlass size={31} weight="light" />
              <h4>{t('查找可用的云效配置')}</h4>
              <p>{t('本 Demo 使用本地样例，不扫描终端环境、配置文件或凭据。')}</p>
              <button className="primary" onClick={discover}>
                {t('开始发现')}
                <ArrowRight size={15} />
              </button>
            </div>
          )}
          {discovery.status === 'running' && (
            <div className="discovery-empty" role="status">
              <SpinnerGap size={28} className="spin" />
              <h4>{t('正在识别已有配置…')}</h4>
              <p>{t('模拟检查 CLI 配置与连接身份。')}</p>
            </div>
          )}
          {discovery.status === 'empty' && (
            <div className="discovery-empty" role="status">
              <MagnifyingGlass size={30} weight="light" />
              <h4>{t('没有发现可用配置')}</h4>
              <p>{t('可以重新发现，或从自定义配置开始。')}</p>
              <div className="actions">
                <button className="secondary" onClick={discover}>
                  {t('重新发现')}
                </button>
                <button className="primary" onClick={custom}>
                  {t('自定义配置')}
                </button>
              </div>
            </div>
          )}
          {discovery.status === 'error' && (
            <div className="discovery-empty" role="alert">
              <WarningCircle size={30} weight="light" />
              <h4>{t('暂时无法发现配置')}</h4>
              <p>{t(discovery.error)}</p>
              <div className="actions">
                <button className="secondary" onClick={discover}>
                  {t('重试')}
                </button>
                <button className="primary" onClick={custom}>
                  {t('自定义配置')}
                </button>
              </div>
            </div>
          )}
          {discovery.status === 'found' && (
            <>
              <div className="discovery-result-heading">
                <span>{t('发现 {count} 个配置候选', { count: discovery.candidates.length })}</span>
                <button className="quiet small" onClick={discover}>
                  <ArrowClockwise size={14} />
                  {t('重新发现')}
                </button>
              </div>
              <div className="discovered-candidates">
                {discovery.candidates.map((candidate) => {
                  const existing = findMatchingConnector(candidate, ctx.model.connectors);
                  return (
                    <article className="discovered-candidate" key={candidate.id}>
                      <header>
                        <div className="connector-symbol">
                          <YunxiaoMark size={31} />
                        </div>
                        <div>
                          <h4>{candidate.name}</h4>
                          <p>
                            {t(EDITIONS[candidate.edition])} · {t(candidate.sourceLabel)}
                          </p>
                        </div>
                        <span
                          className={`discovery-candidate-state ${!candidate.ready ? 'needs-input' : ''}`}
                        >
                          {existing ? (
                            <CheckCircle size={14} />
                          ) : !candidate.ready ? (
                            <WarningCircle size={14} />
                          ) : (
                            <PencilSimple size={14} />
                          )}
                          {existing
                            ? t('已有连接')
                            : candidate.ready
                              ? t('默认草稿已生成')
                              : t('草稿待补充')}
                        </span>
                      </header>
                      <dl>
                        <dt>{candidate.edition === 'region' ? t('实例地址') : t('组织 ID')}</dt>
                        <dd>
                          {candidate.edition === 'region'
                            ? candidate.endpoint
                            : candidate.organizationId || t('未发现，进入后补充')}
                        </dd>
                        <dt>{t('账号')}</dt>
                        <dd>{candidate.principal}</dd>
                        <dt>{t('已识别')}</dt>
                        <dd>{candidate.foundFields.map((field) => t(field)).join(' · ')}</dd>
                      </dl>
                      <footer>
                        <span>
                          {existing
                            ? t('已关联：{name}', { name: existing.name })
                            : t('默认仅拉取 · 可修改 · 尚未保存为连接')}
                        </span>
                        <button className="secondary" onClick={() => openCandidate(candidate)}>
                          {existing ? t('编辑已有连接') : t('查看并编辑')}
                          <CaretRight size={14} />
                        </button>
                      </footer>
                    </article>
                  );
                })}
              </div>
            </>
          )}
          <details className="discovery-scenarios">
            <summary>{t('体验其他发现结果')}</summary>
            <label className="field">
              {t('演示场景')}
              <Select
                aria-label={t('本机发现演示场景')}
                value={scenario}
                disabled={discovery.status === 'running'}
                onChange={(event) => {
                  clearTimeout(timer.current);
                  setScenario(event.target.value);
                  setDiscovery({ status: 'idle', candidates: [], error: '' });
                }}
              >
                <option value="found">{t('找到已有配置')}</option>
                <option value="empty">{t('未发现配置')}</option>
                <option value="unavailable">{t('本地服务不可用')}</option>
              </Select>
            </label>
          </details>
        </div>
        <footer className="modal-actions">
          <span className="catalog-footer-note">
            {t('仅生成草稿；不会自动添加、连接或修改原配置。')}
          </span>
          <button className="quiet" onClick={close}>
            {t('完成')}
          </button>
        </footer>
      </Modal>
    );

  return (
    <Modal key="catalog" title={t('连接器')} close={close} wide>
      <div className="modal-body connector-catalog-body">
        <div className="catalog-intro">
          <span className="eyebrow">{t('汇集你的工作')}</span>
          <h3>{t('选择工作的来处。')}</h3>
          <p>{t('添加新的连接，或继续使用这台电脑上的已有配置。')}</p>
        </div>
        <section className="provider-card" aria-label={t('云效连接器')}>
          <header>
            <div className="provider-symbol">
              <YunxiaoMark size={39} />
            </div>
            <div>
              <h4>{t('云效')}</h4>
              <p>{t('需求、任务与状态同步')}</p>
            </div>
            <span className="provider-driver">{t('官方 CLI')}</span>
          </header>
          <div className="provider-setup-options">
            <button onClick={custom}>
              <PencilSimple size={20} />
              <span>
                <strong>{t('自定义配置')}</strong>
                <small>{t('选择版本，填写组织或实例信息。')}</small>
              </span>
              <CaretRight size={15} />
            </button>
            <button onClick={() => setMode('discovery')}>
              <MagnifyingGlass size={20} />
              <span>
                <strong>{t('发现本机配置')}</strong>
                <small>{t('识别已有配置，生成可编辑草稿。')}</small>
              </span>
              <CaretRight size={15} />
            </button>
          </div>
        </section>
        <div className="catalog-existing-heading">
          <h4>
            {t('已添加的连接')}
            <span>{ctx.model.connectors.length}</span>
          </h4>
          <button className="quiet small" onClick={() => ctx.manageConnectors()}>
            <GearSix size={14} />
            {t('管理全部')}
          </button>
        </div>
        {ctx.model.connectors.length ? (
          <div className="catalog-existing">
            {ctx.model.connectors.map((connector) => (
              <button
                key={connector.id}
                aria-label={t('编辑连接：{name}', { name: connector.name })}
                onClick={() => edit(connector.id)}
              >
                <span className="catalog-existing-icon">
                  <Plugs size={17} />
                </span>
                <span>
                  <strong>{connector.name}</strong>
                  <small>
                    {connector.legacy
                      ? t('历史来源，原身份待确认')
                      : `${t(EDITIONS[connector.edition])} · ${connector.principal}`}
                  </small>
                </span>
                <span className="catalog-existing-status">{connectorStatus(connector, t)}</span>
                <CaretRight size={14} />
              </button>
            ))}
          </div>
        ) : (
          <p className="catalog-no-connections">{t('还没有连接，从云效开始添加。')}</p>
        )}
        <p className="footnote catalog-note">
          {t('本地交互演示。配置发现和连接检测均使用模拟数据。')}
        </p>
      </div>
      <footer className="modal-actions">
        <span className="catalog-footer-note">{t('每个连接独立保存身份、范围和状态映射。')}</span>
        <button className="primary" onClick={close}>
          {t('完成')}
        </button>
      </footer>
    </Modal>
  );
}
