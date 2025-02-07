use rust_py_miio;
use serde::{ser::SerializeStruct, Serialize};
use serde_json;
use std::sync::Mutex;
use tauri::{Manager, State};
use tauri_plugin_store::StoreExt;

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct StoreDevice {
    name: String,
    ip: String,
    token: String,
    device_type: String,
}

impl StoreDevice {
    fn new(name: String, ip: String, token: String, device_type: String) -> Self {
        Self {
            name,
            ip,
            token,
            device_type,
        }
    }
}
#[derive(Clone)]
struct StateDevice {
    store_device: StoreDevice,
    device: Option<rust_py_miio::Device>,
}

impl StateDevice {
    fn from(store_device: StoreDevice, device: Option<rust_py_miio::Device>) -> Self {
        Self {
            store_device,
            device,
        }
    }
}

impl serde::Serialize for StateDevice {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let mut state_device = serializer.serialize_struct("StateDevice", 4)?;
        state_device.serialize_field("name", &self.store_device.name)?;
        state_device.serialize_field("ip", &self.store_device.ip)?;
        state_device.serialize_field("token", &self.store_device.token)?;
        state_device.serialize_field("deviceType", &self.store_device.device_type)?;
        state_device.serialize_field("found", &self.device.is_some())?;
        state_device.end()
    }
}

struct AppState {
    device_types: Option<Vec<String>>,
    loaded_devices: Option<Vec<StateDevice>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            device_types: None,
            loaded_devices: None,
        }
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
fn get_state_devices(state: tauri::State<'_, Mutex<AppState>>) -> Vec<StateDevice> {
    let state = state.lock().unwrap();
    state.loaded_devices.clone().unwrap_or_default()
}

#[tauri::command]
fn get_device_types(state: tauri::State<'_, Mutex<AppState>>) -> Result<Vec<String>, String> {
    let state = state
        .lock()
        .map_err(|err| format!("Locking state, try again or restart: {}", err.to_string()))?;
    Ok(state.device_types.clone().unwrap_or_default())
}

#[tauri::command]
fn update_device_types(state: tauri::State<'_, Mutex<AppState>>) -> Result<(), String> {
    let mut state = state
        .lock()
        .map_err(|err| format!("Locking state, try again or restart: {}", err.to_string()))?;
    state.device_types = rust_py_miio::get_device_types().ok();
    Ok(())
}

#[tauri::command]
fn add_device(
    state: tauri::State<'_, Mutex<AppState>>,
    app: tauri::AppHandle,
    ip: String,
    token: String,
    device_type: String,
    name: String,
) -> Result<StateDevice, String> {
    // Check if device name already exists
    let devices_store = app.store("devices.json").map_err(|err| {
        format!(
            "Opening devices store, try again or restart: {}",
            err.to_string()
        )
    })?;
    if devices_store.has(&name) {
        return Err("Device name already exists".to_string());
    }

    let device: Option<rust_py_miio::Device> =
        rust_py_miio::Device::create_device(&ip, &token, &device_type)
            .map_err(|err| format!("Creating device: {}", err))
            .ok();

    // Store the device in devices_store.
    devices_store.set(
        &name,
        serde_json::to_string(&StoreDevice::new(
            name.clone(),
            ip.clone(),
            token.clone(),
            device_type.clone(),
        ))
        .map_err(|err| format!("Serializing device: {}", err))?,
    );

    let state_device = StateDevice::from(
        StoreDevice::new(name.clone(), ip.clone(), token.clone(), device_type.clone()),
        device.clone(),
    );

    // Update state by ensuring a Vec of StateDevice exists using get_or_insert_with.
    let mut state = state
        .lock()
        .map_err(|err| format!("Locking state, try again or restart: {}", err.to_string()))?;
    state
        .loaded_devices
        .get_or_insert_with(|| Vec::new())
        .push(state_device);

    let state_device = StateDevice::from(
        StoreDevice::new(name.clone(), ip.clone(), token.clone(), device_type.clone()),
        device,
    );

    devices_store.close_resource();

    Ok(state_device)
}

fn state_devices_from_entries<'a>(
    entries: &'a [(String, serde_json::Value)],
) -> impl Iterator<Item = StateDevice> + 'a {
    entries
        .iter()
        .filter_map(|(_k, v)| {
            v.as_str()
                .and_then(|s| serde_json::from_str::<StoreDevice>(s).ok())
        })
        .map(|store_device| {
            let connected = rust_py_miio::Device::create_device(
                &store_device.ip,
                &store_device.token,
                &store_device.device_type,
            )
            .ok();
            StateDevice::from(store_device, connected)
        })
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

            // Load devices from devices_store.
            let entries: Vec<(String, serde_json::Value)> = devices_store.entries();
            // Save the devices in state.
            println!("Loading devices from store");
            state_devices_from_entries(&entries).for_each(|sd| {
                println!("Loaded device: {:?}", sd.store_device.name);
                state
                    .loaded_devices
                    .get_or_insert_with(|| Vec::new())
                    .push(sd);
            });

            settings_store.close_resource();
            devices_store.close_resource();

            Ok(())
        })
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_device_types,
            update_device_types,
            add_device,
            get_state_devices
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
