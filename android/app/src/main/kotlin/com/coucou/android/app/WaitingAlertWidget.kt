package com.coucou.android.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.view.View
import android.widget.RemoteViews
import com.coucou.android.R
import com.coucou.android.core.WidgetContent

/**
 * The Waiting Alert widget: calm when nothing waits for you; a bright orange "N waiting", an orange border and an anxious
 * Mochi when something does. A tap opens the app and the sheet for the request rises by itself over whatever is on screen,
 * so there is no deep link here. It only opens things: a request waits for you in the app, behind the fingerprint.
 */
class WaitingAlertWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) =
        WidgetHub.refresh(context, manager, ids) { c, w -> views(c, w) }

    companion object {
        fun views(context: Context, c: WidgetContent): RemoteViews {
            val v = RemoteViews(context.packageName, R.layout.widget_alert)
            WidgetHub.paint(v, R.id.alert_root, R.id.alert_tint, c.look)
            v.setImageViewBitmap(R.id.alert_face, MochiBitmap.of(c.mood, WidgetHub.px(context, 84), glow = true, tone = c.look, outfit = WidgetHub.outfit(context)))
            v.setContentDescription(R.id.alert_face, context.getString(R.string.widget_mochi_description, c.mood.key))
            v.setViewVisibility(R.id.alert_offline, if (c.connected) View.GONE else View.VISIBLE)
            val waiting = c.waiting > 0
            v.setViewVisibility(R.id.alert_count, if (waiting) View.VISIBLE else View.GONE)
            v.setViewVisibility(R.id.alert_calm, if (waiting) View.GONE else View.VISIBLE)
            v.setTextViewText(if (waiting) R.id.alert_count else R.id.alert_calm, c.alertLine)
            val decision=c.decision.takeIf { c.connected && waiting }
            v.setTextViewText(R.id.alert_sub, decision?.let { "${it.agent} · ${it.project ?: context.getString(R.string.widget_project_hidden)}" } ?: c.alertSub)
            v.setTextViewText(R.id.alert_count, if(waiting) context.getString(R.string.widget_decision_count,c.waiting) else c.alertLine)
            v.setViewVisibility(R.id.alert_clock,if(decision!=null && decision.sinceMs>0)View.VISIBLE else View.GONE)
            val elapsed=(System.currentTimeMillis()-(decision?.sinceMs ?: System.currentTimeMillis())).coerceIn(0,7*24*60*60*1000L)
            v.setChronometer(R.id.alert_clock,android.os.SystemClock.elapsedRealtime()-elapsed,context.getString(R.string.widget_wait_format),decision!=null && decision.sinceMs>0)
            if (waiting) v.setContentDescription(R.id.alert_count, context.getString(R.string.widget_badge_description, c.waiting))
            v.setOnClickPendingIntent(R.id.alert_root, decision?.let { WidgetHub.openSession(context,WidgetHub.CODE_ALERT,it.pillId) } ?: WidgetHub.openApp(context, WidgetHub.CODE_ALERT))
            return v
        }
    }
}
