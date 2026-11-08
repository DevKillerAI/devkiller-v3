# Animation and spatial design integration — 2026-09-20

## Delivered
- Anime.js 4.5.0 added to React Complete, Next static export, Vue and Angular manifests and locks; Docker compiler images rebuilt successfully.
- Motion 13.3.0 retained on React/Next, added as vanilla JS API to Vue/Angular. Three 0.186.0 retained and runtime verified. No unrelated dependency upgrade.
- Shared generation/repair/conversation contract explains library selection, signature interactions, lifecycle, reduced motion, mobile, next client boundary, performance and failure fallbacks. MVP uses the same Engine contract and exported profiles.
- Four original curated recipes M01–M04 indexed in AnythingLLM devkiller-biblioteca, with hashes, sources and eligible stacks. Catalog now 79 core documents / 49 local recipes; existing specialist catalog unchanged.
- Stage filters accept motion guidance in planning, foundation, integration and visual review; features/repair also receive it. Bounded retrieval adapts the technology query to requested animation libraries without expanding beyond four core searches.
- Engine capability labels and MVP capability copy updated. Existing applications are not rewritten.

## Deliberate boundaries
Motion+ full iOS folder example source is paid and was not copied. Public APIs and original recipes are provided. Source: https://motion.dev/examples/react-ios-app-folder
GSAP is documented as research-only, not installed/enabled. Current Webflow product terms restrict competing visual animation builders; a licensing determination is needed for DevKiller visual editing before enabling it. Use Motion/Anime.js meanwhile. Source: https://webflow.com/legal/product-terms
Libraries do not establish premium visual quality by themselves. This release verifies technical capability and retrieval, not a new AI-generated application's design quality.

## Evidence
- validation/motion-v1/profiles.json: four compiled profiles pass browser checks for Anime target transform, Motion opacity, reduced motion and existing controls.
- validation/motion-v1/retrieval.json: live AnythingLLM searches find all four recipes and preserve them in saved stage contexts; integrity validation passes.
- validation/expansion/three.json: R3F/Drei WebGL rendering passes pixel check. Existing Three.Clock deprecation warning remains in dependency output; no browser exception.
- 154/154 full Engine regression tests and 8/8 MVP tests passed. An initial legacy retrieval regression was corrected by limiting animation-query routing to extended profiles; the full suite was then rerun successfully. Log: .runtime/motion-regression.log.
- No paid application generation or image generation initiated for this change. RAG indexing/search used the existing AnythingLLM embedding configuration.

## Reproduce
node tools/install-motion-knowledge.mjs (validate only; --install performs journaled ingestion)
node tools/verify-motion-profiles.mjs
node tools/verify-three-runtime.mjs
node --test tests/motion-capabilities.test.mjs

Engine restarted idle after ingestion so new catalogs are loaded; its live knowledge endpoint confirms eligibility. Model and credential settings were not changed.
