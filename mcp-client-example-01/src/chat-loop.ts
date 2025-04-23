import { ModelContextProtocolClient } from "./client";
import readline from "readline/promises";

/**
 * Starts an interactive chat loop with the Model Context Protocol (MCP) client.
 *
 * This function initializes a readline interface to accept user input from the console.
 * Users can type queries, which are processed by the provided `mcpClient`, and the responses
 * are displayed in the console. The loop continues until the user types "quit".
 *
 * @param mcpClient - An instance of `ModelContextProtocolClient` used to process user queries.
 *
 * @throws Will log an error message if an exception occurs during the chat loop execution.
 *
 * Example usage:
 * ```typescript
 * const mcpClient = new ModelContextProtocolClient();
 * await chatLoop(mcpClient);
 * ```
 */
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
