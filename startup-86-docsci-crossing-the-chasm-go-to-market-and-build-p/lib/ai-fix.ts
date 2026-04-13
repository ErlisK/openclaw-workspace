// AI-powered fix suggestion generator
// Uses Vercel AI Gateway (Claude) to generate fix suggestions and unified diffs

interface FixInput {
  code: string;
  language: string;
  error: string;
  filePath: string;
}

interface FixResult {
  suggestion: string;
  patch: string;
}

export async function generateAIFix(input: FixInput): Promise<FixResult> {
  const { code, language, error, filePath } = input;

  // Only run in Vercel environment (OIDC token available)
  if (!process.env.VERCEL_OIDC_TOKEN && process.env.NODE_ENV !== "production") {
    return {
      suggestion: `[AI fix unavailable in local dev — deploy to Vercel to enable]\n\nError: ${error}`,
      patch: "",
    };
  }

  try {
    const { generateText } = await import("ai");
    const { createGateway } = await import("@ai-sdk/gateway");

    const gateway = createGateway();

    const prompt = `You are a documentation CI assistant. A code snippet in docs failed execution.

File: ${filePath}
Language: ${language}
Error: ${error}

Failing code:
\`\`\`${language}
${code}
\`\`\`

Provide:
1. A brief explanation of what's wrong (1-2 sentences)
2. The corrected code snippet
3. A unified diff patch (--- original / +++ fixed)

Format your response as:
EXPLANATION: <explanation>
FIXED_CODE:
\`\`\`${language}
<fixed code>
\`\`\`
PATCH:
<unified diff>`;

    const { text } = await generateText({
      model: gateway("anthropic/claude-haiku-4-5"),
      prompt,
      maxOutputTokens: 1024,
    });

    // Parse the response
    const explanationMatch = text.match(/EXPLANATION:\s*([\s\S]+?)(?=FIXED_CODE:|$)/);
    const patchMatch = text.match(/PATCH:\s*([\s\S]+?)$/);

    const suggestion = explanationMatch?.[1]?.trim() || text.slice(0, 500);
    const patch = patchMatch?.[1]?.trim() || "";

    return { suggestion, patch };
  } catch (err) {
    console.error("AI fix generation failed:", err);
    return {
      suggestion: `Failed to generate AI fix: ${String(err)}`,
      patch: "",
    };
  }
}
