package com.gulibrary.app;

import java.util.List;
import java.util.regex.Pattern;

// Name rules SafPlugin applies to what the documents provider hands back. Kept free of Android
// types so they run as plain JUnit tests on the host.
final class SafNames {
    private SafNames() {}

    // Whether the provider may have renamed a new document because `want` is taken on disk: `got`
    // is "x (1)", or "x (1).pdf" with the extension kept, or null (the provider would not say, as it
    // may not while it hides the kho), so the caller has to check the listing. Any other difference
    // (the provider swapping a character FAT does not allow, like ':' in a shared file's name) is
    // not a taken name.
    static boolean mayBeRenamed(String got, String want) {
        if (got == null) return true;
        if (got.equals(want)) return false;
        String k = " \\(\\d+\\)";
        if (got.matches(Pattern.quote(want) + k)) return true;
        int dot = want.lastIndexOf('.');
        return dot > 0 && got.matches(Pattern.quote(want.substring(0, dot)) + k + Pattern.quote(want.substring(dot)));
    }

    // Index in `names` of the one named `want`, else of one named `want` in another case (on a
    // case-insensitive disk that is the same document), or -1.
    static int pick(List<String> names, String want) {
        int exact = names.indexOf(want);
        if (exact >= 0) return exact;
        for (int i = 0; i < names.size(); i++) {
            if (want.equalsIgnoreCase(names.get(i))) return i;
        }
        return -1;
    }

    // What createDir rejects with when `name` is taken: "exists", which JS shows as "Đã tồn tại", and
    // when the copy the provider made could not be removed, its name, so the app can say an empty
    // folder was left behind (src/storage/createDirError.ts reads this shape).
    static String takenMessage(boolean copyRemoved, String copyName) {
        return copyRemoved ? "exists" : "exists; could not remove the empty copy '" + copyName + "'";
    }
}
