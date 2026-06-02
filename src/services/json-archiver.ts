import fs from "node:fs/promises";
import path from "node:path";
import { AnalyzedArticle } from "./ai-news-analyzer.js";

const ARCHIVES_DIR = path.resolve("archives");

type ArchiveSummaryItem = {
  name: string;
  count: number;
};

type PriorityTrendItem = {
  date: string;
  high: number;
  medium: number;
  low: number;
};

type DailyJsonArchive = {
  date: string;
  generatedAt: string;
  totalArticles: number;
  summary: {
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
    topCategories: ArchiveSummaryItem[];
    topSources: ArchiveSummaryItem[];
  };
  articles: AnalyzedArticle[];
};

type ArchiveIndexReport = {
  date: string;
  generatedAt: string;
  totalArticles: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  topCategory: string | null;
  topSource: string | null;
  topCategories: ArchiveSummaryItem[];
  topSources: ArchiveSummaryItem[];
  topArticles: AnalyzedArticle[];
};

type ArchiveIndexSummary = {
  totalReports: number;
  totalArticles: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  averageArticlesPerReport: number;
  latestReportDate: string | null;
  dominantCategory: string | null;
  mostActiveSource: string | null;
  highestRiskDay: string | null;
  topCategories: ArchiveSummaryItem[];
  topSources: ArchiveSummaryItem[];
};

type ArchiveIndex = {
  generatedAt: string;
  availableDates: string[];
  summary: ArchiveIndexSummary;
  priorityTrend: PriorityTrendItem[];
  reports: ArchiveIndexReport[];
};

export async function saveDailyJsonArchive(
  articles: AnalyzedArticle[],
): Promise<string> {
  await fs.mkdir(ARCHIVES_DIR, { recursive: true });

  const date = getTodayIsoDate();
  const generatedAt = new Date().toISOString();
  const filePath = path.join(ARCHIVES_DIR, `${date}.json`);

  const archive: DailyJsonArchive = {
    date,
    generatedAt,
    totalArticles: articles.length,
    summary: {
      highPriority: countArticlesByPriority(articles, "high"),
      mediumPriority: countArticlesByPriority(articles, "medium"),
      lowPriority: countArticlesByPriority(articles, "low"),
      topCategories: getTopItems(articles.map((article) => article.category)),
      topSources: getTopItems(articles.map((article) => article.source)),
    },
    articles,
  };

  await fs.writeFile(filePath, JSON.stringify(archive, null, 2), "utf-8");

  await updateArchiveIndex(archive);

  return filePath;
}

async function updateArchiveIndex(archive: DailyJsonArchive): Promise<void> {
  const indexPath = path.join(ARCHIVES_DIR, "index.json");
  const existingIndex = await readArchiveIndex(indexPath);

  const currentReport = buildArchiveIndexReport(archive);

  const reportsWithoutCurrentDate = existingIndex.reports.filter(
    (report) => report.date !== archive.date,
  );

  const reports = [currentReport, ...reportsWithoutCurrentDate].sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  const nextIndex: ArchiveIndex = {
    generatedAt: new Date().toISOString(),
    availableDates: reports.map((report) => report.date),
    summary: buildArchiveIndexSummary(reports),
    priorityTrend: buildPriorityTrend(reports),
    reports,
  };

  await fs.writeFile(indexPath, JSON.stringify(nextIndex, null, 2), "utf-8");
}

async function readArchiveIndex(indexPath: string): Promise<ArchiveIndex> {
  try {
    const content = await fs.readFile(indexPath, "utf-8");
    const parsedIndex = JSON.parse(content) as Partial<ArchiveIndex>;

    const reports = parsedIndex.reports ?? [];

    return {
      generatedAt: parsedIndex.generatedAt ?? new Date().toISOString(),
      availableDates:
        parsedIndex.availableDates ?? reports.map((report) => report.date),
      summary: parsedIndex.summary ?? buildArchiveIndexSummary(reports),
      priorityTrend: parsedIndex.priorityTrend ?? buildPriorityTrend(reports),
      reports,
    };
  } catch {
    return {
      generatedAt: new Date().toISOString(),
      availableDates: [],
      summary: buildArchiveIndexSummary([]),
      priorityTrend: [],
      reports: [],
    };
  }
}

