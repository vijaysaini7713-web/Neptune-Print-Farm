# 📱 Neptune Print Farm — Android Native Application

Official Android companion app for **Neptune Print Farm**. Enables remote monitoring, local workshop access, and background push notifications directly on your phone.

---

## 🌟 Key Features

1. **Dual Connection Modes**:
   - 🟢 **Remote Mode**: Connects via secure HTTPS tunnel (`https://exciting-cooking-tap-developments.trycloudflare.com`) from anywhere outside the workshop.
   - 🏠 **Local Mode**: Connects directly via workshop Wi-Fi (`http://172.16.20.139:3080`) with zero latency.
   - One-tap switcher directly in the app's top bar.

2. **🔔 Background Notifications ("Notified")**:
   - Built with Android `WorkManager` & `NotificationCompat`.
   - Runs in the background and sends real-time system alerts with sound and vibration for:
     - 🎉 **Print Completed**: Alerts when a printer completes a job so you can clear the bed.
     - ⚠️ **Filament Runout**: Alerts when a filament sensor runs empty so you can reload the spool immediately.
     - 🚨 **Printer Shutdown / Thermal Error**: Alerts when a printer triggers thermal runaway or MCU shutdown.
     - ⏸️ **Print Paused**: Alerts when a print is paused.

3. **Modern Native Architecture**:
   - **Language**: 100% Kotlin
   - **UI**: Jetpack Compose + Edge-to-Edge Material 3 + Optimized WebView
   - **Background Tasks**: AndroidX WorkManager (Periodic & On-Demand)
   - **Network**: OkHttp3

---

## 🚀 How to Build & Install on Your Phone

### Option A: Install Instantly via Chrome (No Build Required)
1. On your Android phone, open Chrome and visit:
   `https://exciting-cooking-tap-developments.trycloudflare.com`
2. Tap the 3 dots (menu) in Chrome and select **"Install app"** (or **"Add to Home screen"**).
3. The Neptune Farm app icon will be installed directly on your Android phone's home screen, opening in standalone full-screen mode!

---

### Option B: Build APK via Android Studio
1. Open **Android Studio** on your PC.
2. Select **File ➔ Open** and choose the `android` folder in this repository:
   `C:\Users\User\Neptune-Print-Farm\android`
3. Wait for Gradle sync to complete.
4. Go to **Build ➔ Build Bundle(s) / APK(s) ➔ Build APK(s)**.
5. Transfer the generated `.apk` file to your phone and tap to install!

---

## ⚙️ Configuration
In the Android app, tap the **Settings (gear)** icon at the top right to configure:
- **Server URL**: Choose between the Cloudflare Remote Tunnel or your Local Workshop IP (`172.16.20.139:3080`).
- **Test Notifications**: Tap the bell icon in the top bar to send a test alert to your phone.
