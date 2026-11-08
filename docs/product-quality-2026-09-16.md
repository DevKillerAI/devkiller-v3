# Product quality changes — 2026-09-16

## Implemented

- Targeted edits: one call, 5,000 output tokens, 90 seconds, at most 16 exact replacements in existing files. Ambiguous replacements fail atomically. Large changes must be split. Conversation retains its separate allowance and approval.
- Existing scenarios survive editing. CSS casing/whitespace discrepancies are presentation differences; ambiguous selectors are test-environment problems. New functional failures preserve the previous preview. Model-supplied visual checks measure actual computed styles; inconclusive/failed requested checks also preserve the preview.
- Photos: bounded Wikimedia Commons retrieval for supported subjects; up to two subjects and two photos each. Binary images, author, source and commercial-compatible license persist per project. The same generation call sees actual images and must reject mismatches. Missing photos get honest placeholders. Stock photos are demo references, not verified merchant inventory. Credits and binaries accompany the MVP export.
- Mandatory design-v6 guidance separates photos, Lucide icons, Recharts data charts, and SVG illustration. This applies independently of RAG. No additional illustration collection or unrestricted remote SVG imports were enabled.
- Durable generation queue: two execution slots, isolated Engine process, project database, preview and source per new MVP. Root Engine work consumes a slot. Four resident workers maximum; idle workers may be closed and reopened. Uncertain submissions are not automatically retried.

## Limits

This is local backend concurrency, not production multitenant hosting. Authentication, quotas and deployment remain future work. Generation requests queue; conversations/edits report occupied capacity. Existing MVP projects keep their original executor.

Initial photo topic mapping and Commons imagery do not guarantee premium photography for every request. Image references add bounded vision input to the existing model call. No separate paid image generation service was enabled. Edits do not create or remove files.

## Verification

102 Engine tests and 7 MVP tests passed. A browser fixture covered selection, conversation, approval, updated preview and refresh without duplicate calls. Two real isolated executors ran concurrently with distinct persistent counters. Provider responses were mocked; these tests establish behavior, not real-model aesthetic quality. Actual online photo retrieval was also exercised without a model call.

## References

- https://www.mediawiki.org/wiki/API:Imageinfo
- https://lucide.dev/guide/packages/lucide-react
- https://recharts.github.io/en-US/api/ResponsiveContainer/
