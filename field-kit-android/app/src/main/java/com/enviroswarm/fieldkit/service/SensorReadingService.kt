package com.enviroswarm.fieldkit.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.lifecycle.LifecycleService
import com.enviroswarm.fieldkit.MainActivity
import com.enviroswarm.fieldkit.R
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

/**
 * Foreground service that maintains a persistent connection to USB/BLE sensors
 * and streams readings to the database. Runs as a foreground service with
 * location + connectedDevice type to comply with Android 10+ background restrictions.
 */
@AndroidEntryPoint
class SensorReadingService : LifecycleService() {

    companion object {
        private const val CHANNEL_ID = "sensor_reading_channel"
        private const val NOTIFICATION_ID = 1
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        Timber.i("SensorReadingService created")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        super.onStartCommand(intent, flags, startId)
        startForeground(NOTIFICATION_ID, buildNotification())
        return START_STICKY
    }

    override fun onBind(intent: Intent): IBinder? {
        super.onBind(intent)
        return null
    }

    override fun onDestroy() {
        super.onDestroy()
        Timber.i("SensorReadingService destroyed")
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Sensor Reading",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Maintains active sensor connection while reading"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent, PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("ENViroSwarm Field Kit")
            .setContentText("Reading sensors in background…")
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }
}
