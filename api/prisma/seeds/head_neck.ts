/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { ConceptType, AliasLanguage } from '@prisma/client';
import { SeedConcept } from './_types';

export const headAndNeckConcepts: SeedConcept[] = [
  {
    preferredLabel: 'Facial Nerve',
    conceptType: ConceptType.NERVE,
    aliases: [
      { alias: 'Cranial Nerve VII', language: AliasLanguage.EN },
      { alias: 'Nervus facialis', language: AliasLanguage.LA },
      { alias: 'Yüz Siniri', language: AliasLanguage.TR },
    ],
  },
  //Foramina & Canals (tam)
  {
    preferredLabel: 'Jugular Foramen',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Foramen jugulare', language: AliasLanguage.LA },
      { alias: 'Jugular Foramen', language: AliasLanguage.EN },
      { alias: 'Juguler Foramen', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Carotid Canal',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Canalis caroticus', language: AliasLanguage.LA },
      { alias: 'Carotid Canal', language: AliasLanguage.EN },
      { alias: 'Karotid Kanal', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Foramen Magnum',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Foramen magnum', language: AliasLanguage.LA },
      { alias: 'Foramen Magnum', language: AliasLanguage.EN },
      { alias: 'Büyük Foramen', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Optic Canal',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Canalis opticus', language: AliasLanguage.LA },
      { alias: 'Optic Canal', language: AliasLanguage.EN },
      { alias: 'Optik Kanal', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Superior Orbital Fissure',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Fissura orbitalis superior', language: AliasLanguage.LA },
      { alias: 'Superior Orbital Fissure', language: AliasLanguage.EN },
      { alias: 'Superior Orbital Fissure', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Inferior Orbital Fissure',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Fissura orbitalis inferior', language: AliasLanguage.LA },
      { alias: 'Inferior Orbital Fissure', language: AliasLanguage.EN },
      { alias: 'Inferior Orbital Fissure', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Foramen Rotundum',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Foramen rotundum', language: AliasLanguage.LA },
      { alias: 'Foramen Rotundum', language: AliasLanguage.EN },
      { alias: 'Foramen Rotundum', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Foramen Ovale',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Foramen ovale', language: AliasLanguage.LA },
      { alias: 'Foramen Ovale', language: AliasLanguage.EN },
      { alias: 'Foramen Ovale', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Foramen Spinosum',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Foramen spinosum', language: AliasLanguage.LA },
      { alias: 'Foramen Spinosum', language: AliasLanguage.EN },
      { alias: 'Foramen Spinosum', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Foramen Lacerum',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Foramen lacerum', language: AliasLanguage.LA },
      { alias: 'Foramen Lacerum', language: AliasLanguage.EN },
      { alias: 'Foramen Lacerum', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Internal Acoustic Meatus',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Meatus acusticus internus', language: AliasLanguage.LA },
      { alias: 'Internal Acoustic Meatus', language: AliasLanguage.EN },
      { alias: 'Internal Acoustic Meatus', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Hypoglossal Canal',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Canalis hypoglossalis', language: AliasLanguage.LA },
      { alias: 'Hypoglossal Canal', language: AliasLanguage.EN },
      { alias: 'Hipoglossal Kanal', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Stylomastoid Foramen',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Foramen stylomastoideum', language: AliasLanguage.LA },
      { alias: 'Stylomastoid Foramen', language: AliasLanguage.EN },
      { alias: 'Stylomastoid Foramen', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Mandibular Foramen',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Foramen mandibulae', language: AliasLanguage.LA },
      { alias: 'Mandibular Foramen', language: AliasLanguage.EN },
      { alias: 'Mandibular Foramen', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Mental Foramen',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Foramen mentale', language: AliasLanguage.LA },
      { alias: 'Mental Foramen', language: AliasLanguage.EN },
      { alias: 'Mental Foramen', language: AliasLanguage.TR },
    ],
  },

  {
    preferredLabel: 'Ciliary Ganglion',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Ganglion ciliare', language: AliasLanguage.LA },
      { alias: 'Ciliary Ganglion', language: AliasLanguage.EN },
      { alias: 'Siliyer Ganglion', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Pterygopalatine Ganglion',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Ganglion pterygopalatinum', language: AliasLanguage.LA },
      { alias: 'Pterygopalatine Ganglion', language: AliasLanguage.EN },
      { alias: 'Pterigopalatine Ganglion', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Submandibular Ganglion',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Ganglion submandibulare', language: AliasLanguage.LA },
      { alias: 'Submandibular Ganglion', language: AliasLanguage.EN },
      { alias: 'Submandibular Ganglion', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Otic Ganglion',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      {
        alias: 'Ganglion oticum',
        language: AliasLanguage.LA,
      },
      { alias: 'Otic Ganglion', language: AliasLanguage.EN },
      { alias: 'Otic Ganglion', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Superior Cervical Ganglion',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Ganglion cervicale superius', language: AliasLanguage.LA },
      { alias: 'Superior Cervical Ganglion', language: AliasLanguage.EN },
      { alias: 'Superior Servikal Ganglion', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Middle Cervical Ganglion',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Ganglion cervicale medium', language: AliasLanguage.LA },
      { alias: 'Middle Cervical Ganglion', language: AliasLanguage.EN },
      { alias: 'Middle Servikal Ganglion', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Inferior Cervical Ganglion',
    conceptType: ConceptType.STRUCTURE,
    aliases: [
      { alias: 'Ganglion cervicale inferius', language: AliasLanguage.LA },
      { alias: 'Inferior Cervical Ganglion', language: AliasLanguage.EN },
      { alias: 'Inferior Servikal Ganglion', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Thyroid Gland',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Thyroid Gland', language: AliasLanguage.EN },
      { alias: 'Glandula thyreoidea', language: AliasLanguage.LA },
      { alias: 'Tiroid Bezi', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Parathyroid Glands',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Parathyroid Glands', language: AliasLanguage.EN },
      { alias: 'Glandulae parathyreoideae', language: AliasLanguage.LA },
      { alias: 'Paratiroid Bezleri', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Larynx',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Larynx', language: AliasLanguage.EN },
      { alias: 'Larynx', language: AliasLanguage.LA },
      { alias: 'Larinks', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Pharynx',
    conceptType: ConceptType.ORGAN,
    aliases: [
      { alias: 'Pharynx', language: AliasLanguage.EN },
      { alias: 'Pharynx', language: AliasLanguage.LA },
      { alias: 'Farenks', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Parietal Bone',
    conceptType: ConceptType.BONE,
    aliases: [
      { alias: 'Parietal Bone', language: AliasLanguage.EN },
      { alias: 'Os parietale', language: AliasLanguage.LA },
      { alias: 'Parietal Kemik', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Temporal Bone',
    conceptType: ConceptType.BONE,
    aliases: [
      { alias: 'Temporal Bone', language: AliasLanguage.EN },
      { alias: 'Os temporale', language: AliasLanguage.LA },
      { alias: 'Temporal Kemik', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Occipital Bone',
    conceptType: ConceptType.BONE,
    aliases: [
      { alias: 'Occipital Bone', language: AliasLanguage.EN },
      { alias: 'Os occipitale', language: AliasLanguage.LA },
      { alias: 'Oksipital Kemik', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Sphenoid Bone',
    conceptType: ConceptType.BONE,
    aliases: [
      { alias: 'Sphenoid Bone', language: AliasLanguage.EN },
      { alias: 'Os sphenoidale', language: AliasLanguage.LA },
      { alias: 'Sfenoid Kemik', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Ethmoid Bone',
    conceptType: ConceptType.BONE,
    aliases: [
      { alias: 'Ethmoid Bone', language: AliasLanguage.EN },
      { alias: 'Os ethmoidale', language: AliasLanguage.LA },
      { alias: 'Etnomid Kemik', language: AliasLanguage.TR },
    ],
  },

  {
    preferredLabel: 'Maxilla',
    conceptType: ConceptType.BONE,
    aliases: [
      { alias: 'Maxilla', language: AliasLanguage.EN },
      { alias: 'Maxilla', language: AliasLanguage.LA },
      { alias: 'Maksilla', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Mandible',
    conceptType: ConceptType.BONE,
    aliases: [
      { alias: 'Mandible', language: AliasLanguage.EN },
      { alias: 'Mandibula', language: AliasLanguage.LA },
      { alias: 'Mandibula', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Zygomatic Bone',
    conceptType: ConceptType.BONE,
    aliases: [
      { alias: 'Zygomatic Bone', language: AliasLanguage.EN },
      { alias: 'Os zygomaticum', language: AliasLanguage.LA },
      { alias: 'Zygomatik Kemik', language: AliasLanguage.TR },
    ],
  },
  {
    preferredLabel: 'Nasal Bone',
    conceptType: ConceptType.BONE,
    aliases: [
      { alias: 'Nasal Bone', language: AliasLanguage.EN },
      { alias: 'Os nasale', language: AliasLanguage.LA },
      { alias: 'Nazal Kemik', language: AliasLanguage.TR },
    ],
  },
];
