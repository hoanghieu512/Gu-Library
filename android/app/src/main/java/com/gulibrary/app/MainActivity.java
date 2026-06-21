package com.gulibrary.app;

import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import com.getcapacitor.BridgeActivity;

import java.util.ArrayList;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SafPlugin.class);
        registerPlugin(SyncthingPlugin.class);
        registerPlugin(ShareTargetPlugin.class);
        super.onCreate(savedInstanceState);
        handleSendIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleSendIntent(intent);
    }

    // Nạp file share vào ShareTargetPlugin.pending. ACTION_SEND = 1 file;
    // ACTION_SEND_MULTIPLE = nhiều file (EXTRA_STREAM là ArrayList<Uri>).
    private void handleSendIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (Intent.ACTION_SEND.equals(action)) {
            ShareTargetPlugin.pending.clear();
            Uri uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (uri != null) ShareTargetPlugin.pending.add(new ShareTargetPlugin.SharedFile(uri.toString(), queryName(uri)));
        } else if (Intent.ACTION_SEND_MULTIPLE.equals(action)) {
            ShareTargetPlugin.pending.clear();
            ArrayList<Uri> uris = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
            if (uris != null) {
                for (Uri uri : uris) {
                    if (uri != null) ShareTargetPlugin.pending.add(new ShareTargetPlugin.SharedFile(uri.toString(), queryName(uri)));
                }
            }
        }
    }

    private String queryName(Uri uri) {
        try (Cursor c = getContentResolver().query(uri, null, null, null, null)) {
            if (c != null && c.moveToFirst()) {
                int i = c.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (i >= 0) return c.getString(i);
            }
        } catch (Exception ignored) {}
        return uri.getLastPathSegment();
    }
}
