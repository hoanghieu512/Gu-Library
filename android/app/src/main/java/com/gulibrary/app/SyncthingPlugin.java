package com.gulibrary.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;

import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

@CapacitorPlugin(name = "Syncthing")
public class SyncthingPlugin extends Plugin {

    @PluginMethod
    public void request(PluginCall call) {
        String urlStr = call.getString("url");
        String apiKey = call.getString("apiKey", "");
        if (urlStr == null) { call.reject("url required"); return; }
        try {
            URL url = new URL(urlStr);
            String host = url.getHost();
            boolean isLocal = host.equals("127.0.0.1") || host.equalsIgnoreCase("localhost");
            if (!isLocal) { call.reject("only localhost allowed"); return; }

            HttpURLConnection conn;
            if ("https".equalsIgnoreCase(url.getProtocol())) {
                HttpsURLConnection https = (HttpsURLConnection) url.openConnection();
                https.setSSLSocketFactory(trustAllForLocalhost());
                https.setHostnameVerifier((h, s) -> h.equals("127.0.0.1") || h.equalsIgnoreCase("localhost"));
                conn = https;
            } else {
                conn = (HttpURLConnection) url.openConnection();
            }
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            if (!apiKey.isEmpty()) conn.setRequestProperty("X-API-Key", apiKey);

            int code = conn.getResponseCode();
            InputStream is = (code >= 200 && code < 400) ? conn.getInputStream() : conn.getErrorStream();
            String body = readAll(is);

            JSObject ret = new JSObject();
            ret.put("status", code);
            ret.put("data", body);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("request failed: " + e.getMessage());
        }
    }

    private static String readAll(InputStream is) throws Exception {
        if (is == null) return "";
        try (BufferedReader r = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            char[] buf = new char[4096];
            int n;
            while ((n = r.read(buf)) != -1) sb.append(buf, 0, n);
            return sb.toString();
        }
    }

    private static SSLSocketFactory trustAllForLocalhost() throws Exception {
        TrustManager[] tm = new TrustManager[]{ new X509TrustManager() {
            public void checkClientTrusted(X509Certificate[] c, String a) {}
            public void checkServerTrusted(X509Certificate[] c, String a) {}
            public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
        }};
        SSLContext ctx = SSLContext.getInstance("TLS");
        ctx.init(null, tm, new SecureRandom());
        return ctx.getSocketFactory();
    }
}
