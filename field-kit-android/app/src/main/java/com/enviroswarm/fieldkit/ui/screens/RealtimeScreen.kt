package com.enviroswarm.fieldkit.ui.screens

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FileDownload
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.core.content.FileProvider
import com.enviroswarm.fieldkit.R
import com.enviroswarm.fieldkit.ui.theme.ChartCo2
import com.enviroswarm.fieldkit.ui.theme.ChartPm25
import com.enviroswarm.fieldkit.ui.theme.ChartTemp
import com.enviroswarm.fieldkit.ui.theme.DataTypography
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import timber.log.Timber
import java.io.File
import java.io.FileWriter
import java.text.SimpleDateFormat
import java.util.*
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min

/**
 * Single time-series data point for a sensor reading.
 *
 * @property timestamp Unix timestamp (ms)
 * @property pm25 PM2.5 in μg/m³ (nullable)
 * @property co2 CO₂ in ppm (nullable)
 * @property temperature Temperature in °C (nullable)
 */
data class TimeSeriesPoint(
    val timestamp: Long = System.currentTimeMillis(),
    val pm25: Double? = null,
    val co2: Int? = null,
    val temperature: Double? = null
)

/**
 * Configuration for the realtime chart display.
 *
 * @property windowSizeMs Time window to display in milliseconds (default 60 seconds)
 * @property showPm25 Whether to show PM2.5 line
 * @property showCo2 Whether to show CO₂ line
 * @property showTemperature Whether to show temperature line
 * @property yAxisMin Minimum Y-axis value (null = auto)
 * @property yAxisMax Maximum Y-axis value (null = auto)
 */
data class ChartConfig(
    val windowSizeMs: Long = 60_000L,
    val showPm25: Boolean = true,
    val showCo2: Boolean = true,
    val showTemperature: Boolean = true,
    val yAxisMin: Double? = null,
    val yAxisMax: Double? = null
)

/**
 * Realtime monitoring screen with live multi-line chart, pause/resume controls,
 * data export, and chart configuration.
 */
@Composable
fun RealtimeScreen() {
    val context = LocalContext.current

    var isRunning by remember { mutableStateOf(false) }
    var dataPoints by remember { mutableStateOf<List<TimeSeriesPoint>>(emptyList()) }
    var chartConfig by remember { mutableStateOf(ChartConfig()) }
    var showConfigDialog by remember { mutableStateOf(false) }

    // Simulated data feed for demo purposes
    LaunchedEffect(isRunning) {
        if (!isRunning) return@LaunchedEffect
        var t = 0.0
        while (isActive) {
            delay(1000)
            t += 1.0
            val point = TimeSeriesPoint(
                pm25 = 15.0 + 10.0 * kotlin.math.sin(t * 0.2) + kotlin.random.Random.nextDouble() * 5,
                co2 = 400 + (50 * kotlin.math.sin(t * 0.1)).toInt() + (kotlin.random.Random.nextDouble() * 20).toInt(),
                temperature = 22.0 + 3.0 * kotlin.math.sin(t * 0.15) + kotlin.random.Random.nextDouble() * 0.5
            )
            dataPoints = dataPoints + point
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = stringResource(R.string.realtime_title),
                style = MaterialTheme.typography.headlineMedium
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                IconButton(onClick = { showConfigDialog = true }) {
                    Icon(Icons.Filled.Settings, contentDescription = stringResource(R.string.chart_config))
                }
                IconButton(onClick = { exportToCsv(context, dataPoints) }) {
                    Icon(Icons.Filled.FileDownload, contentDescription = stringResource(R.string.export_csv))
                }
            }
        }

        // Live Chart
        Card(
            shape = MaterialTheme.shapes.large,
            modifier = Modifier
                .fillMaxWidth()
                .height(320.dp)
        ) {
            Box(modifier = Modifier.fillMaxSize()) {
                RealtimeLineChart(
                    dataPoints = dataPoints,
                    config = chartConfig,
                    modifier = Modifier.fillMaxSize()
                )

                if (!isRunning && dataPoints.isEmpty()) {
                    Text(
                        text = "Tap play to start monitoring",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.align(Alignment.Center)
                    )
                }
            }
        }

        // Legend
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterHorizontally)
        ) {
            if (chartConfig.showPm25) {
                LegendItem(color = ChartPm25, label = "PM2.5 (μg/m³)")
            }
            if (chartConfig.showCo2) {
                LegendItem(color = ChartCo2, label = "CO₂ (ppm)")
            }
            if (chartConfig.showTemperature) {
                LegendItem(color = ChartTemp, label = "Temp (°C)")
            }
        }

        // Statistics
        if (dataPoints.isNotEmpty()) {
            StatsRow(dataPoints)
        }

        // Pause/Resume Button
        Button(
            onClick = { isRunning = !isRunning },
            modifier = Modifier.fillMaxWidth()
        ) {
            Icon(
                imageVector = if (isRunning) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                contentDescription = null
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = if (isRunning) stringResource(R.string.pause)
                else stringResource(R.string.resume)
            )
        }

        // Data count
        Text(
            text = "Data points: ${dataPoints.size}",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }

    // Chart Config Dialog
    if (showConfigDialog) {
        ChartConfigDialog(
            currentConfig = chartConfig,
            onDismiss = { showConfigDialog = false },
            onApply = { chartConfig = it; showConfigDialog = false }
        )
    }
}

