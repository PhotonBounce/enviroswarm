package com.enviroswarm.fieldkit.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bluetooth
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.filled.Usb
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.enviroswarm.fieldkit.R
import com.enviroswarm.fieldkit.ui.theme.DataTypography
import com.enviroswarm.fieldkit.utils.AQICalculator
import java.text.SimpleDateFormat
import java.util.*

/**
 * Dashboard UI state for sensor readings and connection status.
 */
data class DashboardState(
    val isReading: Boolean = false,
    val isUsbConnected: Boolean = false,
    val isBleConnected: Boolean = false,
    val pm25: Double? = null,
    val pm10: Double? = null,
    val co2: Int? = null,
    val temperature: Double? = null,
    val humidity: Double? = null,
    val pressure: Double? = null,
    val lastReadingTime: Long? = null
)

/**
 * Main dashboard screen displaying air quality summary, sensor status,
 * current readings, and health advice.
 */
@Composable
fun DashboardScreen(
    state: DashboardState = remember { DashboardState() },
    onStartReading: () -> Unit = {},
    onStopReading: () -> Unit = {}
) {
    val aqi = state.pm25?.let { AQICalculator.calculateAQI(it) }
    val aqiColor = aqi?.let { AQICalculator.getAQIColor(it) } ?: MaterialTheme.colorScheme.outline
    val aqiLabel = aqi?.let { AQICalculator.getAQILabel(it) } ?: "--"
    val healthAdvice = aqi?.let { AQICalculator.getHealthAdvice(it) }
        ?: "Connect a sensor and start reading to see air quality data."

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Title
        Text(
            text = stringResource(R.string.dashboard_title),
            style = MaterialTheme.typography.headlineMedium
        )

        // AQI Gauge
        AQIGauge(
            aqi = aqi ?: 0,
            aqiColor = aqiColor,
            aqiLabel = aqiLabel,
            modifier = Modifier.align(Alignment.CenterHorizontally)
        )

        // Sensor Status Cards
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            SensorStatusCard(
                icon = Icons.Filled.Usb,
                label = stringResource(R.string.usb_status),
                status = when {
                    state.isUsbConnected -> stringResource(R.string.sensor_connected)
                    state.isReading -> stringResource(R.string.sensor_connecting)
                    else -> stringResource(R.string.sensor_disconnected)
                },
                isConnected = state.isUsbConnected,
                modifier = Modifier.weight(1f)
            )
            SensorStatusCard(
                icon = Icons.Filled.Bluetooth,
                label = stringResource(R.string.ble_status),
                status = when {
                    state.isBleConnected -> stringResource(R.string.sensor_connected)
                    else -> stringResource(R.string.sensor_disconnected)
                },
                isConnected = state.isBleConnected,
                modifier = Modifier.weight(1f)
            )
        }

        // Readings Grid
        Text(
            text = "Current Readings",
            style = MaterialTheme.typography.titleLarge
        )
        ReadingsGrid(state)

        // Health Advisory Banner
        HealthAdviceBanner(advice = healthAdvice, color = aqiColor)

        // Start/Stop Button
        Button(
            onClick = if (state.isReading) onStopReading else onStartReading,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(
                containerColor = if (state.isReading) MaterialTheme.colorScheme.error
                else MaterialTheme.colorScheme.primary
            )
        ) {
            Icon(
                imageVector = if (state.isReading) Icons.Filled.Stop else Icons.Filled.PlayArrow,
                contentDescription = null
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = if (state.isReading) stringResource(R.string.stop_reading)
                else stringResource(R.string.start_reading)
            )
        }

        // Last Reading Timestamp
        state.lastReadingTime?.let { time ->
            Text(
                text = stringResource(
                    R.string.last_reading,
                    SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date(time))
                ),
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.align(Alignment.CenterHorizontally)
            )
        } ?: Text(
            text = stringResource(R.string.no_reading),
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.align(Alignment.CenterHorizontally)
        )
    }
}

/**
 * Animated circular AQI gauge with color-coded progress arc.
 */
