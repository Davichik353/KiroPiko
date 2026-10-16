package com.coucou.android.core

/** Visible syntax only; never executes the request or certifies its safety. */
object ActionExplanation {
    fun describeRequest(request: com.coucou.android.link.ApprovalRequest, russian: Boolean): String = describe(request.tool, request.command, russian)
    fun describe(tool: String, command: String, russian: Boolean): String {
        val text = "$tool $command".lowercase()
        val notes = mutableListOf<String>()
        if (Regex("\\b(rm|del|erase|rmdir|remove-item|unlink)\\b").containsMatchIn(text)) notes += if (russian) "Есть операция удаления: проверьте точные пути." else "Deletion syntax is present: review the exact paths."
        if (Regex("https?://|\\b(curl|wget|invoke-webrequest|invoke-restmethod)\\b").containsMatchIn(text)) notes += if (russian) "Есть обращение к сети: возможны загрузка и передача данных." else "Network access may download files or transmit data."
        if (Regex("\\b(edit|write|multiedit|set-content|out-file|mv|cp)\\b|>").containsMatchIn(text)) notes += if (russian) "Возможно создание, изменение или перезапись файлов." else "Files may be created, changed or overwritten."
        if (notes.isEmpty()) notes += if (russian) "Полный эффект действия по одному тексту неизвестен." else "The full effects cannot be established from this text alone."
        notes += if (russian) "Это локальный разбор, не гарантия безопасности. Скрипты и содержимое файлов не проверены." else "This local description is not a safety guarantee. Scripts and file contents were not inspected."
        return notes.joinToString("\n")
    }
}
