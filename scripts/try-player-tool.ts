import { parseArgs } from "node:util";
import { buildPlayerAssistantPrompt } from "../src/ai/prompts/player-assistant.js";
import {
  runToolConversation,
  type Message,
} from "../src/ai/tool-conversation.js";
import {
  playerToolDefinitions,
  type ToolDefinition,
} from "../src/ai/tools/player-tools.js";

const usage =
  'Usage: pnpm exec tsx scripts/try-player-tool.ts "What are Juan Portugal statistics?"';

function print(label: string, value: unknown): void {
  process.stdout.write(
    `\n${label}\n${typeof value === "string" ? value : JSON.stringify(value, null, 2)}\n`
  );
}

async function getModelResponse(
  model: string,
  messages: Message[],
  tools: ToolDefinition[]
): Promise<Message> {
  let response: Response;
  try {
    response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        tools,
        stream: false,
        think: false,
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (error) {
    throw new Error(
      "Cannot reach Ollama at http://localhost:11434. Start ollama serve and check that it responds.",
      { cause: error }
    );
  }
  if (!response.ok)
    throw new Error(
      `Ollama returned ${response.status}: ${await response.text()}`
    );
  const payload = (await response.json()) as {
    message?: Message;
    error?: string;
  };
  if (!payload.message || payload.message.role !== "assistant")
    throw new Error(payload.error || "Ollama returned no assistant message.");
  return payload.message;
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { help: { type: "boolean", short: "h" } },
  });
  if (values.help) {
    process.stdout.write(`${usage}\n`);
    return;
  }
  if (positionals.length !== 1 || !positionals[0].trim())
    throw new Error(usage);
  const model = process.env.OLLAMA_MODEL || "qwen3:8b";
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Mendoza",
  });
  const messages: Message[] = [
    {
      role: "system",
      content: buildPlayerAssistantPrompt({ today }),
    },
    { role: "user", content: positionals[0] },
  ];
  print("User question", positionals[0]);
  print("Tool definitions sent to Ollama", playerToolDefinitions);
  const answer = await runToolConversation(
    messages,
    (history, tools) => getModelResponse(model, history, tools),
    print
  );
  print("Final answer", answer);
}

main().catch(error => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exitCode = 1;
});
