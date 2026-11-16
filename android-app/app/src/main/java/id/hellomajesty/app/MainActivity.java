package id.hellomajesty.app;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.app.AlertDialog;
import android.provider.Settings;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.Toast;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.JavascriptInterface;
import android.util.Log;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import org.json.JSONObject;
import androidx.core.view.WindowCompat;
import com.google.firebase.messaging.FirebaseMessaging;

public class MainActivity extends Activity {
    private WebView webView;
    private volatile boolean pushResultToastShown = false;
    private ValueCallback<Uri[]> uploadCallback;
    private static final int FILE_CHOOSER_REQUEST = 4102;
    private static final int NOTIFICATION_PERMISSION_REQUEST = 4103;
    private static final String APP_URL = "https://hello-majesty-lead-tracker.pages.dev/";

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().clearFlags(android.view.WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS
                | android.view.WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);
        getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        getWindow().setStatusBarColor(android.graphics.Color.rgb(5, 16, 32));
        getWindow().setNavigationBarColor(android.graphics.Color.rgb(5, 16, 32));
        getWindow().getDecorView().setSystemUiVisibility(0);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        HelloMajestyMessagingService.createNotificationChannel(this);
        FirebaseMessaging.getInstance().getToken().addOnSuccessListener(token -> {
            getSharedPreferences("hello_majesty_native", MODE_PRIVATE).edit().putString("fcm_token", token).apply();
            // Token retrieval is asynchronous and may finish after WebView onPageFinished.
            // Retry registration as soon as both the native token and WebView are available.
            if (webView != null) registerNativePushToken(webView);
        });
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(android.graphics.Color.rgb(5, 16, 32));
        webView = new WebView(this);
        webView.addJavascriptInterface(new NativePushBridge(), "HelloMajestyNative");
        root.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        ViewCompat.setOnApplyWindowInsetsListener(root, (view, insets) -> {
            androidx.core.graphics.Insets bars = insets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return insets;
        });
        ViewCompat.requestApplyInsets(root);
        setContentView(root);
        root.post(this::requestNotificationPermission);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        webView.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                registerNativePushToken(view);
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, android.webkit.WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme() == null ? "" : uri.getScheme();
                if ("https".equals(scheme) && uri.getHost() != null &&
                    (uri.getHost().equals("hello-majesty-lead-tracker.pages.dev") ||
                     uri.getHost().equals("ksowzhhmzrumyciehuyv.supabase.co"))) return false;
                if ("http".equals(scheme) || "https".equals(scheme) ||
                    "whatsapp".equals(scheme) || "mailto".equals(scheme) ||
                    "tel".equals(scheme) || "intent".equals(scheme)) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                    catch (ActivityNotFoundException ignored) {}
                    return true;
                }
                return false;
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (uploadCallback != null) uploadCallback.onReceiveValue(null);
                uploadCallback = callback;
                try { startActivityForResult(params.createIntent(), FILE_CHOOSER_REQUEST); }
                catch (ActivityNotFoundException e) { uploadCallback = null; return false; }
                return true;
            }
        });
        if (savedInstanceState == null) webView.loadUrl(resolveNotificationUrl(getIntent()));
        else webView.restoreState(savedInstanceState);
    }

    private String resolveNotificationUrl(Intent intent) {
        String target = intent == null ? null : intent.getStringExtra("hm_notification_url");
        if (target == null && intent != null) target = intent.getStringExtra("url");
        if (target != null && target.startsWith("https://hello-majesty-lead-tracker.pages.dev/")) return target;
        return APP_URL;
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        String target = resolveNotificationUrl(intent);
        if (webView != null) webView.loadUrl(target);
    }

    private void registerNativePushToken(WebView view) {
        String script = """
            (function() {
              if (window.__hmNativePushWatcherStarted) return;
              window.__hmNativePushWatcherStarted = true;
              let lastRegisteredKey = '';
              let lastAttemptAt = 0;
              setInterval(() => {
                try {
                  let session = null;
                  try {
                    const value = JSON.parse(localStorage.getItem('hm_auth_session') || 'null');
                    if (value && value.access_token && value.user && value.user.id) session = value;
                  } catch (e) {}
                  if (!session) {
                    lastRegisteredKey = '';
                    return;
                  }
                  const key = session.user.id + ':' + session.access_token;
                  const now = Date.now();
                  if (key !== lastRegisteredKey || now - lastAttemptAt >= 15000) {
                    if (window.HelloMajestyNative &&
                        typeof window.HelloMajestyNative.registerPushSession === 'function') {
                      lastRegisteredKey = key;
                      lastAttemptAt = now;
                      window.HelloMajestyNative.registerPushSession(session.access_token, session.user.id);
                    }
                  }
                } catch (error) { console.log('Native push registration watcher error', error); }
              }, 3000);
            })();
            """;
        view.evaluateJavascript(script, null);
    }

    public final class NativePushBridge {
        @JavascriptInterface
        public void registerPushSession(String accessToken, String userId) {
            if (accessToken == null || accessToken.isEmpty() || userId == null || userId.isEmpty()) {
                Log.e("HelloMajestyPush", "Push registration skipped: missing authenticated session.");
                return;
            }
            Log.i("HelloMajestyPush", "Authenticated session detected; requesting FCM token for current user.");
            String token = getSharedPreferences("hello_majesty_native", MODE_PRIVATE).getString("fcm_token", null);
            if (token == null || token.isEmpty()) {
                FirebaseMessaging.getInstance().getToken()
                    .addOnSuccessListener(fcmToken -> {
                        getSharedPreferences("hello_majesty_native", MODE_PRIVATE).edit().putString("fcm_token", fcmToken).apply();
                        postPushSubscription(accessToken, userId, fcmToken);
                    })
                    .addOnFailureListener(error -> {
                        Log.e("HelloMajestyPush", "FCM token retrieval failed", error);
                        showPushRegistrationResult("Token notifikasi gagal diambil: " + error.getMessage());
                    });
                return;
            }
            postPushSubscription(accessToken, userId, token);
        }
    }

    private void postPushSubscription(String accessToken, String userId, String fcmToken) {
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                byte[] digest = MessageDigest.getInstance("SHA-256").digest(fcmToken.getBytes(StandardCharsets.UTF_8));
                StringBuilder hash = new StringBuilder();
                for (byte value : digest) hash.append(String.format("%02x", value & 0xff));
                JSONObject payload = new JSONObject();
                payload.put("user_id", userId);
                payload.put("endpoint_hash", hash.toString());
                payload.put("fcm_token", fcmToken);
                payload.put("device_label", "Hello Majesty Android");
                payload.put("platform", "android");
                payload.put("enabled", true);
                String now = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", Locale.US).format(new Date());
                payload.put("last_seen_at", now);
                payload.put("updated_at", now);

                URL url = new URL("https://ksowzhhmzrumyciehuyv.supabase.co/rest/v1/hm_push_subscriptions?on_conflict=user_id,endpoint_hash");
                connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("POST");
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(15000);
                connection.setDoOutput(true);
                connection.setRequestProperty("apikey", "sb_publishable_WfnEfH3-TOZS6wTKV9Ac_w_F58DiOTW");
                connection.setRequestProperty("Authorization", "Bearer " + accessToken);
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setRequestProperty("Prefer", "resolution=merge-duplicates,return=minimal");
                try (OutputStream output = connection.getOutputStream()) {
                    output.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                }
                int status = connection.getResponseCode();
                String responseMessage = connection.getResponseMessage();
                if (status >= 200 && status < 300) {
                    Log.i("HelloMajestyPush", "Android push subscription registered for signed-in user. HTTP " + status);
                    showPushRegistrationResult("Notifikasi Android berhasil didaftarkan (HTTP " + status + ").");
                } else {
                    String errorBody = "";
                    try (java.io.InputStream errorStream = connection.getErrorStream()) {
                        if (errorStream != null) { java.io.ByteArrayOutputStream buffer = new java.io.ByteArrayOutputStream(); byte[] chunk = new byte[1024]; int count; while ((count = errorStream.read(chunk)) != -1) buffer.write(chunk, 0, count); errorBody = buffer.toString(StandardCharsets.UTF_8.name()); }
                    } catch (Exception ignored) {}
                    Log.e("HelloMajestyPush", "Push registration failed with HTTP " + status + ": " + errorBody);
                    showPushRegistrationResult("Registrasi notifikasi gagal (HTTP " + status + "): " + errorBody);
                }
            } catch (Exception error) {
                Log.e("HelloMajestyPush", "Push registration error", error);
                showPushRegistrationResult("Kesalahan registrasi notifikasi: " + error.getMessage());
            } finally {
                if (connection != null) connection.disconnect();
            }
        }).start();
    }

    private void showPushRegistrationResult(String message) {
        if (pushResultToastShown) return;
        pushResultToastShown = true;
        runOnUiThread(() -> Toast.makeText(getApplicationContext(), message, Toast.LENGTH_LONG).show());
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT < 33 ||
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) return;
        if (shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS)) {
            new AlertDialog.Builder(this)
                .setTitle("Izin Notifikasi Hello Majesty")
                .setMessage("Izinkan notifikasi agar CS menerima pemberitahuan WhatsApp masuk dan Sales menerima handover, termasuk saat aplikasi tidak sedang dibuka. Notifikasi dapat disertai suara sesuai pengaturan perangkat.")
                .setNegativeButton("Nanti", (dialog, which) -> dialog.dismiss())
                .setPositiveButton("Izinkan", (dialog, which) ->
                    requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION_REQUEST))
                .show();
        } else {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION_REQUEST);
        }
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != NOTIFICATION_PERMISSION_REQUEST) return;
        if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) return;
        if (Build.VERSION.SDK_INT >= 33 &&
            !shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS)) {
            new AlertDialog.Builder(this)
                .setTitle("Notifikasi Belum Diizinkan")
                .setMessage("Agar pemberitahuan Hello Majesty dapat diterima, aktifkan izin Notifikasi melalui Pengaturan Android.")
                .setNegativeButton("Nanti", (dialog, which) -> dialog.dismiss())
                .setPositiveButton("Buka Pengaturan", (dialog, which) -> {
                    Intent settings = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                    settings.putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName());
                    startActivity(settings);
                }).show();
        }
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST && uploadCallback != null) {
            Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            uploadCallback.onReceiveValue(results);
            uploadCallback = null;
        }
    }

    @Override protected void onResume() {
        super.onResume();
        FirebaseMessaging.getInstance().getToken().addOnSuccessListener(token -> {
            getSharedPreferences("hello_majesty_native", MODE_PRIVATE).edit().putString("fcm_token", token).apply();
            if (webView != null) registerNativePushToken(webView);
        });
    }

    @Override protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) webView.saveState(outState);
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
