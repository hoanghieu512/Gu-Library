import { describe, it, expect } from 'vitest';
import { jumpGate } from './jumpGate';

describe('jumpGate — a jump requested before the PDF is laid out is kept, not lost', () => {
  it('jump before ready → deferred, then wins over the resume page', () => {
    const g = jumpGate();
    expect(g.request(69)).toBeNull();            // PDF still loading: nothing to scroll yet
    expect(g.open(337)).toBe(69);                // layout ready: go to the requested page, not resume
  });

  it('no jump before ready → resume page', () => {
    expect(jumpGate().open(337)).toBe(337);
  });

  it('the latest request before ready wins', () => {
    const g = jumpGate();
    g.request(69);
    g.request(140);
    expect(g.open(1)).toBe(140);
  });

  it('after ready, requests pass straight through', () => {
    const g = jumpGate();
    g.open(337);
    expect(g.request(12)).toBe(12);
  });
});
