// iPOST CRM ish stoli ilovasi (Tauri v2).
// Mavjud React (Vite) ilovasini o'rab, Windows .exe / macOS .dmg sifatida
// ishga tushiradi. Telefon liniyasi ilovaning o'ziga o'rnatilgan (SIP/WebRTC) —
// tashqi dastur kerak emas.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("Tauri ilovasini ishga tushirishda xato");
}
