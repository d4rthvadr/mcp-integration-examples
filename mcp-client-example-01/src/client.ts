import { Anthropic } from "@anthropic-ai/sdk";
import {
  ContentBlock,
  MessageParam,
  Tool,
} from "@anthropic-ai/sdk/resources/messages/messages";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export class ModelContextProtocolClient {
  #mcp: Client;
  #anthropic: Anthropic;
  #transport: StdioClientTransport | null = null;
  #tools: Tool[] = [];
  #finalText: string[] = [];
  #toolResults: unknown[] = [];
  constructor(anthropic: Anthropic, mcp: Client) {
    this.#anthropic = anthropic;
    this.#mcp = mcp;
  }

  isValidServerScriptType(
    serverScriptPath: string,
    type: ".js" | ".py"
  ): boolean {
    return serverScriptPath.endsWith(type);
  }

  validateServerScript(serverScriptPath: string): void {
    if (
      !this.isValidServerScriptType(serverScriptPath, ".py") &&
      !this.isValidServerScriptType(serverScriptPath, ".js")
    ) {
      throw new Error(
        `Invalid server script: ${serverScriptPath}. Must be a .js or .py file.`
      );
    }
  }

  getCommandScriptPath(isPy: boolean): string {
    if (isPy) {
      return process.platform === "win32" ? "python" : "python3";
    }
    return process.execPath;
  }

  getCommand(serverScriptPath: string): string {
    // Determine the command to run based on the script type

    this.validateServerScript(serverScriptPath);

    const isPy = this.isValidServerScriptType(serverScriptPath, ".py");

    return this.getCommandScriptPath(isPy);
  }

  async connectToServer(serverScriptPath: string) {
    try {
      // Reset tools to avoid stale data
      this.#tools = [];

      const command = this.getCommand(serverScriptPath);

      this.#transport = new StdioClientTransport({
        command,
        args: [serverScriptPath],
      });

      await this.#mcp.connect(this.#transport);

      const toolsResult = await this.#mcp.listTools();

      this.#tools = toolsResult.tools.map((tool) => {
        return {
          name: tool.name,
          description: tool.description,
          input_schema: tool.inputSchema,
        };
      });

      console.log(
        "Connected to server with tools:",
        this.#tools.map(({ name }) => name)
      );
    } catch (e) {
      console.log("Failed to connect to MCP server: ", e);
      throw e;
    }
  }

  async processQuery(query: string) {
    // Reset tool results and final text
    this.#resetToolResults();
    this.#resetFinalText();

    const messages: MessageParam[] = [
      {
        role: "user",
        content: query,
      },
    ];

    const contents = (await this.createModelMessage(messages)) || [];

    for (const content of contents) {
      await this.processResponse(content, messages);
    }

    return this.#getFinalText();
  }

  async createModelMessage(
    messages: MessageParam[]
  ): Promise<Anthropic.Messages.ContentBlock[]> {
    const response = await this.#anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
      messages,
      tools: this.#tools,
    });

    return response.content;
  }

  #resetToolResults() {
    this.#toolResults = [];
  }

  #resetFinalText() {
    this.#finalText = [];
  }

  #addFinalText(text: string) {
    this.#finalText.push(text);
  }

  #getFinalText(): string {
    return this.#finalText.join("\n");
  }

  #addToolResult(result: unknown) {
    this.#toolResults.push(result);
  }

  async processResponse(content: ContentBlock, messages: MessageParam[]) {
    if (content.type === "text") {
      this.#addFinalText(content.text);
    } else if (content.type === "tool_use") {
      const toolName = content.name;
      const toolArgs = content.input as { [x: string]: unknown } | undefined;

      const result = await this.#mcp.callTool({
        name: toolName,
        arguments: toolArgs,
      });

      this.#addToolResult(result);

      this.#addFinalText(
        `[Calling tool ${toolName} with arguments ${JSON.stringify(toolArgs)}]`
      );

      messages.push({
        role: "user",
        content: result.content as string,
      });

      const newContent = await this.createModelMessage(messages);

      this.#addFinalText(
        newContent[0].type === "text" ? newContent[0].text : ""
      );
    }
  }

  async cleanup() {
    await this.#mcp.close();
  }
}
