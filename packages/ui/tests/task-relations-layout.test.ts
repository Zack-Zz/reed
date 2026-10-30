import { describe, expect, it } from 'vitest';
import type { RelationKind } from '../src/workbench/relations-layout';
import {
  getRelationAncestors,
  layoutTaskRelations,
  switchRelationRoot,
} from '../src/workbench/relations-layout';
const task = (id: string) => ({ id, title: id, status: 'todo' });
const relation = (
  fromTaskId: string,
  toTaskId: string,
  kind: RelationKind = 'child',
  active = true,
) => ({
  id: `${fromTaskId}-${toTaskId}`,
  fromTaskId,
  toTaskId,
  kind,
  required: false,
  active,
});
const model = {
  tasks: ['P', 'A', 'B', 'C', 'R', 'D', 'H'].map(task),
  relations: [
    relation('P', 'A'),
    relation('P', 'B'),
    relation('A', 'C'),
    relation('P', 'R', 'related'),
    relation('B', 'D', 'dependency'),
    relation('P', 'H', 'child', false),
  ],
};
describe('task relation tree projection', () => {
  it('lays out only active child links from left to right and centers each parent over its branches', () => {
    const layout = layoutTaskRelations(model, 'P');
    expect(layout.nodes.map((node) => node.task.id).sort()).toEqual(['A', 'B', 'C', 'P']);
    const byId = Object.fromEntries(layout.nodes.map((node) => [node.task.id, node]));
    expect(byId.A.x).toBeGreaterThan(byId.P.x);
    expect(byId.C.x).toBeGreaterThan(byId.A.x);
    expect(byId.P.y).toBe((byId.A.y + byId.B.y) / 2);
    expect(layout.links).toHaveLength(3);
    expect(layout.width).toBeGreaterThan(byId.C.x);
  });
  it('collapses descendants while preserving the branch count', () => {
    const layout = layoutTaskRelations(model, 'P', ['A']);
    expect(layout.nodes.map((node) => node.task.id).sort()).toEqual(['A', 'B', 'P']);
    expect(layout.nodes.find((node) => node.task.id === 'A')?.childCount).toBe(1);
  });
  it('returns the root path in navigation order for a subtree', () => {
    expect(getRelationAncestors(model, 'C').map((item) => item.id)).toEqual(['P', 'A']);
    expect(layoutTaskRelations(model, 'C').nodes.map((node) => node.task.id)).toEqual(['C']);
  });
  it('survives dangling and cyclic historical mock data without hanging or repeating cards', () => {
    const broken = {
      ...model,
      relations: [...model.relations, relation('C', 'P'), relation('P', 'missing')],
    };
    const ids = layoutTaskRelations(broken, 'P').nodes.map((node) => node.task.id);
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(ids.length);
    expect(getRelationAncestors(broken, 'C').length).toBeLessThan(4);
    expect(layoutTaskRelations(model, 'missing').nodes).toEqual([]);
  });
});

it('restores each root viewport while retaining collapsed branches and drawer selection context', () => {
  const initial = {
    rootId: 'P',
    collapsed: ['A'],
    zoom: 0.39,
    pan: { x: -30, y: 48 },
    showRelated: false,
    showDependencies: true,
    selectedId: 'C',
  };
  const child = switchRelationRoot(initial, 'A');
  const panned = { ...child, zoom: 0.58, pan: { x: 81, y: 10 } };
  const parent = switchRelationRoot(panned, 'P');
  expect(parent.zoom).toBe(0.39);
  expect(parent.pan).toEqual(initial.pan);
  expect(parent.collapsed).toEqual(['A']);
  expect(parent.showRelated).toBe(false);
  const back = switchRelationRoot(parent, 'A');
  expect(back.zoom).toBe(0.58);
  expect(back.pan).toEqual(panned.pan);
  expect(switchRelationRoot({ ...back, selectedId: 'C' }, 'A').pan).toEqual(panned.pan);
});
