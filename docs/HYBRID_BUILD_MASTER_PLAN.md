# ENViroSwarm: Pollution Detector & Scientific Environmental Tool
## Master Build Plan — Hybrid Architecture

## Product Vision

**Tagline:** *"Pollution Detection & Scientific Environmental Tools for Everyone — From Casual Observers to Research Scientists"*

**Positioning:**
- **For Regular People:** See air quality, noise, and light pollution around you. Get alerts when levels are unsafe. Share readings with your community.
- **For Scientists:** Professional-grade data collection, calibration tools, advanced analytics, collaboration hub, and publication-ready exports.
- **For Cities/Organizations:** Deploy sensor networks, monitor compliance, generate regulatory reports.

## Hybrid Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ENViroSwarm PLATFORM                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   SaaS Web App  │    │  Expo Mobile    │                │
│  │   (React/Vite)  │    │  (React Native) │                │
│  │                 │    │                 │                │
│  │  • Dashboard    │    │  • View Data    │                │
│  │  • Portal/Hub   │    │  • Manage       │                │
│  │  • Reports      │    │  • Basic        │                │
│  │  • Analytics    │    │    Sensors      │                │
│  │  • Collaboration│    │  • Push Alerts  │                │
│  └────────┬────────┘    └────────┬────────┘                │
│           │                      │                           │
│           └──────────┬───────────┘                           │
│                      │                                      │
│           ┌──────────┴──────────┐                         │
│           │   FastAPI Backend   │                         │
│           │   • Auth/Cookies    │                         │
│           │   • Data Pipeline   │                         │
│           │   • Scientific APIs │                         │
│           │   • Report Engine   │                         │
│           └──────────┬──────────┘                         │
│                      │                                      │
│  ┌───────────────────┴──────────────────┐                 │
│  │      ENViroSwarm Field Kit           │                 │
│  │      (Native Kotlin Android)         │                 │
│  │                                      │                 │
│  │  • USB OTG Hardware Hub              │                 │
│  │  • Bluetooth LE Sensors              │                 │
│  │  • Real-time Streaming               │                 │
│  │  • Calibration Tools                 │                 │
│  │  • Offline Data Collection           │                 │
│  │  • QR Code Station Setup             │                 │
│  └──────────────────────────────────────┘                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Phase 1: Rebrand & Plan (Current)

