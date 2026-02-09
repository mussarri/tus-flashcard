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

export const abdomenConcepts: SeedConcept[] = [
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
    preferredLabel: 'Abdominal Cavity',
    conceptType: ConceptType.SPACE,
    aliases: [
      { alias: 'Abdominal Cavity', language: AliasLanguage.EN },
      { alias: 'Cavitas Abdominis', language: AliasLanguage.LA },
      { alias: 'Abdominal Kavite', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Peritoneum',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Peritoneum', language: AliasLanguage.EN },
      { alias: 'Peritoneum', language: AliasLanguage.LA },
      { alias: 'Periton', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Greater Omentum',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Greater Omentum', language: AliasLanguage.EN },
      { alias: 'Omentum Majus', language: AliasLanguage.LA },
      { alias: 'Büyük Omentum', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Lesser Omentum',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Lesser Omentum', language: AliasLanguage.EN },
      { alias: 'Omentum Minus', language: AliasLanguage.LA },
      { alias: 'Küçük Omentum', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Stomach',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Stomach', language: AliasLanguage.EN },
      { alias: 'Gaster', language: AliasLanguage.LA },
      { alias: 'Mide', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Duodenum',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Duodenum', language: AliasLanguage.EN },
      { alias: 'Duodenum', language: AliasLanguage.LA },
      { alias: 'Onikiparmak Bağırsağı', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Jejunum',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Jejunum', language: AliasLanguage.EN },
      { alias: 'Jejunum', language: AliasLanguage.LA },
      { alias: 'Boş Bağırsağın Yüksük Kısmı', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Ileum',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Ileum', language: AliasLanguage.EN },
      { alias: 'Ileum', language: AliasLanguage.LA },
      {
        alias: 'İnce Bağırsağın Çekumdan Sonraki Kısmı',
        language: AliasLanguage.TR,
      },
    ],
  },
  {
    preferredLabel: 'Cecum',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Cecum', language: AliasLanguage.EN },
      { alias: 'Caecum', language: AliasLanguage.LA },
      { alias: 'Çekum', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Colon',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Colon', language: AliasLanguage.EN },
      { alias: 'Colon', language: AliasLanguage.LA },
      { alias: 'Kolon', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Liver',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Liver', language: AliasLanguage.EN },
      { alias: 'Hepar', language: AliasLanguage.LA },
      { alias: 'Karaciğer', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Gallbladder',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Gallbladder', language: AliasLanguage.EN },
      { alias: 'Vesica Biliaris', language: AliasLanguage.LA },
      { alias: 'Safra Kesesi', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Pancreas',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Pancreas', language: AliasLanguage.EN },

      { alias: 'Pancreas', language: AliasLanguage.LA },
      { alias: 'Pankreas', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Spleen',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Spleen', language: AliasLanguage.EN },
      { alias: 'Lien', language: AliasLanguage.LA },
      { alias: 'Dalak', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Portal Vein',
    conceptType: ConceptType.VESSEL,
    aliases: [
      { alias: 'Portal Vein', language: AliasLanguage.EN },
      { alias: 'Vena Portae', language: AliasLanguage.LA },
      { alias: 'Kapı Damarı', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Inferior Vena Cava',
    conceptType: ConceptType.VESSEL,
    aliases: [
      { alias: 'Inferior Vena Cava', language: AliasLanguage.EN },
      { alias: 'Vena Cava Inferior', language: AliasLanguage.LA },
      { alias: 'Alt Vena Kava', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Abdominal Aorta',
    conceptType: ConceptType.VESSEL,
    aliases: [
      { alias: 'Abdominal Aorta', language: AliasLanguage.EN },
      { alias: 'Aorta Abdominalis', language: AliasLanguage.LA },
      { alias: 'Abdominal Aort', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Celiac Trunk',
    conceptType: ConceptType.VESSEL,
    aliases: [
      { alias: 'Celiac Trunk', language: AliasLanguage.EN },
      { alias: 'Truncus Coeliacus', language: AliasLanguage.LA },
      { alias: 'Çölyak Trunkusu', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'çekum',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'çekum', language: AliasLanguage.TR },
      { alias: 'cecum', language: AliasLanguage.EN },
      { alias: 'caecum', language: AliasLanguage.LA },
    ],
  },
  {
    preferredLabel: 'pelvic cavity',
    conceptType: ConceptType.SPACE,
    aliases: [
      { alias: 'pelvic cavity', language: AliasLanguage.EN },
      { alias: 'pelvik kavite', language: AliasLanguage.TR },
      { alias: 'cavitas pelvis', language: AliasLanguage.LA },
    ],
  },
  {
    preferredLabel: 'Rectum',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Rectum', language: AliasLanguage.EN },
      { alias: 'Rektum', language: AliasLanguage.TR },
      { alias: 'Rectum', language: AliasLanguage.LA },
    ],
  },
  {
    preferredLabel: 'Anal Canal',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Anal Canal', language: AliasLanguage.EN },
      { alias: 'Anal Kanal', language: AliasLanguage.TR },
      { alias: 'Canalis Analis', language: AliasLanguage.LA },
    ],
  },
  {
    preferredLabel: 'Urinary Bladder',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Urinary Bladder', language: AliasLanguage.EN },
      { alias: 'Mesane', language: AliasLanguage.TR },
      { alias: 'Vesica Urinaria', language: AliasLanguage.LA },
    ],
  },
  {
    preferredLabel: 'Ureter',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Ureter', language: AliasLanguage.EN },
      { alias: 'Üreter', language: AliasLanguage.TR },
      { alias: 'Ureter', language: AliasLanguage.LA },
    ],
  },
  {
    preferredLabel: 'Prostate',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Prostate', language: AliasLanguage.EN },
      { alias: 'Prostat', language: AliasLanguage.TR },
      { alias: 'Prostata', language: AliasLanguage.LA },
    ],
  },
  {
    preferredLabel: 'Uterus',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Uterus', language: AliasLanguage.EN },
      { alias: 'Uterus', language: AliasLanguage.TR },
      { alias: 'Uterus', language: AliasLanguage.LA },
    ],
  },
  {
    preferredLabel: 'Ovary',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Ovary', language: AliasLanguage.EN },
      { alias: 'Over', language: AliasLanguage.TR },
      { alias: 'Ovarium', language: AliasLanguage.LA },
    ],
  },
  {
    preferredLabel: 'Testis',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Testis', language: AliasLanguage.EN },
      { alias: 'Testis', language: AliasLanguage.TR },
      { alias: 'Testis', language: AliasLanguage.LA },
    ],
  },
  {
    preferredLabel: 'Ischioanal Fossa',
    conceptType: ConceptType.SPACE,
    aliases: [
      { alias: 'Ischioanal Fossa', language: AliasLanguage.EN },
      { alias: 'İskioanal Fossa', language: AliasLanguage.TR },
      { alias: 'Fossa Ischioanalis', language: AliasLanguage.LA },
    ],
  },
  {
    preferredLabel: 'Pelvic Diaphragm',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Pelvic Diaphragm', language: AliasLanguage.EN },
      { alias: 'Pelvik Diyafram', language: AliasLanguage.TR },
      { alias: 'Diaphragma Pelvica', language: AliasLanguage.LA },
    ],
  },
  {
    preferredLabel: 'Böbrek',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Böbrek', language: AliasLanguage.TR },
      { alias: 'Kidney', language: AliasLanguage.EN },
      { alias: 'Ren', language: AliasLanguage.LA },
    ],
  },
  {
    preferredLabel: 'Adrenal Gland',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Adrenal Gland', language: AliasLanguage.EN },
      { alias: 'Adrenal Bez', language: AliasLanguage.TR },
      { alias: 'Glandula Suprarenalis', language: AliasLanguage.LA },
    ],
  },
  {
    preferredLabel: 'Suprarenal Gland',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Suprarenal Gland', language: AliasLanguage.EN },
      { alias: 'Suprarenal Bez', language: AliasLanguage.TR },
      { alias: 'Glandula Suprarenalis', language: AliasLanguage.LA },
    ],
  },
  {
    preferredLabel: 'Renal Cortex',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Renal Cortex', language: AliasLanguage.EN },
      { alias: 'Renal Korteks', language: AliasLanguage.TR },
      { alias: 'Cortex Renalis', language: AliasLanguage.LA },
    ],
  },
  {
    preferredLabel: 'Renal Medulla',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Renal Medulla', language: AliasLanguage.EN },
      { alias: 'Renal Medulla', language: AliasLanguage.TR },
      { alias: 'Medulla Renalis', language: AliasLanguage.LA },
    ],
  },
  {
    preferredLabel: 'Urether',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Ureter', language: AliasLanguage.EN },
      { alias: 'Üreter', language: AliasLanguage.TR },
      { alias: 'Ureter', language: AliasLanguage.LA },
    ],
  },
  {
    preferredLabel: 'Penis',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Penis', language: AliasLanguage.EN },
      { alias: 'Penis', language: AliasLanguage.TR },
      { alias: 'Penis', language: AliasLanguage.LA },
    ],
  },
];
