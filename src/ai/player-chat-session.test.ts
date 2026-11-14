import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPlayerChatSession } from "./player-chat-session.js";
import { type Message, MAX_TOOL_ROUNDS } from "./tool-conversation.js";
import { executeTool } from "./tools/player-tools.js";

vi.mock("./tools/player-tools.js", () => ({
  executeTool: vi.fn(),
  playerToolDefinitions: [
    { type: "function", function: { name: "findPlayers" } },
  ],
}));

const answer = (content: string): Message => ({ role: "assistant", content });
const call: Message = {
  role: "assistant",
  content: "",
  tool_calls: [
    { function: { name: "findPlayers", arguments: { name: "Juan Portugl" } } },
  ],
};

describe("player chat session", () => {
  beforeEach(() => vi.resetAllMocks());

  it("retains the question, suggestion and user confirmation across turns", async () => {
    vi.mocked(executeTool).mockResolvedValue({
      status: "suggestions",
      players: ["Juan Portugal"],
    });
    const request = vi
      .fn()
      .mockResolvedValueOnce(call)
      .mockResolvedValueOnce(answer("¿Te refieres a Juan Portugal?"))
      .mockImplementationOnce(async (messages: Message[]) => {
        expect(messages.map(message => message.role)).toEqual([
          "system",
          "user",
          "assistant",
          "tool",
          "assistant",
          "user",
        ]);
        expect(messages[1].content).toBe("Estadísticas de Juan Portugl");
        expect(messages.at(-1)?.content).toBe("Sí");
        expect(JSON.parse(messages[3].content)).toMatchObject({
          players: ["Juan Portugal"],
        });
        return answer("Ganó 11 partidos.");
      })
      .mockImplementationOnce(async (messages: Message[]) => {
        expect(messages.at(-2)?.content).toBe("Ganó 11 partidos.");
        return answer("Perdió 6.");
      });
    const session = createPlayerChatSession(request, () => "2026-11-14");
    await session.send("Estadísticas de Juan Portugl");
    expect(await session.send("Sí")).toBe("Ganó 11 partidos.");
    expect(await session.send("¿Y cuántos perdió?")).toBe("Perdió 6.");
  });

  it("reset discards previous turns and refreshes the prompt date", async () => {
    const request = vi.fn().mockResolvedValue(answer("Hola"));
    const today = vi
      .fn()
      .mockReturnValueOnce("2026-11-14")
      .mockReturnValueOnce("2026-11-15");
    const session = createPlayerChatSession(request, today);
    await session.send("Primera pregunta");
    session.reset();
    await session.send("Nueva pregunta");
    const messages = request.mock.calls[1][0] as Message[];
    expect(messages[0].content).toContain("2026-11-15");
    expect(messages.filter(message => message.role === "user")).toEqual([
      { role: "user", content: "Nueva pregunta" },
    ]);
  });

  it("discards a failed turn including partial calls and permits retry", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(answer("Respuesta previa"))
      .mockResolvedValueOnce(call)
      .mockImplementationOnce(async (messages: Message[]) => {
        expect(messages.some(message => message.role === "tool")).toBe(true);
        throw new Error("Connection lost");
      })
      .mockImplementationOnce(async (messages: Message[]) => {
        expect(messages.map(message => message.content)).toEqual([
          expect.any(String),
          "Pregunta previa",
          "Respuesta previa",
          "Reintento",
        ]);
        return answer("Recuperado");
      });
    vi.mocked(executeTool).mockResolvedValue({ status: "matched" });
    const session = createPlayerChatSession(request);
    await session.send("Pregunta previa");
    await expect(session.send("Pregunta fallida")).rejects.toThrow(
      "Connection lost"
    );
    expect(await session.send("Reintento")).toBe("Recuperado");
  });

  it("does not carry the temporary tool limit instruction into the next turn", async () => {
    vi.mocked(executeTool).mockResolvedValue({ status: "matched" });
    const request = vi
      .fn()
      .mockImplementation(async (_messages, tools) =>
        tools.length ? call : answer("Límite alcanzado")
      );
    const session = createPlayerChatSession(request);
    await session.send("Pregunta");
    expect(request).toHaveBeenCalledTimes(MAX_TOOL_ROUNDS + 1);
    request.mockImplementationOnce(async (messages: Message[]) => {
      expect(
        messages.filter(message => message.role === "system")
      ).toHaveLength(1);
      return answer("Otra respuesta");
    });
    expect(await session.send("Otra pregunta")).toBe("Otra respuesta");
  });

  it("rejects blank input before requesting a model response", async () => {
    const request = vi.fn();
    await expect(createPlayerChatSession(request).send("  ")).rejects.toThrow(
      "blank"
    );
    expect(request).not.toHaveBeenCalled();
  });
});