/**
 * Custom Canvas multi-line chart with auto-scrolling sliding window.
 */
@Composable
private fun RealtimeLineChart(
    dataPoints: List<TimeSeriesPoint>,
    config: ChartConfig,
    modifier: Modifier = Modifier
) {
    val textMeasurer = rememberTextMeasurer()

    val visibleData = remember(dataPoints, config.windowSizeMs) {
        val now = System.currentTimeMillis()
        dataPoints.filter { it.timestamp >= now - config.windowSizeMs }
    }

    if (visibleData.isEmpty()) {
        Box(modifier = modifier.background(MaterialTheme.colorScheme.surface))
        return
    }

    val pm25Values = visibleData.mapNotNull { it.pm25 }
    val co2Values = visibleData.mapNotNull { it.co2?.toDouble() }
    val tempValues = visibleData.mapNotNull { it.temperature }

    val allValues = buildList {
        if (config.showPm25) addAll(pm25Values)
        if (config.showCo2) addAll(co2Values)
        if (config.showTemperature) addAll(tempValues)
    }

    if (allValues.isEmpty()) {
        Box(modifier = modifier.background(MaterialTheme.colorScheme.surface))
        return
    }

    val yMin = config.yAxisMin ?: floor(allValues.minOrNull() ?: 0.0)
    val yMax = config.yAxisMax ?: ceil(allValues.maxOrNull() ?: 100.0)
    val yRange = (yMax - yMin).coerceAtLeast(1.0)

    val timeRange = config.windowSizeMs.toDouble()
    val now = System.currentTimeMillis()

    Canvas(
        modifier = modifier
            .background(MaterialTheme.colorScheme.surface)
            .pointerInput(Unit) {
                detectTapGestures { /* Placeholder for future tap-to-inspect */ }
            }
    ) {
        val paddingLeft = 48.dp.toPx()
        val paddingRight = 16.dp.toPx()
        val paddingTop = 16.dp.toPx()
        val paddingBottom = 32.dp.toPx()

        val chartWidth = size.width - paddingLeft - paddingRight
        val chartHeight = size.height - paddingTop - paddingBottom

        // Draw grid lines
        val gridLines = 5
        for (i in 0..gridLines) {
            val y = paddingTop + (chartHeight * i / gridLines)
            val value = yMax - (yRange * i / gridLines)

            drawLine(
                color = Color(0xFFE2E8F0),
                start = Offset(paddingLeft, y),
                end = Offset(size.width - paddingRight, y),
                strokeWidth = 1f
            )

            val label = textMeasurer.measure(
                text = "${value.toInt()}",
                style = androidx.compose.ui.text.TextStyle(
                    fontSize = 10.sp,
                    color = Color(0xFF64748B)
                )
            )
            drawText(
                textLayoutResult = label,
                topLeft = Offset(paddingLeft - label.size.width - 4.dp.toPx(), y - label.size.height / 2)
            )
        }

        // Draw X-axis labels (time)
        val timeLabels = 4
        for (i in 0..timeLabels) {
            val x = paddingLeft + (chartWidth * i / timeLabels)
            val timeOffset = (timeRange * i / timeLabels).toLong()
            val time = now - (timeRange - timeOffset).toLong()
            val label = textMeasurer.measure(
                text = formatTimeShort(time),
                style = androidx.compose.ui.text.TextStyle(
                    fontSize = 10.sp,
                    color = Color(0xFF64748B)
                )
            )
            drawText(
                textLayoutResult = label,
                topLeft = Offset(x - label.size.width / 2, size.height - paddingBottom + 4.dp.toPx())
            )
        }

        // Draw series
        if (config.showPm25 && pm25Values.size >= 2) {
            drawSeries(
                data = visibleData.mapNotNull { it.pm25?.let { v -> it.timestamp to v } },
                color = ChartPm25,
                now = now,
                timeRange = timeRange,
                yMin = yMin,
                yRange = yRange,
                paddingLeft = paddingLeft,
                paddingRight = paddingRight,
                paddingTop = paddingTop,
                chartWidth = chartWidth,
                chartHeight = chartHeight
            )
        }
        if (config.showCo2 && co2Values.size >= 2) {
            drawSeries(
                data = visibleData.mapNotNull { it.co2?.let { v -> it.timestamp to v.toDouble() } },
                color = ChartCo2,
                now = now,
                timeRange = timeRange,
                yMin = yMin,
                yRange = yRange,
                paddingLeft = paddingLeft,
                paddingRight = paddingRight,
                paddingTop = paddingTop,
                chartWidth = chartWidth,
                chartHeight = chartHeight
            )
        }
        if (config.showTemperature && tempValues.size >= 2) {
            drawSeries(
                data = visibleData.mapNotNull { it.temperature?.let { v -> it.timestamp to v } },
                color = ChartTemp,
                now = now,
                timeRange = timeRange,
                yMin = yMin,
                yRange = yRange,
                paddingLeft = paddingLeft,
                paddingRight = paddingRight,
                paddingTop = paddingTop,
                chartWidth = chartWidth,
                chartHeight = chartHeight
            )
        }
    }
}

