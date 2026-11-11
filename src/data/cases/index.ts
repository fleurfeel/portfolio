// Разборы кейсов по slug. Кейс без разбора показывает на своей странице только шапку.
import { abeona } from './abeona';
import { beslimshop } from './beslimshop';
import { catamarango } from './catamarango';
import { territoriyaResheniy } from './territoriya-resheniy';
import type { CaseStudy } from './types';

export const caseStudies: Record<string, CaseStudy | undefined> = {
  catamarango,
  abeona,
  beslimshop,
  'territoriya-resheniy': territoriyaResheniy,
};
