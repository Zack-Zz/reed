import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterOptions, navigateOptions, findTypeaheadIndex, nextTypeahead,
  positionSelectPopup,
} from '../../src/workbench/select-model.js';

const options = [
  { value: 'all', label: '全部来源' },
  { value: 'local', label: '本地 · Reed', description: '当前工作区' },
  { value: 'cloud', label: '云效 · 产品团队', group: '团队来源', description: 'Yunxiao Center' },
  { value: 'old', label: '历史来源', disabled: true },
  { value: 'region', label: '云效 · Region' },
];

test('search matches Chinese, English, metadata and multiple normalized terms', () => {
  assert.deepEqual(filterOptions(options, ' 云效 '), [options[2], options[4]]);
  assert.deepEqual(filterOptions(options, 'ＹＵＮＸＩＡＯ center'), [options[2]]);
  assert.deepEqual(filterOptions(options, '团队来源'), [options[2]]);
  assert.deepEqual(filterOptions(options, '不存在'), []);
  assert.deepEqual(filterOptions(options, ' '), options);
});

test('keyboard navigation skips disabled items, wraps and supports edges', () => {
  assert.equal(navigateOptions(options, 2, 'ArrowDown'), 4);
  assert.equal(navigateOptions(options, 4, 'ArrowDown'), 0);
  assert.equal(navigateOptions(options, 0, 'ArrowUp'), 4);
  assert.equal(navigateOptions(options, -1, 'ArrowUp'), 4);
  assert.equal(navigateOptions(options, 3, 'Home'), 0);
  assert.equal(navigateOptions(options, 1, 'End'), 4);
  assert.equal(navigateOptions([{ disabled: true }], 0, 'ArrowDown'), -1);
  assert.equal(navigateOptions([], -1, 'Home'), -1);
});

test('typeahead cycles matching enabled labels and expires its buffer', () => {
  assert.equal(findTypeaheadIndex(options, '云', 2), 4);
  assert.equal(findTypeaheadIndex(options, '云', 4), 2);
  assert.equal(findTypeaheadIndex(options, '历史', -1), -1);
  assert.equal(findTypeaheadIndex(options, '本地', -1), 1);
  assert.deepEqual(nextTypeahead({ text: 'r', time: 100 }, 'e', 200), { text: 're', time: 200 });
  assert.deepEqual(nextTypeahead({ text: '云', time: 100 }, '云', 200), { text: '云', time: 200 });
  assert.deepEqual(nextTypeahead({ text: 'r', time: 100 }, 'e', 1000), { text: 'e', time: 1000 });
});

test('popup opens below when space allows and flips above near viewport bottom', () => {
  const rect = { left: 100, top: 60, bottom: 100, width: 150 };
  assert.deepEqual(positionSelectPopup(rect, { width: 900, height: 700 }, {
    preferredWidth: 240, preferredHeight: 300,
  }), { left: 100, top: 106, width: 240, maxHeight: 300, placement: 'bottom' });
  assert.deepEqual(positionSelectPopup({ ...rect, top: 600, bottom: 640 }, {
    width: 900, height: 700,
  }, { preferredWidth: 240, preferredHeight: 300 }), {
    left: 100, top: 294, width: 240, maxHeight: 300, placement: 'top',
  });
});

test('popup clamps width and coordinates to visual viewport with constrained height', () => {
  const position = positionSelectPopup({ left: 300, top: 110, bottom: 150, width: 200 }, {
    width: 280, height: 240, offsetLeft: 20, offsetTop: 30,
  }, { preferredWidth: 380, preferredHeight: 400 });
  assert.equal(position.width, 264);
  assert.equal(position.left, 28);
  assert.equal(position.placement, 'bottom');
  assert.equal(position.top, 156);
  assert.equal(position.maxHeight, 106);
});
