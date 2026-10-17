package com.coucou.android

import com.coucou.android.mochi.KiroPlay
import org.junit.Assert.*
import org.junit.Test

class KiroPlayTest {
    @Test fun travelIsBoundedAndReturnsWithoutJumping() {
        for(i in 0..2000) {val f=KiroPlay.frame(i*.03);assertTrue(f.x in .079f.. .801f)}
        assertEquals(KiroPlay.frame(0.0).x,KiroPlay.frame(28.0).x,.001f)
        assertEquals(KiroPlay.frame(9.999).x,KiroPlay.frame(10.0).x,.001f)
        assertEquals(KiroPlay.frame(19.999).x,KiroPlay.frame(20.0).x,.001f)
        assertFalse(KiroPlay.frame(Double.NaN).football)
    }
    @Test fun walkAlternatesFeetAndKickHasContactThenRest() {
        val a=KiroPlay.legs(.225,false);val b=KiroPlay.legs(.675,false)
        assertTrue(a.first>0 && a.second<0 && b.first<0 && b.second>0)
        assertTrue(KiroPlay.legs(.6,true).second<-.8f)
        assertEquals(0f,KiroPlay.legs(2.0,true).second,0f)
        assertTrue(KiroPlay.frame(12.0).football)
        assertTrue(KiroPlay.frame(24.0).left)
    }
}
