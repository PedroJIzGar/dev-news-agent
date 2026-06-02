import { AnalyzedArticle } from "./ai-news-analyzer.js";
import { log } from "./logger.js";

export async function sendTelegramNotification(
  articles: AnalyzedArticle[],
  archivePath: string,
): Promise<void> {
  const enabled = process.env.ENABLE_TELEGRAM_NOTIFICATIONS === "true";

  if (!enabled) {
    await log("TELEGRAM", "Telegram notifications are disabled.");
    return;
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    await log(
      "TELEGRAM",
      "Telegram credentials are missing. Notification skipped.",
    );
    return;
  }

  const message = buildTelegramMessage(articles, archivePath);

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        disable_web_page_preview: true,
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Telegram notification failed: ${response.status} ${errorText}`,
    );
  }

  await log("TELEGRAM", "Telegram notification sent successfully.");
}

function buildTelegramMessage(
  articles: AnalyzedArticle[],
  archivePath: string,
): string {
  const sortedArticles = [...articles].sort((a, b) => b.score - a.score);

  const highCount = articles.filter(
    (article) => article.priority === "high",
  ).length;
  const mediumCount = articles.filter(
    (article) => article.priority === "medium",
  ).length;
  const lowCount = articles.filter(
    (article) => article.priority === "low",
  ).length;

  const topArticles = sortedArticles.slice(0, 3);

  const topText = topArticles
    .map((article, index) => {
      return `${index + 1}. ${article.title} — ${article.score}/10`;
    })
    .join("\n");

  return `🗞 Dev News Agent

Analizadas: ${articles.length} noticias
Alta prioridad: ${highCount}
Media prioridad: ${mediumCount}
Baja prioridad: ${lowCount}

Top 3
${topText}

Archivo generado:
${archivePath}`;
}
