#!/usr/bin/env node

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const { chromium } = require("playwright");

class PlaywrightMCPServer {
  constructor() {
    this.browser = null;
    this.page = null;
    this.server = new Server(
      {
        name: "playwright-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "mcp_microsoft_pla_browser_navigate",
            description: "Navigate to a URL",
            inputSchema: {
              type: "object",
              properties: {
                url: { type: "string" },
              },
              required: ["url"],
            },
          },
          {
            name: "mcp_microsoft_pla_browser_click",
            description: "Click an element",
            inputSchema: {
              type: "object",
              properties: {
                ref: { type: "string" },
                element: { type: "string" },
              },
              required: ["ref"],
            },
          },
          {
            name: "mcp_microsoft_pla_browser_type",
            description: "Type text into an element",
            inputSchema: {
              type: "object",
              properties: {
                ref: { type: "string" },
                text: { type: "string" },
                element: { type: "string" },
              },
              required: ["ref", "text"],
            },
          },
          {
            name: "mcp_microsoft_pla_browser_press_key",
            description: "Press a keyboard key",
            inputSchema: {
              type: "object",
              properties: {
                key: { type: "string" },
              },
              required: ["key"],
            },
          },
          {
            name: "mcp_microsoft_pla_browser_wait_for",
            description: "Wait for text or time",
            inputSchema: {
              type: "object",
              properties: {
                text: { type: "string" },
                time: { type: "number" },
              },
            },
          },
          {
            name: "mcp_microsoft_pla_browser_take_screenshot",
            description: "Take a screenshot",
            inputSchema: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["png", "jpeg"] },
                fullPage: { type: "boolean" },
                filename: { type: "string" },
              },
              required: ["type"],
            },
          },
          {
            name: "mcp_microsoft_pla_browser_snapshot",
            description: "Get page accessibility snapshot",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "mcp_microsoft_pla_browser_close",
            description: "Close the browser",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "mcp_microsoft_pla_browser_navigate":
            await this.ensureBrowser();
            if (!this.page) {
              throw new Error("Page not available for navigation");
            }
            await this.page.goto(args.url);
            return {
              content: [{ type: "text", text: `Navigated to ${args.url}` }],
            };

          case "mcp_microsoft_pla_browser_click":
            await this.ensureBrowser();
            if (!this.page) {
              throw new Error("Page not available for click");
            }
            await this.page.click(args.ref);
            return {
              content: [{ type: "text", text: `Clicked ${args.ref}` }],
            };

          case "mcp_microsoft_pla_browser_type":
            await this.ensureBrowser();
            if (!this.page) {
              throw new Error("Page not available for typing");
            }
            await this.page.fill(args.ref, args.text);
            return {
              content: [{ type: "text", text: `Typed "${args.text}" into ${args.ref}` }],
            };

          case "mcp_microsoft_pla_browser_press_key":
            await this.ensureBrowser();
            if (!this.page) {
              throw new Error("Page not available for key press");
            }
            await this.page.keyboard.press(args.key);
            return {
              content: [{ type: "text", text: `Pressed key: ${args.key}` }],
            };

          case "mcp_microsoft_pla_browser_wait_for":
            await this.ensureBrowser();
            if (!this.page) {
              throw new Error("Page not available for wait");
            }
            if (args.text) {
              await this.page.waitForSelector(`text=${args.text}`);
            } else if (args.time) {
              await new Promise(resolve => setTimeout(resolve, args.time * 1000));
            }
            return {
              content: [{ type: "text", text: `Waited for ${args.text || `${args.time}s`}` }],
            };

          case "mcp_microsoft_pla_browser_take_screenshot":
            await this.ensureBrowser();
            if (!this.page) {
              throw new Error("Page not available for screenshot");
            }
            const screenshot = await this.page.screenshot({
              fullPage: args.fullPage || false,
              type: args.type || "png",
            });
            return {
              content: [
                { type: "text", text: "Screenshot taken" },
                { type: "image", data: screenshot.toString("base64"), mimeType: `image/${args.type || "png"}` }
              ],
            };

          case "mcp_microsoft_pla_browser_snapshot":
            await this.ensureBrowser();
            if (!this.page) {
              throw new Error("Page not available for snapshot");
            }
            // Wait for page to be ready
            await this.page.waitForLoadState('domcontentloaded');

            try {
              // Try accessibility snapshot first
              if (this.page.accessibility) {
                const snapshot = await this.page.accessibility.snapshot();
                return {
                  content: [{ type: "text", text: JSON.stringify(snapshot, null, 2) }],
                };
              }
            } catch (accessibilityError) {
              // Fallback: create a basic snapshot using page evaluation
              console.error("Accessibility API failed, using fallback:", accessibilityError.message);
            }

            // Fallback implementation
            const fallbackSnapshot = await this.page.evaluate(() => {
              function getElementInfo(element) {
                const rect = element.getBoundingClientRect();
                return {
                  role: element.getAttribute('role') || element.tagName.toLowerCase(),
                  name: element.textContent?.trim() || element.getAttribute('aria-label') || element.getAttribute('placeholder') || '',
                  level: parseInt(element.getAttribute('aria-level')) || 0,
                  children: Array.from(element.children).map(getElementInfo),
                  boundingBox: {
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height
                  }
                };
              }

              return {
                role: 'root',
                name: document.title || '',
                children: Array.from(document.body.children).map(getElementInfo)
              };
            });

            return {
              content: [{ type: "text", text: JSON.stringify(fallbackSnapshot, null, 2) }],
            };

          case "mcp_microsoft_pla_browser_close":
            if (this.browser) {
              await this.browser.close();
              this.browser = null;
              this.page = null;
            }
            return {
              content: [{ type: "text", text: "Browser closed" }],
            };

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    });
  }

  async ensureBrowser() {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: false });
    }
    if (!this.page) {
      this.page = await this.browser.newPage();
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Playwright MCP server running on stdio");
  }
}

// Run the server
const server = new PlaywrightMCPServer();
server.run().catch(console.error);
