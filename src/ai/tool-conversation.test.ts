import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeTool } from "./tools/player-tools.js";
import {
  MAX_TOOL_ROUNDS,
  runToolConversation,
  type Message,
} from "./tool-conversation.js";

vi.mock("./tools/player-tools.js", () => ({
  executeTool: vi.fn(),
  playerToolDefinitions: [
    { type: "function", function: { name: "findPlayers" } },
  ],
}));

const call = (name: string, args: unknown): Message => ({
  role: "assistant",
  content: "",
  tool_calls: [{ function: { name, arguments: args } }],
});
const final: Message = { role: "assistant", content: "Ganó 11 y perdió 6." };

describe("tool conversation", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns search and statistics results to the model before its answer", async () => {
    const history: Message[] = [
      { role: "user", content: "Estadísticas de Juan Portugal" },
    ];
    vi.mocked(executeTool)
      .mockResolvedValueOnce({ status: "matched", player: "Juan Portugal" })
      .mockResolvedValueOnce({ wins: 11, losses: 6 });
    const request = vi
      .fn()
      .mockResolvedValueOnce(call("findPlayers", { name: "Juan Portugal" }))
      .mockImplementationOnce(async messages => {
        expect(messages.at(-1)).toMatchObject({
          role: "tool",
          tool_name: "findPlayers",
        });
        return call("getPlayerStats", { playerName: "Juan Portugal" });
      })
      .mockImplementationOnce(async messages => {
        expect(JSON.parse(messages.at(-1).content)).toEqual({
          wins: 11,
          losses: 6,
        });
        return final;
      });
    expect(await runToolConversation(history, request)).toBe(final.content);
    expect(request).toHaveBeenCalledTimes(3);
    expect(executeTool).toHaveBeenNthCalledWith(2, "getPlayerStats", {
      playerName: "Juan Portugal",
    });
  });

  it("executes multiple calls within one model response", async () => {
    const response = call("findPlayers", { name: "Juan Portugal" });
    response.tool_calls!.push({
      function: { name: "findPlayers", arguments: { name: "Martín Guerra" } },
    });
    vi.mocked(executeTool).mockResolvedValue({ status: "matched" });
    const request = vi
      .fn()
      .mockResolvedValueOnce(response)
      .mockResolvedValueOnce(final);
    await runToolConversation([], request);
    expect(executeTool).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("reserves a tools-disabled final request after the last permitted tool result", async () => {
    vi.mocked(executeTool).mockResolvedValue({ result: "last result" });
    const request = vi.fn().mockImplementation(async (messages, tools) => {
      if (tools.length) return call("findPlayers", { name: "Juan Portugal" });
      expect(messages.at(-2)).toMatchObject({
        role: "tool",
        content: JSON.stringify({ result: "last result" }),
      });
      return final;
    });
    expect(await runToolConversation([], request)).toBe(final.content);
    expect(executeTool).toHaveBeenCalledTimes(MAX_TOOL_ROUNDS);
    expect(request).toHaveBeenCalledTimes(MAX_TOOL_ROUNDS + 1);
    expect(request.mock.calls.at(-1)![1]).toEqual([]);
  });

  it("rejects calls in the final request without executing them", async () => {
    vi.mocked(executeTool).mockResolvedValue({});
    const request = vi
      .fn()
      .mockResolvedValue(call("findPlayers", { name: "Juan Portugal" }));
    await expect(runToolConversation([], request)).rejects.toThrow(
      "final response requested more tools"
    );
    expect(executeTool).toHaveBeenCalledTimes(MAX_TOOL_ROUNDS);
  });
});
