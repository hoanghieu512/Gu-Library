package com.gulibrary.app;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class OpeningGateTest {

    private static final String MAIN = "android.intent.action.MAIN";

    @Test
    public void playsOnAPlainColdStart() {
        assertTrue(OpeningGate.shouldPlay(true, MAIN, null, null, 1f));
    }

    // savedInstanceState != null: Android restored the activity, or MainActivity.recreate() after a crash.
    @Test
    public void notWhenRecreatedOrRestored() {
        assertFalse(OpeningGate.shouldPlay(false, MAIN, null, null, 1f));
    }

    @Test
    public void notWhenOpenedToReceiveAShare() {
        assertFalse(OpeningGate.shouldPlay(true, "android.intent.action.SEND", null, null, 1f));
        assertFalse(OpeningGate.shouldPlay(true, "android.intent.action.SEND_MULTIPLE", null, null, 1f));
    }

    @Test
    public void notWhenTheSwitchIsOff() {
        assertFalse(OpeningGate.shouldPlay(true, MAIN, "off", null, 1f));
        assertTrue(OpeningGate.shouldPlay(true, MAIN, "on", null, 1f));
    }

    @Test
    public void notAfterARendererCrash() {
        assertFalse(OpeningGate.shouldPlay(true, MAIN, null, "1", 1f));
    }

    @Test
    public void notWhenAnimationsAreRemoved() {
        assertFalse(OpeningGate.shouldPlay(true, MAIN, null, null, 0f));
        assertTrue(OpeningGate.shouldPlay(true, MAIN, null, null, 0.5f));
    }

    @Test
    public void aNullActionStillPlays() {
        assertTrue(OpeningGate.shouldPlay(true, null, null, null, 1f));
    }
}
