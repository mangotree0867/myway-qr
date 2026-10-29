// 서버 전용: 생성형 AI 호출 어댑터 (Claude / Gemini)
// 환경변수
//   LLM_PROVIDER = "anthropic" | "gemini"   (없으면 키가 있는 쪽을 자동 선택)
//   ANTHROPIC_API_KEY, ANTHROPIC_MODEL_FAST, ANTHROPIC_MODEL_VISION
//   GEMINI_API_KEY, GEMINI_MODEL_FAST, GEMINI_MODEL_VISION

export type JSONSchema = Record<string, unknown>;

export interface LLMRequest {
  system: string;
  user: string;
  image?: { mime: string; base64: string };
  schema: JSONSchema; // 응답 JSON 형식
  kind?: "fast" | "vision";
  maxTokens?: number;
}

export function provider(): "anthropic" | "gemini" | null {
  const p = process.env.LLM_PROVIDER;
  if (p === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (p === "gemini" && process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return null;
}

export function modelName(kind: "fast" | "vision" = "fast"): string {
  const p = provider();
  if (p === "anthropic")
    return kind === "vision"
      ? process.env.ANTHROPIC_MODEL_VISION || "claude-sonnet-5-5"
      : process.env.ANTHROPIC_MODEL_FAST || "claude-haiku-5-5";
  if (p === "gemini")
    return kind === "vision"
      ? process.env.GEMINI_MODEL_VISION || "gemini-2.5-flash"
      : process.env.GEMINI_MODEL_FAST || "gemini-2.5-flash";
  return "none";
}

export async function llmJSON<T>(req: LLMRequest): Promise<T> {
  const p = provider();
  if (!p) throw new Error("NO_AI_KEY");
  return p === "anthropic" ? callAnthropic<T>(req) : callGemini<T>(req);
}

async function callAnthropic<T>(req: LLMRequest): Promise<T> {
  const content: unknown[] = [];
  if (req.image) {
    content.push({ type: "image", source: { type: "base64", media_type: req.image.mime, data: req.image.base64 } });
  }
  content.push({ type: "text", text: req.user });
  const body = {
    model: modelName(req.kind),
    max_tokens: req.maxTokens ?? 2048,
    system: req.system,
    messages: [{ role: "user", content }],
    tools: [{ name: "answer", description: "결과를 정해진 형식으로 돌려준다", input_schema: req.schema }],
    tool_choice: { type: "tool", name: "answer" },
  };
  const send = (b: typeof body | Record<string, unknown>) =>
    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(b),
    });
  let res = await send(body);
  if (res.status === 400) {
    const err = await res.text();
    // 일부 모델은 도구 강제 선택을 지원하지 않는다 → 자동 선택 + 지시문으로 다시 요청
    if (!err.includes("tool_choice")) throw new Error(`anthropic 400: ${err.slice(0, 300)}`);
    res = await send({ ...body, system: body.system + "\n\n반드시 answer 도구를 한 번 호출해서 답한다. 다른 글은 쓰지 않는다.", tool_choice: { type: "auto" } });
  }
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const tool = data.content?.find((c: { type: string }) => c.type === "tool_use");
  if (tool) return tool.input as T;
  // 도구 대신 글로 JSON을 준 경우
  const text = (data.content || []).map((c: { text?: string }) => c.text ?? "").join("");
  const m = text.match(/\{[\s\S]*\}/);
  if (m) return JSON.parse(m[0]) as T;
  throw new Error("anthropic: no tool output");
}

// Gemini responseSchema는 OpenAPI 일부만 지원하므로 지원하지 않는 키를 지운다
function toGeminiSchema(s: unknown): unknown {
  if (Array.isArray(s)) return s.map(toGeminiSchema);
  if (s && typeof s === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(s as Record<string, unknown>)) {
      if (["additionalProperties", "$schema", "minItems", "maxItems", "minimum", "maximum"].includes(k)) continue;
      out[k] = toGeminiSchema(v);
    }
    return out;
  }
  return s;
}

async function callGemini<T>(req: LLMRequest): Promise<T> {
  const parts: unknown[] = [];
  if (req.image) parts.push({ inline_data: { mime_type: req.image.mime, data: req.image.base64 } });
  parts.push({ text: req.user });
  const body = {
    system_instruction: { parts: [{ text: req.system }] },
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: toGeminiSchema(req.schema),
      maxOutputTokens: req.maxTokens ?? 2048,
      temperature: 0.3,
    },
  };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName(req.kind)}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  return JSON.parse(text) as T;
}
