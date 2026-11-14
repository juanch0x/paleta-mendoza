import { buildPlayerAssistantPrompt } from "./prompts/player-assistant.js";
import { runToolConversation, type Message } from "./tool-conversation.js";

type GetModelResponse = Parameters<typeof runToolConversation>[1];

/** Owns one in-memory history; failed turns never replace the last valid history. */
export function createPlayerChatSession(
  getModelResponse: GetModelResponse,
  getToday = () =>
    new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Argentina/Mendoza",
    })
) {
  const initialHistory = (): Message[] => [
    {
      role: "system",
      content: buildPlayerAssistantPrompt({ today: getToday() }),
    },
  ];
  let history = initialHistory();

  return {
    async send(content: string): Promise<string> {
      if (!content.trim()) throw new Error("Message must not be blank.");
      const nextHistory = structuredClone(history);
      nextHistory.push({ role: "user", content });
      const answer = await runToolConversation(nextHistory, getModelResponse);
      history = nextHistory;
      return answer;
    },
    reset(): void {
      history = initialHistory();
    },
  };
}
