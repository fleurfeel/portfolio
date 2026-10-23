// «Обо мне»: образование и опыт — порядок как в макете.
export interface Education {
  /** строки заголовка (вуз, ступень и годы) */
  title: string[];
  program: string;
  /** параллельная учёба — пунктирная линия на таймлайне */
  parallel?: boolean;
}

export interface Job {
  company: string;
  role: string;
  period: string;
}

export const intro =
  'Люблю разбираться в продукте до самой сути и превращать сырую идею в понятную структуру. Техническая база сокращает путь от макета до запуска.';

export const education: Education[] = [
  {
    title: ['Южный Федеральный Университет', 'Бакалавр (2020-2024) - *красный диплом'],
    program: 'Распределенные вычислительные системы и инфокоммуникационные технологии',
  },
  {
    title: ['Университет Иннополис (2022-2024)'],
    program: 'Проектирование пользовательских интерфейсов',
    parallel: true,
  },
  {
    title: ['Южный Федеральный Университет', 'Магистр (2024-2026) - *красный диплом'],
    program: 'Технологии интеллектуальных автоматизированных систем',
  },
];

export const experienceTitle = 'Опыт работы 3.9 года';

export const jobs: Job[] = [
  { company: 'NeuroFlex', role: 'UX/UI Дизайнер', period: 'Февраль 2023 - Март 2025 (2.2 года)' },
  { company: 'Quantum Insight', role: 'UX/UI Дизайнер', period: 'Май 2025 - Январь 2026 (9 месяцев)' },
  { company: 'CatamaranGo', role: 'Продуктовый дизайнер', period: 'Октябрь 2025 - Май 2026 (8 месяцев)' },
  { company: 'NeuroFlex', role: 'Продуктовый дизайнер', period: 'Февраль 2026 - сейчас (9 месяцев)' },
];

/** Резюме: public/resume.pdf; при скачивании сохраняется под понятным именем. */
export const resumeUrl = '/resume.pdf';
export const resumeFileName = 'Пашковский Руслан — резюме.pdf';
