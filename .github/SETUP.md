# GitHub Actions Setup for ENViroSwarm

## Android APK Build Workflow

The `.github/workflows/build-apk.yml` workflow automatically builds an Android APK on every push to `main` that changes the `android-app/` directory.

### Required GitHub Secrets

Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret** and add:

#### 1. EXPO_TOKEN (Required for APK build)
- Create an Expo account at https://expo.dev/signup
- Go to https://expo.dev/accounts/[your-username]/settings/access-tokens
- Generate a new token
- Add it as `EXPO_TOKEN` secret

#### 2. FTP_HOST, FTP_USER, FTP_PASS (Optional - for auto-upload)
- `FTP_HOST`: `ftp.photon-bounce.com`
- `FTP_USER`: `photonb`
- `FTP_PASS`: `Nepidaras25!!??`

These are optional. If not set, the APK will still be built and attached to GitHub Releases.

### How It Works

1. On push to `main` or manual trigger, GitHub Actions:
   - Checks out the code
   - Sets up Node.js and Expo/EAS CLI
   - Builds APK using EAS Build (cloud)
   - Downloads the built APK
   - Uploads to GitHub Releases
   - Optionally uploads to FTP server

2. The built APK will be available at:
   - GitHub Releases: https://github.com/PhotonBounce/enviroswarm/releases
   - Your FTP server: `ftp.photon-bounce.com/public_html/enviroswarm/apk/enviroswarm.apk`

### Manual Trigger

You can also manually trigger a build:
1. Go to https://github.com/PhotonBounce/enviroswarm/actions
2. Click **Build Android APK**
3. Click **Run workflow**

### Troubleshooting

- **Build fails with auth error**: Check `EXPO_TOKEN` is set correctly
- **FTP upload fails**: Check FTP credentials are correct and server is accessible
- **APK not found**: EAS builds may take 5-10 minutes. Check EAS dashboard for build status.
