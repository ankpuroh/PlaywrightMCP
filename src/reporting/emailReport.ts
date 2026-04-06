import fs from "fs-extra";
import path from "path";
import { ExecutionSummary } from "../executor/runner";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toRows(summary: ExecutionSummary): string {
  return summary.results
    .map((result) => {
      const statusColor = result.success ? "#0f9d58" : "#d93025";
      return `<tr>
  <td>${escapeHtml(result.stepId)}</td>
  <td>${escapeHtml(result.action)}</td>
  <td style=\"color:${statusColor};font-weight:700;\">${result.success ? "PASS" : "FAIL"}</td>
  <td>${result.duration} ms</td>
  <td>${escapeHtml(result.error || result.result || "")}</td>
</tr>`;
    })
    .join("\n");
}

function buildEmailHtml(summary: ExecutionSummary): string {
  const statusColor = summary.status === "PASSED" ? "#0f9d58" : "#d93025";

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Automation Execution Report</title>
</head>
<body style="font-family:Segoe UI,Arial,sans-serif;background:#f6f8fb;color:#1f2937;padding:24px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:900px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:24px;">
    <tr>
      <td>
        <h2 style="margin:0 0 12px 0;">Automation Execution Report</h2>
        <p style="margin:0 0 16px 0;font-size:14px;color:#4b5563;">Generated at ${new Date().toISOString()}</p>
        <p style="margin:0 0 8px 0;"><strong>Status:</strong> <span style="color:${statusColor};font-weight:700;">${summary.status}</span></p>
        <p style="margin:0 0 8px 0;"><strong>Total Steps:</strong> ${summary.totalSteps}</p>
        <p style="margin:0 0 8px 0;"><strong>Passed:</strong> ${summary.passedSteps}</p>
        <p style="margin:0 0 8px 0;"><strong>Failed:</strong> ${summary.failedSteps}</p>
        <p style="margin:0 0 16px 0;"><strong>Total Duration:</strong> ${summary.totalDuration} ms</p>
        <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f3f4f6;text-align:left;">
              <th style="border:1px solid #e5e7eb;">Step ID</th>
              <th style="border:1px solid #e5e7eb;">Action</th>
              <th style="border:1px solid #e5e7eb;">Status</th>
              <th style="border:1px solid #e5e7eb;">Duration</th>
              <th style="border:1px solid #e5e7eb;">Details</th>
            </tr>
          </thead>
          <tbody>
            ${toRows(summary)}
          </tbody>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildEmailText(summary: ExecutionSummary): string {
  const lines = [
    "Automation Execution Report",
    `Generated At: ${new Date().toISOString()}`,
    `Status: ${summary.status}`,
    `Total Steps: ${summary.totalSteps}`,
    `Passed: ${summary.passedSteps}`,
    `Failed: ${summary.failedSteps}`,
    `Total Duration: ${summary.totalDuration} ms`,
    "",
    "Step Details:",
  ];

  for (const r of summary.results) {
    lines.push(
      `- ${r.stepId} | ${r.action} | ${r.success ? "PASS" : "FAIL"} | ${r.duration} ms | ${r.error || r.result || ""}`
    );
  }

  return lines.join("\n");
}

export async function generateEmailReport(
  artifactDir: string,
  summary: ExecutionSummary
): Promise<{ htmlPath: string; textPath: string }> {
  const htmlPath = path.join(artifactDir, "report-email.html");
  const textPath = path.join(artifactDir, "report-email.txt");

  await fs.writeFile(htmlPath, buildEmailHtml(summary), "utf-8");
  await fs.writeFile(textPath, buildEmailText(summary), "utf-8");

  return { htmlPath, textPath };
}
