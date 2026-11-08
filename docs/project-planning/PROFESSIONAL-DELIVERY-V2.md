# Professional delivery v2 — measured gap remains

The user's target is comparable completeness and visual finish to the manually authored Sol 5.6 reference. This is a quality target, not a proven guarantee for arbitrary applications.

## Observed gap

The old workflow wrote its plan inside the same response as the implementation. FRAME compiled but omitted rescheduling and some filters; model-authored tests used wrong actions/selectors. Adding libraries did not solve this.

## Changes

1. Independently saved product plan: original requirements, screens, acceptance statements, visual composition, typography, palette, mobile layout and media roles.
2. Implementation receives this plan and must map requirement IDs to concrete delivered files and behavior.
3. Mapping checks detect missing declarations and nonexistent paths. They are not functional proof.
4. Actual rendered desktop/mobile review remains advisory and preserves preview availability.
5. UI distinguishes planning, writing and visual review. Planning/code/review usage is recorded separately, with a summed total when available.
6. Test instructions distinguish native select from fill, literal expected text, existing selectors and independent prerequisite data.

## Limits

One planning call: 3,000 output tokens / 90 seconds. One code call: 20,000 output tokens / 300 seconds. Optional existing rendered review: 2,000 output tokens / 60 seconds. No automatic repair loop. Image generation and embeddings remain separate, explicit operations; they are not included in these three model-call ceilings. The validation run does not request image generation.

Planning reserves an immutable receipt before contacting the provider. Complete receipts are reused, including across models when request, stack and approved assets match. Failed planning is not repeated: generation may continue once from the original request with a visible warning. Existing run records retain their original settings. New jobs enable the new plan by default, with professionalDelivery:false available as a compatibility escape hatch.

## Comparison protocol

Use the original Trailroom workspace prompt, existing approved photographs, actual AnythingLLM retrieval and the configured generation model. Keep the generated output independent from hand-authored reference code. Evaluate hierarchy, density, photography/cropping, responsive layout, complete user journey, persistence and failure handling. A customer storefront and operational workspace should not have identical layout.

Reference source: trilha-marketplace, served locally on 5173 for observation. The reference itself is not proof of transactional backend completeness; inspect functionality separately from design.

Evidence folder: devkiller-executor/validation/professional-v2. Run receipt: professional-v2-run.json.

## Actual results — 2026-09-16

- Luna run 81acac42-5271-4ab0-ba03-19e91033c54c delivered a preview with approved backpack photographs. Planning/code/review totaled 48,563 reported tokens. All 33 declared requirements referred to existing source, but rendered review found a misleading reservation action, broken mobile navigation, inaccessible loading-error handling and excessive whitespace. Requirement mapping is explicitly insufficient to establish quality.
- A mistakenly started Luna planning run was cancelled; its unconfirmed charge is not included in the confirmed totals. The user was informed.
- Sol planning run b1b1422f-cf4c-48d1-8f24-9c68f96c6e46 stopped at the planning output ceiling (5,207 total tokens). No implementation was requested by that run.
- Final Sol run 9c846121-1ac1-4932-835e-5f1c02bd992d reused the completed plan without another planning call. Its implementation reached 20,000 output tokens before completing the JSON package (34,723 total tokens). No executable version or preview was produced. Evidence: sol-result.json. No additional full generation was started.
- Confirmed totals for these benchmark runs: 88,493 tokens, plus the unknown cancelled-planning usage. Tokens are not dollar amounts or Codex account percentages.
- 22 focused tests passed: planning receipt/cache, plan transport with photos, requirement mapping, provider errors, bounded calls, cancellation, saved-run recovery and connection/model selection. These are infrastructure checks, not proof of visual parity.

## Additional protection and remaining work

Future interrupted responses are retained as non-executable diagnostic text in the project's quality folder. They are never published or silently continued. This protection was added after the failed Sol benchmark and cannot recover that response retroactively.

Parity with the manually authored Sol reference has NOT been established. The observed bottleneck is whole-application delivery in one response, combined with weak functional/visual completion. The next architectural step is a bounded, durable module-by-module implementation pipeline with explicit total budget, file checkpoints, deterministic build checks and targeted fixes. This pipeline is not implemented in this change. Simply increasing a token ceiling or adding RAG documents is not sufficient evidence of improvement.
