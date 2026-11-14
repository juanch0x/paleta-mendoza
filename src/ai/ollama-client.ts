import type { Message } from "./tool-conversation.js";
import type { ToolDefinition } from "./tools/player-tools.js";

export async function getModelResponse(
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
