import { PlaywrightMCPClient } from "./src/executor/mcpClient";
import { Logger } from "./src/utils/logger";
import path from "path";

async function manualLocatorDiscovery() {
  const logger = new Logger("./artifacts/manual");

  try {
    // Initialize MCP client
    const client = new PlaywrightMCPClient(logger, "node playwright-mcp-server.js");
    await client.connect();

    console.log("🔍 Starting manual locator discovery for TC01...");

    // Step 1: Navigate to SauceDemo
    console.log("\n1. Navigating to SauceDemo...");
    await client.callTool("mcp_microsoft_pla_browser_navigate", { url: "https://www.saucedemo.com/" });
    await client.callTool("mcp_microsoft_pla_browser_wait_for", { time: 3 });

    // Get snapshot for login page
    console.log("Getting snapshot for login page...");
    const snapshot1 = await client.callTool("mcp_microsoft_pla_browser_snapshot", {});
    console.log("Login page snapshot:", snapshot1);

    // Step 2: Login
    console.log("\n2. Performing login...");
    await client.callTool("mcp_microsoft_pla_browser_type", {
      ref: "#user-name",
      text: "standard_user"
    });
    await client.callTool("mcp_microsoft_pla_browser_type", {
      ref: "#password",
      text: "secret_sauce"
    });
    await client.callTool("mcp_microsoft_pla_browser_click", {
      ref: "#login-button"
    });
    await client.callTool("mcp_microsoft_pla_browser_wait_for", { time: 3 });

    // Get snapshot for products page
    console.log("Getting snapshot for products page...");
    const snapshot2 = await client.callTool("mcp_microsoft_pla_browser_snapshot", {});
    console.log("Products page snapshot:", snapshot2);

    // Step 4: Take screenshot of product detail page and look for add to cart button
    console.log("\n4. Taking screenshot of product detail page...");
    const screenshot1 = await client.callTool("mcp_microsoft_pla_browser_take_screenshot", {
      filename: "product_detail_page.png",
      fullPage: true
    });
    console.log("Screenshot saved:", screenshot1);

    // Try to find add to cart button by inspecting the page
    console.log("Looking for add to cart button...");

    // Step 5: Click add to cart (using known selector)
    console.log("\n5. Clicking add to cart...");
    await client.callTool("mcp_microsoft_pla_browser_click", {
      ref: "#add-to-cart-sauce-labs-bike-light"
    });
    await client.callTool("mcp_microsoft_pla_browser_wait_for", { time: 2 });

    // Step 6: Take screenshot of cart icon
    console.log("Taking screenshot after adding to cart...");
    const screenshot2 = await client.callTool("mcp_microsoft_pla_browser_take_screenshot", {
      filename: "after_add_to_cart.png",
      fullPage: true
    });
    console.log("Screenshot saved:", screenshot2);

    // Step 7: Click shopping cart
    console.log("\n6. Clicking shopping cart...");
    await client.callTool("mcp_microsoft_pla_browser_click", {
      ref: ".shopping_cart_link"
    });
    await client.callTool("mcp_microsoft_pla_browser_wait_for", { time: 2 });

    // Step 8: Take final screenshot
    console.log("Taking screenshot of cart page...");
    const screenshot3 = await client.callTool("mcp_microsoft_pla_browser_take_screenshot", {
      filename: "cart_page.png",
      fullPage: true
    });
    console.log("Screenshot saved:", screenshot3);

    console.log("\n✅ Manual locator discovery completed");
    await client.disconnect();

  } catch (error) {
    console.error("❌ Error during manual discovery:", error);
  }
}

manualLocatorDiscovery();