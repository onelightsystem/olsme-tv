---
name: firestore-modular
description: Resolve Firestore API misuse and typing issues using Firebase modular SDK patterns.
---
## When to Use

Use for:
- `collection(...).doc()` style errors
- batch write typing issues
- invalid document reference usage
- Firestore import mismatches

Keywords: firestore, modular sdk, doc collection, writeBatch, addDoc, getDoc, query.

## Workflow

1. Detect Pattern Mismatches
- Find legacy/chained API usage and replace with modular calls.
- Ensure imports map to actual modular functions used.

2. Normalize Writes
- Use `doc(collection(db, 'name'))` for new refs.
- Use fresh `writeBatch(db)` instances per commit cycle.

3. Validate
- Re-run targeted typecheck and lint for changed files.
- Verify no runtime path depends on removed legacy behavior.

## Repo-Specific Notes

- This codebase heavily logs to Firestore (`logs`, `biofeedback_events`, etc.).
- Keep logging payload structure consistent when patching.

## Done Criteria

- No Firestore modular API typing errors.
- Batch and doc reference usage consistent across changed files.
