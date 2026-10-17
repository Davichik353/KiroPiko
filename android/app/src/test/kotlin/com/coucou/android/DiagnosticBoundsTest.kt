package com.coucou.android
import com.coucou.android.link.Diagnostics
import org.junit.Assert.*
import org.junit.Test
class DiagnosticBoundsTest {
    @Test fun relayProbeNeverReadsAnUnlimitedResponse() {
        var consumed=0
        val endless=object:java.io.Reader() {
            override fun close() {}
            override fun read(buffer:CharArray,offset:Int,length:Int):Int {
                consumed+=length
                for(i in offset until offset+length)buffer[i]='x'
                return length
            }
        }
        assertEquals(64,Diagnostics.readPrefix(endless).length)
        assertEquals(64,consumed)
        assertEquals("short",Diagnostics.readPrefix(java.io.StringReader("short")))
    }
}