function buildArchiveIndexReport(
  archive: DailyJsonArchive,
): ArchiveIndexReport {
  return {
    date: archive.date,
    generatedAt: archive.generatedAt,
    totalArticles: archive.totalArticles,
    highPriority: archive.summary.highPriority,
    mediumPriority: archive.summary.mediumPriority,
    lowPriority: archive.summary.lowPriority,
    topCategory: archive.summary.topCategories[0]?.name ?? null,
    topSource: archive.summary.topSources[0]?.name ?? null,
    topCategories: archive.summary.topCategories,
    topSources: archive.summary.topSources,
    topArticles: getTopArticles(archive.articles, 3),
  };
}

function buildArchiveIndexSummary(
  reports: ArchiveIndexReport[],
): ArchiveIndexSummary {
  const totalReports = reports.length;
  const totalArticles = reports.reduce(
    (total, report) => total + report.totalArticles,
    0,
  );
  const highPriority = reports.reduce(
    (total, report) => total + report.highPriority,
    0,
  );
  const mediumPriority = reports.reduce(
    (total, report) => total + report.mediumPriority,
    0,
  );
  const lowPriority = reports.reduce(
    (total, report) => total + report.lowPriority,
    0,
  );

  const topCategories = getTopItemsFromSummaryItems(
    reports.flatMap((report) => report.topCategories),
  );

  const topSources = getTopItemsFromSummaryItems(
    reports.flatMap((report) => report.topSources),
  );

  const highestRiskReport = [...reports].sort((a, b) => {
    if (b.highPriority !== a.highPriority) {
      return b.highPriority - a.highPriority;
    }

    return b.totalArticles - a.totalArticles;
  })[0];

  return {
    totalReports,
    totalArticles,
    highPriority,
    mediumPriority,
    lowPriority,
    averageArticlesPerReport:
      totalReports === 0 ? 0 : Math.round(totalArticles / totalReports),
    latestReportDate: reports[0]?.date ?? null,
    dominantCategory: topCategories[0]?.name ?? null,
    mostActiveSource: topSources[0]?.name ?? null,
    highestRiskDay: highestRiskReport?.date ?? null,
    topCategories,
    topSources,
  };
}

function buildPriorityTrend(
  reports: ArchiveIndexReport[],
  limit = 7,
): PriorityTrendItem[] {
  return reports
    .slice(0, limit)
    .reverse()
    .map((report) => ({
      date: report.date,
      high: report.highPriority,
      medium: report.mediumPriority,
      low: report.lowPriority,
    }));
}

function getTopArticles(
  articles: AnalyzedArticle[],
  limit: number,
): AnalyzedArticle[] {
  return [...articles].sort((a, b) => b.score - a.score).slice(0, limit);
}

function countArticlesByPriority(
  articles: AnalyzedArticle[],
  priority: AnalyzedArticle["priority"],
): number {
  return articles.filter((article) => article.priority === priority).length;
}

function getTopItems(values: string[], limit = 5): ArchiveSummaryItem[] {
  const counter = new Map<string, number>();

  for (const value of values) {
    const normalizedValue = value?.trim() || "Uncategorized";
    counter.set(normalizedValue, (counter.get(normalizedValue) ?? 0) + 1);
  }

  return Array.from(counter.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function getTopItemsFromSummaryItems(
  items: ArchiveSummaryItem[],
  limit = 5,
): ArchiveSummaryItem[] {
  const counter = new Map<string, number>();

  for (const item of items) {
    const normalizedName = item.name?.trim() || "Uncategorized";
    counter.set(
      normalizedName,
      (counter.get(normalizedName) ?? 0) + item.count,
    );
  }

  return Array.from(counter.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
