import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Logger } from "../utils/logger";

export interface MCPToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface MCPToolResult {
  content: Array<{
    type: string;
    text?: string;
    data?: string;
  }>;
  isError?: boolean;
}

/**
 * MCP Client for Playwright server
 * Handles connection and tool calls to the Playwright MCP server
 */
export class PlaywrightMCPClient {
  private client: Client;
  private logger: Logger;
  private serverCommand: string;

  constructor(logger: Logger, serverCommand: string = "node playwright-mcp-server.js") {
    this.logger = logger;
    this.serverCommand = serverCommand;
    this.client = new Client(
      {
        name: "automation-framework",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );
  }

  /**
   * Connect to Playwright MCP server via stdio transport
   */
  async connect(): Promise<void> {
    try {
      this.logger.info(`Connecting to Playwright MCP server: ${this.serverCommand}`);

      // Parse command and arguments
      const [command, ...args] = this.serverCommand.split(' ');

      const transport = new StdioClientTransport({
        command,
        args,
      });

      await this.client.connect(transport);
      this.logger.success("Successfully connected to Playwright MCP server");
    } catch (error) {
      this.logger.error("Failed to connect to MCP server", {
        error: String(error),
        serverCommand: this.serverCommand,
      });
      throw error;
    }
  }

  /**
   * List available tools from the MCP server
   */
  async listTools(): Promise<Array<{ name: string; description: string }>> {
    try {
      const tools = await this.client.listTools();
      return tools.tools.map((tool) => ({
        name: tool.name,
        description: tool.description || "",
      }));
    } catch (error) {
      this.logger.error("Failed to list MCP tools", { error: String(error) });
      throw error;
    }
  }

  /**
   * Call a Playwright MCP tool
   */
  async callTool(
    toolName: string,
    toolArguments: Record<string, unknown>
  ): Promise<MCPToolResult> {
    try {
      this.logger.debug(`Calling MCP tool: ${toolName}`, toolArguments);

      const result = await this.client.callTool({
        name: toolName,
        arguments: toolArguments,
      });

      this.logger.debug(`Tool result for ${toolName}`, {
        content: result.content,
      });

      return result as MCPToolResult;
    } catch (error) {
      this.logger.error(`Failed to call tool ${toolName}`, {
        error: String(error),
        arguments: toolArguments,
      });
      throw error;
    }
  }

  /**
   * Navigate to a URL via Playwright MCP
   */
  async navigate(url: string): Promise<MCPToolResult> {
    return this.callTool("mcp_microsoft_pla_browser_navigate", { url });
  }

  /**
   * Click an element via Playwright MCP
   */
  async click(
    ref: string,
    element: string = "element"
  ): Promise<MCPToolResult> {
    return this.callTool("mcp_microsoft_pla_browser_click", {
      ref,
      element,
    });
  }

  /**
   * Fill a form field via Playwright MCP
   */
  async fill(
    ref: string,
    text: string,
    element: string = "element"
  ): Promise<MCPToolResult> {
    return this.callTool("mcp_microsoft_pla_browser_type", {
      ref,
      text,
      element,
    });
  }

  /**
   * Press a key via Playwright MCP
   */
  async pressKey(key: string): Promise<MCPToolResult> {
    return this.callTool("mcp_microsoft_pla_browser_press_key", { key });
  }

  /**
   * Wait for text to appear/disappear via Playwright MCP
   */
  async waitFor(text?: string, time?: number): Promise<MCPToolResult> {
    const args: Record<string, string | number> = {};
    if (text) args.text = text;
    if (time) args.time = time;
    return this.callTool("mcp_microsoft_pla_browser_wait_for", args);
  }

  /**
   * Take a screenshot via Playwright MCP
   */
  async screenshot(
    filename?: string,
    fullPage: boolean = false
  ): Promise<MCPToolResult> {
    const args: Record<string, string | boolean> = {
      type: "png",
      fullPage,
    };
    if (filename) args.filename = filename;
    return this.callTool("mcp_microsoft_pla_browser_take_screenshot", args);
  }

  /**
   * Get page snapshot via Playwright MCP
   */
  async getSnapshot(): Promise<MCPToolResult> {
    return this.callTool("mcp_microsoft_pla_browser_snapshot", {});
  }

  /**
   * Close the browser via Playwright MCP
   */
  async close(): Promise<void> {
    try {
      await this.callTool("mcp_microsoft_pla_browser_close", {});
      this.logger.info("Browser closed");
    } catch (error) {
      this.logger.warn("Error closing browser", { error: String(error) });
    }
  }

  /**
   * Disconnect from MCP server
   */
  async disconnect(): Promise<void> {
    try {
      await this.client.close?.();
      this.logger.info("Disconnected from MCP server");
    } catch (error) {
      this.logger.warn("Error disconnecting from MCP server", {
        error: String(error),
      });
    }
  }
}
