# KiroPiko

KiroPiko — компактный AI-компаньон для Windows с Android-приложением. Киро показывает состояние агентов, помогает отвечать на запросы и открывает чат с подключёнными моделями.

**Стадия: рабочий прототип / preview.** Публичная готовность и все внешние интеграции пока не подтверждены. macOS/iOS/Linux из исходного репозитория сохранены, но ребрендинг и тестирование KiroPiko для них не выполнены.

[Скачать тестовые сборки Windows и Android](https://github.com/Davichik353/KiroPiko/releases/tag/kiropiko-preview-2026-10-16).

## Версии KiroPiko

| Дата | Windows | Android | Изменения |
| --- | --- | --- | --- |
| 2026-10-16 | 0.4.2 | 0.1.2-preview | Новая палитра, отчёты, обновления и виджет решений |
| 2026-10-16 | 0.4.1 | 0.1.1-preview | Общий гардероб и отдельные костюмы для позы сна |

## Возможности

- Капсула вверху экрана, персонаж, гардероб, размеры и тихий режим.
- Сессии агентов, запросы разрешений, вопросы, файлы и изменения кода.
- Чат: Anthropic, Google Gemini, OpenAI, OpenRouter, Groq и совместимые локальные/собственные серверы. Нужны доступные модели и ключи соответствующих сервисов.
- Android 11+: связь с компьютером по QR, чат и разрешённые компьютером данные; русский и английский интерфейс.
- Музыка через медиасессии Windows, диагностика только для чтения, история и дополнительные инструменты.

Наличие кода не означает успешную проверку каждой интеграции. [Результаты последней проверки](startup/FINAL-VALIDATION.md) и [ограничения](KIROPIKO-STATUS.md).

## Запуск Windows

Требуются Node.js/npm, Rust MSVC и Visual Studio C++ Build Tools. В PowerShell из папки `windows`:

```powershell
npm ci
powershell -NoProfile -File .\scripts\native-windows.ps1 -BuildToolsPath "D:\BuildTools" -Action dev
```

Для других установок Build Tools укажите свой путь. Локальный вспомогательный скрипт может использовать Rust из `.tools` рядом с репозиторием; если такой установки нет, нужен Cargo в PATH или `%USERPROFILE%\.cargo\bin`.

```powershell
npm test
npm run check:preserved
powershell -NoProfile -File .\scripts\native-windows.ps1 -Action test
powershell -NoProfile -File .\scripts\native-windows.ps1 -Action build
```

## Android

Сборка требует JDK 17 и установленного Android SDK; конкретные версии заданы в Gradle. Из `android`:

```powershell
node scripts/gen-strings.mjs --check
.\gradlew.bat testDebugUnitTest assembleDebug lintDebug
```

APK появляется в `android/app/build/outputs/apk/debug/`. Это debug-сборка для проверки, не магазинный релиз. [Инструкция подключения](android/PHONE-TESTING.ru.md). Телефон и ноутбук для локального подключения должны быть в одной сети; доступы к чату и данным включаются отдельно на компьютере.

## Ключи и личные данные

Ключи вводятся в настройках компьютера и хранятся через существующее системное хранилище credentials. Не добавляйте ключи, пользовательские настройки, отчёты системы, снимки рабочего стола, сертификаты пары и файлы подписи в Git. Локальные установщики, APK и снимки проверки исключены из исходников. Историю изменений и материалы заявки можно хранить в приватном репозитории; доступ экспертов предоставляется владельцем отдельно.

## Происхождение и лицензии

KiroPiko основан на [Coucou](https://github.com/Louis-CFM/coucou) Louis Raillé и других участников. Исходная история, LICENSE, NOTICE и платформенные сведения об авторстве сохранены. Описание исходного Coucou находится в [README-COUCOU.md](README-COUCOU.md); оно не является перечнем проверенных функций KiroPiko. Сведения о собственных Android-ресурсах: [android/ASSETS.md](android/ASSETS.md).

## Материалы стартапа

[Черновик заявки UzCombinator](startup/UZCOMBINATOR-DRAFT.ru.md) содержит описание прототипа, план пилота и приоритетные идеи. Пользователи, выручка и инвестиции не заявляются без подтверждения основателя.
