// Избранные кейсы — в этом порядке они идут в карусели на главной и в списке /projects.
import type { ImageMetadata } from 'astro';
import abeona from '../assets/projects/abeona.png';
import beslimshop from '../assets/projects/beslimshop.webp';
import catamarango from '../assets/projects/catamarango.webp';
import lernium from '../assets/projects/lernium.webp';
import territoriya from '../assets/projects/territoriya-resheniy.webp';
import yufuPro from '../assets/projects/yufu-pro.png';

export interface Project {
  slug: string;
  title: string;
  summary: string;
  /** обложка: первый экран продукта */
  cover: ImageMetadata;
}

export const projects: Project[] = [
  {
    slug: 'catamarango',
    title: 'CatamaranGo',
    summary:
      'Веб-платформа аренды катамаранов со шкипером. Придумал автоподбор капитанов через API партнёров, чего нет у конкурентов, и собрал вокруг этого понятный флоу бронирования.',
    cover: catamarango,
  },
  {
    slug: 'yufu-pro',
    title: 'ЮФУ.Про',
    summary:
      'Платформа ЮФУ, где студенты и партнёры вместе запускают стартапы и проекты. Спроектировал её целиком: каталог курсов, личный кабинет, путь участника от записи до прохождения программы и всё, что между ними.',
    cover: yufuPro,
  },
  {
    slug: 'lernium',
    title: 'Лерниум',
    summary:
      'AI-платформа корпоративного обучения: HR загружает внутренние документы, ИИ собирает из них готовый курс. Отвечал за продукт и дизайн целиком, вёл команду разработки и защищал проект на акселераторе и конкурсах.',
    cover: lernium,
  },
  {
    slug: 'beslimshop',
    title: 'BeSlimShop',
    summary:
      'Интернет-магазин профессиональной косметики, который я сделал с нуля: лендинг, каталог, корзина, личный кабинет и подбор ухода с косметологом. Там, где конструктора не хватало, дописал свой код.',
    cover: beslimshop,
  },
  {
    slug: 'abeona',
    title: 'Abeona',
    summary:
      'CRM для командной работы и профессионального роста с AI-ассистентом. Главная фишка — живая карта навыков: она сама обновляется по задачам и проектам, а ИИ подсказывает, куда расти дальше.',
    cover: abeona,
  },
  {
    slug: 'territoriya-resheniy',
    title: 'Территория решений',
    summary:
      'Новый формат хакатона, где вместо слайдов — живая симуляция с ролями и цифровой профиль участника. Спроектировал лендинг, который объясняет механику без перегруза текстом, и саму платформу (под NDA).',
    cover: territoriya,
  },
];

export const projectUrl = (p: Project) => `/projects/${p.slug}`;
