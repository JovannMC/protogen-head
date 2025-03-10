// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::fs;
use std::io::{self, Write};
use tauri::Manager;
use tauri_plugin_dialog::FileDialogBuilder;

#[tauri::command]
fn import_data(file_path: String) -> Result<String, String> {
    // Read the file at the given file_path
    match fs::read_to_string(&file_path) {
        Ok(contents) => Ok(contents),
        Err(err) => Err(format!("Failed to read file: {}", err)),
    }
}

#[tauri::command]
fn export_data(file_path: String, data: String) -> Result<(), String> {
    // Write the data to the file at the given file_path
    match fs::File::create(&file_path) {
        Ok(mut file) => match file.write_all(data.as_bytes()) {
            Ok(_) => Ok(()),
            Err(err) => Err(format!("Failed to write to file: {}", err)),
        },
        Err(err) => Err(format!("Failed to create file: {}", err)),
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![import_data, export_data])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
