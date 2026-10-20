package com.coucou.android.core

/** Display strings only. Protocol tokens, commands and agent text are never translated. */
object CoreLanguage {
    var russian = false
    private val labels = mapOf(
        "Checking the interface" to "Проверяет интерфейс",
        "Reading documentation" to "Читает документацию",
        "Working with GitHub" to "Работает с GitHub",
        "Running code" to "Выполняет код",
        "Asking a question" to "Задаёт вопрос",
        "Running a command" to "Выполняет команду",
        "Reading files" to "Читает файлы",
        "Editing files" to "Изменяет файлы",
        "Searching files" to "Ищет в файлах",
        "Searching the web" to "Ищет в интернете",
        "Reading a web page" to "Читает веб-страницу",
        "Running a sub-agent" to "Запускает подзадачу",
        "run a command" to "выполнить команду",
        "edit files" to "изменить файлы",
        "read files" to "читать файлы",
        "search files" to "искать в файлах",
        "look at files" to "посмотреть файлы",
        "search the web" to "искать в интернете",
        "read a web page" to "прочитать веб-страницу",
        "run a sub-agent" to "запустить подзадачу",
        "do something" to "выполнить действие",
        "Looking at files" to "Просматривает файлы",
        "Planning" to "Планирует",
        "ask a question" to "задать вопрос"
    )
    fun label(value: String): String = if (russian) labels[value] ?: value else value
    fun text(english: String, ru: String): String = if (russian) ru else english
}