@Composable
private fun AQIGauge(
    aqi: Int,
    aqiColor: Color,
    aqiLabel: String,
    modifier: Modifier = Modifier,
    size: Dp = 200.dp,
    strokeWidth: Dp = 16.dp
) {
    val animatedProgress by animateFloatAsState(
        targetValue = (aqi.coerceIn(0, 500) / 500f),
        animationSpec = tween(1000, easing = FastOutSlowInEasing),
        label = "aqi_progress"
    )

    Box(
        modifier = modifier.size(size),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val arcSize = size.toPx() - strokeWidth.toPx()
            val arcStroke = strokeWidth.toPx()
            val topLeft = Offset(
                (size.toPx() - arcSize) / 2,
                (size.toPx() - arcSize) / 2
            )
            val arcRect = Size(arcSize, arcSize)

            // Background track
            drawArc(
                color = Color(0xFFE2E8F0),
                startAngle = 135f,
                sweepAngle = 270f,
                useCenter = false,
                topLeft = topLeft,
                size = arcRect,
                style = Stroke(width = arcStroke, cap = StrokeCap.Round)
            )

            // Progress arc
            if (animatedProgress > 0) {
                drawArc(
                    color = aqiColor,
                    startAngle = 135f,
                    sweepAngle = 270f * animatedProgress,
                    useCenter = false,
                    topLeft = topLeft,
                    size = arcRect,
                    style = Stroke(width = arcStroke, cap = StrokeCap.Round)
                )
            }
        }

        Column(
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = stringResource(R.string.aqi_label),
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = aqi.toString(),
                style = DataTypography.displayMedium,
                color = aqiColor
            )
            Text(
                text = aqiLabel,
                style = MaterialTheme.typography.bodyMedium,
                color = aqiColor,
                textAlign = TextAlign.Center
            )
        }
    }
}

/**
 * Card displaying a single sensor connection status.
 */
@Composable
private fun SensorStatusCard(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    status: String,
    isConnected: Boolean,
    modifier: Modifier = Modifier
) {
    val statusColor = when {
        isConnected -> MaterialTheme.colorScheme.tertiary
        status.contains("Connecting", ignoreCase = true) -> MaterialTheme.colorScheme.secondary
        else -> MaterialTheme.colorScheme.outline
    }

    Card(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = statusColor,
                modifier = Modifier.size(32.dp)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = label,
                style = MaterialTheme.typography.labelMedium
            )
            Text(
                text = status,
                style = MaterialTheme.typography.bodyMedium,
                color = statusColor
            )
        }
    }
}

/**
 * Grid of current sensor readings with monospace numeric display.
 */
@Composable
private fun ReadingsGrid(state: DashboardState) {
    val readings = listOf(
        ReadingItem("PM2.5", state.pm25?.let { "%.1f".format(it) }, stringResource(R.string.unit_ug_m3)),
        ReadingItem("PM10", state.pm10?.let { "%.1f".format(it) }, stringResource(R.string.unit_ug_m3)),
        ReadingItem("CO₂", state.co2?.toString(), stringResource(R.string.unit_ppm)),
        ReadingItem("Temp", state.temperature?.let { "%.1f".format(it) }, stringResource(R.string.unit_celsius)),
        ReadingItem("Humidity", state.humidity?.let { "%.1f".format(it) }, stringResource(R.string.unit_percent)),
        ReadingItem("Pressure", state.pressure?.let { "%.1f".format(it) }, stringResource(R.string.unit_hpa))
    )

    LazyVerticalGrid(
        columns = GridCells.Fixed(3),
        modifier = Modifier.heightIn(max = 240.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(readings) { reading ->
            ReadingCard(reading)
        }
    }
}

private data class ReadingItem(val name: String, val value: String?, val unit: String)

@Composable
private fun ReadingCard(reading: ReadingItem) {
    Card(
        shape = RoundedCornerShape(8.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = reading.name,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = reading.value ?: "--",
                style = DataTypography.titleMedium,
                fontFamily = FontFamily.Monospace
            )
            Text(
                text = reading.unit,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * Color-coded health advice banner.
 */
@Composable
private fun HealthAdviceBanner(advice: String, color: Color) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = color.copy(alpha = 0.12f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(12.dp)
                    .clip(CircleShape)
                    .background(color)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = advice,
                style = MaterialTheme.typography.bodyMedium,
                color = color.copy(alpha = 0.9f)
            )
        }
    }
}
