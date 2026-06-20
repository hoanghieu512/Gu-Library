package com.gulibrary.app;

/* TEMP M6 spike */

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ShareTarget")
public class ShareTargetPlugin extends Plugin {
    public static String pendingUri;
    public static String pendingName;

    @PluginMethod
    public void getSharedFile(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("uri", pendingUri);
        ret.put("name", pendingName);
        call.resolve(ret);
        pendingUri = null;
        pendingName = null;
    }
}
