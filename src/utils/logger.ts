import chalk from "chalk";
import fs from "fs-extra";
import path from "path";

export interface LogEntry {
  timestamp: string;
  level: "INFO" | "SUCCESS" | "ERROR" | "WARN" | "DEBUG";
  message: string;
  data?: Record<string, unknown>;
}

export class Logger {
  private logs: LogEntry[] = [];
  private logFilePath: string;

  constructor(artifactDir: string) {
    this.logFilePath = path.join(artifactDir, "execution.log");
  }

  private log(
    level: LogEntry["level"],
    message: string,
    data?: Record<string, unknown>
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };

    this.logs.push(entry);

    const prefix = {
      INFO: chalk.blue("ℹ️  INFO"),
      SUCCESS: chalk.green("✓ SUCCESS"),
      ERROR: chalk.red("✗ ERROR"),
      WARN: chalk.yellow("⚠ WARN"),
      DEBUG: chalk.gray("🐛 DEBUG"),
    };

    console.log(`${prefix[level]} ${message}`);
    if (data) {
      console.log(chalk.gray(JSON.stringify(data, null, 2)));
    }
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log("INFO", message, data);
  }

  success(message: string, data?: Record<string, unknown>): void {
    this.log("SUCCESS", message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.log("ERROR", message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log("WARN", message, data);
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log("DEBUG", message, data);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  async saveLogs(): Promise<void> {
    const logContent = this.logs
      .map(
        (entry) =>
          `[${entry.timestamp}] [${entry.level}] ${entry.message}${
            entry.data ? "\n" + JSON.stringify(entry.data, null, 2) : ""
          }`
      )
      .join("\n\n");

    await fs.ensureDir(path.dirname(this.logFilePath));
    await fs.writeFile(this.logFilePath, logContent, "utf-8");
    this.info(`Logs saved to ${this.logFilePath}`);
  }
}
