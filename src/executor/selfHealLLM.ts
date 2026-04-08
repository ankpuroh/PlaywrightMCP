const SYSTEM_PROMPT = `You are a test automation locator expert.
Generate exactly one stable XPath for the requested element from provided DOM.

Rules:
- Return ONLY the XPath string, no prose, no markdown.
- Prefer stable attributes in this order: id, name, aria-label, role, visible text.
- Avoid positional indexes like [1], [2], etc.
- Use normalize-space(text()) for visible text checks.
- XPath must start with // or /.`;

function buildUserPrompt(dom: string, description: string): string {
  const cappedDom = dom.length > 15000
    ? `${dom.slice(0, 15000)}\n<!-- DOM truncated -->`
    : dom;
  return `Element description: ${description}\n\nClean DOM:\n${cappedDom}\n\nXPath:`;
}

function extractXPath(raw: string): string | null {
  const cleaned = raw
    .trim()
    .replace(/^```[a-zA-Z]*\n?/, "")
    .replace(/\n?```$/, "")
    .trim();

  if (!cleaned) {
    return null;
  }

  if (!cleaned.startsWith("//") && !cleaned.startsWith("/")) {
    return null;
  }

  return cleaned;
}

async function callOpenAI(dom: string, description: string, apiKey: string): Promise<string | null> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0,
      max_tokens: 180,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(dom, description) },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI call failed with status ${response.status}`);
  }

  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return extractXPath(payload.choices?.[0]?.message?.content ?? "");
}

async function callOllama(dom: string, description: string): Promise<string | null> {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_MODEL ?? "llama3.2:latest";

  const response = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt: `${SYSTEM_PROMPT}\n\n${buildUserPrompt(dom, description)}`,
      stream: false,
      options: {
        temperature: 0,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama call failed with status ${response.status}`);
  }

  const payload = await response.json() as { response?: string };
  return extractXPath(payload.response ?? "");
}

/**
 * Generate a stable XPath using configured LLM provider.
 * Provider priority: OpenAI -> Ollama.
 * Returns null when no provider is configured or generation fails.
 */
export async function generateXPathWithLLM(
  dom: string,
  description: string
): Promise<string | null> {
  try {
    if (process.env.OPENAI_API_KEY) {
      return await callOpenAI(dom, description, process.env.OPENAI_API_KEY);
    }

    if (process.env.OLLAMA_BASE_URL || process.env.OLLAMA_MODEL) {
      return await callOllama(dom, description);
    }

    return null;
  } catch {
    return null;
  }
}
