package com.doppelx.studio;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Base64;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.ValueCallback;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Scanner;

/**
 * DOPPEL X native shell.
 *
 * The application loads only the bundled offline studio from
 * file:///android_asset/. Its JavaScript bridge is deliberately narrow: local
 * persistence, explicit export/share actions, and optional haptic feedback.
 * The app requests no network permission and never opens an untrusted page in
 * this WebView.
 */
public final class MainActivity extends Activity {
    private static final String ASSET_PREFIX = "file:///android_asset/";
    private WebView web;
    private long lastBack = 0L;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setStatusBarColor(Color.parseColor("#070a12"));
        getWindow().setNavigationBarColor(Color.parseColor("#070a12"));
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE);

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#070a12"));
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        // Android asset URLs require file-scheme access. Navigation is pinned to
        // ASSET_PREFIX below; file-to-file and file-to-network access are disabled.
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(false);
        if (Build.VERSION.SDK_INT >= 16) {
            settings.setAllowFileAccessFromFileURLs(false);
            settings.setAllowUniversalAccessFromFileURLs(false);
        }
        if (Build.VERSION.SDK_INT >= 21) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        }
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setTextZoom(100);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        if (Build.VERSION.SDK_INT >= 26) settings.setSafeBrowsingEnabled(true);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);

        web.addJavascriptInterface(new Bridge(), "DXBridge");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request == null ? null : request.getUrl();
                if (isTrustedAsset(uri) || isAboutBlank(uri)) return false;

                // The offline WebView never renders remote or data/content URLs.
                // An intentional http(s) link is handed to the user-selected
                // browser, where it does not have access to DXBridge.
                if (isExternalHttp(uri)) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, uri));
                    } catch (Exception ignored) {
                        toast("No app can open this link");
                    }
                } else {
                    toast("Blocked unsupported link");
                }
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onConsoleMessage(ConsoleMessage message) { return true; }
        });

        setContentView(web);
        web.loadUrl(ASSET_PREFIX + "index.html");
    }

    private static boolean isTrustedAsset(Uri uri) {
        return uri != null && uri.toString().startsWith(ASSET_PREFIX);
    }

    private static boolean isAboutBlank(Uri uri) {
        return uri != null && "about:blank".equals(uri.toString());
    }

    private static boolean isExternalHttp(Uri uri) {
        if (uri == null || uri.getScheme() == null) return false;
        String scheme = uri.getScheme();
        return "https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme);
    }

    private void toast(final String message) {
        runOnUiThread(new Runnable() {
            @Override public void run() {
                Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show();
            }
        });
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript(
            "(function(){try{return (window.__dxBack && window.__dxBack()) ? '1':'0'}catch(e){return '0'}})()",
            new ValueCallback<String>() {
                @Override public void onReceiveValue(String value) {
                    if (value != null && value.contains("1")) return;
                    long now = SystemClock.elapsedRealtime();
                    if (now - lastBack < 2200) finish();
                    else {
                        lastBack = now;
                        toast("Press back again to exit");
                    }
                }
            }
        );
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            onBackPressed();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    /** Narrow, local-only JavaScript bridge for bundled assets. */
    final class Bridge {
        private File kv(String key) {
            return new File(getFilesDir(), "dxkv_" + sha256Hex(key) + ".json");
        }

        private String sha256Hex(String value) {
            try {
                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                byte[] bytes = digest.digest(value.getBytes(StandardCharsets.UTF_8));
                StringBuilder out = new StringBuilder(bytes.length * 2);
                for (byte b : bytes) out.append(String.format("%02x", b & 0xff));
                return out.toString();
            } catch (Exception ignored) {
                // This fallback is collision-resistant enough for the fixed key
                // namespace while keeping persistence available on a broken JRE.
                return Integer.toHexString(value.hashCode());
            }
        }

        @JavascriptInterface
        public synchronized String get(String key) {
            try {
                File file = kv(key);
                if (!file.exists()) return null;
                try (InputStream in = new FileInputStream(file);
                     Scanner scanner = new Scanner(in, StandardCharsets.UTF_8.name()).useDelimiter("\\A")) {
                    return scanner.hasNext() ? scanner.next() : "";
                }
            } catch (Exception ignored) {
                return null;
            }
        }

        @JavascriptInterface
        public synchronized void set(String key, String value) {
            try (FileOutputStream out = new FileOutputStream(kv(key))) {
                out.write((value == null ? "" : value).getBytes(StandardCharsets.UTF_8));
            } catch (Exception ignored) {
                // The web layer has a localStorage/memory fallback.
            }
        }

        @JavascriptInterface
        public synchronized void remove(String key) {
            try {
                File file = kv(key);
                if (file.exists()) file.delete();
            } catch (Exception ignored) {
                // Best-effort local deletion.
            }
        }

        @JavascriptInterface
        public void haptic(int milliseconds) {
            try {
                Vibrator vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                if (vibrator == null || !vibrator.hasVibrator()) return;
                int duration = Math.max(4, milliseconds);
                if (Build.VERSION.SDK_INT >= 26) {
                    vibrator.vibrate(VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    vibrator.vibrate(duration);
                }
            } catch (Exception ignored) {
                // Haptics are optional.
            }
        }

        @JavascriptInterface
        public void copy(String text) {
            try {
                ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                if (clipboard != null) {
                    clipboard.setPrimaryClip(ClipData.newPlainText("DOPPEL X", text == null ? "" : text));
                    toast("Copied");
                }
            } catch (Exception ignored) {
                // Clipboard availability differs by Android version.
            }
        }

        @JavascriptInterface
        public void save(String name, String content) {
            try {
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType(mimeType(name));
                intent.putExtra(Intent.EXTRA_TITLE, safeFileName(name));
                pendingName = safeFileName(name);
                pendingText = content == null ? "" : content;
                pendingBytes = null;
                startActivityForResult(intent, REQ_SAVE_TEXT);
            } catch (Exception ignored) {
                toast("Save failed");
            }
        }

        @JavascriptInterface
        public void saveBase64(String name, String base64) {
            try {
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType(mimeType(name));
                intent.putExtra(Intent.EXTRA_TITLE, safeFileName(name));
                pendingName = safeFileName(name);
                pendingBytes = Base64.decode(base64 == null ? "" : base64, Base64.DEFAULT);
                pendingText = "";
                startActivityForResult(intent, REQ_SAVE_BYTES);
            } catch (Exception ignored) {
                toast("Save failed");
            }
        }

        @JavascriptInterface
        public void share(String title, String text) {
            try {
                Intent intent = new Intent(Intent.ACTION_SEND);
                intent.setType("text/plain");
                intent.putExtra(Intent.EXTRA_SUBJECT, title == null ? "DOPPEL X" : title);
                intent.putExtra(Intent.EXTRA_TEXT, text == null ? "" : text);
                startActivity(Intent.createChooser(intent, "Share profile"));
            } catch (Exception ignored) {
                // Sharing is optional.
            }
        }

        @JavascriptInterface
        public void ready() {
            // Explicit no-op: retains a low-risk liveness hook for the bundled UI.
        }
    }

    private static String safeFileName(String value) {
        String cleaned = (value == null ? "doppelx-export.txt" : value)
            .replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_")
            .trim();
        return cleaned.isEmpty() ? "doppelx-export.txt" : cleaned;
    }

    private static String mimeType(String name) {
        String lower = name == null ? "" : name.toLowerCase();
        if (lower.endsWith(".json")) return "application/json";
        if (lower.endsWith(".csv")) return "text/csv";
        if (lower.endsWith(".zip")) return "application/zip";
        if (lower.endsWith(".html")) return "text/html";
        return "text/plain";
    }

    private static final int REQ_SAVE_TEXT = 0x51;
    private static final int REQ_SAVE_BYTES = 0x52;
    private String pendingName = "doppelx-export.txt";
    private String pendingText = "";
    private byte[] pendingBytes;

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (resultCode != RESULT_OK || data == null || data.getData() == null) return;
        Uri uri = data.getData();
        try {
            if (requestCode == REQ_SAVE_TEXT) {
                try (OutputStream out = getContentResolver().openOutputStream(uri)) {
                    if (out == null) throw new IllegalStateException("No output stream");
                    out.write(pendingText.getBytes(StandardCharsets.UTF_8));
                }
                toast("Saved " + pendingName);
            } else if (requestCode == REQ_SAVE_BYTES && pendingBytes != null) {
                try (OutputStream out = getContentResolver().openOutputStream(uri)) {
                    if (out == null) throw new IllegalStateException("No output stream");
                    out.write(pendingBytes);
                }
                toast("Saved " + pendingName);
            }
        } catch (Exception ignored) {
            toast("Write failed");
        } finally {
            pendingText = "";
            pendingBytes = null;
        }
    }
}
