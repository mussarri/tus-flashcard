/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { ConceptType, AliasLanguage } from '@prisma/client';
import { SeedConcept } from './_types';

// Abdominal cavity
// Peritoneum
// Greater omentum
// Lesser omentum
// Stomach
// Duodenum
// Jejunum
// Ileum
// Cecum
// Colon
// Liver
// Gallbladder
// Pancreas
// Spleen
// Portal vein
// Inferior vena cava
// Abdominal aorta

//pelvic cavity
// Rectum
// Anal canal
// Urinary bladder
// Ureter
// Prostate
// Uterus
// Ovary
// Testis
// Ischioanal fossa
// Pelvic diaphragm

// Brachial plexus
// Axillary nerve
// Radial nerve
// Median nerve
// Ulnar nerve
// Musculocutaneous nerve

// Clavicle
// Scapula
// Humerus
// Radius
// Ulna

// Lumbar plexus
// Sacral plexus
// Femoral nerve
// Obturator nerve
// Sciatic nerve
// Tibial nerve
// Common fibular nerve

// Femur
// Patella
// Tibia
// Fibula

export const chestConcepts: SeedConcept[] = [
  {
    preferredLabel: 'Thoracic Cavity',
    conceptType: ConceptType.SPACE,
    aliases: [
      { alias: 'Cavitas Thoracis', language: AliasLanguage.LA },
      { alias: 'Göğüs Boşluğu', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Mediastinum',
    conceptType: ConceptType.SPACE,
    aliases: [
      { alias: 'Mediastinum', language: AliasLanguage.EN },
      { alias: 'Mediastinum', language: AliasLanguage.LA },
      { alias: 'Mediasten', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Superior Mediastinum',
    conceptType: ConceptType.SPACE,
    aliases: [
      { alias: 'Superior Mediastinum', language: AliasLanguage.EN },
      { alias: 'Mediastinum Superius', language: AliasLanguage.LA },
      { alias: 'Superior Mediasten', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Inferior Mediastinum',
    conceptType: ConceptType.SPACE,
    aliases: [
      { alias: 'Inferior Mediastinum', language: AliasLanguage.EN },
      { alias: 'Mediastinum Inferius', language: AliasLanguage.LA },
      { alias: 'İnferior Mediasten', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Heart',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Heart', language: AliasLanguage.EN },
      { alias: 'Cor', language: AliasLanguage.LA },
      { alias: 'Kalp', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Pericardium',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Pericardium', language: AliasLanguage.EN },
      { alias: 'Pericardium', language: AliasLanguage.LA },
      { alias: 'Perikard', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Lung',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Lung', language: AliasLanguage.EN },
      { alias: 'Pulmo', language: AliasLanguage.LA },
      { alias: 'Akciğer', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Pleura',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Pleura', language: AliasLanguage.EN },
      { alias: 'Pleura', language: AliasLanguage.LA },
      { alias: 'Plevra', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Trachea',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Trachea', language: AliasLanguage.EN },
      { alias: 'Trachea', language: AliasLanguage.LA },
      { alias: 'Trakea', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Esophagus',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Esophagus', language: AliasLanguage.EN },
      { alias: 'Esophagus', language: AliasLanguage.LA },
      { alias: 'Özofagus', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Thoracic Duct',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Thoracic Duct', language: AliasLanguage.EN },
      { alias: 'Ductus Thoracicus', language: AliasLanguage.LA },
      { alias: 'Torakal Duktus', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Azygos Vein',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Azygos Vein', language: AliasLanguage.EN },
      { alias: 'Vena Azygos', language: AliasLanguage.LA },
      { alias: 'Azygos Ven', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Thoracic Aorta',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Thoracic Aorta', language: AliasLanguage.EN },
      { alias: 'Aorta Thoracica', language: AliasLanguage.LA },
      { alias: 'Torakal Aorta', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Esophageal Hiatus',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Esophageal Hiatus', language: AliasLanguage.EN },
      { alias: 'Hiatus Esophageus', language: AliasLanguage.LA },
      { alias: 'Özofageal Hiatus', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Aortic Hiatus',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Aortic Hiatus', language: AliasLanguage.EN },
      { alias: 'Hiatus Aorticus', language: AliasLanguage.LA },
      { alias: 'Aortik Hiatus', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Caval Hiatus',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Caval Hiatus', language: AliasLanguage.EN },
      { alias: 'Hiatus Cavalis', language: AliasLanguage.LA },
      { alias: 'Kaval Hiatus', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Thymus',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Thymus', language: AliasLanguage.EN },
      { alias: 'Thymus', language: AliasLanguage.LA },
      { alias: 'Timüs', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Diaphragm',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Diaphragm', language: AliasLanguage.EN },
      { alias: 'Diaphragma', language: AliasLanguage.LA },
      { alias: 'Diyafram', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Bronchi',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Bronchi', language: AliasLanguage.EN },
      { alias: 'Bronchi', language: AliasLanguage.LA },
      { alias: 'Bronş', language: AliasLanguage.TR },
    ],
  },
];
