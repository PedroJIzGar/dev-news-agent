export type NewsSource = {
  name: string;
  url: string;
  categoryHint: string;
};

export const newsSources: NewsSource[] = [
  {
    name: "GitHub Blog",
    url: "https://github.blog/feed/",
    categoryHint: "Dev Tools",
  },
  {
    name: "Spring Blog",
    url: "https://spring.io/blog.atom",
    categoryHint: "Backend",
  },
  {
    name: "Angular Blog",
    url: "https://blog.angular.dev/feed",
    categoryHint: "Frontend",
  },
  {
    name: "Stack Overflow Blog",
    url: "https://stackoverflow.blog/feed/",
    categoryHint: "Developer Culture",
  },
  {
    name: "The Hacker News",
    url: "https://feeds.feedburner.com/TheHackersNews",
    categoryHint: "Security",
  },
  {
    name: "Krebs on Security",
    url: "https://krebsonsecurity.com/feed/",
    categoryHint: "Security",
  },
];
