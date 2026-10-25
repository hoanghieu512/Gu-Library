package com.gulibrary.app;

import android.content.Intent;

// Whether the opening clip plays (spec 2026-10-25-mo-cua-video-design.md §5.1). Pure, so JUnit can
// pin every case; MainActivity gathers the inputs.
final class OpeningGate {
    /** Settings switch, written by src/opening/openingPref.ts into CapacitorStorage: "off" = off. */
    static final String SWITCH_KEY = "opening_doors";
    /** Set by MainActivity when the renderer died; CrashNotice reads and clears it. */
    static final String CRASH_KEY = "viewer_crash";

    private OpeningGate() {}

    /**
     * Only a real cold start plays: not an activity Android restored or MainActivity recreated
     * (coldStart false), not a launch to receive a share, not with the switch off, not right after
     * a renderer crash, not when the phone removed animations (animator scale 0).
     */
    static boolean shouldPlay(boolean coldStart, String intentAction, String switchValue,
                              String crashFlag, float animatorScale) {
        if (!coldStart) return false;
        if (Intent.ACTION_SEND.equals(intentAction) || Intent.ACTION_SEND_MULTIPLE.equals(intentAction)) return false;
        if ("off".equals(switchValue)) return false;
        if ("1".equals(crashFlag)) return false;
        return animatorScale != 0f;
    }
}
