package com.enviroswarm.fieldkit

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.enviroswarm.fieldkit.ui.navigation.Screen
import com.enviroswarm.fieldkit.ui.screens.*
import com.enviroswarm.fieldkit.ui.theme.FieldKitTheme
import dagger.hilt.android.AndroidEntryPoint

/**
 * Main entry point Activity for the ENViroSwarm Field Kit app.
 *
 * Sets up the Compose UI with a [Scaffold] containing a bottom navigation bar
 * and a [NavHost] for screen-to-screen navigation. The activity is annotated
 * with [@AndroidEntryPoint] for Hilt dependency injection.
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            FieldKitTheme {
                val navController = rememberNavController()
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentDestination = navBackStackEntry?.destination

                Scaffold(
                    bottomBar = {
                        NavigationBar {
                            Screen.bottomNavItems.forEach { screen ->
                                val selected = currentDestination?.hierarchy?.any {
                                    it.route == screen.route
                                } == true

                                NavigationBarItem(
                                    icon = {
                                        Icon(
                                            imageVector = if (selected) screen.selectedIcon else screen.unselectedIcon,
                                            contentDescription = stringResource(screen.labelRes)
                                        )
                                    },
                                    label = { Text(stringResource(screen.labelRes)) },
                                    selected = selected,
                                    onClick = {
                                        navController.navigate(screen.route) {
                                            popUpTo(navController.graph.findStartDestination().id) {
                                                saveState = true
                                            }
                                            launchSingleTop = true
                                            restoreState = true
                                        }
                                    }
                                )
                            }
                        }
                    }
                ) { innerPadding ->
                    NavHost(
                        navController = navController,
                        startDestination = Screen.Dashboard.route,
                        modifier = Modifier.padding(innerPadding)
                    ) {
                        composable(Screen.Dashboard.route) { DashboardScreen() }
                        composable(Screen.Sensors.route) { SensorsScreen() }
                        composable(Screen.Realtime.route) { RealtimeScreen() }
                        composable(Screen.Calibration.route) { CalibrationScreen() }
                        composable(Screen.Export.route) { ExportScreen() }
                    }
                }
            }
        }
    }
}
