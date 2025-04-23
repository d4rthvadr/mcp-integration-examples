import { Anthropic } from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import dotenv from "dotenv";
import { ModelContextProtocolClient } from "./client.js";
import { chatLoop } from "./chat-loop.js";

dotenv.config();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error("Please set the ANTHROPIC_API_KEY environment variable.");
  process.exit(1);
}

const MODEL_TYPE = process.env.MODEL_TYPE || "claude-3-5-sonnet-20241022";

/**
 * The main entry point of the application.
 *
 * This function initializes the necessary components, connects to the server
 * using the provided server script path, and starts the chat loop.
 *
 * Usage:
 *   node main.js <path_to_server_script>
 *
 * @throws Will terminate the process if the server script path is not provided.
 */
async function main() {
  if (process.argv.length < 3) {
    console.error("Usage: node main.js <path_to_server_script>");
    process.exit(1);
  }

  const anthropic = new Anthropic({
    apiKey: ANTHROPIC_API_KEY,
  });

  const client = new Client({
    name: "mcp-client-example-01",
    version: "1.0.0",
    capabilities: {
      resources: {},
      tools: {},
    },
  });

  const mcpClient: ModelContextProtocolClient = new ModelContextProtocolClient(
    MODEL_TYPE,
    anthropic,
    client
  );

  try {
    await mcpClient.connectToServer(process.argv[2]);
    chatLoop(mcpClient);
  } finally {
    await mcpClient.cleanup();
  }
}

main().catch((error) => {
  console.error("Error in main function:", error);
  process.exit(1);
});
