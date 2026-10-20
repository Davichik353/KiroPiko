package com.coucou.android.ui

import android.os.SystemClock
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.inset
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.layout.boundsInWindow
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.repeatOnLifecycle
import com.coucou.android.app.AppModel
import com.coucou.android.core.CoreLanguage
import com.coucou.android.core.TypeScale
import com.coucou.android.mochi.*
import com.coucou.android.mochi.KiroPainter.drawKiro
import kotlinx.coroutines.delay
import java.time.LocalTime
import kotlin.math.PI
import kotlin.math.sin

/** Decorative only. No session actions, sound, networking or background frame loop. */
@Composable
fun KiroLiveScene(model: AppModel, preview: Boolean = false) {
    val context=LocalContext.current
    val view=LocalView.current
    val lifecycle=LocalLifecycleOwner.current.lifecycle
    val engine=remember { MochiEngine({ SystemClock.elapsedRealtimeNanos()/1e6 }) }
    val worn=model.dress()
    val state=if(preview) BotState.IDLE else model.sessions.firstOrNull()?.state ?: BotState.IDLE
    var visible by remember { mutableStateOf(false) }
    var clock by remember { mutableDoubleStateOf(0.0) }
    var still by remember { mutableStateOf(true) }
    var tapped by remember { mutableDoubleStateOf(-100.0) }
    val quiet=model.settings.quiet
    LaunchedEffect(worn,state) { KiroPainter.load(context);engine.setOutfit(worn,animated=false);engine.setState(state,force=true) }
    LaunchedEffect(lifecycle,visible,quiet) {
        if(!visible)return@LaunchedEffect
        lifecycle.repeatOnLifecycle(Lifecycle.State.RESUMED) {
            var last=SystemClock.elapsedRealtimeNanos()
            var nextCheck=0L
            while(true) {
                val milliseconds=SystemClock.elapsedRealtime()
                if(milliseconds>=nextCheck) {
                    val time=LocalTime.now()
                    val reduced=android.provider.Settings.Global.getFloat(context.contentResolver,android.provider.Settings.Global.ANIMATOR_DURATION_SCALE,1f)<=0f
                    still=reduced || quiet.isQuiet(time.hour*60+time.minute)
                    nextCheck=milliseconds+500
                }
                val now=SystemClock.elapsedRealtimeNanos()
                val dt=((now-last)/1e9).coerceIn(0.0,.05);last=now
                if(!still) { engine.update(dt);clock+=dt }
                delay(if(still)500 else 33)
            }
        }
    }
    val t=tokens()
    Panel {
        Column(Modifier.padding(16.dp)) {
            Text(CoreLanguage.text("Kiro's little world","Маленький мир Киро"),style=TypeScale.TITLE.style(t.text.c()))
            Text(if(still) CoreLanguage.text("A quiet moment together.","Тихо посижу рядом.")
                else if(clock-tapped<3) CoreLanguage.text("Hi! I'm here.","Привет! Я рядом.")
                else CoreLanguage.text("Tap Kiro to say hello.","Нажми на Киро, чтобы поздороваться."),style=TypeScale.SECONDARY.style(t.textDim.c()))
            Canvas(Modifier.fillMaxWidth().height(208.dp)
                .onGloballyPositioned { val r=it.boundsInWindow();visible=r.bottom>0 && r.top<view.height && r.height>0 }
                .clickable(role=Role.Button,onClickLabel=CoreLanguage.text("Say hello to Kiro","Поздороваться с Киро")){tapped=clock}) {
                val tick=if(still)0.0 else clock
                val active=!still && (state==BotState.IDLE || state==BotState.FINISHED)
                val avatar=116.dp.toPx().coerceAtMost(size.width*.42f)
                val lane=(size.width-avatar-12.dp.toPx()).coerceAtLeast(0f)
                val travelSeconds=(lane*.72f/32.dp.toPx()).toDouble().coerceAtLeast(1.0)
                val frame=KiroPlay.frame(tick,travelSeconds,travelSeconds)
                val x=if(active)frame.x*lane else lane*.78f
                val jump=if(!still && clock-tapped<.65) sin((clock-tapped)/.65*PI).toFloat()*14.dp.toPx() else 0f
                val y=size.height-avatar-46.dp.toPx()-jump
                val floor=size.height-46.dp.toPx()-avatar*.06f
                drawLine(Color(0xffb7a2d0).copy(alpha=.13f),Offset(8.dp.toPx(),floor),Offset(size.width-8.dp.toPx(),floor),1.dp.toPx())
                for(i in 0..4) {
                    val dotX=(((tick*(.028+i*.003)+i*.19)%1)*size.width).toFloat()
                    val dotY=(12+i%3*17).dp.toPx()
                    drawCircle(Color(0xfff4b38a).copy(alpha=.22f),1.3.dp.toPx(),Offset(dotX,dotY))
                }
                inset(left=x,top=y,right=size.width-x-avatar,bottom=size.height-y-avatar) {
                    withTransform({if(active && frame.left)scale(-1f,1f,Offset(size.width/2,size.height/2))}) {
                        drawKiro(engine,tick,play=if(active)frame else null)
                    }
                }
                if(active && frame.football) {
                    val phase=frame.time%3;val travel=if(phase<.55)0.0 else if(phase<1.35)(phase-.55)/.8 else 1-(phase-1.35)/1.65
                    val ballX=(x+avatar*.79f+travel*avatar*.15f).toFloat()
                    val lift=if(phase in .55..1.35)sin((phase-.55)/.8*PI).toFloat()*avatar*.15f else 0f
                    val center=Offset(ballX,y+avatar*.86f-lift)
                    drawCircle(Color(0xfff7f0e8),avatar*.045f,center);drawCircle(Color(0xff30283d),avatar*.018f,center)
                }
                val colors=listOf(0xffb7a2d0,0xfff4b38a,0xffed9ba7,0xfff4d3a2,0xff9681ad)
                for(i in 0..4) {
                    val cell=size.width/5f
                    val w=minOf(28.dp.toPx(),cell*.58f);val h=w*.8f
                    val room=((cell-w)/2-4.dp.toPx()).coerceAtLeast(0f)
                    // Walk in a straight lane, pause at each end, then face the return direction.
                    val cycle=(tick+i*1.43)%10.0
                    val walking=!still && (cycle<4.0 || cycle in 5.0..<9.0)
                    val right=cycle<5.0
                    val progress=when {
                        cycle<4.0 -> cycle/4.0
                        cycle<5.0 -> 1.0
                        cycle<9.0 -> 1.0-(cycle-5.0)/4.0
                        else -> 0.0
                    }
                    val phase=tick*9.0+i*1.7
                    val px=cell*(i+.5f)-w/2+(if(still)0f else (progress.toFloat()*2f-1f)*room)
                    val step=if(walking) kotlin.math.abs(sin(phase)).toFloat() else 0f
                    val floorY=size.height-5.dp.toPx()
                    val py=floorY-3.dp.toPx()-step*1.5.dp.toPx()
                    val ink=Color(0xff221c2b)
                    for(foot in 0..1) {
                        val lift=if(walking)kotlin.math.max(0.0,sin(phase+foot*PI)).toFloat()*3.dp.toPx() else 0f
                        drawRoundRect(Color(colors[i]).copy(alpha=.85f),Offset(px+w*(.16f+foot*.48f),floorY-lift),Size(w*.22f,3.dp.toPx()),CornerRadius(1.5.dp.toPx()))
                    }
                    drawRoundRect(Color(colors[i]),Offset(px,py-h),Size(w,h),CornerRadius(w*.28f))
                    val blinking=!still && (tick+i*1.37)%6>5.72
                    val eyeH=if(blinking)1.1.dp.toPx() else w*.23f
                    val look=if(still)0f else (if(right)1f else -1f)*w*.07f
                    for(eye in 0..1)drawRoundRect(ink,Offset(px+w*(.27f+eye*.34f)+look,py-h*.54f-eyeH/2),Size(w*.14f,eyeH),CornerRadius(w*.07f))
                }
            }
        }
    }
}
