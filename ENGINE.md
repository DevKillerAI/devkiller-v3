# DevKiller Engine · v0.13.0

This is our internal engine and control room. It combines code generation, isolated builds, previews, local project databases and diagnostics. Version 0.11 adds a bounded durable generation controller and proposed acceptance scenarios. See [ORCHESTRATION.md](ORCHESTRATION.md) for scope and [VALIDATION-0.11.md](VALIDATION-0.11.md) for evidence. It is not the final customer product; automatic stack selection and general generation-quality superiority remain unverified.

Version 0.12 adds a curated knowledge catalog, local text and vector retrieval, saved references and reversible modes. See [KNOWLEDGE.md](KNOWLEDGE.md) and the real-API pilot in [VALIDATION-0.12.md](VALIDATION-0.12.md). Embedding calls and tokens are tracked separately from the single generation call allowance. A working retrieval subsystem does not establish better generated apps.

## Use

Product direction and proposed future image/document capabilities are recorded in [PLANOS.md](PLANOS.md). Public, independent-developer and enterprise products are planned around the shared Engine; none is being created in this stage.

Open Iniciar.cmd. Under the hood shows infrastructure health. Generate app opens the studio; App library reopens saved projects; Connections manages the model and encrypted API key. Navigating between studio and diagnostics keeps the typed request. Reloading does not preserve an unsent draft.

The interface, progress messages and new system diagnostics are English. Existing project names, prompts, generated content and historical records keep their original language. Generated metadata is requested in English; the app uses English unless the request explicitly specifies another language.

## Connections

GPT-5.6 Luna is the default. The selector also offers GPT-5.6 Terra, GPT-5.6 Sol and GPT-4.1 mini. The non-secret setting is saved in settings/<panel-port>/connection.json. Each attempt snapshots the chosen model, so later changes do not rewrite its history. Model changes are blocked while an operation is running. Unknown models are rejected before calling the provider. A corrupt setting blocks generation until a valid selection is saved; it does not silently fall back.

Local model support is visibly marked as future and disabled. No local model endpoint or runtime has been implemented. The API key remains in the Windows-encrypted vault, separate from model settings. Saving either setting makes no provider call and proves neither account balance nor model access.

The technology selector has been removed. New studio requests use react-v3: React, CSS, Radix UI, Motion, HashRouter navigation, Lucide, Recharts and the Engine data API. Existing static-v1, react-v1 and react-v2 projects retain their original build profiles. Automatic selection from the request is a future decision.

## Instrument meanings

| Reading | Source and interpretation |
| --- | --- |
| Engine status | Docker, React compiler, readable databases and loaded connection. Not an app quality score. |
| CPU and memory | Real operating-system readings, including other programs. CPU measures differences between samples. |
| Engine memory | Resident memory of the panel's Node process. |
| Free disk | Available space on the project storage volume. |
| Session time | Current process uptime; resets at restart. |
| Recorded usage | Tokens reported for saved attempts. Calls without reported usage are counted separately. Not OpenAI balance, quota or money spent. |
| Projects, versions, records | Counts from local project databases within this panel's scope. Test instances have separate scopes. |
| Capabilities | Configured generation, build, runtime, file and database limits. Not benchmark scores or guarantees. |

Sensors refresh every five seconds while visible. Docker/image checks cache for thirty seconds; manual refresh keeps that infrastructure cache. Concurrent reads share a query. The chart only shows readings received by the page and resets on reload. A lost connection labels retained readings as stale. Animations respect reduced motion.

The output budget remains 20,000 tokens, including reasoning on reasoning models. One call per click, 180-second generation timeout, 60-second build timeout, and no automatic retries or model fallback. App-specific functional scenarios still require their own checks.

## Components

modules/engine-health.mjs collects telemetry; GET /api/engine returns it. ui/engine.js renders the instruments. ui/app.js runs the studio UI. modules/connection.mjs persists the model, and modules/secrets.mjs protects the key. GET /api/state exposes only non-secret connection metadata. POST /api/connection requires the same origin and session token as other mutations.

A stable public embedding API, custom generated backends, authentication, integrations and orchestration remain future work. Source files and app databases are saved locally; the last usable preview is preserved when a generation or build fails.

Version 0.13 details and verification: [STACK-STUDIO.md](STACK-STUDIO.md).
