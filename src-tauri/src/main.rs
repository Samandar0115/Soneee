// Windows release rejimida konsol oynasi ochilmasligi uchun
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    ipost_crm_lib::run()
}
