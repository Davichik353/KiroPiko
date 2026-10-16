package com.coucou.android

import com.coucou.android.mochi.KiroRig
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import java.io.File

class KiroRigTest {
    private fun data() = File("src/main/assets/kiro/wardrobe-rig.json").readText()
    @Test fun headScaleAndBaselineMatchAcrossEveryOutfit() {
        val rig = KiroRig(JSONObject(data()))
        for ((w,h) in listOf(28f to 28f,120f to 120f,80f to 140f,160f to 90f)) {
            for (bust in listOf(false,true)) {
                val poses = if (bust) rig.ledge + rig.holidayBust + rig.sleepingHolidayBust else rig.states + rig.holidayFull + rig.sleepingHolidayFull
                val spans = poses.map { pose ->
                    val p=rig.place(pose,w,h,bust)
                    assertEquals(w/2,p.originX+pose.eye[0]*p.scale,.001f)
                    assertEquals(h*.94f,p.originY+pose.baseline*p.scale,.001f)
                    assertTrue(p.x>=-1 && p.y>=-1 && p.x+p.width<=w+1 && p.y+p.height<=h+1)
                    pose.span*p.scale
                }
                assertTrue(spans.max()-spans.min()<.001f)
            }
        }
    }
    @Test fun phoneUsesTheSameRigAsWindowsAndKeepsTheWholeWitchBrim() {
        val phone=data()
        assertEquals(File("../../windows/public/nova/wardrobe-rig.json").readText(),phone)
        val rig=KiroRig(JSONObject(phone)); val witch=rig.holidayBust[0]
        assertTrue(witch.rect[0]+witch.rect[2]>=475)
        assertEquals(4,rig.holidayOutfits.size)
    }
    @Test fun sleepingCostumesArePackagedSeparatelyAndSharedWithWindows() {
        val name="kiro-holidays-sleep.png"
        assertArrayEquals(File("../../windows/public/nova/$name").readBytes(),File("src/main/assets/kiro/$name").readBytes())
        val rig=KiroRig(JSONObject(data()))
        assertEquals(rig.holidayOutfits.size,rig.sleepingHolidayFull.size)
        assertEquals(rig.holidayOutfits.size,rig.sleepingHolidayBust.size)
    }
}
