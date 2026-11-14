package id.hellomajesty.app;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import org.json.JSONObject;
import com.google.firebase.messaging.FirebaseMessaging;

public class MainActivity extends Activity {
    private WebView webView;
    private ValueCallback<Uri[]> uploadCallback;
    private static final int FILE_CHOOSER_REQUEST = 4102;
    private static final int NOTIFICATION_PERMISSION_REQUEST = 4103;
    private static final String APP_URL = "https://hello-majesty-lead-tracker.pages.dev/";

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        HelloMajestyMessagingService.createNotificationChannel(this);
        requestNotificationPermission();
        FirebaseMessaging.getInstance().getToken().addOnSuccessListener(token ->
            getSharedPreferences("hello_majesty_native", MODE_PRIVATE).edit().putString("fcm_token", token).apply()
        );
        webView = new WebView(this);
        setContentView(webView);
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
        if (savedInstanceState == null) webView.loadUrl(APP_URL);
        else webView.restoreState(savedInstanceState);
    }


    private void registerNativePushToken(WebView view) {
        String token = getSharedPreferences("hello_majesty_native", MODE_PRIVATE).getString("fcm_token", null);
        if (token == null || token.isEmpty()) return;
        String script = """
            (function() {
              let attempts = 0;
              const fcm = __FCM_TOKEN__;
              const timer = setInterval(async () => {
                try {
                  attempts++;
                  let session = null;
                  for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.includes('auth-token')) {
                      try {
                        const value = JSON.parse(localStorage.getItem(key));
                        if (value && value.access_token && value.user && value.user.id) { session = value; break; }
                      } catch (e) {}
                    }
                  }
                  if (!session) { if (attempts >= 120) clearInterval(timer); return; }
                  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fcm));
                  const endpointHash = Array.from(new Uint8Array(digest)).map(v => v.toString(16).padStart(2, '0')).join('');
                  const response = await fetch(
                    'https://ksowzhhmzrumyciehuyv.supabase.co/rest/v1/hm_push_subscriptions?on_conflict=user_id,endpoint_hash',
                    { method: 'POST',
                      headers: {
                        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtzb3d6aGhtenJ1bXljaWVodXl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NzQ2OTUsImV4cCI6MjEwNjE1MDY5NX0.5FcqCIiSTXvZuwmkGZnPOL_LpXJA9hM07qOdPB48s4',
                        'Authorization': 'Bearer ' + session.access_token,
                        'Content-Type': 'application/json',
                        'Prefer': 'resolution=merge-duplicates,return=minimal'
                      },
                      body: JSON.stringify({
                        user_id: session.user.id, endpoint_hash: endpointHash, fcm_token: fcm,
                        device_label: 'Hello Majesty Android', platform: 'android', enabled: true,
                        last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString()
                      })
                    });
                  if (response.ok) clearInterval(timer);
                } catch (error) { console.log('Native push registration failed', error); }
                if (attempts >= 120) clearInterval(timer);
              }, 3000);
            })();
            """.replace("__FCM_TOKEN__", JSONObject.quote(token));
        view.evaluateJavascript(script, null);
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION_REQUEST);
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

    @Override protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) webView.saveState(outState);
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
