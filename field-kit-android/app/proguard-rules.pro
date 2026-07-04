# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Keep EntryPoint annotations
-keepattributes *Annotation*

# Hilt
-keep class dagger.hilt.** { *; }
-keep class javax.inject.** { *; }
-keep class * extends dagger.hilt.internal.* { *; }
-keep class * extends dagger.hilt.android.* { *; }

# Room
-keep class * extends androidx.room.RoomDatabase
-keep @androidx.room.Entity class *
-keepclassmembers @androidx.room.Entity class * {
    <fields>;
    <init>(...);
}
-keep class * implements androidx.room.RoomDatabase
-keep class * implements androidx.room.RoomDatabase$Callback
-keep class androidx.room.** { *; }
-dontwarn androidx.room.paging.**

# Retrofit
-keep class retrofit2.** { *; }
-keep class com.enviroswarm.fieldkit.data.remote.dto.** { *; }
-keep class com.enviroswarm.fieldkit.data.remote.api.** { *; }
-keepattributes Signature
-keepattributes Exceptions
-keepattributes RuntimeVisibleAnnotations
-keepattributes RuntimeInvisibleAnnotations
-keepattributes RuntimeVisibleParameterAnnotations
-keepattributes RuntimeInvisibleParameterAnnotations
-keepattributes EnclosingMethod

# Gson
-keep class com.google.gson.** { *; }
-keep class com.google.gson.reflect.** { *; }

# USB Serial
-keep class com.hoho.android.usbserial.** { *; }

# Timber
-dontwarn com.jakewharton.timber.**
-keep class com.jakewharton.timber.** { *; }

# BLE
-keep class no.nordicsemi.android.ble.** { *; }

# MPAndroidChart
-keep class com.github.mikephil.charting.** { *; }

# Kotlin Coroutines
-keep class kotlinx.coroutines.** { *; }
-dontwarn kotlinx.coroutines.**

# Kotlin Serialization
-keep class kotlinx.serialization.** { *; }
-keepclassmembers class kotlinx.serialization.json.** { *; }

# DataStore
-keep class androidx.datastore.** { *; }
-keep class com.google.protobuf.** { *; }

# Location
-keep class com.google.android.gms.location.** { *; }
-keep class com.google.android.gms.common.** { *; }
-keep class com.google.android.gms.tasks.** { *; }

# Camera / MLKit
-keep class com.google.mlkit.** { *; }
-keep class androidx.camera.** { *; }

# General Android
-keep public class android.content.** { *; }
-keep public class android.hardware.usb.** { *; }
-keep public class android.bluetooth.** { *; }
-keep public class android.bluetooth.le.** { *; }
-keep public class android.app.** { *; }
-keep public class android.os.** { *; }
-keep public class android.view.** { *; }
-keep public class android.widget.** { *; }
-keep public class android.graphics.** { *; }
-keep public class android.media.** { *; }
-keep public class android.net.** { *; }
-keep public class android.provider.** { *; }
-keep public class android.telephony.** { *; }
-keep public class android.text.** { *; }
-keep public class android.util.** { *; }
-keep public class android.webkit.** { *; }
-keep public class java.util.** { *; }
-keep public class java.lang.** { *; }
-keep public class java.io.** { *; }
-keep public class java.net.** { *; }
-keep public class java.nio.** { *; }
-keep public class java.security.** { *; }
-keep public class java.text.** { *; }
-keep public class java.time.** { *; }
-keep public class java.util.concurrent.** { *; }
-keep public class java.util.function.** { *; }
-keep public class java.util.regex.** { *; }
-keep public class java.util.stream.** { *; }
-keep public class javax.crypto.** { *; }
-keep public class javax.net.** { *; }
-keep public class javax.security.** { *; }
-keep public class javax.xml.** { *; }
-keep public class org.w3c.** { *; }
-keep public class org.xml.** { *; }
-keep public class org.json.** { *; }
-keep public class org.xmlpull.** { *; }
-keep public class com.enviroswarm.fieldkit.** { *; }

# Keep constructors for Serializable
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    !static !transient <fields>;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# For enumeration classes, see http://proguard.sourceforge.net/manual/examples.html#enumerations
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# The support library contains references to newer platform versions.
# Don't warn about those in case this app is linking against an older
# platform version. We know about them, and they are safe.
-dontwarn android.support.**
-dontwarn androidx.**
-dontwarn com.google.**
-dontwarn org.**
-dontwarn javax.**

# Understand the @Keep support annotation.
-keep class android.support.annotation.Keep
-keep class androidx.annotation.Keep

-keep @android.support.annotation.Keep class * { *; }
-keep @androidx.annotation.Keep class * { *; }

-keepclasseswithmembers class * {
    @android.support.annotation.Keep <methods>;
}

-keepclasseswithmembers class * {
    @androidx.annotation.Keep <methods>;
}

-keepclasseswithmembers class * {
    @android.support.annotation.Keep <fields>;
}

-keepclasseswithmembers class * {
    @androidx.annotation.Keep <fields>;
}

-keepclasseswithmembers class * {
    @android.support.annotation.Keep <init>(...);
}

-keepclasseswithmembers class * {
    @androidx.annotation.Keep <init>(...);
}
