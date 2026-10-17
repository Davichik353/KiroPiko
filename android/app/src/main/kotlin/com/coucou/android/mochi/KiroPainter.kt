package com.coucou.android.mochi

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Paint
import android.graphics.Path
import android.graphics.Rect
import android.graphics.RectF
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import kotlin.math.sin

/** KiroPiko's own illustrations; the original engine keeps agent/touch lifecycle semantics. */
object KiroPainter {
    private var states: Bitmap? = null
    private var holidays: Bitmap? = null
    private var sleepingHolidays: Bitmap? = null
    private var ledge: Bitmap? = null
    private var rig: KiroRig? = null
    private val paths = java.util.concurrent.ConcurrentHashMap<String, Path>()
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)

    fun load(context: Context) {
        if (states != null) return
        states = context.assets.open("kiro/kiro-mint-states.png").use { BitmapFactory.decodeStream(it) }
        holidays = context.assets.open("kiro/kiro-holidays.png").use { BitmapFactory.decodeStream(it) }
        sleepingHolidays = context.assets.open("kiro/kiro-holidays-sleep.png").use { BitmapFactory.decodeStream(it) }
        ledge = context.assets.open("kiro/kiro-mint-ledge.png").use { BitmapFactory.decodeStream(it) }
        rig = KiroRig(org.json.JSONObject(context.assets.open("kiro/wardrobe-rig.json").bufferedReader().use { it.readText() }))
    }

    fun frame(state: BotState, emote: BotEmote?): Int = when {
        state == BotState.SLEEPING || emote == BotEmote.YAWN -> 5
        state == BotState.ERROR || state == BotState.RATELIMIT || emote == BotEmote.ANNOYED -> 4
        state == BotState.FINISHED || emote == BotEmote.HAPPY -> 2
        emote == BotEmote.PROUD -> 8
        emote == BotEmote.LOVE || emote == BotEmote.WINK -> 1
        state == BotState.APPROVAL || state == BotState.QUESTION || emote == BotEmote.SURPRISED -> 7
        state == BotState.WORKING || state == BotState.THINKING || state == BotState.SEARCHING -> 3
        else -> 0
    }

    fun DrawScope.drawKiro(e: MochiEngine, nowSec: Double, bust: Boolean = false, play: KiroPlay.Frame? = null) {
        val base = states ?: return
        val face = e.permanentEmote ?: when (e.eyeOverride ?: e.permanentEye) {
            EyeShape.HAPPY -> BotEmote.HAPPY
            EyeShape.HEART -> BotEmote.LOVE
            EyeShape.WINK -> BotEmote.WINK
            EyeShape.TIRED -> BotEmote.YAWN
            EyeShape.LINE -> BotEmote.ANNOYED
            EyeShape.STAR -> BotEmote.PROUD
            EyeShape.DOT -> BotEmote.SURPRISED
            else -> null
        }
        val index = frame(e.state, face)
        val layout = rig ?: return
        val outfit = if (e.isMini) "none" else e.outfit.id
        val costume = layout.holidayOutfits.indexOf(outfit)
        val useHoliday = costume >= 0 && holidays != null
        val sleepingCostume = useHoliday && index == 5 && sleepingHolidays != null
        val bitmap = if (sleepingCostume) sleepingHolidays!! else if (useHoliday) holidays!! else if (bust && ledge != null) ledge!! else base
        val pose = if (sleepingCostume) (if (bust) layout.sleepingHolidayBust else layout.sleepingHolidayFull)[costume]
            else if (useHoliday) (if (bust) layout.holidayBust else layout.holidayFull)[costume]
            else if (bust && ledge != null) layout.ledge[when (index) { 0 -> 0; 6, 7 -> 1; 3, 4 -> 2; 5 -> 4; else -> 3 }]
            else layout.states[index]
        val placement = layout.place(pose, size.width, size.height, bust)
        drawIntoCanvas { canvas ->
            val c = canvas.nativeCanvas
            c.save()
            c.translate(size.width / 2, size.height * .8f)
            val breath = if(play == null) (sin(nowSec * 1.65) * .006).toFloat() else 0f
            c.scale(1f, 1f + breath)
            c.translate(-size.width / 2, -size.height * .8f)
            if (!useHoliday) accessories(c, outfit, pose, placement, "behind")
            if(play != null && !bust) {
                val top=pose.baseline-(pose.baseline-pose.eye[1])*.30f
                val center=pose.eye[0];val span=pose.span
                val angles=KiroPlay.legs(play.time,play.football)
                fun leg(left: Boolean, angle: Float) {
                    val start=maxOf(pose.rect[0],if(left) center-span*1.15f else center)
                    val end=minOf(pose.rect[0]+pose.rect[2],if(left) center else center+span*1.15f)
                    val pivot=center+(if(left) -.35f else .35f)*span
                    c.save();c.translate(placement.originX+pivot*placement.scale,placement.originY+top*placement.scale)
                    c.rotate(Math.toDegrees(angle.toDouble()).toFloat())
                    c.drawBitmap(bitmap,Rect(start.toInt(),top.toInt(),end.toInt(),(pose.rect[1]+pose.rect[3]).toInt()),
                        RectF((start-pivot)*placement.scale,0f,(end-pivot)*placement.scale,(pose.rect[1]+pose.rect[3]-top)*placement.scale),paint)
                    c.restore()
                }
                leg(true,angles.first);leg(false,angles.second)
                c.drawBitmap(bitmap,Rect(pose.rect[0].toInt(),pose.rect[1].toInt(),(pose.rect[0]+pose.rect[2]).toInt(),(top+2).toInt()),
                    RectF(placement.x,placement.y,placement.x+placement.width,placement.originY+(top+2)*placement.scale),paint)
            } else for (r in pose.regions ?: listOf(pose.rect)) {
                val left=placement.originX+r[0]*placement.scale; val top=placement.originY+r[1]*placement.scale
                c.drawBitmap(bitmap, Rect(r[0].toInt(), r[1].toInt(), (r[0]+r[2]).toInt(), (r[1]+r[3]).toInt()), RectF(left, top, left+r[2]*placement.scale, top+r[3]*placement.scale), paint)
            }
            if (!useHoliday) accessories(c, outfit, pose, placement, "front")
            c.restore()
        }
    }

    private fun path(source: String): Path = paths.computeIfAbsent(source) {
        val tokens = Regex("[A-Za-z]|-?[0-9]+(?:\\.[0-9]+)?").findAll(source).map { it.value }.toList()
        var i = 0
        fun number() = tokens[i++].toFloat()
        Path().apply {
            while (i < tokens.size) {
                when (val command = tokens[i++]) {
                    "M" -> moveTo(number(), number())
                    "L" -> lineTo(number(), number())
                    "Q" -> quadTo(number(), number(), number(), number())
                    "C" -> cubicTo(number(), number(), number(), number(), number(), number())
                    "Z" -> close()
                    else -> error("Unsupported Kiro path command: $command")
                }
            }
        }
    }

    private fun accessories(c: android.graphics.Canvas, outfit: String, pose: KiroPose, placement: KiroPlacement, layer: String) {
        val pieces = rig?.pieces?.optJSONArray(outfit) ?: return
        val p = Paint(Paint.ANTI_ALIAS_FLAG).apply { strokeJoin = Paint.Join.ROUND; strokeCap = Paint.Cap.ROUND }
        for (i in 0 until pieces.length()) {
            val shape = pieces.getJSONObject(i)
            if (shape.getString("layer") != layer) continue
            val neck = shape.getString("anchor") == "neck"
            val anchor = if (neck) pose.neck else pose.eye
            c.save()
            c.translate(placement.originX + anchor[0]*placement.scale, placement.originY + anchor[1]*placement.scale)
            if (!neck) c.rotate(Math.toDegrees(pose.angle.toDouble()).toFloat())
            c.scale(placement.eyeSpan/100f, placement.eyeSpan/100f)
            val geometry = if (shape.has("path")) path(shape.getString("path")) else Path().apply {
                if (shape.has("ellipse")) {
                    val e = shape.getJSONArray("ellipse"); val x=e.getDouble(0).toFloat(); val y=e.getDouble(1).toFloat(); val rx=e.getDouble(2).toFloat(); val ry=e.getDouble(3).toFloat()
                    addOval(x-rx,y-ry,x+rx,y+ry,Path.Direction.CW)
                }
                if (shape.has("rect")) {
                    val r=shape.getJSONArray("rect"); val x=r.getDouble(0).toFloat(); val y=r.getDouble(1).toFloat(); val w=r.getDouble(2).toFloat(); val h=r.getDouble(3).toFloat(); val radius=r.getDouble(4).toFloat()
                    addRoundRect(x,y,x+w,y+h,radius,radius,Path.Direction.CW)
                }
            }
            val fill=shape.getString("fill"); val stroke=shape.getString("stroke")
            if (fill != "none") { p.style=Paint.Style.FILL; p.color=android.graphics.Color.parseColor(fill); c.drawPath(geometry,p) }
            if (stroke != "none" && shape.getDouble("lineWidth") > 0) { p.style=Paint.Style.STROKE; p.strokeWidth=shape.getDouble("lineWidth").toFloat(); p.color=android.graphics.Color.parseColor(stroke); c.drawPath(geometry,p) }
            c.restore()
        }
    }
}
