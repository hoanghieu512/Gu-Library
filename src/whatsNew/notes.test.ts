import { describe, it, expect } from 'vitest';
import { RELEASE_NOTES } from './notes';
import { compareVersions } from './select';

describe('RELEASE_NOTES — the notes Pé reads', () => {
  it('the version being built has notes (a release cannot forget them)', () =>
    expect(RELEASE_NOTES[0].version).toBe(__APP_VERSION__));

  it('newest first, no duplicates', () => {
    for (let i = 0; i + 1 < RELEASE_NOTES.length; i++)
      expect(compareVersions(RELEASE_NOTES[i].version, RELEASE_NOTES[i + 1].version)).toBeGreaterThan(0);
  });

  it('every version has at least one line and a dd/mm/yyyy date', () => {
    for (const n of RELEASE_NOTES) {
      expect(n.items.length).toBeGreaterThan(0);
      expect(n.date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    }
  });

  it('plain words for Pé: no code words, never "Gú"', () => {
    for (const { text } of RELEASE_NOTES.flatMap((n) => n.items)) {
      expect(text).not.toMatch(/`/);
      expect(text).not.toMatch(/[a-z][A-Z]/);
      expect(text).not.toMatch(/\.(tsx?|json)\b/);
      expect(text).not.toMatch(/Gú/);
    }
  });
});
