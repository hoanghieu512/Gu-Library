package com.gulibrary.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.Arrays;
import java.util.Collections;
import org.junit.Test;

public class SafNamesTest {

    @Test
    public void renamedWhenTheProviderAddsANumber() {
        assertTrue(SafNames.mayBeRenamed("_inbox (1)", "_inbox"));
        assertTrue(SafNames.mayBeRenamed("bai1 (2).pdf", "bai1.pdf"));
        assertTrue(SafNames.mayBeRenamed("_mon.json (1)", "_mon.json"));
    }

    @Test
    public void notRenamedWhenTheNameCameBackAsAsked() {
        assertFalse(SafNames.mayBeRenamed("_inbox", "_inbox"));
    }

    // A shared file's ':' becomes '_' on FAT: the name was cleaned, not taken.
    @Test
    public void notRenamedWhenTheProviderOnlyCleanedTheName() {
        assertFalse(SafNames.mayBeRenamed("Bài 1_ Tổng quan.pdf", "Bài 1: Tổng quan.pdf"));
    }

    // While the provider hides the kho it may not tell the new document's name either. The first
    // version of the fix treated that as a rename (`!name.equals(got)`); keep it that way, so the
    // caller checks the listing instead of handing back a copy it cannot name.
    @Test
    public void mayBeRenamedWhenTheNameCannotBeRead() {
        assertTrue(SafNames.mayBeRenamed(null, "_inbox"));
    }

    @Test
    public void picksTheExactName() {
        assertEquals(1, SafNames.pick(Arrays.asList("slide", "Slide"), "Slide"));
    }

    // On a case-insensitive disk (UBS1) "Slide" is the folder "slide" names.
    @Test
    public void picksTheNameInAnotherCaseWhenNoneMatchesExactly() {
        assertEquals(0, SafNames.pick(Arrays.asList("_Inbox", "Logic"), "_inbox"));
    }

    @Test
    public void picksNothingFromAnEmptyListing() {
        assertEquals(-1, SafNames.pick(Collections.<String>emptyList(), "_inbox"));
    }

    // createDir refuses a taken name with "exists", which JS shows as "Đã tồn tại".
    @Test
    public void takenMessageIsExistsWhenTheCopyWasRemoved() {
        assertEquals("exists", SafNames.takenMessage(true, "Slide (1)"));
    }

    // Review of 18/10: a copy that could not be removed stayed in the synced kho with nobody told.
    // src/storage/createDirError.ts reads this exact shape.
    @Test
    public void takenMessageNamesTheCopyLeftBehind() {
        assertEquals("exists; could not remove the empty copy 'Slide (1)'", SafNames.takenMessage(false, "Slide (1)"));
    }
}
