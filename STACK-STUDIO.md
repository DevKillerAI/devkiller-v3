# React Studio — DevKiller Engine 0.13

Released locally on 14 September 2026. New generation requests default to `react-v3`. Existing projects retain their recorded profile and exported dependencies.

## What this adds

| Capability | Installed dependency | Intended use |
| --- | --- | --- |
| Accessible controls | radix-ui 1.6.7 | Dialogs, selects, menus, tabs and tooltips with authored CSS |
| Motion | motion 13.3.0 | State transitions and deliberate microinteractions; reduced-motion support |
| Multiple screens | react-router-dom 7.18.3 | HashRouter navigation compatible with static previews and reload |
| Existing graphics | lucide-react 1.45.0, recharts 3.10.1 | Consistent icons and data-driven charts |

React 19.3.0 and Vite 8.3.0 remain pinned. The compiler installs dependencies during setup, never during an AI request. Source files, scaffold, dependency manifest and lockfile are saved with each version and available through the existing project/source interface. New imports are permitted only in v3; arbitrary packages remain rejected.

The Studio build has a 1,024 MB memory ceiling, one CPU and 60 seconds. Earlier profiles retain 512 MB. The full Studio fixture exited with code 137 under 512 MB; it compiled under 1,024 MB. No-network builds, non-root execution and read-only container filesystem remain enabled. Preview and generation budgets are unchanged: 128 MB runtime, 30-minute preview, 20,000 output tokens, 180 seconds and one generation call per action. No automatic retry allowance was added.

## Knowledge and error prevention

Seven authored guides, S01–S07, were indexed in AnythingLLM: profile selection/imports, Radix composition and theme, Motion/geometry, routing/shared state, diagnosing errors, varied semantic graphics and responsive visibility. The source manifest now has 60 documents; the alternative local corpus has 30 recipes. Old dependency contracts remain scoped to their earlier profiles. Existing compatible design, persistence and diagnosis guidance is eligible in v3.

The mandatory design brief is `design-v5`. It asks for purpose-specific layouts and palettes, semantically distinct SVG silhouettes, readable control states and real chart values. It specifically warns that `display: contents` does not hide a mobile-only component. Generation guidance also distinguishes a defective QA selector from a real app error: an exact-text assertion for one value must target that value, not its entire parent container. These are prevention instructions, not a new independent visual evaluator or proof that every output will comply.

The library contains authored examples and synthesis grounded in primary sources, rather than entire copied documentation sites:

- [Radix getting started](https://www.radix-ui.com/primitives/docs/overview/getting-started), [Dialog](https://www.radix-ui.com/primitives/docs/components/dialog) and [styling](https://www.radix-ui.com/primitives/docs/guides/styling).
- [Motion reduced motion](https://motion.dev/docs/react-use-reduced-motion).
- [React Router HashRouter](https://reactrouter.com/api/declarative-routers/HashRouter).
- [SVG coordinates](https://www.w3.org/TR/SVG/coords.html).

## Verification

- `npm test`: **89 passed, 0 failed**. Includes legacy compilation, persistent data, process interruption/resume, budgets, RAG integrity and incomplete-request policy on all four profiles.
- `node tools/verify-studio-generation.mjs`: **one browser end-to-end test passed**, using a simulated model response through the real generator UI, v3 compiler, source export, chart rendering, database and preview reopen. No OpenAI generation call.
- `node tools/verify-studio.mjs`: actual isolated v3 build and browser interactions. Dialog focus/Escape; keyboard selection; API → SQLite save and failed-write preservation; routing, deep-link reload and back; reduced-motion preference on page load; portal colors and desktop/mobile visibility at 1440, 768, 391 and 320 pixels. Zero browser exceptions. Confirms exported version pins, rejects unknown imports and verifies v2 rejects the new dependencies. Fixture is authored code, not model output.
- `node tools/verify-studio-retrieval.mjs`: **eight live AnythingLLM searches** retrieved the expected relevant reference, including Portuguese diagnosis and responsive-control queries. Verified saved reference payload reaches simulated generation transport. At most six references and 4,000 tokens; no generation billing. This does not establish aesthetic superiority.
- ROOMLAB version 2 contains a narrow CSS correction. Its original version 1 and database content were hash-checked and preserved. Desktop-only inspection hides mobile controls; at 391 pixels the Library drawer opens and closes. No browser exceptions. No AI regeneration.
- Main Engine restarted successfully with all 60 sources, active AnythingLLM connection and the existing preview restored from its cached build. The polished ROOMLAB version is now open.

Machine-readable reports and screenshots: [validation/studio-v1](validation/studio-v1). Initial failures are meaningful: the memory limit required adjustment; UI checks needed to wait for focus/state changes; motion was verified with the preference set before page load. The Portuguese generic-error query appropriately retrieved existing diagnosis guide DK12, while the new integration-error query retrieved S05. No source ranking was hard-coded to pass these queries.

## Boundaries and next decision

This expands the frontend profile, not arbitrary full-stack generation. Apps still use the Engine's existing HTTP database bridge; authentication, custom backend generation, production multi-tenant hosting and image/document ingestion remain future work. Current development runs on this PC; the intended product and future document processing must operate online without depending on the customer's desktop.

Radix is unstyled, so appearance still depends on generated CSS. More libraries and richer references do not guarantee premium composition. Validate subsequent real generated apps for coherent imagery, varied layout, usable interactions and honest data. Photographs, detailed illustrations, image references and document uploads require a dedicated asset pipeline with ownership, semantic validation, persistence and separate cost limits. No promise of infinite improvement or automatic image quality is made.
