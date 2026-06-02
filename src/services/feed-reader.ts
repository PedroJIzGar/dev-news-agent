import Parser from "rss-parser";
import { NewsSource } from "../config/sources.js";

export type RawArticle = {
  title: string;
  url: string;
  source: string;
  sourceCategoryHint: string;
  publishedAt?: string;
  contentSnippet?: string;
};

const parser = new Parser();

export async function readFeeds(sources: NewsSource[]): Promise<RawArticle[]> {
  const articles: RawArticle[] = [];

  for (const source of sources) {
    try {
      const feed = await parser.parseURL(source.url);

      const sourceArticles = feed.items.map((item) => ({
        title: item.title ?? "Untitled",
        url: item.link ?? "",
        source: source.name,
        publishedAt: item.isoDate ?? item.pubDate,
        contentSnippet: item.contentSnippet ?? item.content ?? "",
        sourceCategoryHint: source.categoryHint,
      }));

      articles.push(...sourceArticles);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";

      console.warn(`Skipping feed "${source.name}": ${message}`);
    }
  }

  return removeDuplicatedArticles(articles);
}

function removeDuplicatedArticles(articles: RawArticle[]): RawArticle[] {
  const seenUrls = new Set<string>();

  return articles.filter((article) => {
    if (!article.url || seenUrls.has(article.url)) {
      return false;
    }

    seenUrls.add(article.url);
    return true;
  });
}
