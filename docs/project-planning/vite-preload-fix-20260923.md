# Vite preload-helper compiler correction — 2026-09-23

Cause: the frontend import guard treated Vite's injected null-prefixed preload-helper runtime as an application dependency and rejected valid lazy imports.
Fix: allow only the exact internal ID \0vite/preload-helper.js to resolve through Vite. Unknown virtual modules, build-time tools, external imports, traversal and frontend-to-server imports remain rejected.
Files: compiler/import-policy.mjs, compiler/compile-extended.mjs, compiler/Dockerfile.extended, tests/compiler-import-policy.test.mjs.
Validation: 5 focused tests passed. Rebuilt devkiller-react:5 and recompiled saved Devikille Suite version 1 successfully. Browser shows the page and rendered 3D scene.
Project: 8ddaf15e-bffa-4136-af43-9306f06ffbd5; worker 53844.
Preview: http://127.0.0.1:63692/
No generated source edits and no model calls were made.
Rollback source: checkpoints/vite-preload-20260923. Restore compile-extended.mjs and Dockerfile.extended into devkiller-executor/compiler. Runtime rollback: docker tag devkiller-react:5-before-preload-20260923 devkiller-react:5.
