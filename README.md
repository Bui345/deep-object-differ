# Deep Object Differ

Deep Object Differ computes a structured diff between two deeply nested values. It returns a flat list of `add`, `remove`, and `change` entries, each with a path array identifying where the difference occurred.

## Usage

```js
import { diffDeep } from 'deep-object-differ';

const before = {
  user: {
    name: 'Ada',
    roles: ['admin', 'editor'],
  },
};

const after = {
  user: {
    name: 'Ada Lovelace',
    roles: ['admin'],
    active: true,
  },
};

console.log(diffDeep(before, after));
// [
//   { path: ['user', 'name'], type: 'change' },
//   { path: ['user', 'roles', 1], type: 'remove' },
//   { path: ['user', 'active'], type: 'add' },
// ]
```

## Why this library exists

Most deep comparison tools answer a yes/no question: are these two values equal? That is useful for tests, but not for explaining what changed. A boolean hides whether a field was added, removed, or edited, and where in the tree that happened.

Deep Object Differ returns a path-keyed change list instead. The output is minimal: when two objects or arrays differ, the diff descends into them and reports only the leaf-level changes. `change` is reserved for primitive values that differ or for a type mismatch at the same path. This makes the result directly usable for patch generation, audit logs, or UI highlighting.

The trade-off is that the result is not a full recursive patch format. It tells you what changed, but not the old and new values. If you need the values themselves, you can look them up in the original inputs using the returned paths.

## Edge cases

- Sparse arrays: a missing index in one array is reported as `add` or `remove` at that index.
- Inherited object properties are ignored; only own enumerable string keys are compared.
- Symbols are not compared. They are rarely part of plain data objects, and supporting them would complicate path serialization without clear benefit.
- `null` and objects are treated as different types, so a transition between them is a `change` at the path where it occurs.

## Performance

The window keeps a bounded buffer, so `push` is constant time and memory does not
grow with the length of the stream. `peak` and `trough` are linear in the window
size, which is the trade that keeps `push` cheap.

## Limitations

Values are coerced to floats, so very large integers lose precision. If you need
exact integer aggregates over a window, this is the wrong tool.

