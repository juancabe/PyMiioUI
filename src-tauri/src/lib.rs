use rust_py_miio;
use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_store::StoreExt;

struct AppState {
    device_types: Option<Vec<String>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self { device_types: None }
    }
}

enum UserSettings {}

#[tauri::command]
fn greet(_name: &str) -> String {
    let res = rust_py_miio::get_device_types()
        .unwrap_or_else(|err| Vec::from(["Error:".to_string() + err.to_string().as_str()]));
    format!("I dont care, this is the output: \n {:?}", res)
}

#[tauri::command]
fn get_device_types(state: tauri::State<'_, Mutex<AppState>>) -> Vec<String> {
    let state = state.lock().unwrap();
    state.device_types.clone().unwrap_or_default()
}

#[tauri::command]
fn update_device_types(state: tauri::State<'_, Mutex<AppState>>) {
    let mut state = state.lock().unwrap();
    state.device_types = rust_py_miio::get_device_types().ok();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            app.manage(Mutex::new(AppState::default()));

            let state = app.state::<Mutex<AppState>>();
            let mut state = state.lock().unwrap();

            state.device_types = rust_py_miio::get_device_types().ok();

            let settings_store = app.store("user-settings.json")?;

            let devices_store = app.store("devices.json")?;

            settings_store.close_resource();
            devices_store.close_resource();

            Ok(())
        })
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_device_types,
            update_device_types
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
