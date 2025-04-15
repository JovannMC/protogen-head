// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use base64::{engine::general_purpose, Engine as _};
use image::GenericImageView;
use std::fs;
use std::io::{Cursor, Write};
use tauri::command;

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

#[command]
fn decode_image(
    base64_data: String,
    panel_count: usize,
    rows: usize,
    cols: usize,
) -> Result<String, String> {
    // Decode base64 to binary
    let image_data = match general_purpose::STANDARD
        .decode(base64_data.split(",").last().unwrap_or(&base64_data))
    {
        Ok(data) => data,
        Err(err) => return Err(format!("Failed to decode base64: {}", err)),
    };

    // Create a cursor to read the image data
    let cursor = Cursor::new(&image_data);

    // Guess image format based on the binary data
    let format = match image::guess_format(&image_data) {
        Ok(format) => format,
        Err(err) => return Err(format!("Failed to determine image format: {}", err)),
    };

    // Decode the image with the detected format
    let img = match image::load(cursor, format) {
        Ok(img) => img,
        Err(err) => return Err(format!("Failed to decode image: {}", err)),
    };

    // Get dimensions of the image
    let (img_width, img_height) = img.dimensions();

    // Ensure image dimensions match our LED panels
    let expected_width = cols * panel_count;
    if img_width as usize != expected_width || img_height as usize != rows {
        return Err(format!(
            "Image dimensions do not match: got {}x{}, expected {}x{}",
            img_width, img_height, expected_width, rows
        ));
    }

    // Extract RGB data for panels
    let mut panels_data = Vec::new();

    for p in 0..panel_count {
        let mut panel_matrix = Vec::new();

        for y in 0..rows {
            let mut row = Vec::new();

            for x in (p * cols)..((p + 1) * cols) {
                let pixel = img.get_pixel(x as u32, y as u32);
                let [r, g, b] = [pixel[0], pixel[1], pixel[2]];
                row.push(vec![r, g, b]);
            }

            panel_matrix.push(row);
        }

        panels_data.push(panel_matrix);
    }

    // Convert to JSON string
    match serde_json::to_string(&panels_data) {
        Ok(json) => Ok(json),
        Err(err) => Err(format!("Failed to serialize panel data: {}", err)),
    }
}

#[command]
fn decode_gif(
    base64_data: String,
    panel_count: usize,
    rows: usize,
    cols: usize,
) -> Result<String, String> {
    use image::AnimationDecoder;
    use image::codecs::gif::GifDecoder;
    use std::io::Cursor;

    let image_data = match general_purpose::STANDARD
        .decode(base64_data.split(",").last().unwrap_or(&base64_data))
    {
        Ok(data) => data,
        Err(err) => return Err(format!("Failed to decode base64: {}", err)),
    };

    let cursor = Cursor::new(&image_data);
    let decoder = match GifDecoder::new(cursor) {
        Ok(decoder) => decoder,
        Err(err) => return Err(format!("Failed to decode GIF: {}", err)),
    };
    let frames_iter = decoder.into_frames();
    let mut frames = Vec::new();
    for frame_result in frames_iter {
        match frame_result {
            Ok(frame) => frames.push(frame.into_buffer()),
            Err(err) => return Err(format!("Failed to decode GIF frame: {}", err)),
        }
    }

    let mut all_frames = Vec::new();
    for frame in frames {
        let buffer = &frame;
        let (img_width, img_height) = buffer.dimensions();
        let expected_width = cols * panel_count;
        if img_width as usize != expected_width || img_height as usize != rows {
            return Err(format!(
                "GIF frame dimensions do not match: got {}x{}, expected {}x{}",
                img_width, img_height, expected_width, rows
            ));
        }
        let mut panels_data = Vec::new();
        for p in 0..panel_count {
            let mut panel_matrix = Vec::new();
            for y in 0..rows {
                let mut row = Vec::new();
                for x in (p * cols)..((p + 1) * cols) {
                    let pixel = buffer.get_pixel(x as u32, y as u32);
                    let [r, g, b] = [pixel[0], pixel[1], pixel[2]];
                    row.push(vec![r, g, b]);
                }
                panel_matrix.push(row);
            }
            panels_data.push(panel_matrix);
        }
        all_frames.push(panels_data);
    }
    match serde_json::to_string(&all_frames) {
        Ok(json) => Ok(json),
        Err(err) => Err(format!("Failed to serialize GIF panel data: {}", err)),
    }
}

fn main() {
    std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1"); // alternatively `WEBKIT_DISABLE_COMPOSITING_MODE` if this one is not enough
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            import_data,
            export_data,
            decode_image,
            decode_gif
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
