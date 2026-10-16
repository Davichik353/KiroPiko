package com.coucou.android.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.coucou.android.app.AppModel
import com.coucou.android.core.TypeScale
import com.coucou.android.mochi.BotState
import kotlinx.coroutines.delay

/** Uses the same sessions and signed pending requests as the existing sheets. */
@Composable
fun DecisionPanel(model: AppModel, onReview: () -> Unit, onQuestion: (String) -> Unit, onSession: (String) -> Unit) {
    val waiting = model.sessions.filter { it.state == BotState.APPROVAL || it.state == BotState.QUESTION }
    if (waiting.isEmpty()) return
    var now by remember { mutableStateOf(System.currentTimeMillis()) }
    LaunchedEffect(waiting.map { it.pillId }) { while (true) { delay(1000); now = System.currentTimeMillis() } }
    val ru = androidx.compose.ui.platform.LocalConfiguration.current.locales[0].language == "ru"
    Panel {
        Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(if (ru) "Нужно твоё решение · ${waiting.size}" else "Your decisions · ${waiting.size}", style = TypeScale.TITLE.style(tokens().text.c()))
            for (session in waiting) {
                val approval = model.approvals.firstOrNull { it.pillId == session.pillId }
                val question = model.questionFor(session.pillId)
                val since = approval?.createdAtMs ?: question?.createdAtMs
                val age = since?.let { ((now - it).coerceAtLeast(0) / 1000).toString() }
                Column(Modifier.fillMaxWidth().clickable {
                    if (question != null) onQuestion(session.pillId)
                    else if (approval != null) onReview()
                    else onSession(session.pillId)
                }.padding(vertical = 8.dp)) {
                    Text("${model.agentName(session.pillId)} · ${session.project ?: if (ru) "проект не указан" else "project unavailable"}", style = TypeScale.LABEL.style(tokens().text.c()))
                    val target = question?.questions?.firstOrNull()?.question ?: approval?.tool ?: if (ru) "Откройте сессию на компьютере" else "Open the session on the computer"
                    Text(target + (age?.let { if (ru) " · ожидает $it с" else " · waiting $it s" } ?: ""), style = TypeScale.SECONDARY.style(tokens().textDim.c()))
                }
            }
        }
    }
}
