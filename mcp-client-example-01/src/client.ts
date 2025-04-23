import { Anthropic } from "@anthropic-ai/sdk";
import {
  ContentBlock,
  MessageParam,
  Model,
  Tool,
} from "@anthropic-ai/sdk/resources/messages/messages";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

/**
 * A client for interacting with the Model Context Protocol (MCP) server.
 *
 * This class provides methods to connect to an MCP server, validate server scripts,
 * process user queries, and manage tools available on the server.
 *
 * @remarks
 * - The client supports both Python and JavaScript server scripts.
 * - It integrates with the Anthropic API for generating model messages.
 *
 * @example
 * ```typescript
 * const client = new ModelContextProtocolClient(model, anthropic, mcp);
 * await client.connectToServer("server-script.py");
 * const result = await client.processQuery("What is the weather today?");
 * console.log(result);
 * await client.cleanup();
 * ```
 */
export class ModelContextProtocolClient {
  #model: Model;
  #mcp: Client;
  #anthropic: Anthropic;
  #transport: StdioClientTransport | null = null;
  #tools: Tool[] = [];
  #finalText: string[] = [];
  #toolResults: unknown[] = [];
  constructor(model: string, anthropic: Anthropic, mcp: Client) {
    this.#model = model;
    this.#anthropic = anthropic;
    this.#mcp = mcp;
  }

  /**
   * Checks if the given server script path ends with the specified file type.
   *
   * @param serverScriptPath - The path of the server script to validate.
   * @param type - The expected file type, either ".js" or ".py".
   * @returns `true` if the server script path ends with the specified type, otherwise `false`.
   */
  isValidServerScriptType(
    serverScriptPath: string,
    type: ".js" | ".py"
  ): boolean {
    return serverScriptPath.endsWith(type);
  }

  /**
   * Validates the provided server script file path to ensure it has a valid file extension.
   * The valid extensions are `.js` and `.py`.
   *
   * @param serverScriptPath - The file path of the server script to validate.
   * @throws {Error} Throws an error if the file does not have a `.js` or `.py` extension.
   */
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

  /**
   * Determines the appropriate command script path based on the platform and whether Python is required.
   *
   * @param isPy - A boolean indicating whether the command script path should point to Python.
   *               If `true`, returns the Python executable path based on the operating system.
   *               If `false`, returns the Node.js executable path.
   * @returns The command script path as a string. For Python, it returns "python" on Windows
   *          and "python3" on other platforms. For Node.js, it returns the path to the Node.js executable.
   */
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

  /**
   * Connects to an MCP server using the specified server script path.
   *
   * This method initializes a connection to the server, retrieves the list of tools
   * available on the server, and updates the internal tools list with their details.
   *
   * @param serverScriptPath - The file path to the server script to connect to.
   *
   * @throws Will throw an error if the connection to the MCP server fails.
   */
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

  /**
   * Processes a user query by resetting tool results, generating model messages,
   * and handling responses to produce a final text result.
   *
   * @param query - The user-provided query string to process.
   * @returns A promise that resolves to the final processed text result.
   */
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

  /**
   * Creates a model message using the Anthropic API.
   *
   * @param messages - An array of message parameters to be sent to the model.
   * @returns A promise that resolves to an array of content blocks returned by the model.
   *
   * @throws Will throw an error if the API request fails.
   */
  async createModelMessage(
    messages: MessageParam[]
  ): Promise<Anthropic.Messages.ContentBlock[]> {
    const response = await this.#anthropic.messages.create({
      model: this.#model,
      max_tokens: 1000,
      messages,
      tools: this.#tools,
    });

    return response.content;
  }

  /**
   * Resets the tool results by clearing the internal array.
   * This method is used to initialize or reset the state of tool results.
   */
  #resetToolResults() {
    this.#toolResults = [];
  }

  /**
   * Resets the final text array to an empty state.
   */
  #resetFinalText() {
    this.#finalText = [];
  }

  /**
   * Adds the provided text to the final text array.
   *
   * @param text - The text to be added.
   */
  #addFinalText(text: string) {
    this.#finalText.push(text);
  }

  /**
   * Retrieves the final text as a single string, with each element joined by a newline character.
   * @returns The final text as a newline-separated string.
   */
  #getFinalText(): string {
    return this.#finalText.join("\n");
  }

  /**
   * Adds a tool result to the internal collection.
   *
   * @param result - The result to be added.
   */
  #addToolResult(result: unknown) {
    this.#toolResults.push(result);
  }

  /**
   * Processes a response based on the provided content and updates the message flow accordingly.
   *
   * @param content - The content block to process. It can be of type "text" or "tool_use".
   *   - If the type is "text", the text content is added to the final output.
   *   - If the type is "tool_use", a tool is called with the specified name and arguments,
   *     and the result is processed and added to the final output.
   * @param messages - An array of message parameters representing the conversation flow.
   *   - This array is updated with the result of the tool call when the content type is "tool_use".
   *
   * @remarks
   * - For "tool_use" content, the method calls a tool using the `#mcp.callTool` method,
   *   processes the result, and appends it to the conversation flow.
   * - The method also generates a new model message based on the updated messages
   *   and appends the resulting text to the final output.
   * - The method assumes that the `createModelMessage` function returns an array of content blocks.
   *
   * @throws Will throw an error if the tool call fails or if the content type is unsupported.
   */
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

  /**
   * Cleans up resources by closing the MCP connection.
   * This method ensures that the MCP client is properly closed to prevent resource leaks.
   *
   * @throws Will log an error to the console if an exception occurs during the cleanup process.
   */
  async cleanup() {
    try {
      await this.#mcp.close();
    } catch (e) {
      console.error("Error during cleanup:", e);
    }
  }
}
