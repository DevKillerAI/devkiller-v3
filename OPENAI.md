# OpenAI connection · v0.10.0

1. Open Iniciar.cmd or http://127.0.0.1:4310/.
2. Open Connections. Select a model and click Save model. The default is GPT-5.6 Luna.
3. Paste an OpenAI API key into the password field and click Save key.
4. Return to Generate app, describe an application and follow generation, build and preview checks.

Models: gpt-5.6-luna, gpt-5.6-terra, gpt-5.6-sol and gpt-4.1-mini. Availability depends on the API account. The model is sent unchanged to the Responses API. Access errors are shown clearly; the Engine does not retry or switch models automatically. Local model support is planned and unavailable in this version.

The key is encrypted by Windows and loaded only by the backend. The password field clears on submission. The key is not returned by the server, stored in the browser, written into generated apps or included in exports. Model settings are separate, non-secret local files. Delete key removes the saved credential; closing the panel preserves it.

## Limits and evidence

Docker and the compiler are checked before calling OpenAI. Each click allows one call, up to 20,000 output tokens and 180 seconds. Output tokens include reasoning when applicable. Cancellation and timeouts do not guarantee zero billing for work already processed. Reported usage is stored with the selected model; unreported usage remains unknown.

The provider returns structured title, summary, limitations and complete source files. The Engine validates the package, saves it, builds React in Docker and opens a preview. It also runs generic startup diagnostics. Those checks do not prove that every app-specific rule or button works. Repairs are separate, user-triggered attempts with recorded evidence and no automatic repetition.

New studio requests use the current full React profile. Existing HTML and React compatibility projects can still be reopened. Each new request creates a new project; conversational editing and custom generated backends are not implemented.

Automated tests use a simulated provider loaded only with --import ./tests/openai-fixture.mjs. They run real compilation, Docker previews and browser interactions, but do not prove a real response from Luna or account access. The normal server uses the real OpenAI endpoint.

Historical integration evidence: the owner previously generated a real expense-tracker app using their own API key, with 442 input and 4,085 output tokens reported. That earlier result does not certify the newly selected model or all generated functionality.

To test without credits, start a separate panel process:

~~~powershell
$env:DEVKILLER_PORT='4410'
$env:DEVKILLER_PREVIEW_PORT='4411'
$env:DEVKILLER_COMPARISON_PORT='4414'
node --import ./tests/openai-fixture.mjs server.mjs
~~~

In a second terminal, set the same three ports plus DEVKILLER_AI_FIXTURE=1 and run npm run test:e2e. Use npm test for backend, compiler, persistence and provider-contract checks. Test keys are placeholders; the fixture rejects real keys.

## Official references

- [GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna)
- [GPT-5.6 Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra)
- [GPT-5.6 Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol)
- [GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini)
- [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Streaming](https://developers.openai.com/api/docs/guides/streaming-responses)
