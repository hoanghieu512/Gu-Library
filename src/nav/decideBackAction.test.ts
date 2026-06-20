import { describe, it, expect } from 'vitest';
import { decideBackAction } from './decideBackAction';

describe('decideBackAction', () => {
  it('goes back when history has a previous entry', () => {
    expect(decideBackAction({ canGoBack: true, exitArmed: false })).toBe('go-back');
  });
  it('go-back takes precedence over exit arming', () => {
    expect(decideBackAction({ canGoBack: true, exitArmed: true })).toBe('go-back');
  });
  it('asks for confirmation at the root on the first press', () => {
    expect(decideBackAction({ canGoBack: false, exitArmed: false })).toBe('confirm-exit');
  });
  it('exits at the root when already armed', () => {
    expect(decideBackAction({ canGoBack: false, exitArmed: true })).toBe('exit');
  });
});
