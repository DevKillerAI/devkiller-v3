# Efficient visual generation — 2026-09-21

Source checkpoint: checkpoints/before-efficient-20260921 (modules, server and prior generation profile).

New `efficient` profile is the saved default for future scope-4310 jobs. Existing job profiles remain saved and unchanged. Standard and Ultimate remain available. Efficient uses low reasoning, 6k planning output, 8k foundation / 20k features / 12k integration and existing bounded continuation rules (up to two 8k continuations; cumulative 56k code allowance). These are ceilings, not required output lengths. Choose a proportional brief; no promise of fixed latency.

The after-refinement screenshot review now receives the job's generation profile, preventing a silent fall back to 2k. Efficient review has 8k and low reasoning. Subsequent refinement patches also accept the profile (8k/low for nonstandard runs), preserving atomic patches and the prior preview. Each review remains advisory; unverified refinements are not automatically promoted.

Design instructions now distinguish ordinary workspaces from expressive games/immersive sites, permit intentional detailed procedural 3D, and keep keyboard, reduced-motion, cleanup and fallback requirements. No packages, model costs, external integrations or security permissions were silently added.

DK NIGHTRUN was submitted via the MVP API/queue, not hand-coded by Codex. Brief and run id are in .runtime/nightrun-brief.txt and nightrun-run.json. The first worker was launched before the supplementary patch-budget improvement was loaded; its review-profile fix and efficient generation settings were already loaded. No running generation was restarted.

Live trial adjustment: initial 4k foundation/integration ceilings caused partial responses. Completed files were recovered; one integration continuation was needed. Final defaults now provide 8k/12k headroom to reduce split responses. The active trial was not modified. These final ceilings need a subsequent live comparison; automated request tests cover their routing.
