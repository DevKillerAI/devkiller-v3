# React Pro — react-v4

Implemented 2026-09-16. New generations default to React Pro in Engine code and the MVP adapter. Existing stored revisions keep their original profiles. The running Engine has been reloaded; the MVP process requires a restart to load its changed adapter.

## Added capabilities

- React Hook Form 7.88.0, resolvers 5.9.1, Zod 3.25.76.
- Tailwind 4.3.3 and its Vite plugin, built locally inside the isolated Docker compiler.
- clsx 2.1.1, tailwind-merge 3.7.0, class-variance-authority 0.7.1.
- Local source-component approach using existing Radix primitives. Complete Button and Modal examples in RAG; no claim that the entire shadcn registry is installed.

Image: devkiller-react:4. Setup: Preparar.ps1. Source export includes matching pinned package/lock and Tailwind Vite configuration. Sources remain JavaScript/JSX and CSS inside src/. Generated code cannot install arbitrary dependencies.

R01 and R02 are active in AnythingLLM devkiller-biblioteca and only eligible for react-v4. Compatible previous references remain available; the new generation contract overrides older dependency restrictions. Future-stack research workspace remains separate. Total library: 71 remote documents, 41 local recipes.

## Evidence

- validation/pro-v1/integration.json: real Docker build and browser interaction. Form invalid input, persistence, failed save, source export configuration, Radix focus/Escape, keyboard Select, routing/reload, reduced motion and viewport widths 1440/768/391/320 passed.
- RAG Button and Modal source snippets compiled and interacted with in the browser.
- Legacy react-v3 rejects new imports; unknown packages remain rejected.
- validation/pro-v1/retrieval.json: both new references retrieved using actual AnythingLLM and context integrity validated.
- Compiler, OpenAI transport and project tests passed. Knowledge tests were updated for the two additional catalog documents; all 23 knowledge/selection tests passed afterward.

These checks use authored fixtures. No paid complete app generation was performed, and superior generated design is not yet established. No new fullstack backend, authentication, TanStack Table or Query was activated.

The automatic execution review rejected the combined process termination/restart command without a detailed reason. Engine restarted through its own authenticated shutdown endpoint. MVP adapter changes are on disk and pending process restart; do not describe the running MVP as using react-v4 until that happens.
