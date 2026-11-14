package id.hellomajesty.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class HelloMajestyMessagingService extends FirebaseMessagingService {
    public static final String CHANNEL_ID = "hello_majesty_alerts";

    @Override public void onMessageReceived(RemoteMessage message) {
        String title = message.getNotification() != null && message.getNotification().getTitle() != null
            ? message.getNotification().getTitle() : message.getData().getOrDefault("title", "Hello Majesty");
        String body = message.getNotification() != null && message.getNotification().getBody() != null
            ? message.getNotification().getBody() : message.getData().getOrDefault("body", "Ada pemberitahuan baru");
        createNotificationChannel(this);
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, intent,
            PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Builder notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(getApplicationInfo().icon)
            .setContentTitle(title).setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setAutoCancel(true).setContentIntent(pendingIntent);
        NotificationManagerCompat.from(this).notify((int) (System.currentTimeMillis() & 0x7fffffff), notification.build());
    }

    @Override public void onNewToken(String token) {
        getSharedPreferences("hello_majesty_native", Context.MODE_PRIVATE)
            .edit().putString("fcm_token", token).apply();
    }

    public static void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID,
                "Hello Majesty Alerts", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Notifikasi lead dan aktivitas penting Hello Majesty");
            channel.enableVibration(true);
            channel.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
                new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).build());
            NotificationManager manager = context.getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }
}
