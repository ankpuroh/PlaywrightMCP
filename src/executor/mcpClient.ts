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

export function parseServerCommand(commandLine: string): {
  command: string;
  args: string[];
} {
  const parts: string[] = [];
  const tokenPattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(commandLine)) !== null) {
    parts.push(match[1] ?? match[2] ?? match[3]);
  }

  if (parts.length === 0) {
    throw new Error("MCP server command is empty");
  }

  const [command, ...args] = parts;
  return { command, args };
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

      const { command, args } = parseServerCommand(this.serverCommand);

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

      const mcpResult = result as MCPToolResult;

      // The Playwright MCP server signals failures by embedding an error message in
      // content[0].text (starting with "Error:") rather than raising an MCP-level
      // error.  Detect both the protocol-level isError flag and the text prefix so
      // the executor's catch block receives a proper thrown error and can mark the
      // step as failed instead of falsely reporting success.
      const firstText = mcpResult.content?.[0]?.text ?? "";
      if (mcpResult.isError || firstText.startsWith("Error:")) {
        throw new Error(firstText || `Tool ${toolName} returned an error`);
      }

      return mcpResult;
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
   * Select dropdown option via Playwright MCP
   */
  async selectOption(ref: string, values: string[]): Promise<MCPToolResult> {
    return this.callTool("mcp_microsoft_pla_browser_select_option", {
      ref,
      values,
    });
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
   * Reload current page
   */
  async reload(): Promise<MCPToolResult> {
    return this.callTool("mcp_microsoft_pla_browser_reload", {});
  }

  /**
   * Get value or text content from an element
   */
  async getValue(ref: string): Promise<MCPToolResult> {
    return this.callTool("mcp_microsoft_pla_browser_get_value", { ref });
  }

  /**
   * Clear input text in an element
   */
  async clearText(ref: string): Promise<MCPToolResult> {
    return this.callTool("mcp_microsoft_pla_browser_clear_text", { ref });
  }

  /**
   * Check element visible
   */
  async isVisible(ref: string): Promise<MCPToolResult> {
    return this.callTool("mcp_microsoft_pla_browser_is_visible", { ref });
  }

  /**
   * Check element exists
   */
  async elementExists(ref: string): Promise<MCPToolResult> {
    return this.callTool("mcp_microsoft_pla_browser_element_exists", { ref });
  }

  /**
   * Scroll page count times
   */
  async scroll(count: number = 1): Promise<MCPToolResult> {
    return this.callTool("mcp_microsoft_pla_browser_scroll", { count });
  }

  /**
   * Focus and send ArrowDown key
   */
  async focusThenDownarrow(ref: string): Promise<MCPToolResult> {
    return this.callTool("mcp_microsoft_pla_browser_focus_then_downarrow", { ref });
  }

  /**
   * Focus and send ArrowDown + Tab
   */
  async sendDownarrowThenTab(ref: string): Promise<MCPToolResult> {
    return this.callTool("mcp_microsoft_pla_browser_send_downarrow_tab", { ref });
  }

  /**
   * Select dropdown option by index
   */
  async selectByIndex(ref: string, index: number): Promise<MCPToolResult> {
    return this.callTool("mcp_microsoft_pla_browser_select_by_index", { ref, index });
  }

  /**
   * Get all open tabs info
   */
  async getAllTabs(): Promise<MCPToolResult> {
    return this.callTool("mcp_microsoft_pla_browser_get_all_tabs", {});
  }

  /**
   * Switch to specified tab index
   */
  async switchTab(index: number): Promise<MCPToolResult> {
    return this.callTool("mcp_microsoft_pla_browser_switch_tab", { index });
  }

  /**
   * Switch to latest tab (helper)
   */
  async switchToLatestTab(): Promise<MCPToolResult> {
    const tabs = await this.getAllTabs();
    const tabList = JSON.parse(tabs.content?.[0]?.text || "[]");
    const lastIndex = Array.isArray(tabList) ? tabList.length - 1 : -1;
    if (lastIndex < 0) {
      throw new Error("No tabs available to switch");
    }
    return this.switchTab(lastIndex);
  }

  /**
   * Wait for new tab to appear
   */
  async waitForNewTab(initialCount?: number, timeout?: number): Promise<MCPToolResult> {
    const args: Record<string, number> = {};
    if (initialCount !== undefined) args.initialCount = initialCount;
    if (timeout !== undefined) args.timeout = timeout;
    return this.callTool("mcp_microsoft_pla_browser_wait_new_tab", args);
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
