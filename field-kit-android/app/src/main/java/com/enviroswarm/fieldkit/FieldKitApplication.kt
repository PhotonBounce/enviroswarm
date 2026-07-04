package com.enviroswarm.fieldkit

import android.app.Application
import dagger.hilt.android.HiltAndroidApp
import timber.log.Timber

/**
 * Application class for the ENViroSwarm Field Kit Android app.
 *
 * Initializes Hilt dependency injection and Timber logging for debug builds.
 * This class is referenced in the AndroidManifest.xml as the application entry point.
 */
@HiltAndroidApp
class FieldKitApplication : Application() {

    override fun onCreate() {
        super.onCreate()

        if (BuildConfig.DEBUG) {
            Timber.plant(Timber.DebugTree())
        }

        Timber.i("ENViroSwarm Field Kit v%s initialized", BuildConfig.VERSION_NAME)
    }
}
