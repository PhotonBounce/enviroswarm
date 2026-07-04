package com.enviroswarm.fieldkit.ui.navigation

import androidx.annotation.StringRes
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.ui.graphics.vector.ImageVector
import com.enviroswarm.fieldkit.R

/**
 * Sealed class representing the top-level navigation destinations in the Field Kit app.
 *
 * Each destination defines its route, label resource, and selected/unselected icons
 * for the bottom navigation bar.
 *
 * @property route Navigation route string used by NavHost
 * @property labelRes String resource ID for the destination label
 * @property selectedIcon Icon displayed when this destination is selected
 * @property unselectedIcon Icon displayed when this destination is not selected
 */
sealed class Screen(
    val route: String,
    @StringRes val labelRes: Int,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
) {
    object Dashboard : Screen(
        route = "dashboard",
        labelRes = R.string.nav_dashboard,
        selectedIcon = Icons.Filled.Dashboard,
        unselectedIcon = Icons.Outlined.Dashboard
    )

    object Sensors : Screen(
        route = "sensors",
        labelRes = R.string.nav_sensors,
        selectedIcon = Icons.Filled.Usb,
        unselectedIcon = Icons.Outlined.Usb
    )

    object Realtime : Screen(
        route = "realtime",
        labelRes = R.string.nav_realtime,
        selectedIcon = Icons.Filled.ShowChart,
        unselectedIcon = Icons.Outlined.ShowChart
    )

    object Calibration : Screen(
        route = "calibration",
        labelRes = R.string.nav_calibration,
        selectedIcon = Icons.Filled.Tune,
        unselectedIcon = Icons.Outlined.Tune
    )

    object Export : Screen(
        route = "export",
        labelRes = R.string.nav_export,
        selectedIcon = Icons.Filled.FileDownload,
        unselectedIcon = Icons.Outlined.FileDownload
    )

    companion object {
        val bottomNavItems = listOf(Dashboard, Sensors, Realtime, Calibration, Export)
    }
}
