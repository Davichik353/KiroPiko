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
import com.coucou.android.mochi.outfit.Outfit
import kotlin.math.min
import kotlin.math.sin

/** KiroPiko's own illustrations; the original engine keeps agent/touch lifecycle semantics. */
object KiroPainter {
    private var states: Bitmap? = null
    private var holidays: Bitmap? = null
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)

    fun load(context: Context) {
        if (states != null) return
        states = context.assets.open("kiro/kiro-mint-states.png").use { BitmapFactory.decodeStream(it) }
        holidays = context.assets.open("kiro/kiro-holidays.png").use { BitmapFactory.decodeStream(it) }
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

    fun DrawScope.drawKiro(e: MochiEngine, nowSec: Double) {
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
        val costume = listOf(Outfit.WITCH_HAT, Outfit.PUMPKIN, Outfit.SANTA_HAT, Outfit.PARTY_HAT).indexOf(e.outfit)
        val useHoliday = costume >= 0 && holidays != null && index == 0 && !e.isMini
        val bitmap = if (useHoliday) holidays!! else base
        val cw = bitmap.width / if (useHoliday) 4 else 3
        val ch = bitmap.height / if (useHoliday) 2 else 3
        val col = if (useHoliday) costume else index % 3
        val row = if (useHoliday) 1 else index / 3
        // Atlas cells contain different transparent margins. Register the visible
        // illustration, rather than stretching the whole cell into a square.
        val bounds = if (useHoliday) holidayBounds[costume] else stateBounds[index]
        val side = min(size.width, size.height) * .80f
        val drawnWidth = side * bounds.width() / bounds.height()
        val left = (size.width - drawnWidth) / 2
        val top = size.height * .94f - side
        drawIntoCanvas { canvas ->
            val c = canvas.nativeCanvas
            c.save()
            c.translate(size.width / 2, size.height * .8f)
            val breath = (sin(nowSec * 1.65) * .006).toFloat()
            c.scale(1f, 1f + breath)
            c.translate(-size.width / 2, -size.height * .8f)
            c.drawBitmap(bitmap, Rect(col * cw + bounds.left, row * ch + bounds.top, col * cw + bounds.right, row * ch + bounds.bottom), RectF(left, top, left + drawnWidth, top + side), paint)
            if (!useHoliday && !e.isMini) accessories(c, e.outfit, left, top, drawnWidth, side)
            c.restore()
        }
    }

    private val stateBounds = arrayOf(Rect(105,16,341,398), Rect(96,17,337,398), Rect(91,17,334,398), Rect(103,7,351,399), Rect(92,9,338,399), Rect(100,10,346,399), Rect(101,9,347,395), Rect(81,11,348,395), Rect(81,10,331,395))
    private val holidayBounds = arrayOf(Rect(89,4,401,433), Rect(109,4,374,433), Rect(93,4,377,434), Rect(95,4,348,433))

    private fun accessories(c: android.graphics.Canvas, outfit: Outfit, left: Float, top: Float, width: Float, height: Float) {
        c.save(); c.translate(left, top); c.scale(width / 100f, height / 100f)
        val p = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = android.graphics.Color.rgb(126, 221, 187) }
        when (outfit) {
            Outfit.CROWN -> { p.color = 0xFFFFD56A.toInt(); c.drawPath(Path().apply { moveTo(33f, 17f); lineTo(30f, 5f); lineTo(42f, 11f); lineTo(50f, 1f); lineTo(58f, 11f); lineTo(70f, 5f); lineTo(67f, 17f); close() }, p) }
            Outfit.SUNGLASSES, Outfit.ROUND_GLASSES -> {
                p.color = 0xFF263B35.toInt(); p.style = if (outfit == Outfit.ROUND_GLASSES) Paint.Style.STROKE else Paint.Style.FILL; p.strokeWidth = 1.6f
                c.drawOval(24f, 32f, 47f, 43f, p); c.drawOval(55f, 32f, 78f, 43f, p); c.drawLine(47f, 37f, 55f, 37f, p)
            }
            Outfit.BEANIE -> { c.drawOval(14f, -3f, 86f, 18f, p); c.drawRoundRect(14f, 12f, 86f, 18f, 3f, 3f, p); c.drawCircle(50f, -3f, 4f, p) }
            Outfit.SCARF -> { c.drawRoundRect(30f, 49f, 72f, 54f, 2f, 2f, p); c.drawRoundRect(60f, 52f, 69f, 65f, 2f, 2f, p) }
            Outfit.BOW -> { p.color = 0xFFEB9BAE.toInt(); c.drawOval(24f, 16f, 35f, 25f, p); c.drawOval(34f, 16f, 45f, 25f, p); c.drawCircle(34f, 21f, 3f, p) }
            Outfit.BUNNY_EARS -> { p.color = 0xFFF0F6F3.toInt(); c.drawOval(18f, -12f, 32f, 9f, p); c.drawOval(68f, -12f, 82f, 9f, p) }
            Outfit.WITCH_HAT, Outfit.PARTY_HAT, Outfit.SANTA_HAT -> {
                p.color = if (outfit == Outfit.WITCH_HAT) 0xFF78529F.toInt() else if (outfit == Outfit.SANTA_HAT) 0xFFD85866.toInt() else 0xFF7EDDBB.toInt()
                c.drawPath(Path().apply { moveTo(29f, 16f); lineTo(52f, 0f); lineTo(73f, 16f); close() }, p)
                if (outfit == Outfit.WITCH_HAT) c.drawOval(22f, 13f, 80f, 19f, p)
            }
            Outfit.PUMPKIN -> { p.color = 0xFFF3A54F.toInt(); c.drawRoundRect(38f, 66f, 66f, 78f, 6f, 6f, p) }
            else -> Unit
        }
        c.restore()
    }
}
