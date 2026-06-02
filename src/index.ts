import "dotenv/config";
import { newsSources } from "./config/sources.js";
import { readFeeds } from "./services/feed-reader.js";
import {
  filterUnseenArticles,
  saveSeenArticles,
} from "./services/article-history.js";
import { prefilterArticles } from "./services/article-prefilter.js";
import { analyzeNewsWithAI } from "./services/ai-news-analyzer.js";
import { saveDailyMarkdownArchive } from "./services/markdown-archiver.js";
import { log, logError } from "./services/logger.js";
import { sendTelegramNotification } from "./services/telegram-notifier.js";
import { saveDailyJsonArchive } from "./services/json-archiver.js";

async function main(): Promise<void> {
  await log("START", "Dev News Agent started.");

  const rawArticles = await readFeeds(newsSources);

  await log("RSS", `Collected ${rawArticles.length} articles from RSS feeds.`);

  if (rawArticles.length === 0) {
    await log("DONE", "No articles found.");
    return;
  }

  const unseenArticles = await filterUnseenArticles(rawArticles);

  await log(
    "HISTORY",
    `Found ${unseenArticles.length} new articles after historical deduplication.`,
  );

  if (unseenArticles.length === 0) {
    await log(
      "DONE",
      "No new articles found. Everything has already been processed.",
    );
    return;
  }

  const prefilteredArticles = prefilterArticles(unseenArticles);

  await log(
    "FILTER",
    `Selected ${prefilteredArticles.length} articles after local prefilter.`,
  );

  if (prefilteredArticles.length === 0) {
    await log("DONE", "No relevant articles found after prefilter.");
    return;
  }

  await printPrefilterSummary(prefilteredArticles);

  const analyzedArticles = await analyzeNewsWithAI(prefilteredArticles);

  await log("AI", `Analyzed ${analyzedArticles.length} articles with Gemini.`);

  const markdownFilePath = await saveDailyMarkdownArchive(analyzedArticles);
  const jsonFilePath = await saveDailyJsonArchive(analyzedArticles);

  await saveSeenArticles(prefilteredArticles);

  try {
    await sendTelegramNotification(analyzedArticles, markdownFilePath);
  } catch (error) {
    await logError("TELEGRAM", error);
  }

  await log("ARCHIVE", `Archive saved at: ${markdownFilePath}`);
  await log("ARCHIVE", `JSON archive saved at: ${jsonFilePath}`);
  await log("DONE", "Dev News Agent finished successfully.");
}

async function printPrefilterSummary(
  articles: ReturnType<typeof prefilterArticles>,
): Promise<void> {
  await log("FILTER", "Top articles selected for AI analysis:");

  for (const [index, article] of articles.entries()) {
    await log(
      "FILTER",
      `${index + 1}. [${article.localScore}] ${article.title} — ${article.source}`,
    );

    if (article.matchedKeywords.length > 0) {
      await log("FILTER", `Matched: ${article.matchedKeywords.join(", ")}`);
    }
  }
}

main().catch(async (error) => {
  await log("ERROR", "Agent execution failed.");
  await logError("ERROR", error);
  process.exit(1);
});
