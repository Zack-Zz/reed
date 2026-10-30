import { useWorkbenchRuntime } from './runtime-context.js';
import { useI18n } from './i18n.jsx';
import { Select } from './Select.jsx';
import { documentExportName } from './document-export';
import { LocalTaskDialog } from './LocalTaskDialog';
import { TaskFlowDialogs } from './TaskFlowDialogs';
import { TaskRelationDialog } from './TaskRelationDialog';
import { useEffect, useState } from 'react';
import {
  FileText,
  Folder,
  ChatCircleDots,
  GitBranch,
  Play,
  CaretDown,
  CaretRight,
  Check,
  CheckCircle,
  WarningCircle,
  ArrowClockwise,
  Link,
  Info,
  Plus,
  DownloadSimple,
  PencilSimple,
  Cloud,
} from '@phosphor-icons/react';

import { SourceBadge, OriginDialog } from './SourceBadge.jsx';
import { ConnectorCatalog } from './ConnectorCatalog.jsx';
import { ImportDialog } from './ImportDialog.jsx';
import { SyncDialog } from './SyncDialog.jsx';
import { Modal, Field, Markdown, Status, activity, syncLabel, isBusy, latest } from './ui.jsx';
const Footer = ({ children }) => <footer className="modal-actions">{children}</footer>;

