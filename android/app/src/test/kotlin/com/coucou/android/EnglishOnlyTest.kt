package com.coucou.android

import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** English fallback and complete Russian localisation. */
class EnglishOnlyTest {
    private fun read(path: String) = File(path).readText()
    private fun entries(path: String) = Regex("""<string name="(\w+)">(.*?)</string>""").findAll(read(path)).associate { it.groupValues[1] to it.groupValues[2] }

    @Test fun theBuildIncludesEnglishAndRussianResources() {
        assertTrue(read("build.gradle.kts").contains("listOf(\"en\", \"ru\")"))
        assertTrue(read("src/main/AndroidManifest.xml").contains("localeConfig"))
        val config = read("src/main/res/xml/locales_config.xml")
        assertTrue(config.contains("android:name=\"ru\"") && config.contains("android:name=\"en\""))
    }
    @Test fun russianHasEveryEnglishResourceAndNoExtraKeys() {
        val en = entries("src/main/res/values/strings.xml")
        assertTrue(en.size >= 314)
        assertEquals(en.keys, entries("src/main/res/values-ru/strings.xml").keys)
    }
    @Test fun bothTranslationsPreserveFormatArguments() {
        val en = entries("src/main/res/values/strings.xml")
        val ru = entries("src/main/res/values-ru/strings.xml")
        fun args(text: String) = Regex("""%[0-9]+\$[sdf]""").findAll(text).map { it.value }.sorted().toList()
        for ((key, text) in en) assertEquals(key, args(text), args(ru.getValue(key)))
    }
}
