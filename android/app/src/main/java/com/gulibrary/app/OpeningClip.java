package com.gulibrary.app;

// Which opening clip plays today: a holiday clip near its holiday, the default one otherwise. No
// setting picks it, so the holiday clip stays a surprise; the "Hiệu ứng mở cửa" switch still turns
// every clip off (OpeningGate). Pure, so JUnit can pin the date windows; MainActivity passes the
// phone's local date.
enum OpeningClip {
    DEFAULT,
    HALLOWEEN;

    /** month is 1 to 12. Halloween: 24 to 31 October, the week leading up to the 31st. */
    static OpeningClip forDate(int month, int day) {
        if (month == 10 && day >= 24) return HALLOWEEN;
        return DEFAULT;
    }
}
