import { ModelContextProtocolClient } from "./client";
import readline from "readline/promises";

export async function chatLoop(mcpClient: ModelContextProtocolClient) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    console.log("\nMCP Client Started!");
    console.log("Type your queries or 'quit' to exit.");
    while (true) {
      const message = await rl.question("\nQuery: ");
      if (message.toLowerCase() === "quit") {
        break;
      }
      const response = await mcpClient.processQuery(message);
      console.log("\n" + response);
    }
  } catch (e) {
    console.error("Error starting chat loop:", e);
  } finally {
    rl.close();
  }
}
