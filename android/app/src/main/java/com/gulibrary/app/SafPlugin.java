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

    // Liệt kê con của một folder bằng MỘT truy vấn cursor (bulk) thay vì DocumentFile.listFiles()
    // + getName()/isDirectory() hỏi provider TỪNG đứa con (nameLoop, chiếm 60–75% thời gian mỗi
    // lần list — nhân hệ số cho mọi mục khác). Trả entry y hệt cũ (name/isDirectory/uri) nên mọi
    // caller không đổi. URI con dựng bằng buildDocumentUriUsingTree = đúng dạng DocumentFile.getUri().
    @PluginMethod
    public void listFolder(PluginCall call) {
        String uriStr = call.getString("uri");
        if (uriStr == null) { call.reject("uri required"); return; }
        Uri treeUri = Uri.parse(uriStr);
        String parentDocId;
        try {
            // uri con (có /document/) → lấy documentId; uri gốc từ picker (chỉ /tree/) → treeDocumentId.
            parentDocId = android.provider.DocumentsContract.getDocumentId(treeUri);
        } catch (Exception e) {
            parentDocId = android.provider.DocumentsContract.getTreeDocumentId(treeUri);
        }
        Uri childrenUri = android.provider.DocumentsContract.buildChildDocumentsUriUsingTree(treeUri, parentDocId);
        final String[] proj = {
            android.provider.DocumentsContract.Document.COLUMN_DOCUMENT_ID,
            android.provider.DocumentsContract.Document.COLUMN_DISPLAY_NAME,
            android.provider.DocumentsContract.Document.COLUMN_MIME_TYPE
        };
        JSArray entries = new JSArray();
        try (android.database.Cursor c =
                 getContext().getContentResolver().query(childrenUri, proj, null, null, null)) {
            while (c != null && c.moveToNext()) {
                String docId = c.getString(0);
                String name = c.getString(1);
                String mime = c.getString(2);
                boolean isDir = android.provider.DocumentsContract.Document.MIME_TYPE_DIR.equals(mime);
                Uri childUri = android.provider.DocumentsContract.buildDocumentUriUsingTree(treeUri, docId);
                JSObject o = new JSObject();
                o.put("name", name);
                o.put("isDirectory", isDir);
                o.put("uri", childUri.toString());
                entries.put(o);
            }
        } catch (Exception e) {
            call.reject("list failed: " + e.getMessage());
            return;
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
        } catch (Throwable t) {
            // PHẢI bắt Throwable (không chỉ Exception): file quá nặng → Base64 dựng String khổng lồ
            // → OutOfMemoryError (là Error, không phải Exception). Nếu để lọt = uncaught → app chết.
            // reject êm → JS (readPdfBytes) reject → ViewerPage hiện lỗi thân thiện, app sống.
            call.reject("read failed: " + t.getMessage());
        }
    }

    // Probe "có mở đọc được không" (v1.26.0) — GỌI TRƯỚC khi đọc PDF qua local-server (fetch).
    // Vì sao cần: readPdfBytes mới fetch content-URI qua WebViewLocalServer của Capacitor; nếu file
    // đã bị move/xóa (FileNotFoundException) hoặc quyền SAF thu hồi (SecurityException → stream null),
    // local-server ném lỗi KHÔNG bắt trong shouldInterceptRequest → CRASH cả app (main-process, lưới
    // onRenderProcessGone không đỡ). Probe mở+chạm 1 byte trong try/catch Throwable → reject êm →
    // JS (readPdfBytes) throw → ViewerPage catch → empty-state "chết cho đẹp". File OK: resolve, rẻ.
    @PluginMethod
    public void probeReadable(PluginCall call) {
        String uriStr = call.getString("uri");
        if (uriStr == null) { call.reject("uri required"); return; }
        try (java.io.InputStream is = getContext().getContentResolver().openInputStream(android.net.Uri.parse(uriStr))) {
            if (is == null) { call.reject("không mở được file"); return; }
            is.read(); // chạm 1 byte → chắc chắn stream mở thật (không chỉ dựng đối tượng)
            call.resolve();
        } catch (Throwable t) {
            call.reject("không mở được file: " + t.getMessage());
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
        // Ảnh (v1.19.0): worker đóng ảnh→PDF. Mime khớp đuôi để provider giữ đuôi (đừng để .tmp → worker bỏ).
        if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
        if (n.endsWith(".png")) return "image/png";
        if (n.endsWith(".webp")) return "image/webp";
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

    // Bảo đảm có folder con tên `name` (reuse nếu đã có) — dùng cho _inbox/_print.
    // Chống TẠO TRÙNG "_inbox (k)": khi worker/Syncthing vừa xóa+tạo lại _inbox, cache của
    // DocumentFile.findFile trả stale → tưởng chưa có → createDirectory → Samsung auto-dedup ra
    // "_inbox (1)". File ghi vào đó thành mồ côi (worker chỉ quét "_inbox") → kẹt + môn có thể
    // biến mất (snapshot coi "_inbox (k)" là môn rồi throw). Hai lớp chống:
    //   (1) dò con bằng cursor DocumentsContract TƯƠI trước khi tạo (như listFolder);
    //   (2) nếu vẫn lỡ tạo bản dedup (tên trả về != tên xin) → xóa bản rỗng, trả bản gốc.
    @PluginMethod
    public void ensureDir(PluginCall call) {
        String parentUri = call.getString("parentUri");
        String name = call.getString("name");
        if (parentUri == null || name == null) { call.reject("parentUri+name required"); return; }
        try {
            Uri parentTree = android.net.Uri.parse(parentUri);
            com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
            // (1) Dò tươi: đã có đúng folder tên `name` → reuse, không tạo.
            String existing = findChildDirByName(parentTree, name);
            if (existing != null) { ret.put("uri", existing); call.resolve(ret); return; }
            androidx.documentfile.provider.DocumentFile parent =
                androidx.documentfile.provider.DocumentFile.fromTreeUri(getContext(), parentTree);
            if (parent == null) { call.reject("bad parent"); return; }
            androidx.documentfile.provider.DocumentFile child = parent.createDirectory(name);
            if (child == null) { call.reject("createDirectory returned null"); return; }
            // (2) Bị dedup ("_inbox (1)")? = bản gốc ĐÃ tồn tại (dò (1) lỡ vì churn). Xóa bản
            // trùng rỗng vừa tạo rồi trả bản gốc — CHỈ khi xác nhận được gốc (không thì giữ chỗ ghi).
            if (!name.equals(child.getName())) {
                String real = findChildDirByName(parentTree, name);
                if (real != null) { child.delete(); ret.put("uri", real); call.resolve(ret); return; }
            }
            ret.put("uri", child.getUri().toString());
            call.resolve(ret);
        } catch (Exception e) { call.reject("ensureDir failed: " + e.getMessage()); }
    }

    // Dò con là THƯ MỤC tên khớp bằng một cursor DocumentsContract tươi (giống listFolder) → không
    // qua cache DocumentFile.findFile (nguồn stale gây tạo trùng). Trả URI con, hoặc null nếu vắng.
    private String findChildDirByName(Uri parentTree, String name) {
        String parentDocId;
        try { parentDocId = android.provider.DocumentsContract.getDocumentId(parentTree); }
        catch (Exception e) { parentDocId = android.provider.DocumentsContract.getTreeDocumentId(parentTree); }
        Uri childrenUri = android.provider.DocumentsContract.buildChildDocumentsUriUsingTree(parentTree, parentDocId);
        final String[] proj = {
            android.provider.DocumentsContract.Document.COLUMN_DOCUMENT_ID,
            android.provider.DocumentsContract.Document.COLUMN_DISPLAY_NAME,
            android.provider.DocumentsContract.Document.COLUMN_MIME_TYPE
        };
        try (android.database.Cursor c =
                 getContext().getContentResolver().query(childrenUri, proj, null, null, null)) {
            while (c != null && c.moveToNext()) {
                if (name.equals(c.getString(1))
                    && android.provider.DocumentsContract.Document.MIME_TYPE_DIR.equals(c.getString(2))) {
                    return android.provider.DocumentsContract.buildDocumentUriUsingTree(parentTree, c.getString(0)).toString();
                }
            }
        } catch (Exception e) { /* dò lỗi → coi như chưa có, để createDirectory thử */ }
        return null;
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

    // Đổi tên THẬT một thư mục (rename tại chỗ trên đĩa) → tên trong app khớp tên thật ở mini PC/Drive.
    // renameDocument trả URI MỚI (docId của tree dựa đường dẫn nên đổi tên = đổi uri; con bên trong
    // giữ vị trí, companion .print.json/.display.json theo cùng). Caller (JS) đã chặn trùng anh-em TRƯỚC
    // nên ở đây không tự dedup. Trả cả uri mới cho caller cập nhật điều hướng nếu cần.
    @PluginMethod
    public void renameDir(PluginCall call) {
        String uriStr = call.getString("uri");
        String newName = call.getString("newName");
        if (uriStr == null || newName == null) { call.reject("uri+newName required"); return; }
        try {
            android.net.Uri newUri = android.provider.DocumentsContract.renameDocument(
                getContext().getContentResolver(), android.net.Uri.parse(uriStr), newName);
            if (newUri == null) { call.reject("rename returned null"); return; }
            com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
            ret.put("uri", newUri.toString());
            call.resolve(ret);
        } catch (Exception e) { call.reject("rename failed: " + e.getMessage()); }
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

    // Mở system file picker: nhiều file, chỉ loại worker nhận (pdf/doc/docx/ppt/pptx + ảnh jpg/png/webp).
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
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            // Ảnh (v1.19.0): whitelist đúng loại worker đóng→PDF (KHÔNG image/* → né HEIC/gif kẹt ⏳).
            "image/jpeg",
            "image/png",
            "image/webp"
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
