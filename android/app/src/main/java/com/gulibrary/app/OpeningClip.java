package com.gulibrary.app;

// Which opening clip plays today: a holiday clip near its holiday, the default one otherwise. No
// setting picks it, so the holiday clip stays a surprise; the "Hiệu ứng mở cửa" switch still turns
// every clip off (OpeningGate). No Android calls, so JUnit can pin the date windows; MainActivity
// passes the phone's local date. Each clip is cut by scripts/make-opening-video.sh.
enum OpeningClip {
    DEFAULT(R.raw.opening, R.drawable.opening_first, R.drawable.opening_last),
    HALLOWEEN(R.raw.opening_halloween, R.drawable.opening_halloween_first, R.drawable.opening_halloween_last);

    /** The clip, its first frame (shown while the decoder starts) and its last (held, then faded). */
    final int video;
    final int firstFrame;
    final int lastFrame;

    OpeningClip(int video, int firstFrame, int lastFrame) {
        this.video = video;
        this.firstFrame = firstFrame;
        this.lastFrame = lastFrame;
    }

    /** month is 1 to 12. Halloween: 24 to 31 October, the week leading up to the 31st. */
    static OpeningClip forDate(int month, int day) {
        if (month == 10 && day >= 24) return HALLOWEEN;
        return DEFAULT;
    }
}
