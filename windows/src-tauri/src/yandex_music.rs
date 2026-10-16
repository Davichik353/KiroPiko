//! Local adapter for the installed Yandex Music player's own accessible buttons.
//! No account API, global keys, screen coordinates or process injection.
#[cfg(windows)]
mod native {
    use windows::core::{BOOL, PWSTR};
    use windows::Win32::Foundation::{CloseHandle, HWND, LPARAM};
    use windows::Win32::System::Com::{CoCreateInstance, CLSCTX_INPROC_SERVER};
    use windows::Win32::System::Threading::{OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION};
    use windows::Win32::System::Variant::VARIANT;
    use windows::Win32::UI::Accessibility::*;
    use windows::Win32::UI::WindowsAndMessaging::{EnumWindows, GetWindowThreadProcessId, IsWindowVisible};

    unsafe extern "system" fn collect(hwnd: HWND, param: LPARAM) -> BOOL {
        if !unsafe { IsWindowVisible(hwnd) }.as_bool() { return BOOL(1); }
        let mut pid = 0;
        unsafe { GetWindowThreadProcessId(hwnd, Some(&mut pid)) };
        if let Ok(process) = unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) } {
            let mut path = [0u16; 32768];
            let mut len = path.len() as u32;
            let valid = unsafe { QueryFullProcessImageNameW(process, PROCESS_NAME_WIN32, PWSTR(path.as_mut_ptr()), &mut len) }.is_ok()
                && String::from_utf16_lossy(&path[..len as usize]).to_lowercase().ends_with("\\programs\\yandexmusic\\яндекс музыка.exe");
            let _ = unsafe { CloseHandle(process) };
            if valid { unsafe { &mut *(param.0 as *mut Vec<HWND>) }.push(hwnd); }
        }
        BOOL(1)
    }

    pub fn button(action: &str, invoke: bool) -> Result<bool, String> {
        let names: &[&str] = match action {
            "shuffle" => &["В случайном порядке", "Shuffle"],
            "repeat" => &["Повтор", "Repeat"],
            _ => return Err("Неизвестная команда Яндекс Музыки.".into()),
        };
        let mut windows = Vec::new();
        unsafe { EnumWindows(Some(collect), LPARAM(&mut windows as *mut Vec<HWND> as isize)) }.map_err(|e| e.to_string())?;
        let automation: IUIAutomation = unsafe { CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER) }.map_err(|e| e.to_string())?;
        let kind = unsafe { automation.CreatePropertyCondition(UIA_ControlTypePropertyId, &VARIANT::from(UIA_ButtonControlTypeId.0)) }.map_err(|e| e.to_string())?;
        for hwnd in windows {
            let Ok(root) = (unsafe { automation.ElementFromHandle(hwnd) }) else { continue };
            for name in names {
                let condition = unsafe { automation.CreatePropertyCondition(UIA_NamePropertyId, &VARIANT::from(*name)) }.map_err(|e| e.to_string())?;
                let condition = unsafe { automation.CreateAndCondition(&kind, &condition) }.map_err(|e| e.to_string())?;
                let Ok(element) = (unsafe { root.FindFirst(TreeScope_Descendants, &condition) }) else { continue };
                if !unsafe { element.CurrentIsEnabled() }.is_ok_and(|v| v.as_bool()) { continue; }
                let Ok(pattern) = (unsafe { element.GetCurrentPatternAs::<IUIAutomationInvokePattern>(UIA_InvokePatternId) }) else { continue };
                if invoke { unsafe { pattern.Invoke() }.map_err(|e| format!("Яндекс Музыка не приняла команду: {e}"))?; }
                return Ok(true);
            }
        }
        if invoke { Err("Кнопка Яндекс Музыки недоступна. Откройте приложение и выберите плейлист. После обновления приложения адаптеру может потребоваться обновление.".into()) }
        else { Ok(false) }
    }
}

pub fn is_yandex(source: &str) -> bool { source == "ru.yandex.desktop.music" }

/// Called on a COM-initialized worker, only for the exact desktop app ID.
pub fn button(action: &str, invoke: bool) -> Result<bool, String> {
    #[cfg(windows)] { native::button(action, invoke) }
    #[cfg(not(windows))] { let _ = (action, invoke); Ok(false) }
}
