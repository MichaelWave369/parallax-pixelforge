import {
  RuntimeHostV1,
  createModelPolicyClientV1,
} from "../runtime/sdk-v1.js";
import { createOllamaProviderV1 } from "../runtime/providers/ollama-v1.js";
import { createCounterBridge } from "../runtime/reference-counter.js";

function arg(name) {
  const prefix = `--${name}=`;
  const found = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

const model = arg("model") ?? process.env.OLLAMA_MODEL;
const baseUrl =
  arg("base-url") ??
  process.env.OLLAMA_BASE_URL ??
  "http://127.0.0.1:11434";

if (!model) {
  console.error(
    "Missing Ollama model. Set OLLAMA_MODEL or pass --model=<installed-model>.",
  );
  process.exit(2);
}

const provider = createOllamaProviderV1({
  model,
  baseUrl,
  options: {
    temperature: 0,
  },
});

const client = createModelPolicyClientV1({
  id: "model:ollama-live",
  provider,
  maxIntentsPerTurn: 1,
  instructions: [
    "You are qualifying a runtime controller.",
    "The observation contains a counter actor.",
    "Return exactly one ADD intent that increases the counter by 1.",
    "Use the observed self.id as actorId.",
  ].join(" "),
});

const host = new RuntimeHostV1(createCounterBridge(2));
host.attachClient(client);

try {
  const report = await host.turn("model:ollama-live");
  const finalValue = host.snapshot().value;

  if (finalValue !== 3) {
    console.error("OLLAMA QUALIFICATION FAIL");
    console.error(
      JSON.stringify(
        {
          model,
          baseUrl,
          finalValue,
          intents: report.intents,
          gameEvents: report.cycle.events,
          modelReceipts: client.modelReceipts(),
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  console.log("OLLAMA QUALIFICATION PASS");
  console.log(
    JSON.stringify(
      {
        model,
        baseUrl,
        initialValue: 2,
        finalValue,
        intentCount: report.intents.length,
        gameEventTypes: report.cycle.events.map((event) => event.type),
        runtimeHash: host.hash(),
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error("OLLAMA QUALIFICATION FAIL");
  console.error(
    error instanceof Error ? error.stack ?? error.message : String(error),
  );
  process.exit(1);
}
