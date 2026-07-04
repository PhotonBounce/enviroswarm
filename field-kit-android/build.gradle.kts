plugins {
    id("com.android.application") version "8.2.0" apply false
    id("com.android.library") version "8.2.0" apply false
    id("org.jetbrains.kotlin.android") version "1.9.20" apply false
    id("com.google.dagger.hilt.android") version "2.48" apply false
    id("com.google.devtools.ksp") version "1.9.20-1.0.14" apply false
}

buildscript {
    dependencies {
        classpath("com.android.tools.build:gradle:8.2.0")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.20")
        classpath("com.google.dagger:hilt-android-gradle-plugin:2.48")
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://jitpack.io") }
    }
}

extra["compose_version"] = "1.5.4"
extra["lifecycle_version"] = "2.6.2"
extra["room_version"] = "2.6.1"
extra["hilt_version"] = "2.48"
extra["retrofit_version"] = "2.9.0"
extra["coroutines_version"] = "1.7.3"
extra["navigation_version"] = "2.7.5"
extra["mpandroidchart_version"] = "3.1.0"
extra["usb_serial_version"] = "3.5.1"
extra["timber_version"] = "5.0.1"
extra["accompanist_version"] = "0.32.0"
extra["cameras_version"] = "1.3.0"
extra["work_version"] = "2.9.0"

subprojects {
    tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
        kotlinOptions {
            jvmTarget = "1.8"
        }
    }
}
