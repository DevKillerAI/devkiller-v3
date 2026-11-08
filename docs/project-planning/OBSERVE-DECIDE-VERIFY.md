# Observe, decide, intervene, verify — 2026-09-22

## Implemented in the production path

The existing pipeline already handled request intake, requirements, source stages, compilation, database/runtime provisioning, scenarios and rendered review. This change improves its design decisions and the missing connection between rendered observation and editing. It is not an unrestricted agent with every tool available to Codex.

1. **Understand and choose:** the existing planning call compares two compositions, records the chosen focal element/layout and tradeoffs, and sets observable visual success criteria. It does not generate two apps. Cache version advances so a previous plan cannot bypass the new schema.
2. **Implement:** the shared generation contract carries an evidence-driven workflow across the supported stacks. Existing framework-specific contracts, source stages, RAG routing and functional tests remain in place.
3. **Observe:** the browser records desktop/mobile routes, supported disclosure states and static motion-preference samples. A capture manifest links real PNGs to their observations.
4. **Judge:** the reviewer evaluates primary workflow, composition, identity, execution of the plan and unverified behavior. Each finding includes a corrective action and an observable verification condition.
5. **Choose an intervention:** `observation-cycle.mjs` produces a recorded action. Rendered presentation findings route to presentation refinement. Incomplete observation routes to `needs-evidence`. Source-based functional suspicions remain `investigate-behavior`, not fabricated test failures. No findings means sampled delivery for human review, not exhaustive correctness.
6. **Intervene:** production `refineGeneratedDesign` now calls `polishDesign`. The previous implementation still invoked `targetedEdit`, despite importing the new module. The actual editor now receives screenshots, code, selected findings, visual direction, approved assets and stage RAG references. It can reorganize composition while preserving routes, data and business modules.
7. **Verify:** the candidate runs in the existing isolated environment, original scenarios run again, and the reviewer sees before/after screenshots with stable finding IDs. Promotion requires every selected target to be explicitly resolved with evidence, no reported regression, and preservation of all previously passing checks. A generic ready verdict is insufficient.
8. **Preserve and report:** an unsuccessful or uncertain intervention leaves the prior preview active. Receipts persist decisions, outcomes and unresolved risks without replaying paid calls. One automatic presentation intervention remains; this is not an endless retry loop.

## Limits

- The comparison is model judgment backed by screenshots, not a mathematical guarantee of aesthetic excellence.
- Static captures do not prove animation choreography. Unobserved behavior must remain unverified.
- Source-based functional suspicions are recorded for investigation; this change does not add autonomous generation/execution of new exploratory browser tests or arbitrary new tools. Existing scenario checks and repair mechanisms remain separate.
- Existing model/provider limits, timeouts, sandbox boundaries, scoped stack contracts and user cancellation remain.
- No generated app was manually redesigned, and no new paid app generation was launched to claim an aesthetic improvement.

## Verification

`tests/observation-cycle.test.mjs` covers decision routing, false-positive promotion, partial/unknown/duplicate outcomes, missing evidence, unsafe capture paths, composition schema, real browser captures delivered to the editor and before/after evaluator, receipt reuse and the production wiring regression. Browser capture and filesystem behavior are real; model replies in these tests are simulated.

Full regression output: `planning/observation-cycle-tests.txt`: 177 tests passed, zero failures. The focused suite passed 24 tests before the full regression. This is evidence of pipeline behavior, not a paid-generation aesthetic benchmark.

## Rollback

Checkpoint: `checkpoints/before-observe-decide-20260922`.
Run `Restore.ps1 -CheckOnly` to verify hashes without changing files. To restore, stop Engine, its workers and MVP, then run `Restore.ps1`. It refuses to overwrite subsequent edits. Existing generated projects and databases are not restored or deleted. The two newly introduced code/test files are removed only after their paths and hashes are verified; the seven pre-existing files are restored from verified copies.
