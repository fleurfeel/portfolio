// Содержимое страницы кейса: короткие факты и разделы «заголовок — текст — экраны».
import type { ImageMetadata } from 'astro';

export interface CaseImage {
  src: ImageMetadata;
  alt: string;
  caption?: string;
  /** во сколько раз файл крупнее макета (экспорт 2×); по умолчанию 1. Экран не показывается крупнее макета */
  scale?: number;
  /** блок со своими скруглёнными углами и прозрачным фоном: показываем без белой подложки и рамки */
  bare?: boolean;
}

export interface CaseMedia {
  /** wide — один экран во всю ширину; page — длинная страница целиком, уже и по центру; pair и trio — в ряд;
   *  phones — экраны телефона. Экраны всегда показываются целиком, без обрезки */
  layout: 'wide' | 'page' | 'pair' | 'trio' | 'phones';
  images: CaseImage[];
}

export interface CaseSection {
  title: string;
  text: string[];
  media?: CaseMedia[];
}

export interface CaseStudy {
  facts: { label: string; value: string }[];
  sections: CaseSection[];
}
