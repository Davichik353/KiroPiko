# Восстановление KiroPiko после переустановки Windows

Контрольная копия: 20 октября 2026. Репозиторий: https://github.com/Davichik353/KiroPiko

## Быстро установить

1. Открыть https://github.com/Davichik353/KiroPiko/releases/tag/kiropiko-backup-2026-10-20
2. Скачать KiroPiko-Windows-setup.exe и установить. При необходимости установить Microsoft Edge WebView2 Runtime с сайта Microsoft.
3. Для Android скачать KiroPiko-Android-0.1.5-preview.apk (Android 11+). Это тестовая сборка с debug-подписью.
4. Заново ввести ключи провайдеров и связать телефон с ПК. Старые ключи не находятся в GitHub.

## Восстановить исходники

Установить Git, затем в PowerShell:

```powershell
git clone https://github.com/Davichik353/KiroPiko.git
cd KiroPiko
git status
git log -1 --oneline
```

Открыть эту папку в Codex и попросить продолжить проект. История Git, исходники, ресурсы Киро и тесты сохранены в репозитории. Локальные кеши сборки не нужны для восстановления.

## Сборка с нуля

Windows: Node.js LTS, Rust stable (MSVC), Visual Studio Build Tools с Desktop development with C++ и Windows SDK, WebView2. Из windows выполнить npm ci, npm test, npm run build, затем npm run tauri build в среде с доступным MSVC. Скрипт native-windows.ps1 содержит локальные пути старого ноутбука: на новой машине их нужно настроить или использовать обычное окружение Rust/MSVC.

Android: JDK 17, Android SDK platform 35 и build-tools, задать JAVA_HOME и ANDROID_HOME (либо local.properties с sdk.dir). Из android выполнить .\gradlew.bat testDebugUnitTest assembleDebug. Gradle Wrapper хранится в Git. SDK, JDK и node_modules скачиваются заново.

## Что не восстанавливается из GitHub

- API-ключи и токены: находятся в Windows Credential Manager, после удаления системы вводятся заново из кабинетов провайдеров.
- Локальная история, настройки, входящие файлы: %APPDATA%\Coucou и %LOCALAPPDATA%\Coucou. До очистки диска скопировать нужные данные на внешний носитель или в личное защищённое облако. Эти папки могут содержать личные сведения: не загружать их в публичный репозиторий. Обычная копия папок не переносит Credential Manager и не гарантирует перенос привязки телефона.
- История чатов Codex/Cursor/Claude и другие проекты: отдельные данные этих приложений, не часть репозитория KiroPiko.
- Android signing key: текущий APK debug-signed. Для будущих обновлений без удаления установленного приложения сохранить лично %USERPROFILE%\.android\debug.keystore, если он использовался сборкой. Не публиковать ключ. Без него на новой машине может потребоваться удалить старый APK и установить новый с потерей локальных данных приложения.

Проверки этой копии: Windows 443 теста прошли; frontend build прошёл; Android testDebugUnitTest и assembleDebug прошли. Это не гарантия отсутствия всех ошибок. Последнее изменение движения кубиков ещё не проверено визуально на физическом телефоне.
