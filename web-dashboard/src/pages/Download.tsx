import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Smartphone, Download, Check, Shield, Zap, Globe, ChevronRight, Star } from 'lucide-react';

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } }
};

function DownloadPage() {
  const [downloadCount, setDownloadCount] = useState(1247);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    // Simulate real-time download counter
    const interval = setInterval(() => {
      setDownloadCount(prev => prev + Math.floor(Math.random() * 3));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    { icon: <Zap className="w-6 h-6" />, title: "Real-time Pollution Detection", desc: "PM2.5, CO2, VOCs, noise, light — all in real-time" },
    { icon: <Shield className="w-6 h-6" />, title: "Health Alerts", desc: "Get notified when air quality becomes unhealthy" },
    { icon: <Globe className="w-6 h-6" />, title: "Community Map", desc: "See pollution levels from users around the world" },
    { icon: <Smartphone className="w-6 h-6" />, title: "Field Kit Mode", desc: "Connect USB/Bluetooth sensors for lab-grade accuracy" },
  ];

  const requirements = [
    "Android 8.0+ (API 26)",
    "80 MB free storage",
    "Location permission for GPS tagging",
    "Microphone permission for noise meter",
    "Bluetooth permission for BLE sensors"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 dark:from-slate-900 dark:to-slate-800">
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-100 text-teal-700 text-sm font-medium">
                <Star className="w-4 h-4 fill-current" />
                v1.0.0 Now Available
              </span>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-6"
            >
              Get ENViroSwarm{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-sky-500">
                Mobile
              </span>
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-10"
            >
              Your personal pollution detector and environmental lab. 
              Monitor air quality, noise, and light — anywhere, anytime.
            </motion.p>

            {/* Download Buttons */}
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              {/* APK Direct Download */}
              <motion.a
                href="/enviroswarm/apk/enviroswarm-v1.0.0.apk"
                download
                className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-2xl font-semibold text-lg shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 transition-all"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <Download className="w-6 h-6" />
                <span>Download APK</span>
                <span className="text-sm font-normal opacity-80">(Direct)</span>
                <motion.div
                  className="absolute inset-0 rounded-2xl bg-white/20"
                  initial={false}
                  animate={{ opacity: isHovering ? 1 : 0 }}
                />
              </motion.a>

              {/* Google Play (Coming Soon) */}
              <motion.button
                disabled
                className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-2xl font-semibold text-lg cursor-not-allowed"
                whileHover={{ scale: 1.02 }}
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.5,12.92 20.16,13.19L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
                </svg>
                <span>Google Play</span>
                <span className="text-sm font-normal">(Coming Soon)</span>
              </motion.button>
            </motion.div>

            <motion.p variants={fadeInUp} className="text-sm text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-teal-600">{downloadCount.toLocaleString()}</span> downloads so far
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* App Preview */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">
                Pollution Detection in Your Pocket
              </h2>
              <div className="space-y-4">
                {features.map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-4 p-4 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700"
                  >
                    <div className="p-2 rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-900/50 dark:text-teal-400">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{feature.title}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{feature.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              {/* Phone Mockup */}
              <div className="relative mx-auto w-72 h-[580px] bg-slate-900 rounded-[3rem] border-8 border-slate-800 shadow-2xl overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-10" />
                <div className="p-4 pt-10 h-full bg-gradient-to-b from-teal-900 to-slate-900">
                  {/* Mock App UI */}
                  <div className="text-center text-white mb-4">
                    <p className="text-xs opacity-60">Current AQI</p>
                    <p className="text-5xl font-bold text-teal-400">42</p>
                    <p className="text-sm text-teal-300">Good</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[
                      { label: "PM2.5", value: "12" },
                      { label: "CO2", value: "420" },
                      { label: "Noise", value: "54" },
                      { label: "Light", value: "320" },
                    ].map((item, i) => (
                      <div key={i} className="bg-white/10 rounded-lg p-3 text-center">
                        <p className="text-xs text-white/60">{item.label}</p>
                        <p className="text-lg font-bold text-white">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-teal-500/20 rounded-lg p-3 text-center">
                    <p className="text-sm text-teal-300">✓ Safe to exercise outdoors</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8"
          >
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
              System Requirements
            </h2>
            <div className="space-y-3">
              {requirements.map((req, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-teal-500 flex-shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300">{req}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                <strong>Note:</strong> USB OTG sensor support requires Android 10+ and a compatible USB-C adapter.
                Bluetooth LE sensor support requires Android 8+ with Bluetooth 4.0+.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Installation Guide */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">
              Installation Guide
            </h2>
            <div className="space-y-4">
              {[
                { step: "1", title: "Download APK", desc: "Click the Download APK button above. The file will be saved to your Downloads folder." },
                { step: "2", title: "Enable Unknown Sources", desc: "Go to Settings → Security → Enable 'Install from Unknown Sources' (or 'Install unknown apps' for your browser)." },
                { step: "3", title: "Install", desc: "Open the downloaded file and tap 'Install'. The app will be installed in seconds." },
                { step: "4", title: "Grant Permissions", desc: "Allow location, microphone, Bluetooth, and notification permissions when prompted." },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="w-10 h-10 rounded-full bg-teal-500 text-white flex items-center justify-center font-bold flex-shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Google Play CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-gradient-to-r from-teal-500 to-sky-500 rounded-2xl p-8 text-white">
            <h2 className="text-2xl font-bold mb-4">Coming Soon to Google Play</h2>
            <p className="mb-6 opacity-90">
              We're preparing the Google Play release with full Play Store assets, 
              closed testing, and content review. Stay tuned!
            </p>
            <div className="flex items-center justify-center gap-2 text-sm opacity-80">
              <Check className="w-4 h-4" />
              <span>App Icon (512×512)</span>
              <ChevronRight className="w-4 h-4" />
              <Check className="w-4 h-4" />
              <span>Feature Graphic</span>
              <ChevronRight className="w-4 h-4" />
              <Check className="w-4 h-4" />
              <span>Screenshots</span>
              <ChevronRight className="w-4 h-4" />
              <span>Closed Testing</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default DownloadPage;
