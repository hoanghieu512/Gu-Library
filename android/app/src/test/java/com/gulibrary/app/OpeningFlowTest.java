package com.gulibrary.app;

import static com.gulibrary.app.OpeningFlow.Event.CAP_TIMEOUT;
import static com.gulibrary.app.OpeningFlow.Event.ERROR;
import static com.gulibrary.app.OpeningFlow.Event.FADE_ENDED;
import static com.gulibrary.app.OpeningFlow.Event.HOLD_TIMEOUT;
import static com.gulibrary.app.OpeningFlow.Event.HOME_READY;
import static com.gulibrary.app.OpeningFlow.Event.PAUSED;
import static com.gulibrary.app.OpeningFlow.Event.RENDERING_STARTED;
import static com.gulibrary.app.OpeningFlow.Event.SKIP;
import static com.gulibrary.app.OpeningFlow.Event.VIDEO_ENDED;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import com.gulibrary.app.OpeningFlow.Event;
import com.gulibrary.app.OpeningFlow.State;
import org.junit.Test;

public class OpeningFlowTest {

    private static OpeningFlow flow(Event... events) {
        OpeningFlow f = new OpeningFlow();
        for (Event e : events) f.on(e);
        return f;
    }

    @Test
    public void startsOnThePoster() {
        assertEquals(State.POSTER, new OpeningFlow().state());
    }

    @Test
    public void renderingStartedPlays() {
        assertEquals(State.PLAYING, flow(RENDERING_STARTED).state());
    }

    @Test
    public void videoEndedHoldsUntilHomeIsReady() {
        OpeningFlow f = flow(RENDERING_STARTED, VIDEO_ENDED);
        assertEquals(State.HOLDING, f.state());
        f.on(HOME_READY);
        assertEquals(State.FADING, f.state());
        assertFalse(f.fastFade());
    }

    @Test
    public void homeReadyEarlyFadesRightAtTheEnd() {
        OpeningFlow f = flow(HOME_READY, RENDERING_STARTED, VIDEO_ENDED);
        assertEquals(State.FADING, f.state());
        assertFalse(f.fastFade());
    }

    @Test
    public void holdTimesOut() {
        OpeningFlow f = flow(RENDERING_STARTED, VIDEO_ENDED, HOLD_TIMEOUT);
        assertEquals(State.FADING, f.state());
        assertFalse(f.fastFade());
    }

    @Test
    public void skipFadesFastFromPosterPlayingAndHolding() {
        for (OpeningFlow f : new OpeningFlow[] {
            flow(SKIP), flow(RENDERING_STARTED, SKIP), flow(RENDERING_STARTED, VIDEO_ENDED, SKIP),
        }) {
            assertEquals(State.FADING, f.state());
            assertTrue(f.fastFade());
        }
    }

    @Test
    public void skipDuringAFadeIsIgnored() {
        OpeningFlow f = flow(RENDERING_STARTED, VIDEO_ENDED, HOME_READY);
        assertFalse(f.on(SKIP));
        assertEquals(State.FADING, f.state());
        assertFalse(f.fastFade());
    }

    @Test
    public void errorEndsAtOnce() {
        assertEquals(State.DONE, flow(ERROR).state());
        assertEquals(State.DONE, flow(RENDERING_STARTED, ERROR).state());
    }

    // Home key mid-clip: back in the app it is Home, never the rest of the clip.
    @Test
    public void pauseEndsAtOnce() {
        assertEquals(State.DONE, flow(RENDERING_STARTED, PAUSED).state());
        assertEquals(State.DONE, flow(RENDERING_STARTED, VIDEO_ENDED, HOME_READY, PAUSED).state());
    }

    @Test
    public void capFadesWhateverHappens() {
        OpeningFlow f = flow(CAP_TIMEOUT);
        assertEquals(State.FADING, f.state());
        assertFalse(f.fastFade());
    }

    @Test
    public void fadeEndedFinishes() {
        assertEquals(State.DONE, flow(RENDERING_STARTED, VIDEO_ENDED, HOME_READY, FADE_ENDED).state());
    }

    @Test
    public void doneIgnoresEverything() {
        OpeningFlow f = flow(ERROR);
        for (Event e : Event.values()) {
            assertFalse(f.on(e));
            assertEquals(State.DONE, f.state());
        }
    }

    // A decoder fast enough to finish before reporting its first frame still lands on the hold.
    @Test
    public void videoEndedBeforeRenderingStartedStillHolds() {
        assertEquals(State.HOLDING, flow(VIDEO_ENDED).state());
    }

    @Test
    public void constantsMatchTheSpec() {
        assertEquals(2000, OpeningFlow.HOLD_MAX_MS);
        assertEquals(300, OpeningFlow.FADE_MS);
        assertEquals(200, OpeningFlow.FAST_FADE_MS);
        assertEquals(3000, OpeningFlow.CAP_SLACK_MS);
    }
}
