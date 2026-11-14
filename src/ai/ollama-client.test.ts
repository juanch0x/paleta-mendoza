import { afterEach, describe, expect, it, vi } from "vitest";

import { getModelResponse } from "./ollama-client.js";
import type { Message } from "./tool-conversation.js";
import { playerToolDefinitions } from "./tools/player-tools.js";

const messages: Message[] = [
  { role: "user", content: "Buscá a Juan Portugal" },
];
const tools = playerToolDefinitions;

afterEach(() => vi.unstubAllGlobals());

describe("Ollama client", () => {
  it("sends the model, history and tools and returns the assistant tool request", async () => {
    const message: Message = {
      role: "assistant",
      content: "",
      tool_calls: [
        {
          function: {
            name: "findPlayers",
            arguments: { name: "Juan Portugal" },
          },
        },
      ],
    };
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ message }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await getModelResponse("qwen3:8b", messages, tools)).toEqual(
      message
    );
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:11434/api/chat");
    expect(request.method).toBe("POST");
    expect(request.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(request.body)).toEqual({
      model: "qwen3:8b",
      messages,
      tools,
      stream: false,
      think: false,
    });
    expect(request.signal).toBeInstanceOf(AbortSignal);
  });

  it("supports a final response with tools disabled", async () => {
    const message: Message = {
      role: "assistant",
      content: "Encontré a Juan Portugal.",
    };
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ message }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await getModelResponse("qwen3:8b", messages, [])).toEqual(message);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).tools).toEqual([]);
  });

  it("reports HTTP failures with the server response", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response("model not found", { status: 404 }))
    );
    await expect(getModelResponse("missing", messages, tools)).rejects.toThrow(
      "Ollama returned 404: model not found"
    );
  });

  it.each([{}, { message: { role: "user", content: "wrong role" } }])(
    "rejects a missing or non-assistant message: %j",
    async payload => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(payload)));
      await expect(
        getModelResponse("qwen3:8b", messages, tools)
      ).rejects.toThrow("Ollama returned no assistant message.");
    }
  );

  it("preserves an error reported in a successful HTTP response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ error: "model failed" }))
    );
    await expect(getModelResponse("qwen3:8b", messages, tools)).rejects.toThrow(
      "model failed"
    );
  });

  it("does not treat invalid JSON as a connectivity failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not JSON")));
    await expect(
      getModelResponse("qwen3:8b", messages, tools)
    ).rejects.toBeInstanceOf(SyntaxError);
  });

  it("provides startup guidance and preserves the connection error", async () => {
    const cause = new TypeError("fetch failed");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(cause));
    await expect(
      getModelResponse("qwen3:8b", messages, tools)
    ).rejects.toMatchObject({
      message: expect.stringContaining("Cannot reach Ollama"),
      cause,
    });
  });
});
