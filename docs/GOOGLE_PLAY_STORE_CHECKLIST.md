# ENViroSwarm — Google Play Store Release Checklist

## App Assets Required

### 1. App Icon (Mandatory)
- **Size**: 512 × 512 pixels
- **Format**: PNG (32-bit PNG with transparency)
- **Max file size**: 1 MB
- **Path**: `android-app/assets/icon-512.png`

### 2. Feature Graphic (Mandatory)
- **Size**: 1024 × 500 pixels
- **Format**: PNG or JPEG (no alpha)
- **Max file size**: 15 MB
- **Purpose**: Shown at the top of your store listing
- **Path**: `android-app/assets/feature-graphic.png`

### 3. Screenshots (Mandatory)
- **Phone**: Minimum 2, maximum 8 screenshots
- **7-inch tablet**: Optional, max 8
- **10-inch tablet**: Optional, max 8
- **Size**: 1080 × 1920 (portrait) or 1920 × 1080 (landscape) recommended
- **Format**: PNG or JPEG
- **Max file size**: 8 MB each
- **Path**: `android-app/assets/screenshots/phone/`

### 4. App Promo Video (Optional)
- **URL**: YouTube URL (unlisted or public)
- **Purpose**: Shown on store listing

### 5. Store Listing Text

**App Name**: ENViroSwarm (max 30 characters) ✓

**Short Description**: Environmental sensor monitoring & data collaboration (max 80 characters)

**Full Description** (max 4000 characters):
```
ENViroSwarm is the ultimate environmental monitoring platform for scientists, cities, and researchers.

📊 MONITOR
Track air quality, water quality, temperature, noise, and radiation from your IoT sensor network in real-time.

📈 ANALYZE
Advanced analytics with AQI calculations, anomaly detection, trend forecasting, and data quality scoring.

🌍 COLLABORATE
Share datasets with the global community. Join projects, publish findings, and collaborate with researchers worldwide.

🔬 SCIENTIFIC TOOLS
- EPA AQI & NowCast calculations
- Weather data overlays
- OpenAQ public data integration
- Unit conversions (ppm, ppb, µg/m³)
- Calibration validation (R², RMSE)
- Anomaly detection (IQR, Z-score)
- Data forecasting with confidence intervals
- Export to NetCDF, GeoJSON, CSV

🤝 PORTAL
Explore public environmental datasets from NYC, Amazon Basin, Tokyo, Europe, Sydney, and the Arctic.

📱 MOBILE
View your sensor network on the go. Get push notifications for alerts. Scan station QR codes.

🆓 FREE TIER
Start with 3 stations completely free. No credit card required.

🔗 INTEGRATIONS
OpenWeatherMap, OpenAQ, NASA Earthdata, Copernicus CAMS, Google Earth Engine.

🔒 SECURITY
Enterprise-grade security with OAuth2, API key management, and role-based access control.

Download now and start monitoring your environment!
```

### 6. Content Rating (Mandatory)
- Use IARC questionnaire in Google Play Console
- Expected rating: **Everyone** (no violence, no mature content)

### 7. Data Safety Form (Mandatory)
- **Data collected**: Email, location (for sensor stations), device info
- **Data shared**: No third-party sharing (except weather APIs with user consent)
- **Encryption**: Data encrypted in transit (TLS) and at rest
- **Account deletion**: Available via app settings

### 8. Privacy Policy URL (Mandatory)
- Required before publishing
- Must include: data collection, usage, retention, user rights
- Suggested URL: `https://photon-bounce.com/enviroswarm/privacy`

### 9. App Signing (Mandatory)
- Use Google Play App Signing (recommended)
- Upload encrypted private key or let Google generate
- Required for AAB format

### 10. Build Format
- **AAB** (Android App Bundle) — required for new apps
- Target API level: 35 (Android 15) by August 31, 2025
- Minimum API level: 26 (Android 8.0)

## Pre-Launch Checklist

| Step | Status |
|------|--------|
| Create Google Play Developer account ($25 one-time fee) | ⬜ |
| Build signed AAB release | ⬜ |
| Create store listing with all assets | ⬜ |
| Fill content rating questionnaire | ⬜ |
| Complete Data Safety form | ⬜ |
| Upload privacy policy | ⬜ |
| Set up closed testing (12 testers, 14 days) | ⬜ |
| Run internal testing | ⬜ |
| Submit for review | ⬜ |

## Asset Generation Script

Use the provided `scripts/generate-play-store-assets.js` to generate:
- App icon from SVG
- Feature graphic from template
- Screenshot frames from actual app screenshots

## Notes
- Closed testing requires 12 opted-in testers for 14 consecutive days (for personal developer accounts)
- Production release can be done after closed testing period
- Review time: typically 1-3 days for new apps
- App bundle size limit: 150 MB (use Play Asset Delivery for larger assets)
