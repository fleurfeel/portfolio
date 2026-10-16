// Кейсы. Пока заглушки: тексты, картинки и страницы заменим настоящими.
export interface Project {
  slug: string;
  title: string;
  summary: string;
}

const PLACEHOLDER_SUMMARY =
  '3+ года проектирую цифровые продукты, от лендингов до сложных CRM. Довожу идею до работающего флоу и говорю с разработчиками на одном языке.';

export const projects: Project[] = Array.from({ length: 7 }, (_, i) => ({
  slug: `project-${i + 1}`,
  title: 'Название проекта',
  summary: PLACEHOLDER_SUMMARY,
}));

export const projectUrl = (p: Project) => `/projects/${p.slug}`;
