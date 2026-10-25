package com.gulibrary.app;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class OpeningClipTest {

    @Test
    public void halloweenRunsFromThe24thToThe31stOfOctober() {
        assertEquals(OpeningClip.HALLOWEEN, OpeningClip.forDate(10, 24));
        assertEquals(OpeningClip.HALLOWEEN, OpeningClip.forDate(10, 26));
        assertEquals(OpeningClip.HALLOWEEN, OpeningClip.forDate(10, 31));
    }

    @Test
    public void theDefaultClipOnEitherSideOfHalloween() {
        assertEquals(OpeningClip.DEFAULT, OpeningClip.forDate(10, 23));
        assertEquals(OpeningClip.DEFAULT, OpeningClip.forDate(11, 1));
    }

    @Test
    public void theDefaultClipOnOtherDays() {
        assertEquals(OpeningClip.DEFAULT, OpeningClip.forDate(1, 1));
        assertEquals(OpeningClip.DEFAULT, OpeningClip.forDate(9, 30));
        assertEquals(OpeningClip.DEFAULT, OpeningClip.forDate(12, 31));
    }
}
