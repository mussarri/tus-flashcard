/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { ConceptType, AliasLanguage } from '@prisma/client';
import { SeedConcept } from './_types';

export const limbConcepts: SeedConcept[] = [
  // Upper limb nerves
  {
    preferredLabel: 'Axillary Nerve',
    conceptType: ConceptType.NERVE,
    aliases: [
      { alias: 'Nervus axillaris', language: AliasLanguage.LA },
      { alias: 'Aksiller Sinir', language: AliasLanguage.TR },
      { alias: 'Axillary Nerve', language: AliasLanguage.EN },
    ],
  },
  {
    preferredLabel: 'Radial Nerve',
    conceptType: ConceptType.NERVE,
    aliases: [
      { alias: 'Nervus radialis', language: AliasLanguage.LA },
      { alias: 'Radial Sinir', language: AliasLanguage.TR },

      { alias: 'Radial Nerve', language: AliasLanguage.EN },
    ],
  },
  {
    preferredLabel: 'Median Nerve',
    conceptType: ConceptType.NERVE,
    aliases: [
      { alias: 'Nervus medianus', language: AliasLanguage.LA },
      { alias: 'Median Sinir', language: AliasLanguage.TR },
      { alias: 'Median Nerve', language: AliasLanguage.EN },
    ],
  },
  {
    preferredLabel: 'Ulnar Nerve',
    conceptType: ConceptType.NERVE,
    aliases: [
      { alias: 'Nervus ulnaris', language: AliasLanguage.LA },
      { alias: 'Ulnar Sinir', language: AliasLanguage.TR },
      { alias: 'Ulnar Nerve', language: AliasLanguage.EN },
    ],
  },
  {
    preferredLabel: 'Musculocutaneous Nerve',
    conceptType: ConceptType.NERVE,
    aliases: [
      { alias: 'Nervus musculocutaneus', language: AliasLanguage.LA },
      { alias: 'Muskulokutanöz Sinir', language: AliasLanguage.TR },
      { alias: 'Musculocutaneous Nerve', language: AliasLanguage.EN },
    ],
  },
  {
    preferredLabel: 'Brachial Plexus',
    conceptType: ConceptType.NERVE,
    aliases: [
      { alias: 'Plexus brachialis', language: AliasLanguage.LA },
      { alias: 'Brachial Pleksus', language: AliasLanguage.TR },
      { alias: 'Brachial Plexus', language: AliasLanguage.EN },
    ],
  },
  // upper limb bones
  {
    preferredLabel: 'Clavicle',
    conceptType: ConceptType.BONE,
    aliases: [
      { alias: 'Clavicula', language: AliasLanguage.LA },
      { alias: 'Klavikula', language: AliasLanguage.TR },
      { alias: 'Clavicle', language: AliasLanguage.EN },
    ],
  },
  {
    preferredLabel: 'Scapula',
    conceptType: ConceptType.BONE,
    aliases: [
      { alias: 'Scapula', language: AliasLanguage.LA },
      { alias: 'Skapula', language: AliasLanguage.TR },
      { alias: 'Scapula', language: AliasLanguage.EN },
    ],
  },
  {
    preferredLabel: 'Humerus',
    conceptType: ConceptType.BONE,
    aliases: [
      { alias: 'Humerus', language: AliasLanguage.LA },
      { alias: 'Humerus', language: AliasLanguage.TR },
      { alias: 'Humerus', language: AliasLanguage.EN },
    ],
  },
  {
    preferredLabel: 'Radius',
    conceptType: ConceptType.BONE,
    aliases: [
      { alias: 'Radius', language: AliasLanguage.LA },
      { alias: 'Radius', language: AliasLanguage.TR },
      { alias: 'Radius', language: AliasLanguage.EN },
    ],
  },
  {
    preferredLabel: 'Ulna',
    conceptType: ConceptType.BONE,
    aliases: [
      { alias: 'Ulna', language: AliasLanguage.LA },
      { alias: 'Ulna', language: AliasLanguage.TR },
      { alias: 'Ulna', language: AliasLanguage.EN },
    ],
  },
  // Lower limb nerves
  {
    preferredLabel: 'Femoral Nerve',
    conceptType: ConceptType.NERVE,
    aliases: [
      { alias: 'Nervus femoralis', language: AliasLanguage.LA },
      { alias: 'Femoral Sinir', language: AliasLanguage.TR },
      { alias: 'Femoral Nerve', language: AliasLanguage.EN },
    ],
  },
  {
    preferredLabel: 'Obturator Nerve',
    conceptType: ConceptType.NERVE,
    aliases: [
      { alias: 'Nervus obturatorius', language: AliasLanguage.LA },
      { alias: 'Obturator Sinir', language: AliasLanguage.TR },
      { alias: 'Obturator Nerve', language: AliasLanguage.EN },
    ],
  },
  {
    preferredLabel: 'Sciatic Nerve',
    conceptType: ConceptType.NERVE,
    aliases: [
      { alias: 'Nervus ischiadicus', language: AliasLanguage.LA },
      { alias: 'Siyatik Sinir', language: AliasLanguage.TR },
      { alias: 'Sciatic Nerve', language: AliasLanguage.EN },
    ],
  },
  {
    preferredLabel: 'Tibial Nerve',
    conceptType: ConceptType.NERVE,
    aliases: [
      { alias: 'Nervus tibialis', language: AliasLanguage.LA },
      { alias: 'Tibial Sinir', language: AliasLanguage.TR },
      { alias: 'Tibial Nerve', language: AliasLanguage.EN },
    ],
  },
  {
    preferredLabel: 'Common Fibular Nerve',
    conceptType: ConceptType.NERVE,
    aliases: [
      { alias: 'Nervus fibularis communis', language: AliasLanguage.LA },
      { alias: 'Ortak Fibular Sinir', language: AliasLanguage.TR },
      { alias: 'Common Fibular Nerve', language: AliasLanguage.EN },
    ],
  },
  {
    preferredLabel: 'Lumbosacral Plexus',
    conceptType: ConceptType.NERVE,
    aliases: [
      { alias: 'Plexus lumbosacralis', language: AliasLanguage.LA },
      { alias: 'Lumbosakral Pleksus', language: AliasLanguage.TR },
      { alias: 'Lumbosacral Plexus', language: AliasLanguage.EN },
    ],
  },
  {
    preferredLabel: 'Lateral Femoral Cutaneous Nerve',
    conceptType: ConceptType.NERVE,
    aliases: [
      {
        alias: 'Nervus cutaneus femoris lateralis',
        language: AliasLanguage.LA,
      },
      { alias: 'Lateral Femoral Cutaneous Sinir', language: AliasLanguage.TR },
      { alias: 'Lateral Femoral Cutaneous Nerve', language: AliasLanguage.EN },
    ],
  },
  {
    preferredLabel: 'Saphenous Nerve',
    conceptType: ConceptType.NERVE,
    aliases: [
      { alias: 'Nervus saphenus', language: AliasLanguage.LA },
      { alias: 'Safen Sinir', language: AliasLanguage.TR },
      { alias: 'Saphenous Nerve', language: AliasLanguage.EN },
    ],
  },
  {
    preferredLabel: 'Deep Fibular Nerve',
    conceptType: ConceptType.NERVE,
    aliases: [
      { alias: 'Nervus fibularis profundus', language: AliasLanguage.LA },
      { alias: 'Derin Fibular Sinir', language: AliasLanguage.TR },
      { alias: 'Deep Fibular Nerve', language: AliasLanguage.EN },
    ],
  },
  {
    preferredLabel: 'Superficial Fibular Nerve',
    conceptType: ConceptType.NERVE,
    aliases: [
      { alias: 'Nervus fibularis superficialis', language: AliasLanguage.LA },
      { alias: 'Yüzeyel Fibular Sinir', language: AliasLanguage.TR },
      { alias: 'Superficial Fibular Nerve', language: AliasLanguage.EN },
    ],
  },
  {
    preferredLabel: 'Pelvic Nerve',
    conceptType: ConceptType.NERVE,
    aliases: [
      { alias: 'Nervus pelvicus', language: AliasLanguage.LA },
      { alias: 'Pelvik Sinir', language: AliasLanguage.TR },
      { alias: 'Pelvic Nerve', language: AliasLanguage.EN },
    ],
  },
  {
    preferredLabel: 'Pudendal Nerve',
    conceptType: ConceptType.NERVE,
    aliases: [
      { alias: 'Nervus pudendus', language: AliasLanguage.LA },
      { alias: 'Pudendal Sinir', language: AliasLanguage.TR },
      { alias: 'Pudendal Nerve', language: AliasLanguage.EN },
    ],
  },
  {
    preferredLabel: 'Deep Perineal Nerve',
    conceptType: ConceptType.NERVE,
    aliases: [
      { alias: 'Nervus perinealis profundus', language: AliasLanguage.LA },
      { alias: 'Derin Perineal Sinir', language: AliasLanguage.TR },
      { alias: 'Deep Perineal Nerve', language: AliasLanguage.EN },
    ],
  },
  {
    preferredLabel: 'Superficial Perineal Nerve',
    conceptType: ConceptType.NERVE,
    aliases: [
      { alias: 'Nervus perinealis superficialis', language: AliasLanguage.LA },
      { alias: 'Yüzeyel Perineal Sinir', language: AliasLanguage.TR },
      { alias: 'Superficial Perineal Nerve', language: AliasLanguage.EN },
    ],
  },
  // lower limb bones
  {
    preferredLabel: 'Pelvis',
    conceptType: ConceptType.BONE,
    aliases: [
      { alias: 'Pelvis', language: AliasLanguage.LA },
      { alias: 'Pelvis', language: AliasLanguage.TR },
      { alias: 'Pelvis', language: AliasLanguage.EN },
    ],
  },
  {
    preferredLabel: 'Femur',
    conceptType: ConceptType.BONE,
    aliases: [
      { alias: 'Femur', language: AliasLanguage.LA },
      { alias: 'Femur', language: AliasLanguage.TR },
      { alias: 'Femur', language: AliasLanguage.EN },
    ],
  },
  {
    preferredLabel: 'Patella',
    conceptType: ConceptType.BONE,
    aliases: [
      { alias: 'Patella', language: AliasLanguage.LA },
      { alias: 'Patella', language: AliasLanguage.TR },
      { alias: 'Patella', language: AliasLanguage.EN },
    ],
  },
  {
    preferredLabel: 'Tibia',
    conceptType: ConceptType.BONE,
    aliases: [
      { alias: 'Tibia', language: AliasLanguage.LA },
      { alias: 'Tibia', language: AliasLanguage.TR },
      { alias: 'Tibia', language: AliasLanguage.EN },
    ],
  },
  {
    preferredLabel: 'Fibula',
    conceptType: ConceptType.BONE,
    aliases: [
      { alias: 'Fibula', language: AliasLanguage.LA },
      { alias: 'Fibula', language: AliasLanguage.TR },
      { alias: 'Fibula', language: AliasLanguage.EN },
    ],
  },
  {
    preferredLabel: 'Tarsals',
    conceptType: ConceptType.BONE,
    aliases: [
      { alias: 'Ossa tarsi', language: AliasLanguage.LA },
      { alias: 'Tarsal Kemikler', language: AliasLanguage.TR },
      { alias: 'Tarsals', language: AliasLanguage.EN },
    ],
  },
  {
    preferredLabel: 'Metatarsals',
    conceptType: ConceptType.BONE,
    aliases: [
      { alias: 'Ossa metatarsalia', language: AliasLanguage.LA },
      { alias: 'Metatarsal Kemikler', language: AliasLanguage.TR },
      { alias: 'Metatarsals', language: AliasLanguage.EN },
    ],
  },
  {
    preferredLabel: 'Phalanges of Foot',
    conceptType: ConceptType.BONE,
    aliases: [
      { alias: 'Phalanges pedis', language: AliasLanguage.LA },
      { alias: 'Ayak Parmak Kemikleri', language: AliasLanguage.TR },
      { alias: 'Phalanges of Foot', language: AliasLanguage.EN },
    ],
  },
  //lower limb muscles
];
