package com.enviroswarm.fieldkit.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColorScheme = lightColorScheme(
    primary = Teal600,
    onPrimary = LightSurface,
    primaryContainer = Teal100,
    onPrimaryContainer = Teal800,
    secondary = Sky600,
    onSecondary = LightSurface,
    secondaryContainer = Sky100,
    onSecondaryContainer = Sky600,
    tertiary = DataPurple,
    onTertiary = LightSurface,
    tertiaryContainer = DataPurple.copy(alpha = 0.12f),
    onTertiaryContainer = DataPurple,
    background = LightBackground,
    onBackground = DarkSurface,
    surface = LightSurface,
    onSurface = DarkSurface,
    surfaceVariant = LightCardBackground,
    onSurfaceVariant = DarkSurfaceVariant,
    error = StatusError,
    onError = LightSurface,
    errorContainer = StatusError.copy(alpha = 0.12f),
    onErrorContainer = StatusError,
    outline = DarkSurfaceVariant.copy(alpha = 0.5f),
    outlineVariant = DarkSurfaceVariant.copy(alpha = 0.2f),
    scrim = DarkSurface.copy(alpha = 0.6f),
    inverseSurface = DarkSurface,
    inverseOnSurface = LightSurface,
    inversePrimary = Teal200
)

private val DarkColorScheme = darkColorScheme(
    primary = Teal500,
    onPrimary = DarkSurface,
    primaryContainer = Teal800,
    onPrimaryContainer = Teal100,
    secondary = Sky500,
    onSecondary = DarkSurface,
    secondaryContainer = Sky600.copy(alpha = 0.3f),
    onSecondaryContainer = Sky200,
    tertiary = DataPurple,
    onTertiary = DarkSurface,
    tertiaryContainer = DataPurple.copy(alpha = 0.2f),
    onTertiaryContainer = DataPurple,
    background = DarkSurface,
    onBackground = LightSurface,
    surface = DarkSurfaceVariant,
    onSurface = LightSurface,
    surfaceVariant = DarkCardBackground,
    onSurfaceVariant = LightSurface.copy(alpha = 0.7f),
    error = StatusError,
    onError = DarkSurface,
    errorContainer = StatusError.copy(alpha = 0.2f),
    onErrorContainer = StatusError,
    outline = LightSurface.copy(alpha = 0.3f),
    outlineVariant = LightSurface.copy(alpha = 0.1f),
    scrim = DarkSurface.copy(alpha = 0.8f),
    inverseSurface = LightSurface,
    inverseOnSurface = DarkSurface,
    inversePrimary = Teal800
)

/**
 * ENViroSwarm Field Kit theme.
 *
 * Supports Material 3 dynamic colors on Android 12+ and provides a custom
 * teal/blue color scheme optimized for outdoor readability. Dark mode is
 * strongly recommended for field use to reduce screen glare and improve
 * battery life on OLED displays.
 *
 * @param darkTheme Whether to use dark mode. Defaults to system setting.
 * @param dynamicColor Whether to use Material 3 dynamic colors (Android 12+).
 * @param content Composable content to theme.
 */
@Composable
fun FieldKitTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
