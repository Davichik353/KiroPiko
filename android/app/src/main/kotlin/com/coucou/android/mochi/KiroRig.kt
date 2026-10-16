package com.coucou.android.mochi

import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.min

data class KiroPose(val rect: FloatArray, val eye: FloatArray, val span: Float, val baseline: Float, val angle: Float, val neck: FloatArray, val regions: List<FloatArray>? = null)
data class KiroPlacement(val x: Float, val y: Float, val width: Float, val height: Float, val scale: Float, val originX: Float, val originY: Float, val eyeSpan: Float)

/** The exact same pose landmarks and outfit artwork consumed by Windows. */
class KiroRig(val source: JSONObject) {
    private fun JSONArray.floats() = FloatArray(length()) { getDouble(it).toFloat() }
    private fun poses(key: String): List<KiroPose> {
        val values = source.getJSONArray(key)
        return List(values.length()) {
            val p = values.getJSONObject(it)
            KiroPose(p.getJSONArray("rect").floats(), p.getJSONArray("eye").floats(), p.getDouble("span").toFloat(), p.getDouble("baseline").toFloat(), p.getDouble("angle").toFloat(), p.getJSONArray("neck").floats(), p.optJSONArray("regions")?.let { a -> List(a.length()) { a.getJSONArray(it).floats() } })
        }
    }
    val states = poses("states")
    val ledge = poses("ledge")
    val holidayFull = poses("holidayFull")
    val holidayBust = poses("holidayBust")
    val sleepingHolidayFull = poses("sleepingHolidayFull")
    val sleepingHolidayBust = poses("sleepingHolidayBust")
    val holidayOutfits = source.getJSONArray("holidayOutfits").let { a -> List(a.length()) { a.getString(it) } }
    val pieces: JSONObject = source.getJSONObject("accessories")

    fun place(pose: KiroPose, width: Float, height: Float, bust: Boolean = false): KiroPlacement {
        val eyeSpan = min(width, height) * source.getDouble(if (bust) "bustEyeSpan" else "fullEyeSpan").toFloat()
        val scale = eyeSpan / pose.span
        val x = width / 2 - pose.eye[0] * scale
        val y = height * source.getDouble("baseline").toFloat() - pose.baseline * scale
        return KiroPlacement(x + pose.rect[0] * scale, y + pose.rect[1] * scale, pose.rect[2] * scale, pose.rect[3] * scale, scale, x, y, eyeSpan)
    }
}
