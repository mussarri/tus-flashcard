import { chestConcepts } from './chest';
import { heartConcepts } from './heart';
import { neuroConcepts } from './neuro';
import { headAndNeckConcepts } from './head_neck';
import { abdomenConcepts } from './abdomen';
import { limbConcepts } from './limb';

export const allConcepts = [
  ...abdomenConcepts,
  ...headAndNeckConcepts,
  ...limbConcepts,
  ...neuroConcepts,
  ...heartConcepts,
  ...chestConcepts,
];
