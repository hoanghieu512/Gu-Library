import { describe, it, expect } from 'vitest';
import { initialModel, step, type OpeningEvent, type OpeningModel } from './openingMachine';

const START = { type: 'start', play: true } as const;
const HOME = { type: 'homeReady' } as const;
const MIN = { type: 'minElapsed' } as const;
const SKIP = { type: 'skip', reason: 'tap' } as const;
const END = { type: 'animEnd' } as const;
const DEADLINE = { type: 'deadline' } as const;

const run = (...events: OpeningEvent[]): OpeningModel => events.reduce(step, initialModel());

describe('openingMachine', () => {
  it('starts on the plain cover', () => expect(initialModel().state).toBe('cover'));

  it('start without play ends at once', () => expect(run({ type: 'start', play: false }).state).toBe('done'));

  it('start with play closes the doors', () => expect(run(START).state).toBe('closed'));

  it('opens only when Home is ready AND the minimum time has passed', () => {
    expect(run(START, HOME).state).toBe('closed');
    expect(run(START, MIN).state).toBe('closed');
    expect(run(START, HOME, MIN).state).toBe('opening');
    expect(run(START, MIN, HOME).state).toBe('opening');
  });

  it('Home ready before the doors showed still counts', () => {
    expect(run(HOME, START, MIN).state).toBe('opening');
  });

  it('deadline: cover ends, closed opens, opening stays', () => {
    expect(run(DEADLINE).state).toBe('done');
    expect(run(START, DEADLINE).state).toBe('opening');
    expect(run(START, HOME, MIN, DEADLINE).state).toBe('opening');
  });

  it('skip: cover ends, closed and opening fast-open, fastOpen stays', () => {
    expect(run(SKIP).state).toBe('done');
    expect(run(START, SKIP).state).toBe('fastOpen');
    expect(run(START, HOME, MIN, SKIP).state).toBe('fastOpen');
    expect(run(START, SKIP, SKIP).state).toBe('fastOpen');
  });

  it('animEnd finishes opening and fastOpen, is ignored while closed', () => {
    expect(run(START, HOME, MIN, END).state).toBe('done');
    expect(run(START, SKIP, END).state).toBe('done');
    expect(run(START, END).state).toBe('closed');
  });

  it('done ignores everything', () => {
    for (const e of [START, HOME, MIN, SKIP, END, DEADLINE]) {
      expect(run({ type: 'start', play: false }, e).state).toBe('done');
    }
  });

  it('step does not mutate its input', () => {
    const m = initialModel();
    const copy = { ...m };
    step(m, START);
    step(m, HOME);
    expect(m).toEqual(copy);
  });
});
