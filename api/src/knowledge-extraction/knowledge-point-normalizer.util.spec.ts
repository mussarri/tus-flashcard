import { buildNormalizedKey } from './knowledge-point-normalizer.util';

describe('buildNormalizedKey', () => {
  it('normalizes Turkish chars and punctuation', () => {
    const key = buildNormalizedKey(
      'Fizyoloji',
      'Böbrek',
      'Çöğüş: İdrar akışı, Şokta azalır!'
    );

    expect(key).toContain('fizyoloji');
    expect(key).toContain('bobrek');
    expect(key).toContain('cogus_idrar_akisi_sokta_azalir');
  });

  it('removes basic TR/EN stopwords', () => {
    const key = buildNormalizedKey(
      'Anatomi',
      'Kas',
      'The ve and bir kas ile tendon'
    );

    expect(key).toContain('anatomi_kas_kas_tendon');
    expect(key).not.toContain('the');
    expect(key).not.toContain('ve');
  });

  it('truncates to 120 chars', () => {
    const longFact = `${'uzun '.repeat(80)}bilgi`;
    const key = buildNormalizedKey('Dahiliye', 'Endokrin', longFact);

    expect(key.length).toBeLessThanOrEqual(120);
  });

  it('falls back to hash when normalized content is too short', () => {
    const key = buildNormalizedKey(undefined, undefined, 've ve ve');

    expect(key.startsWith('kp_')).toBe(true);
    expect(key.length).toBeGreaterThan(10);
  });
});
