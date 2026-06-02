import fs from "node:fs/promises";
import path from "node:path";
import { AnalyzedArticle } from "./ai-news-analyzer.js";

export async function saveDailyMarkdownArchive(
  articles: AnalyzedArticle[],
): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);

  const archiveDir = path.join(process.cwd(), "archives");
  await fs.mkdir(archiveDir, { recursive: true });

  const filePath = path.join(archiveDir, `${today}.md`);

  const markdown = generateMarkdown(today, articles);

  await fs.writeFile(filePath, markdown, "utf-8");

  return filePath;
}

function generateMarkdown(date: string, articles: AnalyzedArticle[]): string {
  const sortedArticles = sortArticlesByScore(articles);

  const highPriority = sortedArticles.filter(
    (article) => article.priority === "high",
  );

  const mediumPriority = sortedArticles.filter(
    (article) => article.priority === "medium",
  );

  const lowPriority = sortedArticles.filter(
    (article) => article.priority === "low",
  );

  return `# Dev News — ${date}

${renderExecutiveSummary(sortedArticles)}

${renderQuickReadingTable(sortedArticles)}

${renderTopArticles(sortedArticles)}

${renderRecommendedActions(sortedArticles)}

${renderSection("🔴 Alta prioridad", highPriority)}

${renderSection("🟡 Media prioridad", mediumPriority)}

${renderSection("🟢 Baja prioridad", lowPriority)}
`;
}

function sortArticlesByScore(articles: AnalyzedArticle[]): AnalyzedArticle[] {
  return [...articles].sort((a, b) => b.score - a.score);
}

function renderExecutiveSummary(articles: AnalyzedArticle[]): string {
  const totalArticles = articles.length;
  const highCount = articles.filter(
    (article) => article.priority === "high",
  ).length;
  const mediumCount = articles.filter(
    (article) => article.priority === "medium",
  ).length;
  const lowCount = articles.filter(
    (article) => article.priority === "low",
  ).length;

  const topCategories = getTopCategories(articles);
  const topSources = getTopSources(articles);

  return `## Resumen ejecutivo

Hoy se han analizado **${totalArticles} noticias** seleccionadas por relevancia técnica.

- **Alta prioridad:** ${highCount}
- **Media prioridad:** ${mediumCount}
- **Baja prioridad:** ${lowCount}

**Categorías más presentes:** ${formatList(topCategories)}  
**Fuentes principales:** ${formatList(topSources)}
`;
}

function renderQuickReadingTable(articles: AnalyzedArticle[]): string {
  if (articles.length === 0) {
    return `## Lectura rápida

No hay noticias para mostrar.
`;
  }

  const rows = articles
    .map((article) => {
      return `| ${formatPriority(article.priority)} | ${article.score}/10 | ${article.category} | ${article.source} | [${escapeMarkdownTableText(article.title)}](${article.url}) |`;
    })
    .join("\n");

  return `## Lectura rápida

| Prioridad | Score | Categoría | Fuente | Noticia |
|---|---:|---|---|---|
${rows}
`;
}

function renderTopArticles(articles: AnalyzedArticle[]): string {
  const topArticles = articles.slice(0, 3);

  if (topArticles.length === 0) {
    return `## Top 3 noticias del día

No hay noticias destacadas.
`;
  }

  const content = topArticles
    .map((article, index) => {
      return `### ${index + 1}. ${article.title}

**Score:** ${article.score}/10  
**Fuente:** ${article.source}  
**Categoría:** ${article.category}  
**URL:** ${article.url}

**Resumen:**  
${article.summary}

**Por qué importa:**  
${article.whyItMatters}
`;
    })
    .join("\n---\n\n");

  return `## Top 3 noticias del día

${content}
`;
}

function renderRecommendedActions(articles: AnalyzedArticle[]): string {
  const relevantActions = articles
    .filter((article) => article.priority === "high" || article.score >= 8)
    .slice(0, 5);

  if (relevantActions.length === 0) {
    return `## Acciones recomendadas

No hay acciones urgentes para hoy.
`;
  }

  const actions = relevantActions
    .map((article) => {
      return `- **${article.title}:** ${article.recommendedAction}`;
    })
    .join("\n");

  return `## Acciones recomendadas

${actions}
`;
}

function renderSection(title: string, articles: AnalyzedArticle[]): string {
  if (articles.length === 0) {
    return `## ${title}

No hay noticias en esta categoría.
`;
  }

  return `## ${title}

${articles.map(renderArticle).join("\n\n---\n\n")}
`;
}

function renderArticle(article: AnalyzedArticle): string {
  return `### ${article.title}

**Fuente:** ${article.source}  
**Categoría:** ${article.category}  
**Prioridad:** ${formatPriority(article.priority)}  
**Score:** ${article.score}/10  
**URL:** ${article.url}

**Resumen:**  
${article.summary}

**Por qué importa:**  
${article.whyItMatters}

**Acción recomendada:**  
${article.recommendedAction}
`;
}

function getTopCategories(articles: AnalyzedArticle[]): string[] {
  return getTopValues(
    articles.map((article) => article.category),
    3,
  );
}

function getTopSources(articles: AnalyzedArticle[]): string[] {
  return getTopValues(
    articles.map((article) => article.source),
    3,
  );
}

function getTopValues(values: string[], limit: number): string[] {
  const counter = new Map<string, number>();

  values.forEach((value) => {
    counter.set(value, (counter.get(value) ?? 0) + 1);
  });

  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value, count]) => `${value} (${count})`);
}

function formatList(values: string[]): string {
  if (values.length === 0) {
    return "Sin datos";
  }

  return values.join(", ");
}

function formatPriority(priority: AnalyzedArticle["priority"]): string {
  const labels = {
    high: "🔴 Alta",
    medium: "🟡 Media",
    low: "🟢 Baja",
  };

  return labels[priority];
}

function escapeMarkdownTableText(text: string): string {
  return text.replaceAll("|", "\\|");
}