export function Dialogs({ ctx }) {
  const STAGES = ctx.task?.workflow?.stepLabels || [];
  const { t: tr } = useI18n();
  const { modal, setModal, task, model, run, act, openTask, go, download, reset, setStage } = ctx;
  const [drafts, setDrafts] = useState(() => {
    try {
      const cached = JSON.parse(sessionStorage.getItem('reed-form-drafts') || '{}');
      return cached && typeof cached === 'object' && !Array.isArray(cached) ? cached : {};
    } catch {
      return {};
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem('reed-form-drafts', JSON.stringify(drafts));
    } catch {
      /* Keep entered text in the mounted form. */
    }
  }, [drafts]);
  if (!modal) return null;
  if (modal.type.startsWith('relation-')) return <TaskRelationDialog ctx={ctx} />;
  if (modal.type === 'edit-document')
    return (
      <TaskFlowDialogs
        key={`${task.id}:${modal.sourceDocId || ''}`}
        ctx={{ ...ctx, modal: { ...modal, type: 'task-artifact' } }}
      />
    );
  if (modal.type.startsWith('task-') && modal.type !== 'task-context')
    return <TaskFlowDialogs key={`${task.id}:${modal.type}`} ctx={ctx} />;
  if (['create', 'task-context'].includes(modal.type))
    return (
      <LocalTaskDialog
        onManageConfiguration={() => ctx.openConfiguration?.('templates')}
        key={modal.type === 'create' ? 'create-local' : task.id}
        task={modal.type === 'task-context' ? task : undefined}
        model={model}
        initialProject={modal.initialProject || ''}
        act={act}
        close={() => setModal(null)}
        onCreated={openTask}
        notify={ctx.notify}
      />
    );
  const draftKey =
    modal.type === 'edit-title'
      ? `${task.id}:title`
      : `${task.id}:${task.stage}:${modal.type}:${modal.stage ?? ''}:${modal.sourceDocId || ''}`;
  const draft = drafts[draftKey] || {};
  const close = () => setModal(null);
  const doc = task.docs.find((d) => d.id === modal.docId);
  const finish = (outcome) => {
    if (
      run(
        'FINISH_STAGE',
        { outcome },
        outcome === 'review' ? 'task.agent-output-saved' : '模拟结果已记录',
      )
    )
      close();
  };
  const resultOptions = [
    ['review', '完成并生成产出', 'task.agent-result-hint', CheckCircle],
    ['waiting', '等待补充信息', '进入需要答复状态，保留执行占用', ChatCircleDots],
    ['failed', '检查未通过', '保留报告，可以返工或重新验证', WarningCircle],
    ['unknown', '连接中断，结果未知', '保留执行归属，先核查再决定下一步', Info],
  ];
  if (['edit-title', 'feedback', 'reopen'].includes(modal.type)) {
    const names = {
      'edit-title': '编辑任务',
      feedback: '把修改意见交给下一轮',
      reopen: '重新开启阶段',
    };
    return (
      <Modal title={tr(names[modal.type])} close={close}>
        <form
          key={draftKey}
          onInput={(e) => {
            const values = Object.fromEntries(new FormData(e.currentTarget));
            setDrafts((old) => ({ ...old, [draftKey]: values }));
          }}
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            let next;
            if (modal.type === 'edit-title')
              next = run('UPDATE_TASK', { title: f.get('title') }, '已保存到本地');
            if (modal.type === 'feedback')
              next = run(
                'REQUEST_CHANGES',
                { feedback: f.get('body') },
                '已记录反馈，原文与历史保留',
              );
            if (modal.type === 'reopen') {
              next = run(
                'REOPEN_STAGE',
                { stage: modal.stage, reason: f.get('body') },
                '已进入新的返工轮次',
              );
              if (next) setStage(modal.stage);
            }
            if (next) {
              setDrafts((old) => {
                const copy = { ...old };
                delete copy[draftKey];
                return copy;
              });
              close();
            }
          }}
        >
          <div className="modal-body">
            {modal.type === 'edit-title' && (
              <Field
                label={tr('任务标题')}
                name="title"
                defaultValue={draft.title ?? task.title}
                required
                autoFocus
              />
            )}
            {modal.type === 'feedback' && (
              <>
                <p className="muted">
                  {tr('引用当前{p0}阶段产出。保存意见不会覆盖原文，也不会自动发送指令。', {
                    p0: tr(task.workflow ? STAGES[task.stage] : 'task.processing'),
                  })}
                </p>
                <label className="field">
                  {tr('需要调整的内容')}
                  <textarea
                    name="body"
                    defaultValue={draft.body || ''}
                    rows={5}
                    required
                    autoFocus
                    placeholder={tr('写下具体问题与期待的调整。')}
                  />
                </label>
              </>
            )}
            {modal.type === 'reopen' && (
              <>
                <p>
                  {tr('从「{p0}」重新推进，相关下游阶段需要再次验收；原文档、会话与工作区保留。', {
                    p0: tr(STAGES[modal.stage]),
                  })}
                </p>
                <label className="field">
                  {tr('返工原因')}
                  <textarea
                    name="body"
                    defaultValue={draft.body || ''}
                    rows={4}
                    required
                    autoFocus
                    placeholder={tr('说明范围或设计发生了什么变化。')}
                  />
                </label>
              </>
            )}
          </div>
          <Footer>
            <button type="button" className="quiet" onClick={close}>
              {tr('取消')}
            </button>
            <button type="submit" className="primary">
              {modal.type === 'reopen' ? tr('确认返工') : tr('保存')}
            </button>
          </Footer>
        </form>
      </Modal>
    );
  }
  if (modal.type === 'connector-catalog')
    return (
      <ConnectorCatalog
        key={modal.initialConnectorId || 'catalog'}
        ctx={ctx}
        close={close}
        initialConnectorId={modal.initialConnectorId}
      />
    );
  if (modal.type === 'origin')
    return <OriginDialog ctx={ctx} modal={modal} close={() => setModal(modal.returnTo || null)} />;
  if (modal.type === 'document')
    return (
      <Modal title={doc?.title || tr('文档')} close={close} wide>
        <div className="document-source">
          <span className="source-label">{tr('文档来源')}</span>
          <SourceBadge model={model} entity={doc} open={ctx.showOrigin} />
          <span className="document-task-source">
            <span>{tr('关联任务来源')}</span>
            <SourceBadge model={model} entity={task} open={ctx.showOrigin} />
          </span>
        </div>
        <div className="document-toolbar">
          <Select
            aria-label={tr('文档版本')}
            disabled={modal.readOnly}
            value={doc?.id || ''}
            onChange={(e) => setModal({ ...modal, docId: e.target.value })}
          >
            {task.docs
              .filter((d) => d.title === doc?.title)
              .map((d) => (
                <option value={d.id} key={d.id}>
                  V{d.version}
                  {task.docs.filter((x) => x.title === d.title).at(-1).id === d.id
                    ? tr(' · 最新版本')
                    : tr(' · 历史版本')}
                </option>
              ))}
          </Select>
          <button
            className="quiet small"
            onClick={() => download(documentExportName(doc.title), doc.body, 'text/markdown')}
          >
            <DownloadSimple size={15} />
            {tr('下载文档')}
          </button>
        </div>
        <div className="modal-body document-reader">
          {doc?.stale && (
            <p className="scope-note">
              {tr('历史产出：返工后需要更新版本，再用于本轮评审与验收。')}
            </p>
          )}
          <Markdown body={doc?.body} />
        </div>
        <Footer>
          <button className="quiet" onClick={close}>
            {tr('关闭')}
          </button>
          {!modal.readOnly && (
            <button
              className="secondary"
              disabled={
                isBusy(task) ||
                task.status !== 'in_progress' ||
                task.paused ||
                doc?.stage !== task.stage
              }
              onClick={() =>
                setModal({ type: 'edit-document', kind: doc.kind, sourceDocId: doc.id })
              }
            >
              <PencilSimple size={15} />
              {tr('编辑新版本')}
            </button>
          )}
        </Footer>
      </Modal>
    );
  if (modal.type === 'import') return <ImportDialog ctx={ctx} close={close} />;
  if (modal.type === 'prepare')
    return (
      <Modal
        title={tr('准备{p0}', { p0: tr(task.workflow ? STAGES[task.stage] : 'task.processing') })}
        close={close}
        wide
      >
        <Prepare ctx={ctx} close={close} />
      </Modal>
    );
  if (modal.type === 'execution')
    return (
      <Modal
        title={tr('{p0} · 模拟执行', {
          p0: tr(task.workflow ? STAGES[task.stage] : 'task.processing'),
        })}
        close={close}
      >
        <div className="modal-body">
          <div className="execution-heading">
            <Play size={26} />
            <div>
              <strong>{task.title}</strong>
              <p>
                {model.sessions.find((s) => s.id === task.sessionId)?.host} ·{' '}
                {task.workspace.branch || tr('当前项目上下文')}
              </p>
            </div>
          </div>
          <p className="muted">
            {tr('选择模拟结果，观察工作流如何继续。执行结束后仍需要你验收。')}
          </p>
          <div className="choice-list">
            {resultOptions.map(([outcome, title, note, Icon]) => (
              <button key={outcome} onClick={() => finish(outcome)}>
                <Icon size={22} />
                <span>
                  {tr(title)}
                  <small>{tr(note)}</small>
                </span>
                <CaretRight size={16} />
              </button>
            ))}
          </div>
        </div>
        <Footer>
          <button
            className="quiet"
            onClick={() => {
              if (run('STOP_STAGE', {}, '模拟执行已确认停止')) close();
            }}
          >
            {tr('停止本次执行')}
          </button>
          <button className="secondary" onClick={close}>
            {tr('返回任务')}
          </button>
        </Footer>
      </Modal>
    );
  if (modal.type === 'reconcile')
    return (
      <Modal title={tr('核查当前执行')} close={close}>
        <div className="modal-body">
          <p>{tr('当前结果未知。这里模拟人工核查后取得的准确证据，核查前不会自动重发。')}</p>
          <div className="choice-list">
            {[
              ['review', '已结束，产出可供审阅'],
              ['failed', '已确认失败，保留失败报告'],
              ['running', '仍在执行，继续保留占用'],
            ].map(([outcome, title]) => (
              <button
                key={outcome}
                onClick={() => {
                  if (run('RECONCILE_STAGE', { outcome }, '核查结果已记录')) close();
                }}
              >
                <CheckCircle size={20} />
                <span>{tr(title)}</span>
                <CaretRight size={16} />
              </button>
            ))}
          </div>
        </div>
      </Modal>
    );
  if (modal.type === 'native')
    return (
      <Modal title={tr('原生会话交接预览')} close={close} wide>
        <Native ctx={ctx} close={close} />
      </Modal>
    );
  if (modal.type === 'associations')
    return (
      <Modal title={tr('全部关联内容')} close={close} wide>
        <div className="modal-body">
          <h3>{tr('文档与版本')}</h3>
          <div className="choice-list">
            {task.docs
              .filter((d, i, all) => all.findLastIndex((x) => x.title === d.title) === i)
              .map((d) => (
                <button key={d.id} onClick={() => setModal({ type: 'document', docId: d.id })}>
                  <FileText size={21} />
                  <span>
                    {d.title}
                    <small>
                      {tr(d.kind)}
                      {tr('阶段 · V')}
                      {d.version} ·{' '}
                      <SourceBadge model={model} entity={d} compact interactive={false} />
                    </small>
                  </span>
                  <CaretRight size={15} />
                </button>
              ))}
          </div>
          <h3 className="association-heading">{tr('关联会话')}</h3>
          <div className="choice-list">
            {model.sessions
              .filter((s) => task.sessionIds.includes(s.id))
              .map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    close();
                    go('sessions', task.id, s.id);
                  }}
                >
                  <ChatCircleDots size={21} />
                  <span>
                    {s.title}
                    <small>
                      {tr(activity[s.status])} ·{' '}
                      <SourceBadge model={model} entity={s} compact interactive={false} />
                    </small>
                  </span>
                  <CaretRight size={15} />
                </button>
              ))}
          </div>
          <button className="quiet" onClick={() => setModal({ type: 'link-session' })}>
            <Plus size={15} />
            {tr('关联历史会话')}
          </button>
        </div>
      </Modal>
    );
  if (modal.type === 'link-session')
    return (
      <Modal title={tr('关联已有讨论')} close={close}>
        <div className="modal-body">
          <p className="muted">
            {tr('关联到「{p0}」作为历史资源，不改变当前执行归属。', { p0: task.title })}
          </p>
          <div className="choice-list">
            {model.sessions.map((s) => (
              <button
                key={s.id}
                disabled={task.sessionIds.includes(s.id)}
                onClick={() => {
                  if (run('LINK_SESSION', { sessionId: s.id }, '历史会话已关联')) close();
                }}
              >
                <ChatCircleDots size={20} />
                <span>
                  {s.title}
                  <small>
                    {s.host} · {task.sessionIds.includes(s.id) ? tr('已关联') : tr('仅历史引用')}
                  </small>
                </span>
                {task.sessionIds.includes(s.id) ? <Check size={16} /> : <Plus size={16} />}
              </button>
            ))}
          </div>
        </div>
      </Modal>
    );
  if (modal.type === 'workspace') {
    const branch = model.branches.find((b) => b.id === modal.branchId);
    return (
      <Modal title={tr('隔离工作区')} close={close}>
        <div className="modal-body">
          <div className="workspace-large">
            <Folder size={35} weight="light" />
            <h3>{branch?.repo}</h3>
            <code>{branch?.path}</code>
          </div>
          <dl>
            <dt>{tr('数据来源')}</dt>
            <dd>
              <SourceBadge model={model} entity={branch} open={ctx.showOrigin} />
            </dd>
            <dt>{tr('分支')}</dt>
            <dd>{branch?.name}</dd>
            <dt>{tr('状态')}</dt>
            <dd>{branch?.status === 'busy' ? tr('会话使用中') : tr('已准备')}</dd>
            <dt>{tr('模拟文件')}</dt>
            <dd>src/ · tests/ · docs/ · package.json</dd>
          </dl>
          <p className="footnote">
            {tr('这是演示路径，预览不会创建真实 worktree 或执行 checkout。')}
          </p>
        </div>
        <Footer>
          <button className="secondary" onClick={close}>
            {tr('返回分支')}
          </button>
        </Footer>
      </Modal>
    );
  }
  if (modal.type === 'timeline')
    return (
      <Modal title={tr('任务活动')} close={close}>
        <div className="modal-body timeline">
          <div className="activity-source">
            <span>{tr('关联任务来源')}</span>
            <SourceBadge model={model} entity={task} open={ctx.showOrigin} />
          </div>
          {model.events
            .filter((e) => e.taskId === task.id)
            .toReversed()
            .map((e) => (
              <div key={e.id}>
                <CheckCircle size={17} />
                <span>
                  {tr(e.text)}
                  <small>
                    {tr(e.time)} ·{' '}
                    <SourceBadge model={model} entity={e} compact open={ctx.showOrigin} />
                  </small>
                </span>
              </div>
            ))}
        </div>
      </Modal>
    );
  if (modal.type === 'sync') return <SyncDialog ctx={ctx} close={close} />;
  if (modal.type === 'legacy-restore')
    return (
      <Modal title={tr('恢复旧演示存档')} close={close}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            if (
              run(
                'RESTORE_TASK',
                { restoreStatus: f.get('status'), reason: f.get('reason') },
                '已记录人工恢复选择',
              )
            )
              close();
          }}
        >
          <div className="modal-body">
            <p className="muted">
              {tr('此演示存档未记录归档前状态。任务和历史不会丢失，请明确选择恢复到哪里。')}
            </p>
            <label className="field">
              {tr('恢复状态')}
              <Select aria-label={tr('恢复状态')} name="status" required defaultValue="">
                <option value="" disabled>
                  {tr('选择希望恢复的状态')}
                </option>
                <option value="active">{tr('进行中')}</option>
                <option value="paused">{tr('暂停中')}</option>
                <option value="completed" disabled={!task.accepted.every(Boolean)}>
                  {tr('已完成（四阶段均已验收）')}
                </option>
              </Select>
            </label>
            <Field
              name="reason"
              label={tr('恢复依据')}
              required
              placeholder={tr('说明为何选择该状态')}
            />
          </div>
          <Footer>
            <button type="button" className="quiet" onClick={close}>
              {tr('保留归档')}
            </button>
            <button type="submit" className="primary">
              {tr('记录并恢复')}
            </button>
          </Footer>
        </form>
      </Modal>
    );
  if (modal.type === 'about')
    return (
      <Modal title={tr('关于 Reed')} close={close}>
        <div className="modal-body about">
          <div className="about-brand">
            <img src="/assets/reed-wordmark.png" alt="Reed" />
          </div>
          <h3>Many agents. One flow.</h3>
          <p>{tr('让需求、讨论、代码与验证，成为一条有来有回的工作流。')}</p>
          <div className="notice subtle">
            <Info size={19} />
            <span>
              {tr('前端交互预览')}
              <small>
                {tr('数据保存在当前浏览器。Agent、目录及云效操作均为模拟，不连接真实外部服务。')}
              </small>
            </span>
          </div>
        </div>
        <Footer>
          <button
            className="quiet"
            onClick={() =>
              download('reed-demo-backup.json', JSON.stringify(model, null, 2), 'application/json')
            }
          >
            {tr('导出演示数据')}
          </button>
          <button className="secondary" onClick={() => setModal({ type: 'reset' })}>
            {tr('重置演示')}
          </button>
        </Footer>
      </Modal>
    );
  if (modal.type === 'reset')
    return (
      <Modal title={tr('恢复演示样例？')} close={close}>
        <div className="modal-body">
          <p>
            {tr(
              '将替换当前浏览器的演示任务与进度，不影响真实代码、会话或云效数据。可先在关于页导出演示数据。',
            )}
          </p>
        </div>
        <Footer>
          <button className="quiet" onClick={close}>
            {tr('取消')}
          </button>
          <button className="primary" onClick={reset}>
            {tr('恢复样例')}
          </button>
        </Footer>
      </Modal>
    );
  return null;
}