### 1.1 Rebrand Strategy
- **Primary colors:** Teal (#14b8a6) + Blue (#0ea5e9) + Warning Orange (#f97316) for pollution alerts
- **Secondary:** Pollution index colors (green→yellow→orange→red→purple→maroon)
- **Typography:** Inter for UI, Roboto Mono for data/scientific readouts
- **Iconography:** Pollution + science + accessibility symbols

### 1.2 Pollution Focus Features
**Core Pollution Measurements:**
1. **Air Quality:** PM2.5, PM10, CO2, CO, NO2, SO2, O3, VOCs, AQI
2. **Noise Pollution:** dB levels, frequency analysis, noise mapping
3. **Light Pollution:** Lux readings, night sky brightness, blue light exposure
4. **Water Quality:** pH, turbidity, dissolved oxygen, temperature (via external probes)
5. **Radiation:** Background radiation, radon (via external Geiger counters)
6. **Thermal Pollution:** Temperature differential, heat island mapping

**Pollution Alert System:**
- Real-time AQI-based alerts
- WHO guideline comparison
- Health advisory messages ("Unhealthy for sensitive groups")
- Community alerts ("High pollution detected in your area")

### 1.3 SaaS Rebrand Updates

**Homepage Hero:**
```
"Know Your Air. Protect Your Health."

Real-time pollution detection for everyone.
From casual observers to research scientists.

[Try Demo Free]  [Get Field Kit]
```

**New Navigation Sections:**
- **Pollution Map** — Global/local pollution overlay
- **My Environment** — Personal exposure tracker
- **Health Impact** — WHO guideline comparisons
- **Community Alerts** — Neighborhood pollution warnings
- **Scientific Tools** — Full lab suite
- **Research Portal** — Collaboration hub

**Dashboard Widgets:**
- AQI Circle Gauge (current location)
- Pollution Trend Chart (24h/7d/30d)
- Pollutant Breakdown (pie chart of PM2.5/CO2/VOCs/etc)
- Health Advisory Card (current risk level)
- Community Reading Map (nearby user readings)

---

## Phase 2: SaaS Enhancement (Weeks 1-3)

### 2.1 Pollution-Focused UI Updates
- [ ] Update homepage with pollution hero imagery
- [ ] Add AQI circle gauge component
- [ ] Add pollution alert banner (top of dashboard)
- [ ] Add "Pollution Trends" section to dashboard
- [ ] Add "Health Impact" widget with WHO guidelines
- [ ] Add "Community Map" with pollution readings
- [ ] Update color scheme with pollution alert colors
- [ ] Add pollution index legend/tooltip

### 2.2 New Pollution Pages
- [ ] `PollutionMap.tsx` — Interactive map with pollution overlay
- [ ] `HealthImpact.tsx` — WHO guideline comparisons, health advice
- [ ] `CommunityAlerts.tsx` — Neighborhood alert feed
- [ ] `ExposureTracker.tsx` — Personal pollution exposure over time
- [ ] `PollutionForecast.tsx` — 24h/7d pollution prediction
- [ ] `CompareLocations.tsx` — Compare pollution between locations

### 2.3 Backend Pollution APIs
- [ ] EPA AQI NowCast calculation endpoint
- [ ] WHO guideline comparison endpoint
- [ ] Health advisory message endpoint
- [ ] Community pollution aggregation (anonymized)
- [ ] Pollution forecast endpoint (using weather + sensor data)
- [ ] Pollution alert subscription (push/email)

---

## Phase 3: Expo Mobile App — Pollution Focus (Weeks 2-4)

### 3.1 Core Pollution Features
- [ ] **Pollution Dashboard** — AQI gauge, current readings, health advice
- [ ] **Noise Meter** — Real-time dB measurement using microphone
- [ ] **Light Meter** — Lux measurement using ambient light sensor
- [ ] **GPS Pollution Logger** — Tag readings with location
- [ ] **Pollution Alert Notifications** — Push when AQI exceeds thresholds
- [ ] **Exposure Tracker** — Daily/weekly pollution exposure summary
- [ ] **Community Map** — See nearby pollution readings from other users
- [ ] **Share Reading** — Share pollution data to social media

### 3.2 Bluetooth Sensor Support
- [ ] Pair with Xiaomi Mi Air Quality Monitor
- [ ] Pair with Awair Element
- [ ] Pair with generic BLE sensors (custom GATT service)
- [ ] Real-time data display from BLE sensors
- [ ] Background BLE data collection (foreground service)

### 3.3 UI/UX
- [ ] Pollution-focused onboarding
- [ ] AQI color-coded theme
- [ ] Pollution alert cards
- [ ] Health impact tips
- [ ] Dark mode optimized for outdoor use

---

## Phase 4: Field Kit — Native Kotlin App (Weeks 3-6)

### 4.1 USB OTG Hardware Hub
- [ ] USBManager API for USB device enumeration
- [ ] USB Serial (FTDI/CP2102/CH340) communication
- [ ] PMS7003/5003 PM2.5/PM10 sensor driver
- [ ] MH-Z19B/MH-Z19C CO2 sensor driver
- [ ] BME280/BME680 temp/humidity/pressure/VOC driver
- [ ] MQ-135 general air quality sensor driver
- [ ] MQ-7 CO sensor driver
- [ ] Geiger counter (GQ GMC-500+) driver
- [ ] Custom sensor configuration (protocol, baud rate, data format)
- [ ] Multi-sensor hub mode (read multiple sensors simultaneously)

### 4.2 Bluetooth LE Hardware Hub
- [ ] BluetoothGatt connection management
- [ ] BLE sensor discovery and pairing
- [ ] Standard BLE environmental sensing service (0x181A)
- [ ] Custom BLE service support
- [ ] Background BLE scanning and reading
- [ ] BLE sensor configuration (interval, thresholds)

### 4.3 Real-time Data Streaming
- [ ] Foreground service for continuous reading
- [ ] Real-time chart display (line chart, gauge)
- [ ] Data logging to local SQLite database
- [ ] Auto-sync to ENViroSwarm API when online
- [ ] Offline data queue with retry
- [ ] CSV/JSON export from local database
- [ ] Batch upload mode (for field trips)

### 4.4 Calibration Tools
- [ ] Zero-point calibration wizard
- [ ] Span calibration with reference gas
- [ ] Multi-point calibration curve
- [ ] R²/RMSE/MAE calculation
- [ ] Drift detection (CUSUM chart)
- [ ] Calibration history log
- [ ] Calibration certificate export (PDF)

### 4.5 Field Deployment Tools
- [ ] QR code station generation (link to station ID)
- [ ] QR code scanner for station setup
- [ ] GPS auto-tagging for new stations
- [ ] Station metadata form (name, location, sensor types)
- [ ] Photo capture for station documentation
- [ ] Deployment checklist
- [ ] Field notes with voice dictation

### 4.6 Scientific Data Tools
- [ ] Unit conversion calculator (ppm↔ppb↔µg/m³)
- [ ] AQI calculator (EPA, EAQI, AQHI)
- [ ] Statistical summary (min, max, avg, stddev, percentiles)
- [ ] Data quality score calculation
- [ ] Outlier detection (IQR, Z-score)
- [ ] Trend analysis (linear regression, slope)
- [ ] Data export (NetCDF, GeoJSON, CSV, Excel)
- [ ] Research notebook (markdown, embedded charts)

### 4.7 UI/UX
- [ ] Material You design with teal/blue theme
- [ ] Dark mode for outdoor use
- [ ] Large readouts for field visibility
- [ ] Haptic feedback on alerts
- [ ] Voice announcements for high readings
- [ ] Widget support (home screen widget for current AQI)
- [ ] Wear OS companion (for smartwatch readouts)

---

## Phase 5: Testing & QA (Weeks 6-7)

### 5.1 SaaS Testing
- [ ] Visual QA on all screen sizes (320px to 1920px)
- [ ] Pollution data accuracy verification
- [ ] AQI calculation validation against EPA calculator
- [ ] Performance testing (load 1000 stations)
- [ ] Accessibility testing (screen reader, keyboard nav)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)

