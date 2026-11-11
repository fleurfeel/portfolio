// Разборы кейсов по slug. Кейс без разбора показывает на своей странице только шапку.
import { abeona } from './abeona';
import { beslimshop } from './beslimshop';
import { catamarango } from './catamarango';
import { lernium } from './lernium';
import { neuroflex } from './neuroflex';
import { territoriyaResheniy } from './territoriya-resheniy';
import type { CaseStudy } from './types';

export const caseStudies: Record<string, CaseStudy | undefined> = {
  catamarango,
  lernium,
  abeona,
  beslimshop,
  neuroflex,
  'territoriya-resheniy': territoriyaResheniy,
};
