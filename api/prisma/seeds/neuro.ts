/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { ConceptType, AliasLanguage } from '@prisma/client';
import { SeedConcept } from './_types';

export const neuroConcepts: SeedConcept[] = [
  // Cranial nerves
  {
    preferredLabel: 'Facial nerve (CN VII)',
    conceptType: ConceptType.NERVE,
    aliases: [
      { alias: 'Facial nerve', language: AliasLanguage.EN },
      { alias: 'CN VII', language: AliasLanguage.EN },
      { alias: 'Nervus facialis', language: AliasLanguage.LA },
      { alias: 'Fasiyal sinir', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Chorda tympani nerve',
    conceptType: ConceptType.NERVE,
    aliases: [
      { alias: 'Chorda tympani', language: AliasLanguage.LA },
      { alias: 'Chorda tympani nerve', language: AliasLanguage.EN },
      { alias: 'Chorda tympani siniri', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Vestibulocochlear nerve (CN VIII)',
    conceptType: ConceptType.NERVE,
    aliases: [
      { alias: 'Vestibulocochlear nerve', language: AliasLanguage.EN },
      { alias: 'CN VIII', language: AliasLanguage.EN },
      { alias: 'Nervus vestibulocochlearis', language: AliasLanguage.LA },
      { alias: 'Vestibülokoklear sinir', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Olfactory nerve (CN I)',
    conceptType: ConceptType.NERVE,
    aliases: [
      { alias: 'Olfactory nerve', language: AliasLanguage.EN },
      { alias: 'CN I', language: AliasLanguage.EN },
      { alias: 'Nervus olfactorius', language: AliasLanguage.LA },
      { alias: 'Koku siniri', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Optic nerve (CN II)',
    conceptType: ConceptType.NERVE,
    aliases: [
      { alias: 'Optic nerve', language: AliasLanguage.EN },
      { alias: 'CN II', language: AliasLanguage.EN },
      { alias: 'Nervus opticus', language: AliasLanguage.LA },
      { alias: 'Optik sinir', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Oculomotor nerve (CN III)',
    conceptType: ConceptType.NERVE,
    aliases: [
      { alias: 'Oculomotor nerve', language: AliasLanguage.EN },
      { alias: 'CN III', language: AliasLanguage.EN },
      { alias: 'Nervus oculomotorius', language: AliasLanguage.LA },
      { alias: 'Okülomotor sinir', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Trochlear nerve (CN IV)',
    conceptType: ConceptType.NERVE,
    aliases: [
      { alias: 'Trochlear nerve', language: AliasLanguage.EN },
      { alias: 'CN IV', language: AliasLanguage.EN },
      { alias: 'Nervus trochlearis', language: AliasLanguage.LA },
      { alias: 'Trochlear sinir', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Trigeminal nerve (CN V)',
    conceptType: ConceptType.NERVE,
    aliases: [
      { alias: 'Trigeminal nerve', language: AliasLanguage.EN },
      { alias: 'CN V', language: AliasLanguage.EN },
      { alias: 'Nervus trigeminus', language: AliasLanguage.LA },
      { alias: 'Trigeminal sinir', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Abducens nerve (CN VI)',
    conceptType: ConceptType.NERVE,
    aliases: [
      { alias: 'Abducens nerve', language: AliasLanguage.EN },
      { alias: 'CN VI', language: AliasLanguage.EN },
      { alias: 'Nervus abducens', language: AliasLanguage.LA },
      { alias: 'Abducens sinir', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Hypoglossal nerve (CN XII)',
    conceptType: ConceptType.NERVE,
    aliases: [
      { alias: 'Hypoglossal nerve', language: AliasLanguage.EN },
      { alias: 'CN XII', language: AliasLanguage.EN },
      { alias: 'Nervus hypoglossus', language: AliasLanguage.LA },
      { alias: 'Hipoglossal sinir', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Glossopharyngeal nerve (CN IX)',
    conceptType: ConceptType.NERVE,
    aliases: [
      { alias: 'Glossopharyngeal nerve', language: AliasLanguage.EN },
      { alias: 'CN IX', language: AliasLanguage.EN },
      { alias: 'Nervus glossopharyngeus', language: AliasLanguage.LA },
      { alias: 'Glossofaringeal sinir', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Vagus nerve (CN X)',
    conceptType: ConceptType.NERVE,
    aliases: [
      { alias: 'Vagus nerve', language: AliasLanguage.EN },
      { alias: 'CN X', language: AliasLanguage.EN },
      { alias: 'Nervus vagus', language: AliasLanguage.LA },
      { alias: 'Vagus sinir', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Accessory nerve (CN XI)',
    conceptType: ConceptType.NERVE,
    aliases: [
      { alias: 'Accessory nerve', language: AliasLanguage.EN },
      { alias: 'CN XI', language: AliasLanguage.EN },
      { alias: 'Nervus accessorius', language: AliasLanguage.LA },
      { alias: 'Aksesuar sinir', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Cerebrum',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Cerebrum', language: AliasLanguage.EN },
      { alias: 'Cerebrum', language: AliasLanguage.LA },
      { alias: 'Beyin', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Cerebellum',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Cerebellum', language: AliasLanguage.EN },
      { alias: 'Cerebellum', language: AliasLanguage.LA },
      { alias: 'Beyincik', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Diencephalon',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Diencephalon', language: AliasLanguage.EN },
      { alias: 'Diencephalon', language: AliasLanguage.LA },
      { alias: 'Ara beyin', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Midbrain',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Midbrain', language: AliasLanguage.EN },
      { alias: 'Mesencephalon', language: AliasLanguage.LA },
      { alias: 'Orta beyin', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Pons',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Pons', language: AliasLanguage.EN },
      { alias: 'Pons', language: AliasLanguage.LA },
      { alias: 'Pons', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Medulla oblongata',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Medulla oblongata', language: AliasLanguage.EN },
      { alias: 'Medulla oblongata', language: AliasLanguage.LA },
      { alias: 'Medulla oblongata', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Spinal cord',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Spinal cord', language: AliasLanguage.EN },
      { alias: 'Medulla spinalis', language: AliasLanguage.LA },
      { alias: 'Omurilik', language: AliasLanguage.TR },
    ],
  },

  {
    preferredLabel: 'Nerve to stapedius',
    conceptType: ConceptType.NERVE,
    aliases: [
      { alias: 'Nerve to stapedius', language: AliasLanguage.EN },
      { alias: 'Nervus stapedius', language: AliasLanguage.LA },
      { alias: 'Stapedius siniri', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Chorda tympani nerve',
    conceptType: ConceptType.NERVE,
    aliases: [
      { alias: 'Chorda tympani nerve', language: AliasLanguage.EN },
      { alias: 'Nervus chordae tympani', language: AliasLanguage.LA },
      { alias: 'Chorda tympani siniri', language: AliasLanguage.TR },
    ],
  },
  // Brain structures
  {
    preferredLabel: 'Brainstem',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Brainstem', language: AliasLanguage.EN },
      { alias: 'Truncus encephali', language: AliasLanguage.LA },
      { alias: 'Beyin sapı', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Thalamus',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Thalamus', language: AliasLanguage.EN },
      { alias: 'Thalamus', language: AliasLanguage.LA },
      { alias: 'Talamus', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Hypothalamus',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Hypothalamus', language: AliasLanguage.EN },
      { alias: 'Hypothalamus', language: AliasLanguage.LA },
      { alias: 'Hipotalamus', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Basal ganglia',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Basal ganglia', language: AliasLanguage.EN },
      { alias: 'Nuclei basales', language: AliasLanguage.LA },
      { alias: 'Bazal gangliyonlar', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Internal capsule',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Internal capsule', language: AliasLanguage.EN },
      { alias: 'Capsula interna', language: AliasLanguage.LA },
      { alias: 'İnternal kapsül', language: AliasLanguage.TR },
    ],
  },
  //Ventricular System
  {
    preferredLabel: 'Lateral ventricle',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Lateral ventricle', language: AliasLanguage.EN },
      { alias: 'Ventriculus lateralis', language: AliasLanguage.LA },
      { alias: 'Lateral ventrikül', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Third ventricle',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Third ventricle', language: AliasLanguage.EN },
      { alias: 'Ventriculus tertius', language: AliasLanguage.LA },
      { alias: 'Üçüncü ventrikül', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Fourth ventricle',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Fourth ventricle', language: AliasLanguage.EN },
      { alias: 'Ventriculus quartus', language: AliasLanguage.LA },
      { alias: 'Dördüncü ventrikül', language: AliasLanguage.TR },
    ],
  },
  //Cerebral aqueduct
  {
    preferredLabel: 'Cerebral aqueduct',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Cerebral aqueduct', language: AliasLanguage.EN },
      { alias: 'Aquaeductus cerebri', language: AliasLanguage.LA },
      { alias: 'Serebral akuedukt', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Corpus callosum',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Corpus callosum', language: AliasLanguage.EN },
      { alias: 'Corpus callosum', language: AliasLanguage.LA },
      { alias: 'Korpus kallozum', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Hippocampus',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Hippocampus', language: AliasLanguage.EN },
      { alias: 'Hippocampus', language: AliasLanguage.LA },
      { alias: 'Hipokampus', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Lateral ventricle',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Lateral ventricle', language: AliasLanguage.EN },
      { alias: 'Ventriculus lateralis', language: AliasLanguage.LA },
      { alias: 'Lateral ventrikül', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Third ventricle',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Third ventricle', language: AliasLanguage.EN },
      { alias: 'Ventriculus tertius', language: AliasLanguage.LA },
      { alias: 'Üçüncü ventrikül', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Fourth ventricle',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Fourth ventricle', language: AliasLanguage.EN },
      { alias: 'Ventriculus quartus', language: AliasLanguage.LA },
      { alias: 'Dördüncü ventrikül', language: AliasLanguage.TR },
    ],
  },
];
