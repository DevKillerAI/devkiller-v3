# GPT model catalog update — 2026-09-23

Added GPT-6 Luna, Sol and Astra; retained GPT-5.6 Luna, Terra and Sol and the existing legacy option.
Default and saved active connection: gpt-6-luna. MVP reads this connection from the Engine.
Removed Ultimate profile's forced Sol override: selected models now apply to all profiles.
Verified the six family IDs through the account's OpenAI /v1/models endpoint.
Minimal Responses API check: HTTP 200, gpt-6-luna, completed, 14 total tokens. No app generation dispatched.
Validation: connection, efficient-profile and ultimate-profile tests — 8 passed.
Engine and MVP APIs both report gpt-6-luna and configured=true.
Backup: checkpoints/model-catalog-20260923 (files mirror devkiller-executor).
To revert: stop idle Engine, restore backed-up files to their matching paths under devkiller-executor, then restart Engine. Generated projects are not changed.
Sources: https://developers.openai.com/api/docs/models/all and https://developers.openai.com/api/docs/models/gpt-6-luna
