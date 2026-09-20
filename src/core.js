/**
 * Compute a structured diff between two values.
 *
 * The result is an array of change entries. Each entry has a `path` (an array
 * of keys/indices from the root of the compared values) and a `type`:
 *
 * - `add`: the value exists only in the second argument.
 * - `remove`: the value exists only in the first argument.
 * - `change`: the value exists in both, but the primitive value differs, or
 *   the value type differs.
 *
 * Objects are compared by enumerable own string keys. Arrays are compared by
 * index. A missing array index is reported as `add` or `remove`. When an
 * object key exists in both but the values are structurally different, the
 * diff descends into that value instead of emitting a coarse `change` for the
 * whole subtree.
 *
 * Why not a deep-equality boolean? A boolean hides where the two values
 * diverged. A path-keyed list of changes is directly usable for patch
 * generation, logging, and UI rendering without a second traversal.
 *
 * Why `change` only for primitives or type mismatches? Reporting every
 * descendant edit under a changed object would duplicate the work of walking
 * the tree. Keeping `change` for leaves and type flips keeps the output
 * minimal and deterministic.
 *
 * @param {unknown} before - Original value.
 * @param {unknown} after - New value to compare against.
 * @returns {Array<{path: Array<string | number>, type: 'add' | 'remove' | 'change'}>}
 */
export function diffDeep(before, after) {
  const changes = [];
  walk(before, after, [], changes);
  return changes;
}

/**
 * @param {unknown} before
 * @param {unknown} after
 * @param {Array<string | number>} path
 * @param {Array<{path: Array<string | number>, type: 'add' | 'remove' | 'change'}>} changes
 */
function walk(before, after, path, changes) {
  if (Object.is(before, after)) {
    return;
  }

  const beforeType = getType(before);
  const afterType = getType(after);

  if (beforeType !== afterType) {
    changes.push({ path: [...path], type: 'change' });
    return;
  }

  switch (beforeType) {
    case 'array':
      diffArray(/** @type {Array<unknown>} */ (before), /** @type {Array<unknown>} */ (after), path, changes);
      break;
    case 'object':
      diffObject(/** @type {Record<string, unknown>} */ (before), /** @type {Record<string, unknown>} */ (after), path, changes);
      break;
    default:
      // Both are primitives of the same type but not Object.is-equal.
      changes.push({ path: [...path], type: 'change' });
      break;
  }
}

/**
 * @param {unknown} value
 * @returns {'array' | 'object' | 'primitive'}
 */
function getType(value) {
  if (Array.isArray(value)) {
    return 'array';
  }
  if (value !== null && typeof value === 'object') {
    return 'object';
  }
  return 'primitive';
}

/**
 * Compare array elements index by index.
 *
 * Arrays can have explicit holes (sparse arrays). A hole in one array but not
 * the other is treated as an `add` or `remove` at that index. Iterating over
 * the union of indices ensures sparse arrays are handled without treating
 * holes as `undefined` values.
 *
 * @param {Array<unknown>} before
 * @param {Array<unknown>} after
 * @param {Array<string | number>} path
 * @param {Array<{path: Array<string | number>, type: 'add' | 'remove' | 'change'}>} changes
 */
function diffArray(before, after, path, changes) {
  const maxLength = Math.max(before.length, after.length);
  for (let index = 0; index < maxLength; index += 1) {
    const beforeHasIndex = index in before;
    const afterHasIndex = index in after;

    if (!beforeHasIndex && afterHasIndex) {
      changes.push({ path: [...path, index], type: 'add' });
    } else if (beforeHasIndex && !afterHasIndex) {
      changes.push({ path: [...path, index], type: 'remove' });
    } else {
      walk(before[index], after[index], [...path, index], changes);
    }
  }
}

/**
 * Compare objects by the union of their own enumerable string keys.
 *
 * Using only own enumerable string keys keeps the comparison deterministic
 * and avoids surprising differences from prototype chains. Symbols are
 * ignored: they are rarely part of plain data objects, and supporting them
 * would complicate path serialization without clear benefit.
 *
 * @param {Record<string, unknown>} before
 * @param {Record<string, unknown>} after
 * @param {Array<string | number>} path
 * @param {Array<{path: Array<string | number>, type: 'add' | 'remove' | 'change'}>} changes
 */
function diffObject(before, after, path, changes) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    const beforeHasKey = Object.prototype.hasOwnProperty.call(before, key);
    const afterHasKey = Object.prototype.hasOwnProperty.call(after, key);

    if (!beforeHasKey && afterHasKey) {
      changes.push({ path: [...path, key], type: 'add' });
    } else if (beforeHasKey && !afterHasKey) {
      changes.push({ path: [...path, key], type: 'remove' });
    } else {
      walk(before[key], after[key], [...path, key], changes);
    }
  }
}
