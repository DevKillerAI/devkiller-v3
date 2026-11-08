# Engine design process — 2026-09-16

Implemented workflow, informed by the Product Design plugin's planning, asset-fit and visual-verification practices. The Engine does not call the Codex desktop plugin and does not require Mobbin or Figma.

1. Retrieve and validate stage-specific RAG references.
2. Produce the product plan and visual direction before media generation. Include standalone physical scene briefs, independent of programming instructions.
3. Retrieve photos and generate the planned editorial scenes within the existing image allowance. If planning fails, skip paid image generation rather than reuse the raw app prompt.
4. Inspect image content with a vision call. Reject website screenshots, embedded UI, mismatched subjects and unusable assets. Save decisions and actual descriptions. Unverified images are excluded from generation; originals remain saved.
5. Generate foundation, features and integration from the plan and approved media.
6. Open the working preview and execute existing QA. Review up to three linked routes, full page, at desktop and mobile dimensions.
7. For confirmed visual defects, attempt one focused patch (5,000 output tokens, 90 seconds, maximum 16 replacements). Save it as a distinct candidate revision. Run original scenarios against isolated in-memory QA storage and repeat visual review. Promote only if the review is ready-for-human-review, there are no failing checks, and previously passing checks are still present and passing. Otherwise retain the original preview.

Every paid inspection/refinement reserves a durable receipt before calling the provider. Uncertain or failed attempts are not automatically replayed. A limited refinement is not a guarantee that all reported issues will be resolved. Functional risks require their own evidence and are not blindly patched from aesthetic review.

Validation: targeted automated tests for image exclusion, scene-only prompts, uncertain request reuse, non-promotion after failed review, regression preservation, and actual six-screenshot browser capture with QA headers. Existing planning, RAG, modular generation, editing, orchestration and MVP tests also passed. Provider responses in the new tests were mocked; no new paid end-to-end app generation was performed for this change.

Known limits: up to three routes are sampled, not every route/state. The visual reviewer remains probabilistic. One image inspection may fail; placeholders are used instead of automatic paid retries. No automatic image regeneration or domain-specific concurrent reservation guarantee is introduced. The next real generation must be evaluated before claiming premium-quality results.
