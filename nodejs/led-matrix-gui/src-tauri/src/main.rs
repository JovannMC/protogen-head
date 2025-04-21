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
    use image::codecs::gif::GifDecoder;
    use image::AnimationDecoder;
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

#[command]
fn process_gif_frames_chunked(
    base64_data: String,
    panel_count: usize,
    rows: usize,
    cols: usize,
    chunk_start: usize,
    chunk_size: usize,
    direct_processing: Option<bool>,
) -> Result<String, String> {
    use image::codecs::gif::GifDecoder;
    use image::AnimationDecoder;
    use std::io::Cursor;

    // Decode base64 data
    let image_data = match general_purpose::STANDARD
        .decode(base64_data.split(",").last().unwrap_or(&base64_data))
    {
        Ok(data) => data,
        Err(err) => return Err(format!("Failed to decode base64: {}", err)),
    };

    // Create GIF decoder
    let cursor = Cursor::new(&image_data);
    let decoder = match GifDecoder::new(cursor) {
        Ok(decoder) => decoder,
        Err(err) => return Err(format!("Failed to decode GIF: {}", err)),
    };

    // Get frames iterator
    let frames_iter = decoder.into_frames();
    let frames: Vec<_> = frames_iter.collect();

    // Return total frame count if requested
    if chunk_size == 0 {
        return Ok(format!("{{ \"total_frames\": {} }}", frames.len()));
    }

    // Calculate end position for this chunk
    let chunk_end = std::cmp::min(chunk_start + chunk_size, frames.len());
    if chunk_start >= frames.len() {
        return Err(format!(
            "Chunk start {} exceeds total frames {}",
            chunk_start,
            frames.len()
        ));
    }

    // Process just the requested chunk of frames
    let mut chunk_frames = Vec::new();

    // Check if we should process the pixels directly
    let direct_processing = direct_processing.unwrap_or(false);

    for frame_index in chunk_start..chunk_end {
        match &frames[frame_index] {
            Ok(frame) => {
                let buffer = frame.buffer();
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

                            // If direct processing, convert RGB to integer on Rust side
                            if direct_processing {
                                let value = ((r as u32) << 16) | ((g as u32) << 8) | (b as u32);
                                row.push(value);
                            } else {
                                // Keep original format
                                row.push(r.into());
                                row.push(g.into());
                                row.push(b.into());
                            }
                        }
                        panel_matrix.push(row);
                    }
                    panels_data.push(panel_matrix);
                }
                chunk_frames.push(panels_data);
            }
            Err(err) => {
                return Err(format!(
                    "Failed to decode GIF frame {}: {}",
                    frame_index, err
                ))
            }
        }
    }
    // Return data for this chunk
    match serde_json::to_string(&chunk_frames) {
        Ok(json) => Ok(json),
        Err(err) => Err(format!("Failed to serialize GIF chunk data: {}", err)),
    }
}

#[command]
fn process_gif_from_path(
    file_path: String,
    panel_count: usize,
    rows: usize,
    cols: usize,
    chunk_start: Option<usize>,
    chunk_size: Option<usize>,
    get_frame_count: Option<bool>
) -> Result<String, String> {
    use image::codecs::gif::GifDecoder;
    use image::AnimationDecoder;
    use std::fs::File;
    use std::io::BufReader;
    
    // Open the file directly
    let file = match File::open(&file_path) {
        Ok(file) => file,
        Err(err) => return Err(format!("Failed to open GIF file: {}", err)),
    };
    
    // Create a buffered reader for better performance
    let reader = BufReader::new(file);
    
    // Create GIF decoder
    let decoder = match GifDecoder::new(reader) {
        Ok(decoder) => decoder,
        Err(err) => return Err(format!("Failed to decode GIF: {}", err)),
    };
    
    // Get all frames
    let frames = match decoder.into_frames().collect_frames() {
        Ok(frames) => frames,
        Err(err) => return Err(format!("Failed to collect GIF frames: {}", err)),
    };
    
    // Return just the frame count if requested
    if get_frame_count.unwrap_or(false) {
        return Ok(format!("{{ \"total_frames\": {} }}", frames.len()));
    }
    
    // Process the requested chunk
    let chunk_start = chunk_start.unwrap_or(0);
    let chunk_size = chunk_size.unwrap_or(frames.len());
    let chunk_end = std::cmp::min(chunk_start + chunk_size, frames.len());
    
    if chunk_start >= frames.len() {
        return Err(format!("Chunk start {} exceeds total frames {}", chunk_start, frames.len()));
    }
    
    // Process just the requested chunk of frames
    let mut chunk_frames = Vec::new();
    
    for frame_index in chunk_start..chunk_end {
        let frame = &frames[frame_index];
        let buffer = frame.buffer();
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
                    
                    // Convert RGB to integer on Rust side
                    let value = ((r as u32) << 16) | ((g as u32) << 8) | (b as u32);
                    row.push(value);
                }
                panel_matrix.push(row);
            }
            panels_data.push(panel_matrix);
        }
        chunk_frames.push(panels_data);
    }
    
    // Return data for this chunk
    match serde_json::to_string(&chunk_frames) {
        Ok(json) => Ok(json),
        Err(err) => Err(format!("Failed to serialize GIF chunk data: {}", err)),
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
            decode_gif,
            process_gif_frames_chunked,
            process_gif_from_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
