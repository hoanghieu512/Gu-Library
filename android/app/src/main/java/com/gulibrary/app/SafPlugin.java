package com.gulibrary.app;

import android.app.Activity;
import android.content.Intent;
import android.content.UriPermission;
import android.net.Uri;

import androidx.activity.result.ActivityResult;
import androidx.documentfile.provider.DocumentFile;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "Saf")
public class SafPlugin extends Plugin {

    @PluginMethod
    public void pickFolder(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(
            Intent.FLAG_GRANT_READ_URI_PERMISSION
            | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
        );
        startActivityForResult(call, intent, "folderPicked");
    }

    @ActivityCallback
    private void folderPicked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.reject("cancelled");
            return;
        }
        Uri uri = result.getData().getData();
        final int flags = Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION;
        getContext().getContentResolver().takePersistableUriPermission(uri, flags);
        JSObject ret = new JSObject();
        ret.put("uri", uri.toString());
        call.resolve(ret);
    }

    @PluginMethod
    public void hasPermission(PluginCall call) {
        String uriStr = call.getString("uri");
        boolean granted = false;
        if (uriStr != null) {
            for (UriPermission p : getContext().getContentResolver().getPersistedUriPermissions()) {
                if (p.getUri().toString().equals(uriStr) && p.isReadPermission()) {
                    granted = true;
                    break;
                }
            }
        }
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void listFolder(PluginCall call) {
        String uriStr = call.getString("uri");
        if (uriStr == null) { call.reject("uri required"); return; }
        DocumentFile dir = DocumentFile.fromTreeUri(getContext(), Uri.parse(uriStr));
        if (dir == null || !dir.isDirectory()) { call.reject("not a directory"); return; }
        JSArray entries = new JSArray();
        for (DocumentFile f : dir.listFiles()) {
            JSObject o = new JSObject();
            o.put("name", f.getName());
            o.put("isDirectory", f.isDirectory());
            o.put("uri", f.getUri().toString());
            entries.put(o);
        }
        JSObject ret = new JSObject();
        ret.put("entries", entries);
        call.resolve(ret);
    }

    @PluginMethod
    public void readFile(PluginCall call) {
        String uriStr = call.getString("uri");
        if (uriStr == null) { call.reject("uri required"); return; }
        try (InputStream is = getContext().getContentResolver().openInputStream(Uri.parse(uriStr))) {
            BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            char[] buf = new char[4096];
            int n;
            while ((n = reader.read(buf)) != -1) sb.append(buf, 0, n);
            JSObject ret = new JSObject();
            ret.put("data", sb.toString());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("read failed: " + e.getMessage());
        }
    }

    // Đọc file nhị phân (PDF) -> base64. readFile cũ chỉ hợp text UTF-8.
    @PluginMethod
    public void readFileBase64(PluginCall call) {
        String uriStr = call.getString("uri");
        if (uriStr == null) { call.reject("uri required"); return; }
        try (java.io.InputStream is = getContext().getContentResolver().openInputStream(android.net.Uri.parse(uriStr))) {
            java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = is.read(buf)) != -1) bos.write(buf, 0, n);
            String b64 = android.util.Base64.encodeToString(bos.toByteArray(), android.util.Base64.NO_WRAP);
            com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
            ret.put("data", b64);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("read failed: " + e.getMessage());
        }
    }

    // Copy nhị phân từ một content-URI nguồn (vd file share) vào một dir trong kho.
    // Dùng cho PDF/Word/PPTX — KHÁC writeFile (text). createFile tự thêm hậu tố nếu trùng.
    @PluginMethod
    public void copyToDir(PluginCall call) {
        String srcUri = call.getString("srcUri");
        String dirUri = call.getString("dirUri");
        String name = call.getString("name");
        if (srcUri == null || dirUri == null || name == null) { call.reject("srcUri+dirUri+name required"); return; }
        try {
            androidx.documentfile.provider.DocumentFile dir =
                androidx.documentfile.provider.DocumentFile.fromTreeUri(getContext(), android.net.Uri.parse(dirUri));
            if (dir == null || !dir.isDirectory()) { call.reject("not a directory"); return; }
            androidx.documentfile.provider.DocumentFile f = dir.createFile("application/octet-stream", name);
            if (f == null) { call.reject("createFile returned null"); return; }
            java.io.InputStream is = getContext().getContentResolver().openInputStream(android.net.Uri.parse(srcUri));
            java.io.OutputStream os = getContext().getContentResolver().openOutputStream(f.getUri());
            if (is == null || os == null) { call.reject("open stream failed"); return; }
            byte[] buf = new byte[8192];
            int n;
            while ((n = is.read(buf)) != -1) os.write(buf, 0, n);
            os.flush(); os.close(); is.close();
            com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
            ret.put("uri", f.getUri().toString());
            ret.put("name", f.getName());
            call.resolve(ret);
        } catch (Exception e) { call.reject("copy failed: " + e.getMessage()); }
    }

    /* TEMP M6 spike */
    @PluginMethod
    public void ensureDir(PluginCall call) {
        String parentUri = call.getString("parentUri");
        String name = call.getString("name");
        if (parentUri == null || name == null) { call.reject("parentUri+name required"); return; }
        try {
            androidx.documentfile.provider.DocumentFile parent =
                androidx.documentfile.provider.DocumentFile.fromTreeUri(getContext(), android.net.Uri.parse(parentUri));
            if (parent == null) { call.reject("bad parent"); return; }
            androidx.documentfile.provider.DocumentFile child = parent.findFile(name);
            if (child == null || !child.isDirectory()) child = parent.createDirectory(name);
            if (child == null) { call.reject("createDirectory returned null"); return; }
            com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
            ret.put("uri", child.getUri().toString());
            call.resolve(ret);
        } catch (Exception e) { call.reject("ensureDir failed: " + e.getMessage()); }
    }

    /* TEMP M6 spike */
    @PluginMethod
    public void writeFile(PluginCall call) {
        String dirUri = call.getString("dirUri");
        String name = call.getString("name");
        String content = call.getString("content", "");
        if (dirUri == null || name == null) { call.reject("dirUri+name required"); return; }
        try {
            androidx.documentfile.provider.DocumentFile dir =
                androidx.documentfile.provider.DocumentFile.fromTreeUri(getContext(), android.net.Uri.parse(dirUri));
            if (dir == null || !dir.isDirectory()) { call.reject("not a directory"); return; }
            androidx.documentfile.provider.DocumentFile existing = dir.findFile(name);
            if (existing != null) existing.delete();
            androidx.documentfile.provider.DocumentFile f = dir.createFile("application/octet-stream", name);
            if (f == null) { call.reject("createFile returned null"); return; }
            java.io.OutputStream os = getContext().getContentResolver().openOutputStream(f.getUri());
            os.write(content.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            os.flush(); os.close();
            com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
            ret.put("uri", f.getUri().toString());
            call.resolve(ret);
        } catch (Exception e) { call.reject("write failed: " + e.getMessage()); }
    }
}
