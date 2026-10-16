package com.coucou.android.core

import com.coucou.android.link.LinkState
import com.coucou.android.link.SessionInfo
import com.coucou.android.mochi.BotState

/** One agent in a glance: its name and one plain line. No command, no path, no answer text. */
data class GlanceLine(val agent: String, val text: String, val state: BotState)

/** How loud a glance is: picks the dot colour of the widget, the tile state and the notification accent. */
enum class GlanceTone(val argb: Int) {
    CALM(0xFF8E8E93.toInt()),
    OK(0xFF34C759.toInt()),
    BUSY(0xFF0A84FF.toInt()),
    ATTENTION(0xFFFF9F0A.toInt()),
    TROUBLE(0xFFFF453A.toInt()),
}

/**
 * What the small surfaces show without opening the app: the ongoing notification, the home-screen widget and the
 * quick-settings tile. One pure summary so the three always say the same thing. Only agent names and the plain-language
 * lines of [HomeText] go in: never a command, a path, a file name or a final answer, because a widget or a tile can be
 * seen without unlocking the phone.
 */
data class Glance(
    val headline: String,
    val detail: String,
    val tone: GlanceTone,
    val connected: Boolean,
    val lines: List<GlanceLine>,
    /** Requests and questions waiting for the user. */
    val waiting: Int,
)

object GlanceBuilder {
    const val MAX_LINES = 4
    private val BUSY = setOf(BotState.WORKING, BotState.THINKING, BotState.SEARCHING)
    private val TROUBLE = setOf(BotState.ERROR, BotState.RATELIMIT, BotState.DIZZY)

    /** Most urgent first; the same order as the Home list. */
    private val ORDER = listOf(
        BotState.APPROVAL, BotState.QUESTION, BotState.ERROR, BotState.RATELIMIT, BotState.DIZZY,
        BotState.WORKING, BotState.SEARCHING, BotState.THINKING, BotState.FINISHED, BotState.SLEEPING, BotState.IDLE,
    )

    /** Where a state sits in the list, most urgent first; unknown states go last. */
    fun rank(state: BotState): Int = ORDER.indexOf(state).let { i -> if (i < 0) ORDER.size else i }

    fun build(
        paired: Boolean,
        link: LinkState,
        desktop: String?,
        sessions: List<SessionInfo>,
        approvals: Int,
        nameOf: (String) -> String,
    ): Glance {
        if (!paired) return Glance(CoreLanguage.text("Not paired", "Компьютер не подключён"), CoreLanguage.text("Open Coucou to connect to your computer", "Откройте KiroPiko для подключения компьютера"), GlanceTone.CALM, false, emptyList(), 0)
        if (link != LinkState.CONNECTED) {
            val connecting = link == LinkState.CONNECTING
            return Glance(
                if (connecting) CoreLanguage.text("Connecting…", "Подключение…") else CoreLanguage.text("Not connected", "Нет подключения"),
                if (connecting) CoreLanguage.text("Reaching your computer", "Подключаюсь к компьютеру") else CoreLanguage.text("Coucou cannot reach your computer", "Компьютер недоступен"),
                GlanceTone.CALM, false, emptyList(), 0,
            )
        }
        val ranked = sessions.sortedBy { ORDER.indexOf(it.state).let { i -> if (i < 0) ORDER.size else i } }
        val lines = ranked.take(MAX_LINES).map { GlanceLine(nameOf(it.pillId), lineOf(it), it.state) }
        val questions = sessions.count { it.state == BotState.QUESTION }
        val waiting = approvals + questions
        val busy = sessions.count { it.state in BUSY }
        val trouble = sessions.count { it.state in TROUBLE }
        val where = desktop?.takeIf { it.isNotBlank() }
        return when {
            approvals > 0 -> Glance(
                CoreLanguage.text("Waiting for you", "Ожидает вас"),
                if (approvals == 1) CoreLanguage.text("1 request to approve", "Нужен ответ на 1 запрос") else CoreLanguage.text("$approvals requests to approve", "Запросов: $approvals"),
                GlanceTone.ATTENTION, true, lines, waiting,
            )
            questions > 0 -> Glance(
                CoreLanguage.text("Waiting for your answer", "Ожидает вашего ответа"),
                if (questions == 1) CoreLanguage.text("1 question from an agent", "У агента есть вопрос") else CoreLanguage.text("$questions questions from agents", "Вопросов: $questions"),
                GlanceTone.ATTENTION, true, lines, waiting,
            )
            trouble > 0 -> Glance(
                CoreLanguage.text("An agent needs a look", "Агенту нужно внимание"),
                if (trouble == 1) CoreLanguage.text("1 agent stopped", "Агент остановлен") else CoreLanguage.text("$trouble agents stopped", "Агентов остановлено: $trouble"),
                GlanceTone.TROUBLE, true, lines, 0,
            )
            busy > 0 -> Glance(
                if (busy == 1) CoreLanguage.text("${nameOf(ranked.first { it.state in BUSY }.pillId)} is working", "${nameOf(ranked.first { it.state in BUSY }.pillId)} работает") else CoreLanguage.text("$busy agents are working", "Работают агенты: $busy"),
                where?.let { CoreLanguage.text("On $it", "На $it") } ?: CoreLanguage.text("Working", "Работает"),
                GlanceTone.BUSY, true, lines, 0,
            )
            sessions.any { it.state == BotState.FINISHED } -> Glance(
                CoreLanguage.text("All done", "Всё готово"), where?.let { CoreLanguage.text("On $it", "На $it") } ?: CoreLanguage.text("Finished", "Завершено"), GlanceTone.OK, true, lines, 0,
            )
            else -> Glance(CoreLanguage.text("Connected", "Подключено"), where?.let { CoreLanguage.text("To $it", "Компьютер: $it") } ?: CoreLanguage.text("Nothing is running", "Активных задач нет"), GlanceTone.OK, true, lines, 0)
        }
    }

    /** The plain line of a session: its state in a few words, never its step text or answer (those stay in the app). */
    fun lineOf(s: SessionInfo): String = when (s.state) {
        BotState.APPROVAL -> CoreLanguage.text("Waiting for your approval", "Нужно ваше разрешение")
        BotState.QUESTION -> CoreLanguage.text("Has a question", "Есть вопрос")
        BotState.ERROR -> CoreLanguage.text("Stopped on an error", "Остановка из-за ошибки")
        BotState.RATELIMIT -> CoreLanguage.text("Hit a limit", "Достигнут лимит")
        BotState.DIZZY -> CoreLanguage.text("Needs a look", "Нужно внимание")
        BotState.FINISHED -> CoreLanguage.text("Finished", "Завершено")
        BotState.SLEEPING, BotState.IDLE -> CoreLanguage.text("Idle", "Покой")
        BotState.THINKING -> CoreLanguage.text("Thinking", "Думает")
        BotState.SEARCHING -> CoreLanguage.text("Searching", "Ищет")
        else -> CoreLanguage.text("Working", "Работает") // never the step text: it can hold a file name or a command
    }
}
