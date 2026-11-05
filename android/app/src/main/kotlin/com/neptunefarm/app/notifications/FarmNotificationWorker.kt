package com.neptunefarm.app.notifications

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import java.util.concurrent.TimeUnit

class FarmNotificationWorker(
    private val context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    override suspend fun doWork(): Result {
        val prefs = context.getSharedPreferences("farm_app_prefs", Context.MODE_PRIVATE)
        val serverUrl = prefs.getString("server_url", "https://exciting-cooking-tap-developments.trycloudflare.com")
            ?: "https://exciting-cooking-tap-developments.trycloudflare.com"

        val endpoint = serverUrl.trimEnd('/') + "/api/printers"

        return try {
            val request = Request.Builder()
                .url(endpoint)
                .addHeader("Accept", "application/json")
                .build()

            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return Result.retry()
                }

                val bodyStr = response.body?.string() ?: return Result.success()
                val jsonArray = JSONArray(bodyStr)

                for (i in 0 until jsonArray.length()) {
                    val p = jsonArray.getJSONObject(i)
                    val id = p.optString("id", "printer-$i")
                    val name = p.optString("name", "Printer ${i + 1}")
                    val status = p.optString("status", "unknown")
                    val isShutdown = p.optBoolean("isShutdown", false)
                    val file = p.optString("file", "")
                    val shutdownReason = p.optString("shutdownReason", "Printer is shutdown")

                    val lastStateKey = "state_$id"
                    val previousStatus = prefs.getString(lastStateKey, null)

                    // Detect state transitions and fire notifications
                    if (previousStatus != null && previousStatus != status) {
                        when (status) {
                            "completed" -> {
                                FarmNotificationManager.showNotification(
                                    context = context,
                                    notificationId = id.hashCode(),
                                    title = "🎉 Print Completed: $name",
                                    message = "Finished printing \"$file\". Bed is ready to clear!",
                                    subText = "Neptune Farm"
                                )
                            }
                            "runout" -> {
                                FarmNotificationManager.showNotification(
                                    context = context,
                                    notificationId = id.hashCode(),
                                    title = "⚠️ Filament Runout: $name",
                                    message = "Filament sensor triggered on $name! Please reload spool.",
                                    subText = "Action Required"
                                )
                            }
                            "error" -> {
                                val reason = if (isShutdown) shutdownReason else "Hardware issue detected"
                                FarmNotificationManager.showNotification(
                                    context = context,
                                    notificationId = id.hashCode(),
                                    title = "🚨 Printer Error: $name",
                                    message = "Alert on $name: $reason",
                                    subText = "Needs Attention"
                                )
                            }
                            "paused" -> {
                                FarmNotificationManager.showNotification(
                                    context = context,
                                    notificationId = id.hashCode(),
                                    title = "⏸️ Print Paused: $name",
                                    message = "Job on $name has been paused.",
                                    subText = "Paused"
                                )
                            }
                        }
                    }

                    // Save current state
                    prefs.edit().putString(lastStateKey, status).apply()
                }

                Result.success()
            }
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
