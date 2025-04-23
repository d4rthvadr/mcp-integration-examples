import { Anthropic } from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import dotenv from "dotenv";
import { ModelContextProtocolClient } from "./client.js";
import { chatLoop } from "./chat-loop.js";

dotenv.config();

console.log("peek", process.env.ANTHROPIC_API_KEY);

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error("Please set the ANTHROPIC_API_KEY environment variable.");
  process.exit(1);
}

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
    anthropic,
    client
  );

  try {
    await mcpClient.connectToServer(process.argv[2]);
    chatLoop(mcpClient);
  } finally {
    mcpClient.cleanup();
  }
}

main().catch((error) => {
  console.error("Error in main function:", error);
  process.exit(1);
});