function Prepare({ ctx, close }) {
  const STAGES = ctx.task?.workflow?.stepLabels || [];
  const { t: tr } = useI18n();
  const { task, model, run, setModal } = ctx;
  const [host, setHost] = useState('Codex'),
    [preview, setPreview] = useState(false);
  const session = model.sessions.find(
    (s) => s.id === task.sessionId && s.stage === task.stage && s.verified,
  );
  const needsWorkspace = useWorkbenchRuntime().services.needsCodeWorkspace(task),
    ready = session && (!needsWorkspace || (task.workspace.ready && task.workspace.verified));
  return (
    <>
      <div className="modal-body preparation">
        <p className="muted">
          {task.title} · {tr(task.workflow ? STAGES[task.stage] : 'task.processing')}
        </p>
        <div className="input-summary">
          <FileText size={19} />
          <span>
            {tr('输入材料')}
            <small>
              {task.docs.length
                ? [...new Map(task.docs.map((d) => [d.title, d])).values()]
                    .map((d) => `${d.title} V${d.version}`)
                    .join(' · ')
                : tr('任务目标与验收条件')}
            </small>
          </span>
        </div>
        {needsWorkspace && !task.repo?.trim() && (
          <p className="scope-note">
            {tr('请先关联仓库，再准备隔离工作区。')}
            <button className="text-link" onClick={() => setModal({ type: 'task-context' })}>
              {tr('完善任务信息')}
            </button>
          </p>
        )}
        {needsWorkspace && (
          <section>
            <h3>
              <span>1</span>
              {tr('准备隔离工作区')}
              {task.workspace.ready && <CheckCircle size={18} weight="fill" />}
            </h3>
            <dl>
              <dt>{tr('代码仓库')}</dt>
              <dd>{task.repo || tr('未关联仓库')}</dd>
              <dt>{tr('基线分支')}</dt>
              <dd>main</dd>
              <dt>{tr('任务分支')}</dt>
              <dd>{task.workspace.branch || tr('准备后生成任务专属分支')}</dd>
              <dt>{tr('工作区目录')}</dt>
              <dd>{task.workspace.path || tr('尚未创建')}</dd>
            </dl>
            {!task.workspace.ready && (
              <button
                className="secondary"
                disabled={!task.repo?.trim()}
                onClick={() => run('PREPARE_WORKSPACE')}
              >
                <Folder size={16} />
                {tr('准备隔离工作区')}
              </button>
            )}
          </section>
        )}
        <section>
          <h3>
            <span>{needsWorkspace ? '2' : '1'}</span>
            {tr('接入{stage}会话', {
              stage: tr(task.workflow ? STAGES[task.stage] : 'task.processing'),
            })}
            {ready && <CheckCircle size={18} weight="fill" />}
          </h3>
          <div className="form-row">
            <label className="field">
              {tr('宿主')}
              <Select
                aria-label={tr('执行宿主')}
                value={host}
                onChange={(e) => setHost(e.target.value)}
              >
                {['Codex', 'Claude Code', 'ZCode', 'DSH'].map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </Select>
            </label>
            <Field
              label={tr('当前接入')}
              readOnly
              value={
                session ? tr('{host} · 已核对当前阶段', { host: session.host }) : tr('尚未接入')
              }
            />
          </div>
          <button
            className="secondary"
            disabled={needsWorkspace && !task.workspace.ready}
            onClick={() => run('BIND_SESSION', { host })}
          >
            <Link size={16} />
            {session ? tr('重新接入模拟会话') : tr('接入会话并核对目录')}
          </button>
          <p className={`inline-hint ${ready ? 'success' : ''}`}>
            <Info size={16} />
            {ready
              ? tr('会话、仓库与执行位置已在演示中核对。')
              : needsWorkspace && !task.workspace.ready
                ? tr('先准备工作区，再接入目标目录会话。')
                : tr('等待准确会话接入，阶段指令尚未发送。')}
          </p>
        </section>
        <button
          className="quiet small"
          aria-expanded={preview}
          onClick={() => setPreview(!preview)}
        >
          <CaretDown size={14} />
          {tr('输入预览')}
        </button>
        {preview && (
          <pre className="prompt-preview">
            {tr(
              '阶段：{p0}\n任务：{p1}\n范围：只处理本任务及其验收条件。\n工作区：{p2}\n请记录产出与检查结果，完成后等待人工验收。',
              {
                p0: tr(task.workflow ? STAGES[task.stage] : 'task.processing'),
                p1: task.title,
                p2: task.workspace.path || tr('当前项目上下文'),
              },
            )}
          </pre>
        )}
        <p className="footnote">
          {tr('宿主、会话和目录接入均为本地模拟，不会启动真实 Agent 或创建 worktree。')}
        </p>
      </div>
      <Footer>
        <button className="quiet" onClick={close}>
          {tr('保存准备，稍后继续')}
        </button>
        <button
          className="primary"
          disabled={
            !ready || task.attention !== 'idle' || task.status !== 'in_progress' || task.paused
          }
          onClick={() => {
            if (run('START_STAGE', {}, '已提交模拟执行')) setModal({ type: 'execution' });
          }}
        >
          <Play size={15} />
          {tr('开始{stage}', { stage: tr(task.workflow ? STAGES[task.stage] : 'task.processing') })}
        </button>
      </Footer>
    </>
  );
}
function Native({ ctx, close }) {
  const STAGES = ctx.task?.workflow?.stepLabels || [];
  const { t: tr } = useI18n();
  const { modal, model, act, setModal } = ctx;
  const replyKey = `reed-reply:${modal.sessionId}`;
  const [reply, setReply] = useState(() => {
    try {
      return sessionStorage.getItem(replyKey) || '';
    } catch {
      return '';
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem(replyKey, reply);
    } catch {
      /* Current input remains available. */
    }
  }, [reply, replyKey]);
  const session = model.sessions.find((s) => s.id === modal.sessionId),
    task = model.tasks.find((t) => t.id === session?.taskId);
  if (!session || !task)
    return (
      <div className="modal-body">
        <p>{tr('会话暂不可用，历史关联仍然保留。')}</p>
      </div>
    );
  return (
    <>
      <div className="modal-body">
        <div className="native-context">
          <span>
            <SourceBadge model={ctx.model} entity={session} open={ctx.showOrigin} />
            {tr('· 模拟会话')}
          </span>
          <Status value={session.status} />
        </div>
        <div className="conversation">
          <section>
            <small>{tr('任务上下文')}</small>
            <p>{task.title}</p>
            <p className="muted">
              {task.workflow
                ? tr('{p0}阶段 · {p1}', {
                    p0: tr(session.stepName || STAGES[session.stage]),
                    p1: session.branch || tr('当前项目上下文'),
                  })
                : tr('task.processing')}
            </p>
          </section>
          <section className="agent-message">
            <small>{session.host}</small>
            <p>
              {session.status === 'waiting'
                ? task.notes.at(-1) || tr('请确认处理范围、失败策略与补偿边界。')
                : session.status === 'ended'
                  ? tr(
                      task.workflow
                        ? '本次讨论已结束，产出已关联任务。是否通过本阶段仍需要人工验收。'
                        : '执行已结束，产物已关联任务；仍需明确提交并完成任务级验收。',
                    )
                  : tr(
                      task.workflow
                        ? '正在按选定材料处理当前阶段，结果会关联回任务。'
                        : '正在按选定材料处理本任务，结果会关联回任务。',
                    )}
            </p>
          </section>
        </div>
        {session.status === 'waiting' && (
          <label className="field">
            {tr('补充答复')}
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={3}
              placeholder={tr('补充规则或明确下一步…')}
            />
          </label>
        )}
        <p className="footnote">{tr('体验原生会话交接；不会向真实宿主发送消息。')}</p>
      </div>
      <Footer>
        <button className="quiet" onClick={close}>
          {tr('返回 Reed')}
        </button>
        {session.status === 'waiting' && (
          <button
            className="primary"
            disabled={!reply.trim()}
            onClick={() => {
              if (act({ type: 'RESUME_STAGE', taskId: task.id, reply }, '答复已用于模拟继续执行')) {
                setReply('');
                try {
                  sessionStorage.removeItem(replyKey);
                } catch {
                  /* A draft cleanup failure must not hide the accepted operation. */
                }
                setModal({ type: 'execution' });
              }
            }}
          >
            {tr('提交答复并继续')}
          </button>
        )}
        {session.status === 'running' && (
          <button className="primary" onClick={() => setModal({ type: 'execution' })}>
            {tr('查看模拟结果')}
          </button>
        )}
      </Footer>
    </>
  );
}
