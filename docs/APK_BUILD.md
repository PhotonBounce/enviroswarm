# Android APK Build Guide

## Why the GitHub Actions Build Fails

The `build-apk.yml` workflow attempts to build an Android APK locally inside GitHub Actions using Gradle. This approach is **fragile and frequently fails** for the following reasons:

### 1. No EAS Project Configured
This project uses Expo but does **not** have an EAS (Expo Application Services) project ID configured. Without an EAS project, you cannot use Expo's cloud build service, which is the recommended way to build React Native apps.

### 2. Gradle Build Complexity
Local Gradle builds require:
- Android NDK (large download, ~1GB)
- Native module compilation (memory-intensive)
- Correct `ANDROID_HOME` and SDK paths
- Proper signing keystore configuration

GitHub Actions runners often hit **memory limits** or **timeout** during Gradle builds, especially for React Native apps with many native dependencies.

### 3. Missing Signing Configuration
The workflow does not configure a release keystore. APKs built without proper signing cannot be installed on most Android devices.

---

## Recommended Fix: Use EAS Build (Expo)

EAS Build is the official Expo cloud build service. It handles all the native compilation for you.

### Step 1: Create an Expo Account
```bash
npm install -g eas-cli
eas login
```

### Step 2: Configure EAS Project
```bash
cd android-app
# This creates an EAS project and adds the projectId to app.json
eas init
```

### Step 3: Build APK in the Cloud
```bash
cd android-app
eas build --platform android --profile preview
```
- The `preview` profile is already configured in `eas.json` to build an APK.
- EAS will queue the build, compile it on Expo's servers, and provide a download link.

### Step 4: Download the APK
```bash
eas build:list
# Or download directly from the URL provided by EAS
```

---

## Alternative: Local Build

If you prefer to build locally on your machine:

### Prerequisites
- Android Studio (with SDK Platform 34, Build Tools 34, NDK 25)
- Java 17 JDK
- Node.js 18+

### Steps
```bash
cd android-app
npm install

# Generate native Android project
npx expo prebuild --platform android

# Build debug APK (faster, no signing needed)
cd android
./gradlew assembleDebug
# APK will be at: android/app/build/outputs/apk/debug/app-debug.apk

# Or build release APK (requires signing)
# Create a keystore first:
keytool -genkey -v -keystore enviroswarm.keystore -alias enviroswarm -keyalg RSA -keysize 2048 -validity 10000

# Then configure signing in android/app/build.gradle and run:
./gradlew assembleRelease
```

---

## Alternative: Simple GitHub Actions Workflow (Web Preview)

If you only need a CI workflow that validates the app, here is a simpler alternative that does **not** attempt native compilation:

```yaml
name: Android App CI

on:
  push:
    branches: [main]
    paths:
      - 'android-app/**'
  pull_request:
    paths:
      - 'android-app/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: ./android-app/package-lock.json
      - run: npm ci
        working-directory: ./android-app
      - run: npx tsc --noEmit
        working-directory: ./android-app
```

---

## Uploading to FTP

Since you have FTP access to `photon-bounce.com`, you can upload the APK manually:

```bash
# Build locally first, then upload
curl -T enviroswarm.apk \
  ftp://YOUR_FTP_HOST/public_html/enviroswarm/apk/enviroswarm.apk \
  --user "YOUR_USERNAME:YOUR_PASSWORD"
```

Or add the credentials to GitHub Secrets (`FTP_HOST`, `FTP_USER`, `FTP_PASS`) and use the existing upload step in any workflow.

---

## Summary

| Approach | Difficulty | Reliability | Recommended? |
|----------|-----------|-------------|-------------|
| EAS Build (Cloud) | Easy | High | ✅ Yes |
| Local Gradle Build | Hard | Medium | ⚠️ For advanced users |
| GitHub Actions Gradle | Very Hard | Low | ❌ Not recommended |
| GitHub Actions Validate | Easy | High | ✅ For CI only |

**Bottom line:** Set up EAS Build. It is the standard way to build Expo/React Native apps and avoids all the Gradle headaches.
