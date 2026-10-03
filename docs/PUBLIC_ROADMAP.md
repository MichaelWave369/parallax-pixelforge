# Public Roadmap

## v5.3 — Public GitHub Launch Kit

- Public README.
- Starter cartridge template.
- Beginner tutorial.
- Issue and pull request templates.
- Public validation workflow.
- 369 PocketGames manifest lane.

## v5.3.1 — Runtime Bridge Foundation

- game-agnostic Runtime Bridge v1,
- deterministic counter reference cartridge,
- controller/observation/action conformance tests,
- Oak Street Rumble as the first external full-game adapter.

## v5.3.2 — Shared Runtime Core

- extract the contracts proven by Counter, Oak Street Rumble, and Φ: Night Circuit,
- publish the Runtime SDK v1 entry point,
- normalize external-step vs engine-clock semantics,
- add reusable conformance assertions,
- keep gameplay, rendering, physics, and game-specific authority outside the core.

## v5.3.3 — Generic Runtime Host

- consume Runtime Bridge v1 through a game-agnostic host,
- normalize external-step vs engine-clock behavior from runtime descriptors,
- support synchronous and asynchronous policy clients,
- keep an independent host receipt transcript and event cursor,
- avoid provider- or game-specific logic in the host.

## v5.3.4 — Model Policy Client

- add a provider-neutral model policy client above RuntimeHostV1,
- normalize provider request/response boundaries,
- support sync or async providers,
- fail closed on malformed model output,
- enforce a per-turn intent budget before submission,
- keep provider receipts separate from host/game ledgers,
- leave concrete provider SDKs and credentials out of the shared core.

## v5.3.5 — Local Ollama Provider

- add the first concrete Model Policy provider adapter,
- translate provider-neutral requests to Ollama /api/chat,
- require non-streaming structured JSON output,
- normalize Ollama responses back into the provider-neutral envelope,
- fail closed on transport/HTTP/response-shape errors,
- keep live Ollama qualification optional and outside CI.

## v5.3.6 — Async Runtime Host

- add a Promise-capable host for runtimes behind transport boundaries,
- preserve the synchronous RuntimeHostV1 for in-process consumers,
- accept both sync and async Runtime Bridge implementations,
- keep policy/model clients unchanged,
- add asynchronous conformance validation,
- prepare the existing Night Circuit P3 TCP seat as the first external consumer.

## v5.3.7 — Bounded Agent Session

- add a host-agnostic multi-turn session runner,
- enforce total intent budgets before submission,
- cap total turns and consecutive empty turns,
- support cancellation before action submission,
- support custom stop conditions,
- work unchanged across RuntimeHostV1 and AsyncRuntimeHostV1,
- keep session receipts separate from model/host/game evidence,
- add no hidden retries or authority expansion.

## v5.4 — Creator Onboarding Polish

- one-command cartridge generator,
- clearer starter UI components,
- screenshot helper,
- mobile readability checks,
- beginner docs pass.

## v5.5 — Community Cartridge Wave

- cartridge gallery index,
- submission review checklist,
- featured learning cartridges,
- first community playtest loop.

## v6.0 — Mobile Export Track

- PWA polish,
- app icon export,
- store-page generator,
- mobile QA receipt,
- first 369 PocketGames release candidate.
