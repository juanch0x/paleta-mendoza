import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";
import { getModelResponse } from "../src/ai/ollama-client.js";
import { createPlayerChatSession } from "../src/ai/player-chat-session.js";

async function main(): Promise<void> {
  const model = process.env.OLLAMA_MODEL || "qwen3:8b";
  const session = createPlayerChatSession((messages, tools) =>
    getModelResponse(model, messages, tools)
  );
  const terminal = createInterface({ input: stdin, output: stdout });
  terminal.on("SIGINT", () => {
    terminal.close();
    process.stdout.write("\nChat finalizado.\n");
    process.exit(0);
  });
  process.stdout.write(
    `Chat de estadísticas (${model}). /reset reinicia; /bye sale.\n`
  );
  terminal.setPrompt("Tú: ");
  const prompt = () => {
    if (stdin.isTTY) terminal.prompt();
  };
  prompt();

  try {
    for await (const line of terminal) {
      const input = line.trim();
      if (input === "/bye") break;
      if (input === "/reset") {
        session.reset();
        process.stdout.write("Conversación reiniciada.\n");
      } else if (input.startsWith("/")) {
        process.stdout.write("Comando desconocido. Usa /reset o /bye.\n");
      } else if (input) {
        try {
          const answer = await session.send(input);
          process.stdout.write(`\nAsistente: ${answer}\n\n`);
        } catch (error) {
          process.stderr.write(
            `Error: ${error instanceof Error ? error.message : String(error)}\nEl turno no se guardó. Puedes volver a intentar.\n`
          );
        }
      }
      prompt();
    }
  } finally {
    terminal.close();
  }
}

main().catch(error => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exitCode = 1;
});
