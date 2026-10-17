package com.coucou.android.mochi

import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.repeatOnLifecycle
import com.coucou.android.mochi.MochiPainter.drawMochi

/**
 * Hosts a [MochiEngine] and redraws it every frame while the screen is visible.
 * The frame loop only runs while the lifecycle is STARTED, so a backgrounded app costs no CPU.
 */
@Composable
fun MochiView(engine: MochiEngine, modifier: Modifier = Modifier) {
    val frame = remember { mutableLongStateOf(0L) }
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    val resolver=LocalContext.current.contentResolver
    fun motionOff()=android.provider.Settings.Global.getFloat(resolver,android.provider.Settings.Global.ANIMATOR_DURATION_SCALE,1f)<=0f
    var reduced by remember(resolver) { mutableStateOf(motionOff()) }
    LaunchedEffect(engine, lifecycle, resolver) {
        lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) {
            reduced=motionOff()
            var last = 0L
            while (true) {
                if(reduced) {
                    kotlinx.coroutines.delay(250)
                    engine.update(.1)
                    frame.longValue=System.nanoTime()
                    continue
                }
                androidx.compose.runtime.withFrameNanos { ns ->
                    val dt = if (last == 0L) 1.0 / 60 else ((ns - last) / 1e9).coerceIn(0.0, 0.1)
                    last = ns
                    engine.update(dt)
                    frame.longValue = ns
                }
            }
        }
    }
    Canvas(modifier) {
        frame.longValue // read so the canvas redraws every frame
        drawMochi(engine, if(reduced) 0.0 else System.nanoTime() / 1e9)
    }
}
