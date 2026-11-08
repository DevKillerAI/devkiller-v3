# Design v4 and incomplete content

Implemented and checked on 2026-09-14. Applies to future generations and targeted repairs; existing generated projects were not redesigned.

## Mandatory contract

`modules/design.mjs` now exports design-v4. It covers branded expanded selectors, navigation, accessible interaction, text/action separation and purposeful local SVG composition. `modules/content-policy.mjs` supplies content-v1: preserve supplied facts, represent missing editorial fields honestly, provide local editing/persistence, and avoid fake calculations or integrations. Both reach generation and repair for all three stacks even with RAG Off. Generation jobs already record the design version and the orchestrator hashes the generation contract.

These are model instructions, not a deterministic guarantee that every output follows them. Existing runtime/QA checks still apply; no functional test was weakened to accept placeholders. A missing editorial fact is distinct from broken editing or persistence. The available UI does not yet offer a conversational clarification step before generation.

## Curated references

- D01: incomplete content and editing (English).
- D02: branded filters, dropdowns and navigation, including an authored React disclosure/radio example.
- D03: long labels and adjacent actions, with CSS Grid code.
- D04: hero composition and original local SVG ribbon example.
- D05: consistent, accessible SVG/Lucide iconography.
- D06: honest, legible data charts.
- D07: incomplete content in Portuguese; added after an actual Portuguese retrieval miss.

Primary sources are linked in each document. These are authored syntheses and examples, not downloaded copies of full manuals, licensed asset packs, or templates certified for every product. The library keeps multiple visual approaches; the ribbon is an example, not a required motif for every app.

All seven documents are indexed in the existing AnythingLLM `devkiller-biblioteca` workspace, which now has 53 eligible documents. The local lexical/hybrid corpus has 23 recipes. No provider, model or active knowledge mode was changed. The old local semantic index is invalidated when its corpus changes; rebuilding that optional mode remains explicit. The active AnythingLLM index is ready.

For these new documents, an eligible vector hit resolves to the complete local recipe, verified against the manifest SHA-256. This prevents a code example from being cut in half by retrieval chunk boundaries. Matching still comes from AnythingLLM; source enablement, stack filtering, six-reference limit and 4,000-token context ceiling remain enforced. Other references retain their existing retrieval behavior. Adding a new manifest changes its version hash; a paused run with an old saved context may need a new generation under the existing validation policy, never an automatic retry.

## Verification and limits

Evidence is in `validation/design-v4/`:

- `retrieval.json`: seven real AnythingLLM queries, all seven expected references found; exact reference payload forwarded through the production request builder with a simulated model transport. First Portuguese query initially missed D01; the Portuguese companion D07 resolved it. These development queries are not an independent quality benchmark.
- `examples.json`, `reference-1440.png`, `reference-391.png`: exact code snippets extracted from D02/D03/D04 compiled through the isolated React compiler and exercised in a browser. Keyboard navigation, Escape/focus return, click-away, selection, two unique SVG gradient IDs, action clicks, and layout at 1440/768/391/320 pixels passed. An authored editor fixture used the real DevKiller data API and SQLite to check persistence and failed writes. This is not a model-generated application or a screen-reader audit.
- `focused.log`: 33 tests passed, including request transport for all stacks and complete-recipe expansion.
- `unit.log`: full suite, 86/88 passed initially. One test expected the previous catalog size; another had a port allocation/startup failure. The UI count was corrected and the affected test helpers now select ports outside the usual Windows ephemeral-client range, with an explicit separate comparison port.
- `http-recheck.log`: intermediate attempt exposed the port race with EADDRINUSE.
- `http-final.log`: all three affected HTTP/restart tests passed after those corrections. No app assertion was relaxed.
- `activation.json`: live Engine restarted with 53 sources; existing preview reopened at the same URL from its cached build. Source/data hashes and generation job count remained unchanged.

No paid generation or repair call was made for these checks. AnythingLLM indexing/search was used; its API does not report embedding consumption. Richer fixed instructions and retrieved recipes add input tokens to future generations. React-v2's full current generation contract measures 3,346 tokens; RAG remains at most 4,000 additional context tokens. The model remains GPT-5.6 Luna with one call per generation, 20,000 output tokens and 180 seconds. Actual improvement in newly generated apps requires subsequent user testing.

Maintenance commands from the engine directory:

```
node tools/install-design-knowledge.mjs
node tools/install-design-knowledge.mjs --install
node tools/verify-design-retrieval.mjs
node tools/verify-design-examples.mjs
```

Installation journals upload/index progress in `.runtime/design-v4-import.json`. It adds only this batch, never deletes remote documents, never prints keys, and refuses uncertain uploads/indexing instead of blindly retrying. The key stays in the existing backend vault. The verification tools create isolated temporary stores; none writes to a user-generated application's source.
