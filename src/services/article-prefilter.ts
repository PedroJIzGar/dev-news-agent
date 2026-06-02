import { userPreferences } from "../config/user-preferences.js";
import { RawArticle } from "./feed-reader.js";

export type PrefilteredArticle = RawArticle & {
  localScore: number;
  matchedKeywords: string[];
};

export function prefilterArticles(
  articles: RawArticle[],
): PrefilteredArticle[] {
  return articles
    .map(calculateArticleScore)
    .filter((article) => article.localScore > 0)
    .sort((a, b) => b.localScore - a.localScore)
    .slice(0, userPreferences.maxArticlesForAI);
}

function calculateArticleScore(article: RawArticle): PrefilteredArticle {
  const searchableText = buildSearchableText(article);

  const highMatches = findMatches(
    searchableText,
    userPreferences.highPriorityKeywords,
  );

  const mediumMatches = findMatches(
    searchableText,
    userPreferences.mediumPriorityKeywords,
  );

  const lowMatches = findMatches(
    searchableText,
    userPreferences.lowPriorityKeywords,
  );

  const sourceBonus = userPreferences.preferredSources.includes(article.source)
    ? 2
    : 0;

  const categoryBonus = getCategoryBonus(article.sourceCategoryHint);

  const highScore = highMatches.length * 5;
  const mediumScore = mediumMatches.length * 2;
  const lowPenalty = lowMatches.length * 3;

  const localScore =
    highScore + mediumScore + sourceBonus + categoryBonus - lowPenalty;

  return {
    ...article,
    localScore,
    matchedKeywords: [...highMatches, ...mediumMatches],
  };
}

function buildSearchableText(article: RawArticle): string {
  return [
    article.title,
    article.source,
    article.sourceCategoryHint,
    article.contentSnippet,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function findMatches(text: string, keywords: string[]): string[] {
  return keywords.filter((keyword) => text.includes(keyword.toLowerCase()));
}

function getCategoryBonus(categoryHint: string): number {
  const normalizedCategory = categoryHint.toLowerCase();

  if (normalizedCategory.includes("security")) {
    return 4;
  }

  if (normalizedCategory.includes("backend")) {
    return 3;
  }

  if (normalizedCategory.includes("frontend")) {
    return 3;
  }

  if (normalizedCategory.includes("dev tools")) {
    return 2;
  }

  return 0;
}
