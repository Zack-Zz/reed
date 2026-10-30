import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import {
  ArrowLeft,
  ArrowsOut,
  CaretDown,
  CaretRight,
  ChatCircleDots,
  FileText,
  GitBranch,
  Minus,
  Plus,
  TreeStructure,
  X,
} from '@phosphor-icons/react';
import { useI18n } from '../i18n.jsx';
import { Select } from '../Select.jsx';
import { SourceBadge } from '../SourceBadge.jsx';
import { Status, taskStatus, taskTypeLabel } from '../ui.jsx';
import {
  getRelationAncestors,
  layoutTaskRelations,
  RELATION_CARD_HEIGHT,
  RELATION_CARD_WIDTH,
} from '../relations-layout';
import type { RelationsContext, RelationsUi, SetRelationsUi } from '../relations-layout';

export function TaskRelationsPage({
  ctx,
  relationsUi: ui,
  setRelationsUi,
}: {
  ctx: RelationsContext;
  relationsUi: RelationsUi;
  setRelationsUi: SetRelationsUi;
}) {
  const { t } = useI18n();
  const { model } = ctx;
  const rootId = model.tasks.some((task) => task.id === ui.rootId)
    ? ui.rootId!
    : ctx.task?.id || model.tasks[0]?.id || '';
  const root = model.tasks.find((task) => task.id === rootId);
  const layout = useMemo(
    () => layoutTaskRelations(model, rootId, ui.collapsed),
    [model, rootId, ui.collapsed],
  );
  const ancestors = useMemo(() => getRelationAncestors(model, rootId), [model, rootId]);
  const [menu, setMenu] = useState<string | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; pan: { x: number; y: number } } | null>(
    null,
  );
  const [dragging, setDragging] = useState(false);
  const zoom = Number.isFinite(ui.zoom) ? Math.min(1.6, Math.max(0.3, ui.zoom)) : 1;
  const visible = new Set(layout.nodes.map((node) => node.task.id));
  const byId = new Map(model.tasks.map((task) => [task.id, task]));
  const auxiliary = (model.relations || []).filter(
    (relation) =>
      relation.active !== false &&
      (relation.kind === 'related'
        ? ui.showRelated
        : relation.kind === 'dependency' && ui.showDependencies) &&
      (visible.has(relation.fromTaskId) || visible.has(relation.toTaskId)) &&
      byId.has(relation.fromTaskId) &&
      byId.has(relation.toTaskId),
  );
  useEffect(() => {
    if (!menu) return;
    const close = (event: globalThis.PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('.relation-node-actions'))
        setMenu(null);
    };
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenu(null);
        viewport.current
          ?.querySelector<HTMLButtonElement>(`[data-menu-for="${CSS.escape(menu)}"]`)
          ?.focus();
      }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [menu]);
  function startHere(id: string) {
    setMenu(null);
    ctx.openRelations(id);
  }
  function fit() {
    const bounds = viewport.current?.getBoundingClientRect();
    if (!bounds || !layout.width || !layout.height) return;
    const nextZoom = Math.max(
      0.3,
      Math.min(1, (bounds.width - 32) / layout.width, (bounds.height - 32) / layout.height),
    );
    setRelationsUi((state) => ({
      ...state,
      zoom: nextZoom,
      pan: {
        x: (bounds.width - layout.width * nextZoom) / 2,
        y: Math.max(12, (bounds.height - layout.height * nextZoom) / 2),
      },
    }));
  }
  function changeZoom(amount: number) {
    const bounds = viewport.current?.getBoundingClientRect();
    setRelationsUi((state) => {
      const previous = Math.max(0.3, Math.min(1.6, state.zoom));
      const next = Math.max(0.3, Math.min(1.6, Math.round((previous + amount) * 100) / 100));
      const center = { x: (bounds?.width || 800) / 2, y: (bounds?.height || 480) / 2 };
      return {
        ...state,
        zoom: next,
        pan: {
          x: center.x - ((center.x - state.pan.x) * next) / previous,
          y: center.y - ((center.y - state.pan.y) * next) / previous,
        },
      };
    });
  }
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    const movement: Record<string, [number, number]> = {
      ArrowLeft: [40, 0],
      ArrowRight: [-40, 0],
      ArrowUp: [0, 40],
      ArrowDown: [0, -40],
    };
    if (movement[event.key]) {
      event.preventDefault();
      const [x, y] = movement[event.key];
      setRelationsUi((state) => ({ ...state, pan: { x: state.pan.x + x, y: state.pan.y + y } }));
    } else if (['+', '=', '-', '0'].includes(event.key)) {
      event.preventDefault();
      if (event.key === '0') fit();
      else changeZoom(event.key === '-' ? -0.1 : 0.1);
    }
  }
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (
      event.button !== 0 ||
      (event.target instanceof Element && event.target.closest('button, input, [data-task-id]'))
    )
      return;
    setMenu(null);
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, pan: ui.pan };
    setDragging(true);
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    setRelationsUi((state) => ({
      ...state,
      pan: { x: start.pan.x + event.clientX - start.x, y: start.pan.y + event.clientY - start.y },
    }));
  }
  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function toggleChildren(id: string) {
    setRelationsUi((state) => ({
      ...state,
      collapsed: state.collapsed.includes(id)
        ? state.collapsed.filter((value) => value !== id)
        : [...state.collapsed, id],
    }));
  }
  function addRelation(id: string, create: boolean, related = false) {
    setMenu(null);
    ctx.setModal({
      type: create ? 'relation-create' : 'relation-link',
      taskId: id,
      relationKind: related ? 'related' : 'child',
    });
  }
  return (
    <section className="page task-relations-page">
      <header className="page-heading">
        <div>
          <h1>{t('relation.title')}</h1>
          <p>{t('relation.subtitle')}</p>
        </div>
        <button
          type="button"
          className="quiet"
          title={t('relation.exampleNote')}
          onClick={ctx.showRelationExample}
        >
          {t('relation.example')}
        </button>
      </header>
      {!root ? (
        <div className="relations-empty">
          <TreeStructure size={34} />
          <h2>{t('relation.noTasks')}</h2>
          <p>{t('relation.noTasksHelp')}</p>
          <button type="button" className="quiet" onClick={ctx.showRelationExample}>
            {t('relation.example')}
          </button>
        </div>
      ) : (
        <>
          <div className="relations-toolbar">
            <label className="relation-root-control">
              <span>{t('relation.root')}</span>
              <Select
                aria-label={t('relation.chooseRoot')}
                value={rootId}
                onChange={(event: { target: { value: string } }) => startHere(event.target.value)}
              >
                {model.tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.id} · {task.title}
                  </option>
                ))}
              </Select>
            </label>
            <div className="relation-view-switches">
              <label>
                <input
                  type="checkbox"
                  checked={ui.showRelated}
                  onChange={(event) =>
                    setRelationsUi((state) => ({ ...state, showRelated: event.target.checked }))
                  }
                />
                {t('relation.showRelated')}
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={ui.showDependencies}
                  onChange={(event) =>
                    setRelationsUi((state) => ({
                      ...state,
                      showDependencies: event.target.checked,
                    }))
                  }
                />
                {t('relation.showDependencies')}
              </label>
            </div>
          </div>
          <nav className="relation-breadcrumbs" aria-label={t('relation.path')}>
            {ancestors.length > 0 && (
              <button
                className="quiet"
                type="button"
                onClick={() => startHere(ancestors.at(-1)!.id)}
              >
                <ArrowLeft size={14} />
                {t('relation.parent')}
              </button>
            )}
            {ancestors.map((task) => (
              <span key={task.id}>
                <button type="button" onClick={() => startHere(task.id)}>
                  {task.title}
                </button>
                <CaretRight size={12} />
              </span>
            ))}
            <strong>{root.title}</strong>
            {ctx.task && ctx.task.id !== rootId && (
              <button
                className="quiet relation-current"
                type="button"
                onClick={() => startHere(ctx.task!.id)}
              >
                {t('relation.current')}
              </button>
            )}
          </nav>
          <div className="relations-frame">
            <div
              ref={viewport}
              className={`relations-viewport${dragging ? ' is-panning' : ''}`}
              tabIndex={0}
              role="region"
              aria-label={t('relation.pan')}
              aria-describedby="relations-pan-help"
              onKeyDown={keyDown}
              onPointerDown={pointerDown}
              onPointerMove={pointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onLostPointerCapture={() => {
                drag.current = null;
                setDragging(false);
              }}
            >
              <div
                className="relations-scene"
                style={{
                  width: layout.width,
                  height: layout.height,
                  transform: `translate(${ui.pan.x}px, ${ui.pan.y}px) scale(${zoom})`,
                }}
              >
                <svg
                  className="relations-lines"
                  width={layout.width}
                  height={layout.height}
                  role="img"
                  aria-label={t('relation.tree')}
                >
                  {layout.links.map(({ relation, from, to }) => {
                    const x1 = from.x + RELATION_CARD_WIDTH;
                    const y1 = from.y + RELATION_CARD_HEIGHT / 2;
                    const x2 = to.x;
                    const y2 = to.y + RELATION_CARD_HEIGHT / 2;
                    return (
                      <path
                        key={relation.id}
                        d={`M ${x1} ${y1} C ${x1 + 41} ${y1}, ${x2 - 41} ${y2}, ${x2} ${y2}`}
                        className={relation.required ? 'is-required' : ''}
                      />
                    );
                  })}
                </svg>
                {layout.nodes.map((node) => {
                  const task = node.task;
                  const sessions = new Set([
                    ...(task.sessionIds || []),
                    ...(model.sessions || [])
                      .filter((session) => session.taskId === task.id)
                      .map((session) => session.id),
                  ]).size;
                  const branches =
                    (model.branches || []).filter((branch) => branch.taskId === task.id).length ||
                    (task.workspace?.ready && task.workspace.branch ? 1 : 0);
                  const documents = new Set((task.docs || []).map((doc) => doc.id || doc.title))
                    .size;
                  return (
                    <article
                      key={task.id}
                      data-task-id={task.id}
                      className={`relation-card${node.depth === 0 ? ' is-root' : ''}${ui.selectedId === task.id ? ' is-selected' : ''}`}
                      style={{
                        left: node.x,
                        top: node.y,
                        width: RELATION_CARD_WIDTH,
                        height: RELATION_CARD_HEIGHT,
                      }}
                    >
                      <div className="relation-card-top">
                        <span className="mono relation-task-id">{task.id}</span>
                        {node.incoming?.required && (
                          <span className="relation-required">{t('relation.required')}</span>
                        )}
                        <div className="relation-node-actions">
                          <button
                            data-menu-for={task.id}
                            className="relation-plus"
                            type="button"
                            aria-label={t('relation.addFor', { title: task.title })}
                            aria-expanded={menu === task.id}
                            onClick={() => setMenu(menu === task.id ? null : task.id)}
                          >
                            {menu === task.id ? <X size={15} /> : <Plus size={15} />}
                          </button>
                          {menu === task.id && (
                            <div
                              className="relation-node-menu"
                              role="group"
                              aria-label={t('relation.actions')}
                            >
                              <button type="button" onClick={() => addRelation(task.id, true)}>
                                <Plus size={14} />
                                {t('relation.addChild')}
                              </button>
                              <button type="button" onClick={() => addRelation(task.id, false)}>
                                <GitBranch size={14} />
                                {t('relation.linkExisting')}
                              </button>
                              <button
                                type="button"
                                onClick={() => addRelation(task.id, true, true)}
                              >
                                {t('relation.addRelated')}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        className="relation-task-title"
                        type="button"
                        aria-label={t('relation.openTask', { title: task.title })}
                        onClick={() => {
                          setRelationsUi((state) => ({ ...state, selectedId: task.id }));
                          ctx.openTask(task.id);
                        }}
                      >
                        {task.title}
                      </button>
                      <div className="relation-card-meta">
                        <span className="relation-type">{taskTypeLabel(task, model, t)}</span>
                        <Status value={task.status} text={taskStatus(task)} />
                        <span
                          className="relation-workflow"
                          title={t(task.workflow ? 'relation.hasWorkflow' : 'relation.noWorkflow')}
                        >
                          {t(task.workflow ? 'relation.hasWorkflow' : 'relation.noWorkflow')}
                        </span>
                      </div>
                      <div className="relation-card-resources">
                        <SourceBadge
                          model={model}
                          entity={task}
                          compact
                          interactive={false}
                          open={undefined}
                        />
                        <span
                          title={t('relation.sessions', { count: sessions })}
                          aria-label={t('relation.sessions', { count: sessions })}
                        >
                          <ChatCircleDots size={12} />
                          {sessions}
                        </span>
                        <span
                          title={t('relation.branches', { count: branches })}
                          aria-label={t('relation.branches', { count: branches })}
                        >
                          <GitBranch size={12} />
                          {branches}
                        </span>
                        <span
                          title={t('relation.documents', { count: documents })}
                          aria-label={t('relation.documents', { count: documents })}
                        >
                          <FileText size={12} />
                          {documents}
                        </span>
                      </div>
                      <footer className="relation-card-footer">
                        <button type="button" onClick={() => startHere(task.id)}>
                          {t('relation.showFromHere')}
                          <CaretRight size={11} />
                        </button>
                        {node.childCount > 0 && (
                          <button
                            className="relation-collapse"
                            type="button"
                            aria-label={t(
                              node.collapsed ? 'relation.expand' : 'relation.collapse',
                              { count: node.childCount },
                            )}
                            aria-expanded={!node.collapsed}
                            onClick={() => toggleChildren(task.id)}
                          >
                            {node.collapsed ? <CaretRight size={12} /> : <CaretDown size={12} />}
                            {node.childCount}
                          </button>
                        )}
                      </footer>
                    </article>
                  );
                })}
              </div>
              {layout.nodes.length === 1 && (
                <div className="relation-first-hint">
                  <strong>{t('relation.singleNode')}</strong>
                  <p>{t('relation.singleNodeHelp')}</p>
                </div>
              )}
            </div>
            <div className="relation-zoom-controls">
              <button type="button" onClick={fit} aria-label={t('relation.fit')}>
                <ArrowsOut size={15} />
                <span>{t('relation.fit')}</span>
              </button>
              <span className="relation-control-divider" />
              <button
                type="button"
                onClick={() => changeZoom(-0.1)}
                aria-label={t('relation.zoomOut')}
                disabled={zoom <= 0.3}
              >
                <Minus size={14} />
              </button>
              <output aria-live="polite">{Math.round(zoom * 100)}%</output>
              <button
                type="button"
                onClick={() => changeZoom(0.1)}
                aria-label={t('relation.zoomIn')}
                disabled={zoom >= 1.6}
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="relation-legend">
              <span>
                <i />
                {t('relation.childLegend')}
              </span>
              <span>
                <i className="dashed" />
                {t('relation.auxiliaryLegend')}
              </span>
            </div>
          </div>
          {(ui.showRelated || ui.showDependencies) && (
            <aside className="relation-auxiliary" aria-label={t('relation.auxiliary')}>
              <h2>
                {t('relation.auxiliary')}
                <span>{auxiliary.length}</span>
              </h2>
              {auxiliary.length ? (
                <div className="relation-auxiliary-list">
                  {auxiliary.map((relation) => (
                    <div className={`relation-aux-row kind-${relation.kind}`} key={relation.id}>
                      <span className="relation-aux-kind">
                        {t(
                          relation.kind === 'dependency'
                            ? relation.required
                              ? 'relation.requiredPrerequisite'
                              : 'relation.optionalPrerequisite'
                            : `relation.${relation.kind}`,
                        )}
                      </span>
                      <div>
                        <div className="relation-aux-tasks">
                          <button type="button" onClick={() => ctx.openTask(relation.fromTaskId)}>
                            {byId.get(relation.fromTaskId)!.title}
                          </button>
                          <span aria-hidden="true">{relation.kind === 'related' ? '↔' : '→'}</span>
                          <button type="button" onClick={() => ctx.openTask(relation.toTaskId)}>
                            {byId.get(relation.toTaskId)!.title}
                          </button>
                          {relation.required && relation.kind === 'dependency' && (
                            <span className="relation-required">{t('relation.required')}</span>
                          )}
                        </div>
                        <p>
                          {t(
                            relation.kind === 'dependency'
                              ? relation.required
                                ? 'relation.requiredDependencyDescription'
                                : 'relation.optionalDependencyDescription'
                              : `relation.${relation.kind}Description`,
                          )}
                          {relation.reason && <span> · {relation.reason}</span>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>{t('relation.noAuxiliary')}</p>
              )}
            </aside>
          )}
          <p className="relation-boundary-note">{t('relation.noAutomation')}</p>
          <p id="relations-pan-help" className="relation-keyboard-help">
            {t('relation.panHelp')}
          </p>
        </>
      )}
    </section>
  );
}
