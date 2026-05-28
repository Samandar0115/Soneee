// iPOST CRM ish stoli ilovasi (Tauri v2).
// Mavjud React (Vite) ilovasini o'rab, Windows .exe sifatida ishga tushiradi.
// MicroSIP bundle qilinadi (resources/microsip) va ilova ochilganda fonda
// avtomatik ishga tushiriladi.

use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::Manager;

// Bundle qilingan MicroSIP papkasidagi birinchi .exe faylni topadi
fn find_microsip(app: &tauri::AppHandle) -> Option<PathBuf> {
    let resource_dir = app.path().resource_dir().ok()?;
    let dir = resource_dir.join("microsip");
    if !dir.exists() {
        return None;
    }
    // Avval keng tarqalgan nomlarni sinab ko'ramiz
    for name in ["microsip.exe", "MicroSIP.exe", "MicroSIPPortable.exe"] {
        let p = dir.join(name);
        if p.exists() {
            return Some(p);
        }
    }
    // Bo'lmasa — papkadagi har qanday .exe ni olamiz
    let entries = fs::read_dir(&dir).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()).map(|e| e.eq_ignore_ascii_case("exe")).unwrap_or(false) {
            return Some(path);
        }
    }
    None
}

// MicroSIP'ni ishga tushiradi (allaqachon ochiq bo'lsa, Windows ikkinchisini ochmaydi)
#[tauri::command]
fn launch_microsip(app: tauri::AppHandle) -> Result<String, String> {
    match find_microsip(&app) {
        Some(exe) => {
            Command::new(&exe)
                .spawn()
                .map_err(|e| format!("MicroSIP ishga tushmadi: {}", e))?;
            Ok(format!("MicroSIP ishga tushdi: {}", exe.display()))
        }
        None => Err("MicroSIP topilmadi (src-tauri/microsip/ ichiga MicroSIP portable joylang)".into()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![launch_microsip])
        .setup(|app| {
            // Ilova ochilganda MicroSIP'ni fonda avtomatik ishga tushiramiz.
            // Xato bo'lsa (masalan, MicroSIP joylanmagan) — jim o'tkazamiz.
            let handle = app.handle().clone();
            let _ = launch_microsip(handle);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Tauri ilovasini ishga tushirishda xato");
}
