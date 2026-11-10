// Разборы кейсов по slug. Кейс без разбора показывает на своей странице только шапку.
import { catamarango } from './catamarango';
import type { CaseStudy } from './types';

export const caseStudies: Record<string, CaseStudy | undefined> = {
  catamarango,
};
