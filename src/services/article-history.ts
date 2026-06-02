import fs from "node:fs/promises";
import path from "node:path";
import { RawArticle } from "./feed-reader.js";

type ArticleHistory = {
  seenUrls: string[];
};

const historyDir = path.join(process.cwd(), "data");
const historyFilePath = path.join(historyDir, "seen-articles.json");

export async function filterUnseenArticles(
  articles: RawArticle[],
): Promise<RawArticle[]> {
  const history = await readArticleHistory();
  const seenUrls = new Set(history.seenUrls);

  return articles.filter((article) => {
    return article.url && !seenUrls.has(article.url);
  });
}

export async function saveSeenArticles(articles: RawArticle[]): Promise<void> {
  const history = await readArticleHistory();

  const seenUrls = new Set(history.seenUrls);

  articles.forEach((article) => {
    if (article.url) {
      seenUrls.add(article.url);
    }
  });

  const updatedHistory: ArticleHistory = {
    seenUrls: [...seenUrls].sort(),
  };

  await fs.mkdir(historyDir, { recursive: true });

  await fs.writeFile(
    historyFilePath,
    JSON.stringify(updatedHistory, null, 2),
    "utf-8",
  );
}

async function readArticleHistory(): Promise<ArticleHistory> {
  try {
    const fileContent = await fs.readFile(historyFilePath, "utf-8");
    const parsedHistory = JSON.parse(fileContent) as ArticleHistory;

    return {
      seenUrls: parsedHistory.seenUrls ?? [],
    };
  } catch (error) {
    return {
      seenUrls: [],
    };
  }
}
