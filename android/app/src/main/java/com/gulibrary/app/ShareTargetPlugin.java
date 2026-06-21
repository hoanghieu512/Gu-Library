package com.gulibrary.app;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.List;

// Cầu nhận file share (ACTION_SEND + ACTION_SEND_MULTIPLE). MainActivity nạp
// danh sách pending; JS đọc qua getSharedFiles() (đọc xong tự clear).
@CapacitorPlugin(name = "ShareTarget")
public class ShareTargetPlugin extends Plugin {
    public static class SharedFile {
        public final String uri;
        public final String name;
        public SharedFile(String uri, String name) { this.uri = uri; this.name = name; }
    }

    public static final List<SharedFile> pending = new ArrayList<>();

    @PluginMethod
    public void getSharedFiles(PluginCall call) {
        JSArray files = new JSArray();
        for (SharedFile f : pending) {
            JSObject o = new JSObject();
            o.put("uri", f.uri);
            o.put("name", f.name);
            files.put(o);
        }
        JSObject ret = new JSObject();
        ret.put("files", files);
        call.resolve(ret);
        pending.clear();
    }
}
