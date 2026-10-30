import type { Dispatch, SetStateAction } from 'react';
import type { WorkbenchCommand } from './ports';

/** Temporary presentation projection for the mock workbench, not a Core protocol. */
export interface RelationTask {
  id: string;
  title: string;
  status: string;
  taskType?: string;
  project?: string;
  origin?: Record<string, unknown>;
  sessionIds?: string[];
  docs?: { id?: string; title: string }[];
  workflow?: unknown;
  workspace?: { ready?: boolean; branch?: string };
}
export type RelationKind = 'child' | 'related' | 'dependency';
export interface TaskRelation {
  id: string;
  kind: RelationKind;
  fromTaskId: string;
  toTaskId: string;
  required: boolean;
  active?: boolean;
  reason?: string;
  origin?: { kind: string; system: string };
}
export interface RelationsModel {
  tasks: RelationTask[];
  relations?: TaskRelation[];
  sessions?: { id: string; taskId?: string }[];
  branches?: { id?: string; taskId?: string }[];
  connectors?: unknown[];
}
export interface RelationsUi {
  rootId: string | null;
  collapsed: string[];
  zoom: number;
  pan: { x: number; y: number };
  showRelated: boolean;
  showDependencies: boolean;
  selectedId?: string;
  viewports?: Record<string, { zoom: number; pan: { x: number; y: number } }>;
}
export type SetRelationsUi = Dispatch<SetStateAction<RelationsUi>>;
export interface RelationModal {
  type: string;
  taskId?: string;
  relationKind?: RelationKind;
  required?: boolean;
}
export interface RelationsContext {
  model: RelationsModel;
  task?: RelationTask;
  modal?: RelationModal | null;
  openTask: (id: string) => void;
  openRelations: (id: string) => void;
  showRelationExample: () => void;
  setModal: (modal: RelationModal | null) => void;
  act?: (command: WorkbenchCommand, message?: string, onError?: (error: string) => void) => unknown;
}
export const RELATION_CARD_WIDTH = 288;
export const RELATION_CARD_HEIGHT = 178;
const HORIZONTAL_GAP = 82;
const VERTICAL_GAP = 34;
const PADDING = 36;
export interface RelationNode {
  task: RelationTask;
  x: number;
  y: number;
  depth: number;
  childCount: number;
  collapsed: boolean;
  incoming?: TaskRelation;
}
export interface RelationLayout {
  nodes: RelationNode[];
  links: { relation: TaskRelation; from: RelationNode; to: RelationNode }[];
  width: number;
  height: number;
}
function childIndex(model: RelationsModel) {
  const tasks = new Map(model.tasks.map((task) => [task.id, task]));
  const children = new Map<string, TaskRelation[]>();
  const parents = new Map<string, TaskRelation>();
  for (const relation of model.relations || []) {
    if (
      relation.active === false ||
      relation.kind !== 'child' ||
      !tasks.has(relation.fromTaskId) ||
      !tasks.has(relation.toTaskId) ||
      parents.has(relation.toTaskId)
    )
      continue;
    parents.set(relation.toTaskId, relation);
    children.set(relation.fromTaskId, [...(children.get(relation.fromTaskId) || []), relation]);
  }
  return { tasks, children, parents };
}
export function getRelationAncestors(model: RelationsModel, rootId: string): RelationTask[] {
  const { tasks, parents } = childIndex(model);
  const visited = new Set([rootId]);
  const path: RelationTask[] = [];
  let current = rootId;
  while (parents.has(current)) {
    const parentId = parents.get(current)!.fromTaskId;
    if (visited.has(parentId)) break;
    visited.add(parentId);
    path.unshift(tasks.get(parentId)!);
    current = parentId;
  }
  return path;
}
export function layoutTaskRelations(
  model: RelationsModel,
  rootId: string,
  collapsed: string[] = [],
): RelationLayout {
  const { tasks, children } = childIndex(model);
  const root = tasks.get(rootId);
  if (!root) return { nodes: [], links: [], width: 0, height: 0 };
  const closed = new Set(collapsed);
  const visited = new Set<string>();
  const nodes: RelationNode[] = [];
  const stack: { task: RelationTask; depth: number; incoming?: TaskRelation }[] = [
    { task: root, depth: 0 },
  ];
  const visibleChildren = new Map<string, RelationNode[]>();
  while (stack.length) {
    const entry = stack.pop()!;
    if (visited.has(entry.task.id)) continue;
    visited.add(entry.task.id);
    const childLinks = children.get(entry.task.id) || [];
    const node: RelationNode = {
      ...entry,
      x: PADDING + entry.depth * (RELATION_CARD_WIDTH + HORIZONTAL_GAP),
      y: 0,
      childCount: childLinks.length,
      collapsed: closed.has(entry.task.id),
    };
    nodes.push(node);
    if (entry.incoming) {
      const parentId = entry.incoming.fromTaskId;
      visibleChildren.set(parentId, [...(visibleChildren.get(parentId) || []), node]);
    }
    if (!node.collapsed)
      for (const relation of [...childLinks].reverse())
        stack.push({
          task: tasks.get(relation.toTaskId)!,
          depth: entry.depth + 1,
          incoming: relation,
        });
  }
  let leaf = 0;
  for (const node of nodes)
    if (!visibleChildren.has(node.task.id))
      node.y = PADDING + leaf++ * (RELATION_CARD_HEIGHT + VERTICAL_GAP);
  for (const node of [...nodes].reverse()) {
    const branch = visibleChildren.get(node.task.id);
    if (branch?.length) node.y = (branch[0].y + branch.at(-1)!.y) / 2;
  }
  const byId = new Map(nodes.map((node) => [node.task.id, node]));
  return {
    nodes,
    links: nodes
      .filter((node) => node.incoming)
      .map((to) => ({ relation: to.incoming!, from: byId.get(to.incoming!.fromTaskId)!, to })),
    width: Math.max(...nodes.map((node) => node.x)) + RELATION_CARD_WIDTH + PADDING,
    height: Math.max(...nodes.map((node) => node.y)) + RELATION_CARD_HEIGHT + PADDING,
  };
}

// Presentation-only navigation state; never persisted as task business data.
export function switchRelationRoot(previous: RelationsUi, key: string): RelationsUi {
  if (previous.rootId === key) return { ...previous, selectedId: key };
  const viewports = { ...previous.viewports };
  if (previous.rootId)
    viewports[previous.rootId] = { zoom: previous.zoom, pan: { ...previous.pan } };
  const viewport = viewports[key] || { zoom: 0.9, pan: { x: 16, y: 16 } };
  return { ...previous, ...viewport, rootId: key, selectedId: key, viewports };
}
