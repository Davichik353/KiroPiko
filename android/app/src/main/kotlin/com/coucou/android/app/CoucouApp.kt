package com.coucou.android.app

import android.app.Application

class CoucouApp : Application() {
    override fun onCreate() {
        super.onCreate()
        com.coucou.android.core.CoreLanguage.russian = resources.configuration.locales[0].language == "ru"
        com.coucou.android.mochi.KiroPainter.load(this)
    }
    val model: AppModel by lazy { AppModel(this) }
}
