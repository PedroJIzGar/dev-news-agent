import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { RawArticle } from "./feed-reader.js";

const analyzedArticleSchema = z.object({
  title: z.string(),
  url: z.string(),
  source: z.string(),
  category: z.string(),
  priority: z.enum(["high", "medium", "low"]),
  score: z.number().min(1).max(10),
  summary: z.string(),
  whyItMatters: z.string(),
  recommendedAction: z.string(),
});

async function retry<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 2000,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      console.warn(
        `AI request failed. Attempt ${attempt}/${maxAttempts}. Retrying in ${delayMs}ms...`,
      );

      if (attempt < maxAttempts) {
        await sleep(delayMs);
      }
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const analyzedArticlesSchema = z.array(analyzedArticleSchema);

export type AnalyzedArticle = z.infer<typeof analyzedArticleSchema>;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function analyzeNewsWithAI(
  articles: RawArticle[],
): Promise<AnalyzedArticle[]> {
  const model = process.env.GEMINI_MODEL;

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY in .env file");
  }

  if (!model) {
    throw new Error("Missing GEMINI_MODEL in .env file");
  }

  const limitedArticles = articles.slice(0, 20);

  const prompt = buildPrompt(limitedArticles);

const response = await retry(() =>
  ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json"
    }
  })
);

  const text = response.text;

  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  const parsedJson: unknown = JSON.parse(text);

  return analyzedArticlesSchema.parse(parsedJson);
}

function buildPrompt(articles: RawArticle[]): string {
  return `
You are a technical news curator for a junior/intermediate software developer.

User profile:
- Interested in Java, Spring Boot, Angular, PostgreSQL, Docker, GitHub, security and AI for developers.
- Wants useful technical news, not marketing noise.
- The final language must be Spanish.

Your task:
Analyze each article and return ONLY valid JSON.
Do not include markdown.
Do not include explanations outside the JSON.

Return an array of objects.

Each object must have this exact shape:

{
  "title": "string",
  "url": "string",
  "source": "string",
  "category": "string",
  "priority": "high | medium | low",
  "score": 1,
  "summary": "string in Spanish",
  "whyItMatters": "string in Spanish",
  "recommendedAction": "string in Spanish"
}

Scoring rules:
- 9-10: Very relevant for Java, Spring Boot, Angular, security, AI development tools, GitHub, Docker, PostgreSQL or professional software development.
- 6-8: Useful but not urgent.
- 3-5: Interesting but secondary.
- 1-2: Low value or mostly marketing.

Priority rules:
- high: important, practical, security-related, or directly useful for the user's stack.
- medium: useful general knowledge.
- low: low practical impact.

Articles:
${JSON.stringify(articles, null, 2)}
`;
}
