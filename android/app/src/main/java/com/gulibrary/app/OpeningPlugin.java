package com.gulibrary.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// JS side of the opening clip (src/plugins/opening.ts): Home reports it has drawn, notices wait for
// the clip's layer to leave. Plugin calls arrive off the main thread; the overlay lives on it.
@CapacitorPlugin(name = "Opening")
public class OpeningPlugin extends Plugin {

    @PluginMethod
    public void homeReady(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            OpeningOverlay overlay = overlay();
            if (overlay != null) overlay.homeReady();
            call.resolve();
        });
    }

    /** Resolves once the layer has left, or at once when it never played. One resolve: no keep-alive. */
    @PluginMethod
    public void whenDone(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            OpeningOverlay overlay = overlay();
            if (overlay == null || overlay.isDone()) call.resolve();
            else overlay.whenDone(call::resolve);
        });
    }

    private OpeningOverlay overlay() {
        return getActivity() instanceof MainActivity ? ((MainActivity) getActivity()).opening() : null;
    }
}
