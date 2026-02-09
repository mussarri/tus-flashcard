/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { ConceptType, AliasLanguage } from '@prisma/client';
import { SeedConcept } from './_types';

export const heartConcepts: SeedConcept[] = [
  {
    preferredLabel: 'Heart',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Cardiac Muscle', language: AliasLanguage.EN },
      { alias: 'Cor', language: AliasLanguage.LA },
      { alias: 'Kalp', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Heart Chambers',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Cardiac Chambers', language: AliasLanguage.EN },
      { alias: 'Cavitates Cordis', language: AliasLanguage.LA },
      { alias: 'Kalp Odacıkları', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Right Atrium',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Right Atrium', language: AliasLanguage.EN },
      { alias: 'Atrium Dexter', language: AliasLanguage.LA },
      { alias: 'Sağ Atriyum', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Left Atrium',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Left Atrium', language: AliasLanguage.EN },
      { alias: 'Atrium Sinister', language: AliasLanguage.LA },
      { alias: 'Sol Atriyum', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Right Ventricle',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Right Ventricle', language: AliasLanguage.EN },
      { alias: 'Ventriculus Dexter', language: AliasLanguage.LA },
      { alias: 'Sağ Ventrikül', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Left Ventricle',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Left Ventricle', language: AliasLanguage.EN },
      { alias: 'Ventriculus Sinister', language: AliasLanguage.LA },
      { alias: 'Sol Ventrikül', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Valves',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Cardiac Valves', language: AliasLanguage.EN },
      { alias: 'Valvulae Cordis', language: AliasLanguage.LA },
      { alias: 'Kalp Kapakları', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Tricuspid Valve',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Right Atrioventricular Valve', language: AliasLanguage.EN },
      {
        alias: 'Valvula Atrioventricularis Dextra',
        language: AliasLanguage.LA,
      },
      { alias: 'Triküspit Kapak', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Mitral Valve',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Bicuspid Valve', language: AliasLanguage.EN },
      {
        alias: 'Valvula Atrioventricularis Sinistra',
        language: AliasLanguage.LA,
      },
      { alias: 'Mitral Kapak', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Pulmonary Valve',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Pulmonic Valve', language: AliasLanguage.EN },
      { alias: 'Valvula Pulmonalis', language: AliasLanguage.LA },
      { alias: 'Pulmoner Kapak', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Aortic Valve',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Semilunar Aortic Valve', language: AliasLanguage.EN },
      { alias: 'Valvula Aortae', language: AliasLanguage.LA },
      { alias: 'Aort Kapak', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Vessels',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Blood Vessels', language: AliasLanguage.EN },
      { alias: 'Vasa Sanguinea', language: AliasLanguage.LA },
      { alias: 'Damarlar', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Ascending Aorta',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Ascending Portion of Aorta', language: AliasLanguage.EN },
      { alias: 'Aorta Ascendens', language: AliasLanguage.LA },
      { alias: 'Yükselen Aort', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Aortic Arch',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Arch of Aorta', language: AliasLanguage.EN },
      { alias: 'Arcus Aortae', language: AliasLanguage.LA },
      { alias: 'Aort Kemiği', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Descending Aorta',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Descending Portion of Aorta', language: AliasLanguage.EN },
      { alias: 'Aorta Descendens', language: AliasLanguage.LA },
      { alias: 'İnen Aort', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Pulmonary Trunk',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Pulmonary Artery', language: AliasLanguage.EN },
      { alias: 'Truncus Pulmonalis', language: AliasLanguage.LA },
      { alias: 'Pulmoner Gövde', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Superior Vena Cava',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Upper Vena Cava', language: AliasLanguage.EN },
      { alias: 'Vena Cava Superior', language: AliasLanguage.LA },
      { alias: 'Üst Vena Kava', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Inferior Vena Cava',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Lower Vena Cava', language: AliasLanguage.EN },
      { alias: 'Vena Cava Inferior', language: AliasLanguage.LA },
      { alias: 'Alt Vena Kava', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Coronary Artery (Right)',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Right Coronary Artery', language: AliasLanguage.EN },
      { alias: 'Arteria Coronaria Dextra', language: AliasLanguage.LA },
      { alias: 'Sağ Koroner Arter', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Coronary Artery (Left)',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Left Coronary Artery', language: AliasLanguage.EN },
      { alias: 'Arteria Coronaria Sinistra', language: AliasLanguage.LA },
      { alias: 'Sol Koroner Arter', language: AliasLanguage.TR },
    ],
  },
];
