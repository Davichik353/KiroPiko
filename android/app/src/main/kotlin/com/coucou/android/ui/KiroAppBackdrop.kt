package com.coucou.android.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.repeatOnLifecycle
import com.coucou.android.core.QuietHours
import kotlinx.coroutines.delay
import java.time.LocalTime
import kotlin.math.sin

/** One quiet, shared backdrop behind every screen, rather than animations inside isolated cards. */
@Composable
fun KiroAppBackdrop(quiet: QuietHours, active: Boolean = true) {
    val lifecycle=LocalLifecycleOwner.current.lifecycle
    val resolver=LocalContext.current.contentResolver
    var clock by remember { mutableDoubleStateOf(0.0) }
    LaunchedEffect(lifecycle,quiet,active) {
        if(!active)return@LaunchedEffect
        lifecycle.repeatOnLifecycle(Lifecycle.State.RESUMED) {
            var nextCheck=0L
            var still=true
            while(true) {
                val now=android.os.SystemClock.elapsedRealtime()
                if(now>=nextCheck) {
                    val time=LocalTime.now()
                    still=quiet.isQuiet(time.hour*60+time.minute) || android.provider.Settings.Global.getFloat(resolver,android.provider.Settings.Global.ANIMATOR_DURATION_SCALE,1f)<=0f
                    nextCheck=now+1000
                }
                if(!still)clock+=1.0/20
                delay(if(still)1000 else 50)
            }
        }
    }
    Canvas(Modifier.fillMaxSize()) {
        val t=clock
        drawRect(Brush.verticalGradient(listOf(Color(0xff100d18),Color(0xff171020),Color(0xff24172c))))
        val orb=Offset(size.width*(.2f+sin(t*.12).toFloat()*.14f),size.height*.83f)
        drawRect(Brush.radialGradient(listOf(Color(0xffb77cad).copy(alpha=.14f),Color.Transparent),orb,size.width*.95f))
        drawRect(Brush.radialGradient(listOf(Color(0xfff4b38a).copy(alpha=.10f),Color.Transparent),Offset(size.width*.94f,size.height*(.25f+sin(t*.09).toFloat()*.08f)),size.width*.8f))
        for(i in 0..2) {
            val path=Path();val base=size.height*(.88f+i*.035f)
            path.moveTo(-size.width*.1f,base)
            path.cubicTo(size.width*.25f,base-size.height*(.07f+sin(t*.14+i).toFloat()*.03f),size.width*.7f,base+size.height*.05f,size.width*1.1f,base-size.height*.04f)
            drawPath(path,Color(if(i==1)0xfff4b38a else 0xffb7a2d0).copy(alpha=.09f),style=Stroke(1.1f))
        }
    }
}
