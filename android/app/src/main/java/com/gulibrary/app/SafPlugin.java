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

    // Mime đúng theo đuôi. PHẢI truyền mime khớp đuôi cho createFile: nếu để
    // "application/octet-stream", SAF provider của Samsung tự gắn ".tmp" vào file
    // trên đĩa (đuôi không khớp mime) → worker bỏ qua → kẹt. (getName() còn nói dối,
    // trả tên không-.tmp.) Mime khớp → provider giữ nguyên đuôi.
    private static String mimeForName(String name) {
        String n = name.toLowerCase(java.util.Locale.ROOT);
        if (n.endsWith(".pdf")) return "application/pdf";
        if (n.endsWith(".doc")) return "application/msword";
        if (n.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        if (n.endsWith(".ppt")) return "application/vnd.ms-powerpoint";
        if (n.endsWith(".pptx")) return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        return "application/octet-stream";
    }

    // Tên chưa trùng trong dir: nếu trùng, chèn " (k)" TRƯỚC đuôi → "x (1).pdf"
    // (KHÔNG để Android auto-dedup, vì nó thêm sau cả tên → "x.pdf (1)" làm hỏng đuôi → worker bỏ qua).
    private static String uniqueName(androidx.documentfile.provider.DocumentFile dir, String name) {
        if (dir.findFile(name) == null) return name;
        int dot = name.lastIndexOf('.');
        String base = dot > 0 ? name.substring(0, dot) : name;
        String ext = dot > 0 ? name.substring(dot) : "";
        for (int k = 1; k < 1000; k++) {
            String cand = base + " (" + k + ")" + ext;
            if (dir.findFile(cand) == null) return cand;
        }
        return name;
    }

    // Copy nhị phân từ một content-URI nguồn (vd file share) vào một dir trong kho.
    // Dùng cho PDF/Word/PPTX — KHÁC writeFile (text). Tự dedup "(k)" trước đuôi.
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
            String uniq = uniqueName(dir, name);
            androidx.documentfile.provider.DocumentFile f = dir.createFile(mimeForName(uniq), uniq);
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
            ret.put("name", uniq);
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

    // Tạo folder mới, CHẶN nếu trùng (khác ensureDir reuse). Dùng cho tạo môn/folder con.
    @PluginMethod
    public void createDir(PluginCall call) {
        String parentUri = call.getString("parentUri");
        String name = call.getString("name");
        if (parentUri == null || name == null) { call.reject("parentUri+name required"); return; }
        try {
            androidx.documentfile.provider.DocumentFile parent =
                androidx.documentfile.provider.DocumentFile.fromTreeUri(getContext(), android.net.Uri.parse(parentUri));
            if (parent == null || !parent.isDirectory()) { call.reject("bad parent"); return; }
            if (parent.findFile(name) != null) { call.reject("exists"); return; }
            androidx.documentfile.provider.DocumentFile child = parent.createDirectory(name);
            if (child == null) { call.reject("createDirectory returned null"); return; }
            android.util.Log.i("GuSaf", "createDir req='" + name + "' got='" + child.getName() + "'");
            com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
            ret.put("uri", child.getUri().toString());
            ret.put("name", child.getName());
            call.resolve(ret);
        } catch (Exception e) { call.reject("createDir failed: " + e.getMessage()); }
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

    // Xóa một file theo document-URI (dùng cho dọn _print/ + xóa companion .print.json).
    @PluginMethod
    public void deleteFile(PluginCall call) {
        String uriStr = call.getString("uri");
        if (uriStr == null) { call.reject("uri required"); return; }
        try {
            boolean ok = android.provider.DocumentsContract.deleteDocument(
                getContext().getContentResolver(), android.net.Uri.parse(uriStr));
            if (!ok) { call.reject("delete returned false"); return; }
            call.resolve(new com.getcapacitor.JSObject());
        } catch (Exception e) { call.reject("delete failed: " + e.getMessage()); }
    }

    // Mở system file picker: nhiều file, chỉ loại worker nhận (pdf/doc/docx/ppt/pptx).
    @PluginMethod
    public void pickFiles(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        });
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        startActivityForResult(call, intent, "filesPicked");
    }

    @ActivityCallback
    private void filesPicked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        com.getcapacitor.JSArray files = new com.getcapacitor.JSArray();
        if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            Intent data = result.getData();
            android.content.ClipData clip = data.getClipData();
            if (clip != null) {
                for (int i = 0; i < clip.getItemCount(); i++) {
                    android.net.Uri uri = clip.getItemAt(i).getUri();
                    if (uri != null) files.put(fileMeta(uri));
                }
            } else if (data.getData() != null) {
                files.put(fileMeta(data.getData()));
            }
        }
        com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
        ret.put("files", files);
        call.resolve(ret); // huỷ picker → files rỗng → resolve {files:[]} (không side effect)
    }

    private com.getcapacitor.JSObject fileMeta(android.net.Uri uri) {
        com.getcapacitor.JSObject o = new com.getcapacitor.JSObject();
        o.put("uri", uri.toString());
        o.put("name", queryDisplayName(uri));
        return o;
    }

    private String queryDisplayName(android.net.Uri uri) {
        try (android.database.Cursor c = getContext().getContentResolver().query(uri, null, null, null, null)) {
            if (c != null && c.moveToFirst()) {
                int i = c.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME);
                if (i >= 0) return c.getString(i);
            }
        } catch (Exception ignored) {}
        return uri.getLastPathSegment();
    }
}
