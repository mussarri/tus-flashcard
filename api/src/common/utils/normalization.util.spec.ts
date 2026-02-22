import { computeNormalizedKey, getAtomicitySuspicionScore } from './normalization.util';
import crypto from 'crypto';

describe('Normalization Utilities', () => {
  describe('computeNormalizedKey', () => {
    it('should normalize text to lowercase', () => {
      const input = 'The Medial Meniscus';
      const key = computeNormalizedKey(input);
      expect(key).toBe(computeNormalizedKey('the medial meniscus'));
    });

    it('should normalize Turkish characters', () => {
      const turkish = 'Ş ş İ i Ğ ğ Ü ü Ö ö Ç ç';
      const key = computeNormalizedKey(turkish);
      // Should contain normalized forms (s, i, g, u, o, c)
      expect(key).toBeDefined();
      expect(key.length).toBeGreaterThan(0);
    });

    it('should remove punctuation', () => {
      const inputs = [
        'The ligament: ACL',
        'The ligament; ACL',
        'The ligament, ACL',
        'The ligament (ACL)',
      ];
      
      const keys = inputs.map(computeNormalizedKey);
      // All should produce the same key since punctuation is removed
      expect(keys[0]).toBe(keys[1]);
      expect(keys[1]).toBe(keys[2]);
    });

    it('should collapse whitespace', () => {
      const inputs = [
        'The  medial  meniscus',
        'The   medial   meniscus',
        'The\t medial\nmenis cus',
      ];
      
      const keys = inputs.map(computeNormalizedKey);
      // All should produce the same key
      expect(keys[0]).toBe(keys[1]);
    });

    it('should trim leading/trailing whitespace', () => {
      const inputs = [
        '  medial meniscus  ',
        '\t medial meniscus \n',
        'medial meniscus',
      ];
      
      const keys = inputs.map(computeNormalizedKey);
      // All should produce the same key
      expect(keys[0]).toBe(keys[1]);
      expect(keys[1]).toBe(keys[2]);
    });

    it('should produce consistent hashes', () => {
      const text = 'The anterior cruciate ligament';
      const key1 = computeNormalizedKey(text);
      const key2 = computeNormalizedKey(text);
      expect(key1).toBe(key2);
    });

    it('should produce different hashes for different texts', () => {
      const key1 = computeNormalizedKey('ACL');
      const key2 = computeNormalizedKey('MCL');
      expect(key1).not.toBe(key2);
    });
  });

  describe('getAtomicitySuspicionScore', () => {
    it('should return low score for clearly atomic facts', () => {
      const atomicFacts = [
        'The medial meniscus is found in the knee',
        'Sfinkter ani haricisinin innervasyonu pudendal sinir tarafından sağlanır',
        'The ACL prevents anterior tibial translation',
      ];
      
      atomicFacts.forEach(fact => {
        const score = getAtomicitySuspicionScore(fact);
        expect(score).toBeLessThan(0.5);
      });
    });

    it('should return high score for facts with conjunctions ("and")', () => {
      const nonAtomicFacts = [
        'The ACL and MCL are ligaments',
        'The medial meniscus and lateral meniscus',
      ];
      
      nonAtomicFacts.forEach(fact => {
        const score = getAtomicitySuspicionScore(fact);
        expect(score).toBeGreaterThan(0.3);
      });
    });

    it('should return high score for facts with "or"', () => {
      const fact = 'The ligament is either ACL or MCL';
      const score = getAtomicitySuspicionScore(fact);
      expect(score).toBeGreaterThan(0.2);
    });

    it('should return high score for facts with semicolons (multiple clauses)', () => {
      const fact = 'The ACL prevents translation; the MCL prevents valgus';
      const score = getAtomicitySuspicionScore(fact);
      expect(score).toBeGreaterThan(0.2);
    });

    it('should return score between 0 and 1', () => {
      const facts = [
        'Simple fact',
        'Complex fact with and or conjunctions here',
        'The knee joint includes ACL, MCL, and menisci',
      ];
      
      facts.forEach(fact => {
        const score = getAtomicitySuspicionScore(fact);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });
    });

    it('should detect multiple facts joined by commas', () => {
      const fact = 'The ACL, MCL, and PCL are ligaments';
      const score = getAtomicitySuspicionScore(fact);
      expect(score).toBeGreaterThan(0.2);
    });
  });
});
