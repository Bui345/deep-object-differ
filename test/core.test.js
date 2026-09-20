import test from 'node:test';
import assert from 'node:assert/strict';

import { diffDeep } from '../src/index.js';

test('returns empty array for identical primitives', () => {
  assert.deepEqual(diffDeep(1, 1), []);
  assert.deepEqual(diffDeep('same', 'same'), []);
  assert.deepEqual(diffDeep(null, null), []);
});

test('reports primitive change at root', () => {
  assert.deepEqual(diffDeep(1, 2), [
    { path: [], type: 'change' },
  ]);
});

test('reports type change at root', () => {
  assert.deepEqual(diffDeep(1, '1'), [
    { path: [], type: 'change' },
  ]);
});

test('returns empty array for deeply identical structures', () => {
  const value = {
    a: [1, { b: 'c' }],
    d: { e: null },
  };
  assert.deepEqual(diffDeep(value, structuredClone(value)), []);
});

test('reports added object keys', () => {
  assert.deepEqual(diffDeep({}, { a: 1 }), [
    { path: ['a'], type: 'add' },
  ]);
});

test('reports removed object keys', () => {
  assert.deepEqual(diffDeep({ a: 1 }, {}), [
    { path: ['a'], type: 'remove' },
  ]);
});

test('reports changed nested primitive', () => {
  assert.deepEqual(diffDeep({ a: { b: 1 } }, { a: { b: 2 } }), [
    { path: ['a', 'b'], type: 'change' },
  ]);
});

test('reports added and removed array elements', () => {
  assert.deepEqual(diffDeep([1, 2], [1, 2, 3]), [
    { path: [2], type: 'add' },
  ]);
  assert.deepEqual(diffDeep([1, 2, 3], [1, 2]), [
    { path: [2], type: 'remove' },
  ]);
});

test('reports change inside array element', () => {
  assert.deepEqual(diffDeep([{ a: 1 }], [{ a: 2 }]), [
    { path: [0, 'a'], type: 'change' },
  ]);
});

test('reports array-to-object type change', () => {
  assert.deepEqual(diffDeep([], {}), [
    { path: [], type: 'change' },
  ]);
});

test('treats null and object as different types', () => {
  assert.deepEqual(diffDeep(null, {}), [
    { path: [], type: 'change' },
  ]);
});

test('handles sparse arrays', () => {
  // eslint-disable-next-line no-sparse-arrays
  const sparse = [1, , 3];
  const dense = [1, 2, 3];
  assert.deepEqual(diffDeep(sparse, dense), [
    { path: [1], type: 'add' },
  ]);
  assert.deepEqual(diffDeep(dense, sparse), [
    { path: [1], type: 'remove' },
  ]);
});

test('does not confuse inherited properties with own properties', () => {
  const before = Object.create({ inherited: 1 });
  before.own = 2;
  const after = { own: 2 };

  assert.deepEqual(diffDeep(before, after), []);
});

test('returns changes deterministically in key insertion order', () => {
  const before = { z: 1, a: 1 };
  const after = { z: 2, a: 2 };

  assert.deepEqual(diffDeep(before, after), [
    { path: ['z'], type: 'change' },
    { path: ['a'], type: 'change' },
  ]);
});
