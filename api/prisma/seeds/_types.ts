import { ConceptType, AliasLanguage } from '@prisma/client';

export type SeedConcept = {
  preferredLabel: string;
  conceptType: ConceptType;
  aliases: {
    alias: string;
    language: AliasLanguage;
  }[];
};
