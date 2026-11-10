// Содержимое страницы кейса: короткие факты и разделы «заголовок — текст — экраны».
import type { ImageMetadata } from 'astro';

export interface CaseImage {
  src: ImageMetadata;
  alt: string;
  caption?: string;
}

export interface CaseMedia {
  /** wide — один экран во всю ширину; narrow — один небольшой по центру; pair и trio — в ряд; phones — экраны телефона */
  layout: 'wide' | 'narrow' | 'pair' | 'trio' | 'phones';
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
