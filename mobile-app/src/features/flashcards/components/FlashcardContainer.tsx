import React from 'react';
import { CardType, Flashcard } from '../types';
import StructureIdCard from './cards/StructureIdCard';
import ContentsOfSpaceCard from './cards/ContentsOfSpaceCard';
import FunctionalAnatomyCard from './cards/FunctionalAnatomyCard';
import RelationsBordersCard from './cards/RelationsBordersCard';
import LesionAnatomyCard from './cards/LesionAnatomyCard';
import EmbryologicOriginCard from './cards/EmbryologicOriginCard';
import ClinicalCorrelationCard from './cards/ClinicalCorrelationCard';
import HighYieldDistinctionCard from './cards/HighYieldDistinctionCard';
import ExceptTrapCard from './cards/ExceptTrapCard';
import TopographicMapCard from './cards/TopographicMapCard';

interface FlashcardContainerProps {
    flashcard: Flashcard;
    isFlipped: boolean;
    onFlip: () => void;
}

/**
 * Smart container that renders the appropriate card component based on cardType
 */
export default function FlashcardContainer({
    flashcard,
    isFlipped,
    onFlip,
}: FlashcardContainerProps) {
    switch (flashcard.cardType) {
        // CORE CARDS
        case CardType.STRUCTURE_ID:
            return (
                <StructureIdCard
                    flashcard={flashcard}
                    isFlipped={isFlipped}
                    onFlip={onFlip}
                />
            );

        case CardType.CONTENTS_OF_SPACE:
            return (
                <ContentsOfSpaceCard
                    flashcard={flashcard}
                    isFlipped={isFlipped}
                    onFlip={onFlip}
                />
            );

        case CardType.FUNCTIONAL_ANATOMY:
            return (
                <FunctionalAnatomyCard
                    flashcard={flashcard}
                    isFlipped={isFlipped}
                    onFlip={onFlip}
                />
            );

        // INTERMEDIATE CARDS
        case CardType.RELATIONS_BORDERS:
            return (
                <RelationsBordersCard
                    flashcard={flashcard}
                    isFlipped={isFlipped}
                    onFlip={onFlip}
                />
            );

        case CardType.LESION_ANATOMY:
            return (
                <LesionAnatomyCard
                    flashcard={flashcard}
                    isFlipped={isFlipped}
                    onFlip={onFlip}
                />
            );

        case CardType.EMBRYOLOGIC_ORIGIN:
            return (
                <EmbryologicOriginCard
                    flashcard={flashcard}
                    isFlipped={isFlipped}
                    onFlip={onFlip}
                />
            );

        // ADVANCED CARDS
        case CardType.CLINICAL_CORRELATION:
            return (
                <ClinicalCorrelationCard
                    flashcard={flashcard}
                    isFlipped={isFlipped}
                    onFlip={onFlip}
                />
            );

        case CardType.HIGH_YIELD_DISTINCTION:
            return (
                <HighYieldDistinctionCard
                    flashcard={flashcard}
                    isFlipped={isFlipped}
                    onFlip={onFlip}
                />
            );

        case CardType.EXCEPT_TRAP:
            return (
                <ExceptTrapCard
                    flashcard={flashcard}
                    isFlipped={isFlipped}
                    onFlip={onFlip}
                />
            );

        case CardType.TOPOGRAPHIC_MAP:
            return (
                <TopographicMapCard
                    flashcard={flashcard}
                    isFlipped={isFlipped}
                    onFlip={onFlip}
                />
            );

        // LEGACY CARDS - fallback to simple card
        default:
            return (
                <ContentsOfSpaceCard
                    flashcard={flashcard}
                    isFlipped={isFlipped}
                    onFlip={onFlip}
                />
            );
    }
}