private fun DrawScope.drawSeries(
    data: List<Pair<Long, Double>>,
    color: Color,
    now: Long,
    timeRange: Double,
    yMin: Double,
    yRange: Double,
    paddingLeft: Float,
    paddingRight: Float,
    paddingTop: Float,
    chartWidth: Float,
    chartHeight: Float
) {
    if (data.size < 2) return

    val path = Path()
    var first = true

    for ((timestamp, value) in data) {
        val timeDelta = (now - timestamp).toDouble()
        val x = paddingLeft + chartWidth * (1 - timeDelta / timeRange).toFloat()
        val y = paddingTop + chartHeight * (1 - (value - yMin) / yRange).toFloat()

        if (first) {
            path.moveTo(x, y)
            first = false
        } else {
            path.lineTo(x, y)
        }
    }

    drawPath(
        path = path,
        color = color,
        style = Stroke(width = 2.5f)
    )
}

private fun formatTimeShort(timestamp: Long): String {
    return SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date(timestamp))
}

@Composable
private fun LegendItem(color: Color, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            modifier = Modifier
                .size(12.dp)
                .background(color, MaterialTheme.shapes.small)
        )
        Spacer(modifier = Modifier.width(4.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium
        )
    }
}

@Composable
private fun StatsRow(dataPoints: List<TimeSeriesPoint>) {
    val latest = dataPoints.lastOrNull()
    val pm25Avg = dataPoints.mapNotNull { it.pm25 }.takeIf { it.isNotEmpty() }?.average()
    val co2Avg = dataPoints.mapNotNull { it.co2 }.takeIf { it.isNotEmpty() }?.average()?.toInt()
    val tempAvg = dataPoints.mapNotNull { it.temperature }.takeIf { it.isNotEmpty() }?.average()

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        StatCard("PM2.5 Avg", pm25Avg?.let { "%.1f" }.format(pm25Avg), "μg/m³", ChartPm25, Modifier.weight(1f))
        StatCard("CO₂ Avg", co2Avg?.toString(), "ppm", ChartCo2, Modifier.weight(1f))
        StatCard("Temp Avg", tempAvg?.let { "%.1f" }.format(tempAvg), "°C", ChartTemp, Modifier.weight(1f))
    }
}

