# Bounded modular generation

React generations use saved foundation, feature and integration stages when professional delivery is enabled. The direct, single-response path remains available with professionalDelivery:false; static projects retain their existing path.

## Delivered behavior

- Every provider call is reserved in the project execution database before being sent. Three primary code stages and at most two partial continuations share a five-call ceiling. Maximum code output allowance is 44,000 tokens (8k foundation, 12k features, 8k integration, up to two 8k continuations). Planning and visual review are separate; input tokens are additionally billed.
- Each stage stores a receipt and materializes complete files under the project's quality/<job>/modules/source/src directory. Responses and source are saved before subsequent calls. Completed receipts are reused. Unknown provider outcomes are never automatically replayed.
- Output-limited responses can recover only fully parsed, validated file objects. Truncated file contents are evidence, never executable source. A substantial partial foundation can forward missing work explicitly to the feature stage rather than repeatedly reprinting a large unfinished stylesheet.
- Large files are instructed to split into focused components and imported CSS files. This is generation guidance, not proof of code quality.
- The feature assembly is compiled in the existing restricted Docker compiler before integration. Code diagnostics are supplied to integration; environment failures stop without requesting a speculative code fix. Final publication still passes through existing build and preview checks.
- The current-files endpoint exposes saved provisional module source during generation. It labels it provisional. Final versions include the runtime scaffold, lockfile, build scripts and deployment notes. Each project retains its isolated database.
- Existing published previews are not replaced by unfinished modules. The source package's database routes still require the Engine or an explicitly implemented deployment adapter; this is not a new arbitrary backend/full-stack runtime.

## Scope and evidence

This removes the requirement that every source file fit in one response. It does not guarantee every requested application is complete or visually excellent. Functional acceptance and rendered review remain necessary.

Validation run: project 1b23dd34-871c-4594-a93b-835eae034956 on port 4360, execution 3e7d1782-e4e4-49ed-9190-09fe0b8248f8. It used the original Trailroom prompt and Sol. The first implementation of the stage splitter still repeated oversized CSS. Recovery preserved 16 complete files and all three call receipts, then forwarded missing styling to the features stage within the same five-call ceiling. foundation-recovery-audit.json preserves the pre-migration receipts and their usage. Live result must be evaluated separately; infrastructure tests are not proof that this app works.

## Final observed result

The five-call validation stopped at the 300-second deadline of the last call. Thirty complete source files were preserved; the responsive stylesheet was truncated. No preview was published and no sixth call was made. Confirmed usage for the first four calls is 122,747 total tokens (86,747 input, 36,000 output). Final-call usage is unknown and may be billed. See validation/modular-final-result.json. This is not a successful end-to-end generation.

After observing this, the foundation scope was narrowed to data/domain contracts, CSS was assigned to features, and conflicting inherited 20,000-token instructions were replaced with each stage's actual API allowance and headroom. Those final prompt changes have not received a further paid end-to-end test. A buildable-feature fallback is covered by a deterministic test; the failed live run had not reached that state. Thirty-two focused tests passed, including partial recovery, deferred foundation work, fixed call ceilings, saved-receipt reuse, persistence, and candidate fallback. Do not describe generation quality or universal completeness as proven.
