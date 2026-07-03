# Security Fixes and Remediation Notes

## 1. Leaked GitHub Token

**Status:** A GitHub Personal Access Token was leaked in conversation history and shell commands. It must be treated as compromised.

### Immediate Actions Required

1. **Revoke the token immediately** in your GitHub account:
   - Go to https://github.com/settings/tokens
   - Find and delete the token that was shared in previous conversations
   - Or revoke all tokens and generate a new one

2. **Regenerate a new token** if CI/CD or scripts still need GitHub API access.
   - Use GitHub Actions secrets (`secrets.GITHUB_TOKEN`) instead of hardcoded personal access tokens.
   - Never commit tokens to source control.

3. **Audit repository history** for any other leaked credentials:
   ```bash
   # Install gitLeaks or detect-secrets
   pip install detect-secrets
   detect-secrets scan --all-files
   ```

### Prevention

- All GitHub Actions workflows in this repository now use `secrets.GITHUB_TOKEN` (the automatically provided token) instead of personal access tokens.
- No hardcoded tokens should be present in any script, config, or documentation file.
- Consider enabling GitHub secret scanning for the repository.

## 2. Shared Hosting Deployment Notes

Since this project is deployed to shared hosting (photon-bounce.com via FTP):

- **No backend server can run** on shared hosting. Only static files can be served.
- The web dashboard is built as a static SPA and uploaded via FTP.
- **Demo Mode** has been added to the frontend so the app works without a backend API.
- Users can click "Try Demo" on the login page to see all features with realistic mock data.

## 3. Build Workflows

- The Android APK build workflow has been replaced with an Expo EAS Build workflow, which is more reliable than local Gradle builds in GitHub Actions.
- If you need to build locally, use `eas build --platform android --profile preview` from the `android-app/` directory.