@Composable
private fun StatCard(label: String, value: String?, unit: String, color: Color, modifier: Modifier) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = color.copy(alpha = 0.08f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
            .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(text = label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(
                text = value ?: "--",
                style = DataTypography.titleMedium,
                color = color
            )
            Text(text = unit, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun ChartConfigDialog(
    currentConfig: ChartConfig,
    onDismiss: () -> Unit,
    onApply: (ChartConfig) -> Unit
) {
    var windowSize by remember { mutableStateOf((currentConfig.windowSizeMs / 1000).toString()) }
    var showPm25 by remember { mutableStateOf(currentConfig.showPm25) }
    var showCo2 by remember { mutableStateOf(currentConfig.showCo2) }
    var showTemp by remember { mutableStateOf(currentConfig.showTemperature) }
    var yMin by remember { mutableStateOf(currentConfig.yAxisMin?.toString() ?: "") }
    var yMax by remember { mutableStateOf(currentConfig.yAxisMax?.toString() ?: "") }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = MaterialTheme.shapes.large,
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text("Chart Configuration", style = MaterialTheme.typography.headlineSmall)

                OutlinedTextField(
                    value = windowSize,
                    onValueChange = { windowSize = it.filter { c -> c.isDigit() } },
                    label = { Text("Window (seconds)") },
                    modifier = Modifier.fillMaxWidth()
                )

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = showPm25, onCheckedChange = { showPm25 = it })
                    Text("Show PM2.5")
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = showCo2, onCheckedChange = { showCo2 = it })
                    Text("Show CO₂")
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = showTemp, onCheckedChange = { showTemp = it })
                    Text("Show Temperature")
                }

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = yMin,
                        onValueChange = { yMin = it },
                        label = { Text("Y Min") },
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = yMax,
                        onValueChange = { yMax = it },
                        label = { Text("Y Max") },
                        modifier = Modifier.weight(1f)
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(onClick = onDismiss) { Text("Cancel") }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(onClick = {
                        onApply(
                            ChartConfig(
                                windowSizeMs = (windowSize.toLongOrNull() ?: 60) * 1000,
                                showPm25 = showPm25,
                                showCo2 = showCo2,
                                showTemperature = showTemp,
                                yAxisMin = yMin.toDoubleOrNull(),
                                yAxisMax = yMax.toDoubleOrNull()
                            )
                        )
                    }) {
                        Text("Apply")
                    }
                }
            }
        }
    }
}

/**
 * Exports the current session data to a CSV file and shares it.
 */
private fun exportToCsv(context: Context, dataPoints: List<TimeSeriesPoint>) {
    if (dataPoints.isEmpty()) {
        Timber.w("No data to export")
        return
    }

    try {
        val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
        val fileName = "enviroswarm_session_$timestamp.csv"
        val file = File(context.cacheDir, fileName)

        FileWriter(file).use { writer ->
            writer.append("timestamp,pm25_ug_m3,co2_ppm,temperature_c\n")
            dataPoints.forEach { point ->
                writer.append(
                    "${point.timestamp},${point.pm25 ?: ""},${point.co2 ?: ""},${point.temperature ?: ""}\n"
                )
            }
        }

        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        val shareIntent = Intent(Intent.ACTION_SEND).apply {
            type = "text/csv"
            putExtra(Intent.EXTRA_STREAM, uri)
            putExtra(Intent.EXTRA_SUBJECT, "ENViroSwarm Session Data")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }

        context.startActivity(Intent.createChooser(shareIntent, "Export Session Data"))
        Timber.i("Exported %d data points to %s", dataPoints.size, fileName)
    } catch (e: Exception) {
        Timber.e(e, "CSV export failed")
    }
}
