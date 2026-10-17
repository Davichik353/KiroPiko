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
            while(true) {
                val time=LocalTime.now()
                val reduced=android.provider.Settings.Global.getFloat(context.contentResolver,android.provider.Settings.Global.ANIMATOR_DURATION_SCALE,1f)<=0f
                still=reduced || quiet.isQuiet(time.hour*60+time.minute)
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
            Canvas(Modifier.fillMaxWidth().height(172.dp)
                .onGloballyPositioned { val r=it.boundsInWindow();visible=r.bottom>0 && r.top<view.height && r.height>0 }
                .clickable(role=Role.Button,onClickLabel=CoreLanguage.text("Say hello to Kiro","Поздороваться с Киро")){tapped=clock}) {
                val tick=if(still)0.0 else clock
                val frame=KiroPlay.frame(tick)
                val active=!still && (state==BotState.IDLE || state==BotState.FINISHED)
                val avatar=116.dp.toPx().coerceAtMost(size.width*.42f)
                val lane=(size.width-avatar-12.dp.toPx()).coerceAtLeast(0f)
                val x=if(active)frame.x*lane else lane*.78f
                val jump=if(!still && clock-tapped<.65) sin((clock-tapped)/.65*PI).toFloat()*14.dp.toPx() else 0f
                val y=size.height-avatar-10.dp.toPx()-jump
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
                    val phase=tick*.22+i*1.1
                    val px=(.07f+i*.075f+(if(still)0f else sin(phase).toFloat()*.025f))*size.width
                    val py=size.height-13.dp.toPx()-(if(still)0f else kotlin.math.abs(sin(phase*4)).toFloat()*3.dp.toPx())
                    val w=19.dp.toPx();val h=15.dp.toPx()
                    drawRoundRect(Color(colors[i]),Offset(px,py-h),Size(w,h),CornerRadius(6.dp.toPx()))
                    for(eye in 0..1)drawCircle(Color(0xff221c2b),1.7.dp.toPx(),Offset(px+w*(.34f+eye*.32f),py-h*.48f))
                }
            }
        }
    }
}
