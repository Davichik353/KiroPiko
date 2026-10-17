package com.coucou.android.mochi

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.sin

/** One clock for the feet, travel and ball; no renderer or network dependencies. */
object KiroPlay {
    data class Frame(val x: Float, val left: Boolean, val football: Boolean, val time: Double)
    fun frame(seconds: Double): Frame {
        val t = (if (seconds.isFinite()) seconds.coerceAtLeast(0.0) else 0.0) % 28.0
        return when {
            t < 10 -> Frame((.08 + .72*t/10).toFloat(), false, false, t)
            t < 20 -> Frame(.8f, false, true, t-10)
            else -> Frame((.8-.72*(t-20)/8).toFloat(), true, false, t-20)
        }
    }
    fun legs(time: Double, football: Boolean): Pair<Float, Float> {
        if (!football) { val stride=sin(time*2*PI/.9).toFloat()*.38f; return stride to -stride }
        val p=time%3
        fun smooth(x: Double): Double {val v=x.coerceIn(0.0,1.0);return v*v*(3-2*v)}
        val kick=when {p<.3->.25*smooth(p/.3);p<.6->.25-1.2*smooth((p-.3)/.3);p<1.1->-.95*(1-smooth((p-.6)/.5));else->0.0}
        return 0f to kick.toFloat()
    }
    fun bounce(time: Double) = (-abs(sin(time*2*PI/.9))*.012).toFloat()
}
