package com.coucou.android.ui

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.widget.Toast
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.coucou.android.R
import com.coucou.android.core.TypeScale

/** Reuses the nine existing providers; the launcher always owns the final placement. */
@Composable
fun WidgetInstallPanel() {
    val context = LocalContext.current
    val ru = context.resources.configuration.locales[0].language == "ru"
    val widgets = listOf(
        "GlanceWidget" to R.string.widget_glance_label, "SoloWidget" to R.string.widget_solo_label,
        "ListWidget" to R.string.widget_list_label, "MochiBigWidget" to R.string.widget_big_label,
        "StatusPillWidget" to R.string.widget_pill_label, "WaitingAlertWidget" to R.string.widget_alert_label,
        "UsageRingWidget" to R.string.widget_ring_label, "TodayWidget" to R.string.widget_today_label,
        "MoodWidget" to R.string.widget_mood_label,
    )
    Panel {
        Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(if (ru) "Виджеты Киро" else "Kiro widgets", style = TypeScale.TITLE.style(tokens().text.c()))
            Text(if (ru) "Выберите виджет. Android предложит разместить его на домашнем экране. Команды и разговоры в виджетах не показываются." else "Choose a widget and confirm placement on your home screen. Widgets do not show commands or conversations.", style = TypeScale.SECONDARY.style(tokens().textDim.c()))
            for ((provider, label) in widgets) {
                Text(context.getString(label) + "  +", Modifier.fillMaxWidth().clickable {
                    val manager = AppWidgetManager.getInstance(context)
                    val supported = manager.isRequestPinAppWidgetSupported
                    val accepted = supported && runCatching { manager.requestPinAppWidget(ComponentName(context, "com.coucou.android.app.$provider"), null, null) }.getOrDefault(false)
                    if (!accepted) Toast.makeText(context, if (ru) "Зажмите пустое место домашнего экрана → Виджеты → KiroPiko." else "Long press your home screen → Widgets → KiroPiko.", Toast.LENGTH_LONG).show()
                }.padding(vertical = 12.dp), style = TypeScale.LABEL.style(tokens().text.c()))
            }
        }
    }
}
