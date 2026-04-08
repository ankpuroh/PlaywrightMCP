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
            name: "mcp_microsoft_pla_browser_select_option",
            description: "Select an option from a dropdown",
            inputSchema: {
              type: "object",
              properties: {
                ref: { type: "string" },
                values: { type: "array", items: { type: "string" } },
              },
              required: ["ref", "values"],
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
          {
            name: "mcp_microsoft_pla_browser_reload",
            description: "Reload current page",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "mcp_microsoft_pla_browser_get_value",
            description: "Get value or text from element",
            inputSchema: {
              type: "object",
              properties: {
                ref: { type: "string" },
              },
              required: ["ref"],
            },
          },
          {
            name: "mcp_microsoft_pla_browser_clear_text",
            description: "Clear text of input element",
            inputSchema: {
              type: "object",
              properties: {
                ref: { type: "string" },
              },
              required: ["ref"],
            },
          },
          {
            name: "mcp_microsoft_pla_browser_is_visible",
            description: "Check if element is visible",
            inputSchema: {
              type: "object",
              properties: {
                ref: { type: "string" },
              },
              required: ["ref"],
            },
          },
          {
            name: "mcp_microsoft_pla_browser_element_exists",
            description: "Check if element exists",
            inputSchema: {
              type: "object",
              properties: {
                ref: { type: "string" },
              },
              required: ["ref"],
            },
          },
          {
            name: "mcp_microsoft_pla_browser_scroll",
            description: "Scroll page",
            inputSchema: {
              type: "object",
              properties: {
                count: { type: "number" },
              },
            },
          },
          {
            name: "mcp_microsoft_pla_browser_focus_then_downarrow",
            description: "Focus and press ArrowDown",
            inputSchema: {
              type: "object",
              properties: {
                ref: { type: "string" },
              },
              required: ["ref"],
            },
          },
          {
            name: "mcp_microsoft_pla_browser_send_downarrow_tab",
            description: "Focus and press ArrowDown + Tab",
            inputSchema: {
              type: "object",
              properties: {
                ref: { type: "string" },
              },
              required: ["ref"],
            },
          },
          {
            name: "mcp_microsoft_pla_browser_select_by_index",
            description: "Select dropdown option by index",
            inputSchema: {
              type: "object",
              properties: {
                ref: { type: "string" },
                index: { type: "number" },
              },
              required: ["ref", "index"],
            },
          },
          {
            name: "mcp_microsoft_pla_browser_get_all_tabs",
            description: "Get all open tabs",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "mcp_microsoft_pla_browser_switch_tab",
            description: "Switch to tab index",
            inputSchema: {
              type: "object",
              properties: {
                index: { type: "number" },
              },
              required: ["index"],
            },
          },
          {
            name: "mcp_microsoft_pla_browser_wait_new_tab",
            description: "Wait for a new tab/window",
            inputSchema: {
              type: "object",
              properties: {
                initialCount: { type: "number" },
                timeout: { type: "number" },
              },
            },
          },
          {
            name: "mcp_microsoft_pla_browser_get_dom",
            description: "Get cleaned DOM body HTML for self-heal",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "mcp_microsoft_pla_browser_validate_xpath",
            description: "Validate XPath and return number of matches",
            inputSchema: {
              type: "object",
              properties: {
                xpath: { type: "string" },
              },
              required: ["xpath"],
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

          case "mcp_microsoft_pla_browser_select_option":
            await this.ensureBrowser();
            if (!this.page) {
              throw new Error("Page not available for selectOption");
            }
            if (!Array.isArray(args.values) || args.values.length === 0) {
              throw new Error("select_option requires values array");
            }
            const label = args.values[0];
            await this.page.selectOption(args.ref, { label });
            return {
              content: [{ type: "text", text: `Selected option '${label}' on ${args.ref}` }],
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

          case "mcp_microsoft_pla_browser_reload":
            await this.ensureBrowser();
            if (!this.page) {
              throw new Error("Page not available for reload");
            }
            await this.page.reload();
            return {
              content: [{ type: "text", text: "Page reloaded" }],
            };

          case "mcp_microsoft_pla_browser_get_value":
            await this.ensureBrowser();
            if (!this.page) {
              throw new Error("Page not available for get value");
            }
            const valueHandle = await this.page.$(args.ref);
            if (!valueHandle) {
              return { content: [{ type: "text", text: "" }] };
            }
            const inputValue = await valueHandle.evaluate((el) => {
              if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
                return el.value;
              }
              return el.textContent || "";
            });
            return {
              content: [{ type: "text", text: String(inputValue) }],
            };

          case "mcp_microsoft_pla_browser_clear_text":
            await this.ensureBrowser();
            if (!this.page) {
              throw new Error("Page not available for clear text");
            }
            await this.page.fill(args.ref, "");
            return {
              content: [{ type: "text", text: `Cleared text in ${args.ref}` }],
            };

          case "mcp_microsoft_pla_browser_is_visible":
            await this.ensureBrowser();
            if (!this.page) {
              throw new Error("Page not available for is_visible");
            }
            const visible = await this.page.isVisible(args.ref);
            return {
              content: [{ type: "text", text: String(visible) }],
            };

          case "mcp_microsoft_pla_browser_element_exists":
            await this.ensureBrowser();
            if (!this.page) {
              throw new Error("Page not available for element_exists");
            }
            const element = await this.page.$(args.ref);
            return {
              content: [{ type: "text", text: String(Boolean(element)) }],
            };

          case "mcp_microsoft_pla_browser_scroll":
            await this.ensureBrowser();
            if (!this.page) {
              throw new Error("Page not available for scroll");
            }
            const count = typeof args.count === "number" ? args.count : 1;
            await this.page.evaluate((scrollCount) => {
              window.scrollBy(0, window.innerHeight * scrollCount);
            }, count);
            return {
              content: [{ type: "text", text: `Scrolled ${count} page(s)` }],
            };

          case "mcp_microsoft_pla_browser_focus_then_downarrow":
            await this.ensureBrowser();
            if (!this.page) {
              throw new Error("Page not available for focus_then_downarrow");
            }
            await this.page.focus(args.ref);
            await this.page.keyboard.press("ArrowDown");
            return {
              content: [{ type: "text", text: `Focused ${args.ref} and pressed ArrowDown` }],
            };

          case "mcp_microsoft_pla_browser_send_downarrow_tab":
            await this.ensureBrowser();
            if (!this.page) {
              throw new Error("Page not available for send_downarrow_tab");
            }
            await this.page.focus(args.ref);
            await this.page.keyboard.press("ArrowDown");
            await this.page.keyboard.press("Tab");
            return {
              content: [{ type: "text", text: `Focused ${args.ref} and pressed ArrowDown + Tab` }],
            };

          case "mcp_microsoft_pla_browser_select_by_index":
            await this.ensureBrowser();
            if (!this.page) {
              throw new Error("Page not available for select_by_index");
            }
            await this.page.selectOption(args.ref, { index: args.index });
            return {
              content: [{ type: "text", text: `Selected index ${args.index} for ${args.ref}` }],
            };

          case "mcp_microsoft_pla_browser_get_all_tabs":
            await this.ensureBrowser();
            if (!this.browser) {
              throw new Error("Browser not available for get_all_tabs");
            }
            const pages = this.browser.contexts().flatMap((ctx) => ctx.pages());
            const tabs = await Promise.all(
              pages.map(async (page, idx) => ({
                index: idx,
                url: page.url(),
                title: await page.title(),
                isCurrent: page === this.page,
              }))
            );
            return {
              content: [{ type: "text", text: JSON.stringify(tabs) }],
            };

          case "mcp_microsoft_pla_browser_switch_tab":
            await this.ensureBrowser();
            if (!this.browser) {
              throw new Error("Browser not available for switch_tab");
            }
            const allPages = this.browser.contexts().flatMap((ctx) => ctx.pages());
            if (args.index < 0 || args.index >= allPages.length) {
              throw new Error(`Invalid tab index ${args.index}`);
            }
            this.page = allPages[args.index];
            return {
              content: [{ type: "text", text: `Switched to tab ${args.index}` }],
            };

          case "mcp_microsoft_pla_browser_wait_new_tab":
            await this.ensureBrowser();
            if (!this.browser) {
              throw new Error("Browser not available for wait_new_tab");
            }
            const initial = typeof args.initialCount === "number" ? args.initialCount : this.browser.contexts().flatMap((ctx) => ctx.pages()).length;
            const timeoutMs = (typeof args.timeout === "number" ? args.timeout : 10) * 1000;
            const start = Date.now();
            let currentCount = initial;
            while (Date.now() - start < timeoutMs) {
              currentCount = this.browser.contexts().flatMap((ctx) => ctx.pages()).length;
              if (currentCount > initial) {
                return {
                  content: [{ type: "text", text: String(currentCount) }],
                };
              }
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
            throw new Error(`No new tab appeared after ${timeoutMs}ms`);

          case "mcp_microsoft_pla_browser_get_dom":
            await this.ensureBrowser();
            if (!this.page) {
              throw new Error("Page not available for get_dom");
            }
            const cleanedDom = await this.page.evaluate(() => {
              const bodyClone = document.body.cloneNode(true);

              bodyClone.querySelectorAll("script, style, noscript, iframe").forEach((el) => {
                el.remove();
              });

              bodyClone.querySelectorAll("*").forEach((el) => {
                Array.from(el.attributes)
                  .filter((attr) => attr.name.startsWith("on"))
                  .forEach((attr) => el.removeAttribute(attr.name));
              });

              return bodyClone.innerHTML;
            });

            return {
              content: [{ type: "text", text: cleanedDom }],
            };

          case "mcp_microsoft_pla_browser_validate_xpath":
            await this.ensureBrowser();
            if (!this.page) {
              throw new Error("Page not available for validate_xpath");
            }
            if (!args.xpath || typeof args.xpath !== "string") {
              throw new Error("validate_xpath requires a xpath string");
            }
            const xpathCount = await this.page.evaluate((xpath) => {
              try {
                const result = document.evaluate(
                  xpath,
                  document,
                  null,
                  XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                  null
                );
                return result.snapshotLength;
              } catch {
                return -1;
              }
            }, args.xpath);

            return {
              content: [{ type: "text", text: String(xpathCount) }],
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
      const executablePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
      this.browser = await chromium.launch({
        headless: false,
        executablePath: executablePath || undefined,
      });
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
