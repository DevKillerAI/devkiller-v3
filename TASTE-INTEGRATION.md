# Taste integration — dk-taste-1

Taste is a reviewed, compact design-guidance layer alongside the existing Product Design process, stage-specific AnythingLLM RAG, supported component registry, media inspection and QA. It is not a new agent or a replacement for them.

## Source and scope
Pinned upstream: Leonxlnx/taste-skill commit 5217fb45be2c0b302f29c9cd31cbd3237501c684. Source, checksum, provenance and MIT license are retained in knowledge/vendor/taste/. The original skill is experimental and primarily oriented toward marketing sites/portfolios. Its entire prompt is deliberately not injected. New dependency prescriptions, framework changes, arbitrary style bans, random image placeholders, mandatory themes and landing-page patterns for workspaces were excluded.

## Actual wiring
- Planning: contextual art direction in the existing visualDirection schema.
- Foundation: shared tokens and component contracts, without expanding domain scope.
- Features: implement the saved direction using the selected stack and approved assets.
- Integration: visual consistency while retaining behavior.
- Screenshot review: compare with the brief and saved direction; cosmetic preferences remain advisory.
- Targeted edits and functional repairs: retain their narrow existing contracts.

The adapter adds fewer than 650 input tokens per participating call and no new provider calls. Input tokens can still slightly increase cost. It does not change output budgets, model selection, generation profiles, retry limits, dependency lists or RAG collections. This is deterministic stage guidance; putting it only in the RAG would make retrieval optional.

## Observability and comparison
New jobs save tasteMode and designAssistance. Plan, modular-stage and visual-review receipts include source/version/instruction hashes. Engine state and Under the hood expose its enabled status. Cached plans and module resumes distinguish on/off configurations. Existing jobs with no tasteMode resume with Taste off and retain legacy fingerprints.

Default is auto in settings/taste.json; DEVKILLER_TASTE_MODE overrides it. POST /api/generate accepts tasteMode: auto or off for controlled comparisons. Use the same brief, model, stack, generation profile and asset/RAG inputs in separate projects. Never switch modes on an existing paid execution.

To change the global default, run node tools/taste-mode.mjs off (or auto) from the executor folder and restart idle Engine processes/workers. The MVP uses the Engine default through its existing API; no copied frontend implementation is needed.

## Verification and limits
61 relevant automated checks passed before activation, including provider-request capture, real browser screenshot review with a stubbed provider, cache separation, no additional calls, stage routing, RAG coexistence and editing regression checks. This proves integration and safeguards, not premium aesthetics. No paid full-app generation was launched for this integration. A controlled generation comparison and human visual review are still needed to measure the actual improvement.

Checkpoint: K:/devkiller_v3/checkpoints/before-taste-20260921-041634 contains pre-change server, modules, tests, package.json and the modified UI script. It is a source checkpoint, not a full backup of project data or secrets. Disable first if comparing outcomes; do not restore source over unrelated future changes.
