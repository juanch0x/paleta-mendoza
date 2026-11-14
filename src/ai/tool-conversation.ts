import {
  executeTool,
  playerToolDefinitions,
  type ToolDefinition,
} from "./tools/player-tools.js";

export type ToolCall = { function: { name: string; arguments: unknown } };
export type Message = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_name?: string;
};

type GetModelResponse = (
  messages: Message[],
  tools: ToolDefinition[]
) => Promise<Message>;
type Trace = (label: string, value: unknown) => void;
export const MAX_TOOL_ROUNDS = 4;

/** Each tool round is one model response, potentially requesting several tools. */
export async function runToolConversation(
  messages: Message[],
  getModelResponse: GetModelResponse,
  trace: Trace = () => {}
): Promise<string> {
  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const message = await getModelResponse(messages, playerToolDefinitions);
    messages.push(message);
    trace("Assistant response", message);
    if (!message.tool_calls?.length) return message.content;

    for (const call of message.tool_calls) {
      trace("Requested tool call", call);
      const result = await executeTool(
        call.function.name,
        call.function.arguments
      );
      trace(`Executed ${call.function.name} locally; tool result`, result);
      messages.push({
        role: "tool",
        tool_name: call.function.name,
        content: JSON.stringify(result),
      });
    }
  }

  // Reserve a final response so results from the last tool round are not lost.
  const finalMessages: Message[] = [
    ...messages,
    {
      role: "system",
      content:
        "The tool round limit has been reached. Give your final answer using only the results already available. Explain any missing information. Do not request more tools.",
    },
  ];
  const final = await getModelResponse(finalMessages, []);
  messages.push(final);
  trace("Assistant response", final);
  if (final.tool_calls?.length)
    throw new Error(
      "Tool round limit reached; the final response requested more tools."
    );
  return final.content;
}
