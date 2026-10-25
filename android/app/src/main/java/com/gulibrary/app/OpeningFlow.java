package com.gulibrary.app;

// The opening clip's states (spec 2026-10-25-mo-cua-video-design.md §5.2). Pure: OpeningOverlay
// feeds it what the player, the timers, the user and JS report, and acts on the state it lands in.
//   POSTER   first frame as a still while the decoder starts (no black frame)
//   PLAYING  the clip runs
//   HOLDING  clip over, last frame held until Home is ready or HOLD_MAX_MS
//   FADING   the layer fades out (fast after a skip)
//   DONE     the layer is gone for this launch
final class OpeningFlow {
    enum State { POSTER, PLAYING, HOLDING, FADING, DONE }

    enum Event { RENDERING_STARTED, VIDEO_ENDED, HOME_READY, SKIP, HOLD_TIMEOUT, CAP_TIMEOUT, ERROR, PAUSED, FADE_ENDED }

    static final long HOLD_MAX_MS = 2000;
    static final long FADE_MS = 300;
    static final long FAST_FADE_MS = 200;
    /** The whole layer never outlives the clip by more than this. */
    static final long CAP_SLACK_MS = 3000;

    private State state = State.POSTER;
    private boolean homeReady;
    private boolean fastFade;

    State state() { return state; }

    boolean fastFade() { return fastFade; }

    /** Applies the event; returns true when the state changed. */
    boolean on(Event e) {
        if (state == State.DONE) return false;
        if (e == Event.HOME_READY) homeReady = true;
        State next = next(e);
        if (next == state) return false;
        state = next;
        return true;
    }

    private State next(Event e) {
        switch (e) {
            case ERROR:
            case PAUSED:
                return State.DONE;
            case FADE_ENDED:
                return state == State.FADING ? State.DONE : state;
            case SKIP:
                if (state == State.FADING) return state;
                fastFade = true;
                return State.FADING;
            case CAP_TIMEOUT:
                return state == State.FADING ? state : State.FADING;
            case RENDERING_STARTED:
                return state == State.POSTER ? State.PLAYING : state;
            case VIDEO_ENDED:
                if (state != State.POSTER && state != State.PLAYING) return state;
                return homeReady ? State.FADING : State.HOLDING;
            case HOME_READY:
            case HOLD_TIMEOUT:
                return state == State.HOLDING ? State.FADING : state;
            default:
                return state;
        }
    }
}
