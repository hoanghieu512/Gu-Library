export type BackAction = 'go-back' | 'confirm-exit' | 'exit';

export interface BackState {
  /** True when the router has a previous entry to pop to. */
  canGoBack: boolean;
  /** True when a recent back press has armed the exit-confirmation window. */
  exitArmed: boolean;
}

/**
 * Decides what a single Android back press should do.
 * Overlay handling is intentionally NOT here: Ionic's own overlay handlers run
 * at a higher priority and consume the press before this logic is reached.
 */
export function decideBackAction(state: BackState): BackAction {
  if (state.canGoBack) return 'go-back';
  if (state.exitArmed) return 'exit';
  return 'confirm-exit';
}
