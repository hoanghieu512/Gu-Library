package com.gulibrary.app;

import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

import java.util.ArrayList;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SafPlugin.class);
        registerPlugin(SyncthingPlugin.class);
        registerPlugin(ShareTargetPlugin.class);
        super.onCreate(savedInstanceState);

        // Lưới an toàn "chết cho đẹp": khi WebView renderer bị Android kill (OOM — vd PDF quá
        // nặng), mặc định Capacitor trả false → Android giết CẢ APP. Ta trả true (đã xử lý) +
        // recreate Activity (process sống) → app tự khởi động lại về Home, Home hiện thông báo.
        this.bridge.addWebViewListener(new WebViewListener() {
            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                // Cờ đọc được từ JS (@capacitor/preferences dùng SharedPreferences "CapacitorStorage").
                getSharedPreferences("CapacitorStorage", MODE_PRIVATE)
                    .edit().putString("viewer_crash", "1").apply();
                runOnUiThread(() -> recreate());
                return true; // đã xử lý → KHÔNG để Android kill app
            }
        });

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
