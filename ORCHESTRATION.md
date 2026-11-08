# Orchestration — v0.11.0 validation stage

This release implements the first bounded slice from the research: durable generation, a saved provider-call allowance, recoverable source preparation, and declarative acceptance scenarios. It does not add a new stack or create a distributed multi-agent platform.

## What changes

- Every new generation has a durable execution record and ordered transition events in its project SQLite database. Existing databases receive additive tables; existing project versions and application data remain intact.
- The controller reserves its one provider call before sending it. It persists the complete response before creating a source version. Model, prompt, instruction hash, usage and selected stack stay linked to that execution.
- If preparation fails after the response was saved, **Continue with saved code** retries preparation without contacting the model. Saving the same execution again does not create a duplicate source version.
- If the process dies while the provider result is unknown, recovery marks it uncertain. That execution cannot automatically resend the AI call. Confirmed rejections and incomplete output stop; they do not start a retry loop.
- A successful new preview keeps the preceding preview available for comparison/restoration during its remaining runtime lifetime. Failed preparation retains the active preview. Source versions remain stored after containers stop.
- The generation response can include up to six acceptance scenarios, at most twelve steps each. The Engine executes a fixed vocabulary of interactions and assertions in Playwright; it never executes model-authored test scripts or shell commands.
- Scenarios have isolated browser contexts and an isolated, empty in-memory application database. Reloads within a scenario preserve that scenario's data. QA does not write its records into the real project's SQLite application data.
- Evidence includes the proposed requirement, expected value, observed result, executed steps and source hash. Browser-environment failures are unverified, not proof of application defects. A malformed test plan does not discard usable generated source.
- Repairs preserve the previous scenario plan. They cannot pass by silently deleting an existing scenario from the evaluation.

## Honest boundaries

The model proposes scenarios alongside the code, within the same existing 20,000-output-token / 180-second generation allowance. Passing those scenarios does **not** independently prove that the model understood every original requirement. Full coverage stays explicitly unverified. This is not yet a separate planning/evaluation agent.

The durable controller covers generation and resuming preparation. Repair remains an explicitly requested, separate single-call action; repair execution itself is not automatically resumed after a process crash. There is no automatic repair loop, global currency estimator, arbitrary backend generation, automatic capability routing, multi-worker queue, or commercial-readiness certification in this release.

Persistence prevents replay of known completed generation. It cannot guarantee provider billing exactly once if a provider response is lost before local persistence. Unknown outcomes stay visible and are not retried. The token allowance is output/reasoning, not a hard total-input-token or monetary limit.

Code restoration preserves application data; it does not reverse a database migration. Custom migrations remain outside the supported stack.

## Verification and advancement gate

The previous release's 34 tests were run before changes and passed. New fault-injection tests cover response receipt, source-version commit and unknown provider outcome. They kill actual isolated test server processes, restart them, use the recovery button and assert exactly one simulated provider call across restarts. Browser tests also demonstrate a nonfunctional button passing startup verification but failing an interaction scenario.

Automated fixtures verify the controller; they are labeled simulations and do not establish a model's generation quality. The separate live comparison uses two real generations of the same expense-tracker request with the same configured model and output ceiling. Results and usage are recorded in `evidencias/orchestrator/*-live.json`.

**Advancement gate:** this is a validation stage. Do not treat a passing small test set as proof that this is the best possible architecture, that arbitrary apps are complete, or that the Engine is ready for commercial exposure. Representative repeated comparisons are required before claiming broader generation-quality improvement or expanding the next area of the product.

## Commands

`npm test` runs unit, browser-backed integration and restart tests with simulated provider responses. `npx playwright test` requires the appropriate isolated fixture server for the full nine-scenario UI suite; its fixture flag must never be pointed at the real-key panel.

`node tests/live-orchestrator-validation.mjs baseline` or `candidate` deliberately performs **one paid generation** against the local main panel using its saved connection. This script is excluded from automatic test discovery. Do not run it as a routine regression test. `verify-existing` rechecks the same selected validation generation without calling AI again.

The recoverable execution code is in `modules/orchestrator.mjs`; scenario validation/execution is in `modules/scenarios.mjs`; UI recovery is in `ui/orchestration.js`. The application still uses its existing compiler, Docker runtime and project store.