### 5.2 Expo Mobile Testing
- [ ] Physical device testing (Android 10-15)
- [ ] Noise meter accuracy vs. calibrated dB meter
- [ ] GPS accuracy verification
- [ ] BLE sensor pairing with real hardware
- [ ] Battery consumption testing
- [ ] Offline mode testing
- [ ] Push notification testing

### 5.3 Field Kit Testing
- [ ] USB OTG with real sensors (PMS7003, MH-Z19B, BME280)
- [ ] BLE pairing with real sensors (Xiaomi Mi, custom)
- [ ] Foreground service stability (24h+ run)
- [ ] Data sync accuracy (local vs. server)
- [ ] Calibration accuracy validation
- [ ] QR code scan/generate testing
- [ ] Export format validation (NetCDF, GeoJSON)
- [ ] Performance on low-end Android devices

---

## Phase 6: Marketing & Launch (Week 7-8)

### 6.1 Google Play Store
- [ ] App icon (512x512)
- [ ] Feature graphic (1024x500)
- [ ] Screenshots (8 phone, 8 tablet)
- [ ] Store description (pollution-focused)
- [ ] Privacy policy
- [ ] Content rating
- [ ] Closed testing (12 testers, 14 days)
- [ ] Production release

### 6.2 Marketing Materials
- [ ] Product website landing page
- [ ] Demo video (2-3 minutes)
- [ ] User guide PDF
- [ ] Scientific whitepaper
- [ ] Blog post: "Democratizing Environmental Monitoring"
- [ ] Social media assets
- [ ] Press kit

---

## Technology Stack

### SaaS
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Recharts, MapLibre GL
- **Backend:** FastAPI, async SQLAlchemy, PostgreSQL/PostGIS, TimescaleDB, Redis, Celery
- **Deployment:** Static files via FTP (current), Docker + K8s (future)

### Expo Mobile App
- **Framework:** Expo SDK 50, React Native, TypeScript
- **Sensors:** expo-av (noise), expo-brightness (light), expo-location (GPS), expo-sensors (barometer)
- **Bluetooth:** expo-bluetooth-le
- **Storage:** AsyncStorage, expo-sqlite
- **Notifications:** expo-notifications
- **Build:** EAS Build (cloud)

### Field Kit (Native Kotlin)
- **Language:** Kotlin 1.9
- **UI:** Jetpack Compose (Material You)
- **Architecture:** MVVM + Repository pattern
- **DI:** Hilt
- **Database:** Room (SQLite)
- **Networking:** Retrofit + OkHttp + Kotlinx Serialization
- **USB:** Android USB Host API + usb-serial-for-android library
- **BLE:** Android BluetoothGatt
- **Charts:** MPAndroidChart
- **Maps:** MapLibre Android
- **Export:** Apache POI (Excel), uCrop (PDF), custom (NetCDF/GeoJSON)
- **Background:** WorkManager + Foreground Service
- **Testing:** JUnit, Espresso, Hilt testing

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| USB sensor compatibility issues | High | Medium | Test with 5+ popular sensors, document known working hardware |
| BLE connection instability | Medium | Medium | Implement auto-reconnect, connection state machine |
| Battery drain on mobile | High | High | Aggressive power management, user-configurable intervals |
| Data accuracy concerns | Medium | High | Calibration tools, R²/RMSE reporting, uncertainty quantification |
| Regulatory compliance (FCC/CE) | Low | High | Use certified sensors, provide calibration certificates |
| Play Store rejection | Medium | High | Follow all policies, test thoroughly, provide privacy policy |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| SaaS active users | 1000 in 6 months |
| Mobile app downloads | 5000 in 6 months |
| Field Kit downloads | 1000 in 6 months |
| Community sensor readings | 100,000/day |
| API calls | 1M/month |
| AQI accuracy vs. EPA | ±10% |
| Noise meter accuracy | ±3 dB |
| User retention (30d) | 30% |
| App store rating | 4.5+ |
