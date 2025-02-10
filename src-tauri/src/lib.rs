use rust_py_miio;
use serde::{de, ser::SerializeStruct};
use serde_json;
use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_store::StoreExt;

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct Argument {
    name: String,
    value: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct Action {
    name: String,
    method: String,
    arguments: Vec<Argument>,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct StoreDevice {
    name: String,
    ip: String,
    token: String,
    device_type: String,
    actions: Vec<Action>,
}

impl StoreDevice {
    fn new(
        name: String,
        ip: String,
        token: String,
        device_type: String,
        actions: Vec<Action>,
    ) -> Self {
        Self {
            name,
            ip,
            token,
            device_type,
            actions,
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
#[derive(serde::Serialize)]
struct Method {
    name: String,
    signature: String,
}

impl serde::Serialize for StateDevice {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let mut state_device = serializer.serialize_struct("StateDevice", 7)?;
        state_device.serialize_field("name", &self.store_device.name)?;
        state_device.serialize_field("ip", &self.store_device.ip)?;
        state_device.serialize_field("token", &self.store_device.token)?;
        state_device.serialize_field("deviceType", &self.store_device.device_type)?;
        state_device.serialize_field("found", &self.device.is_some())?;
        state_device.serialize_field(
            "methods",
            &self.device.as_ref().map_or_else(
                || Vec::new(),
                |d| {
                    let mut v = Vec::new();
                    d.callable_methods.iter().for_each(|m| {
                        v.push(Method {
                            name: m.0.clone(),
                            signature: m.1.clone(),
                        });
                    });
                    v
                },
            ),
        )?;
        state_device.serialize_field("actions", &self.store_device.actions)?;
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
async fn remove_action(
    app: tauri::AppHandle,
    state: tauri::State<'_, Mutex<AppState>>,
    device_name: String,
    action_name: String,
) -> Result<(), String> {
    let devices_store = app.store("devices.json").map_err(|err| {
        format!(
            "Opening devices store, try again or restart: {}",
            err.to_string()
        )
    })?;

    let mut state = state
        .lock()
        .map_err(|err| format!("Locking state, try again or restart: {}", err.to_string()))?;

    let device = state
        .loaded_devices
        .as_mut()
        .ok_or_else(|| "No devices loaded".to_string())?
        .iter_mut()
        .find(|sd| sd.store_device.name == device_name)
        .ok_or_else(|| "Device not found".to_string())?;

    let action_index = device
        .store_device
        .actions
        .iter()
        .position(|a| a.name == action_name)
        .ok_or_else(|| "Action not found".to_string())?;

    device.store_device.actions.remove(action_index);

    devices_store.set(
        &device_name,
        serde_json::to_string(&device.store_device).map_err(|err| {
            format!(
                "Serializing device: {}, try again or restart",
                err.to_string()
            )
        })?,
    );

    Ok(())
}

#[tauri::command]
async fn add_action(
    state: tauri::State<'_, Mutex<AppState>>,
    app: tauri::AppHandle,
    device_name: String,
    action: Action,
) -> Result<(), String> {
    let devices_store = app.store("devices.json").map_err(|err| {
        format!(
            "Opening devices store, try again or restart: {}",
            err.to_string()
        )
    })?;

    let mut state = state
        .lock()
        .map_err(|err| format!("Locking state, try again or restart: {}", err.to_string()))?;

    let device = state
        .loaded_devices
        .as_mut()
        .ok_or_else(|| "No devices loaded".to_string())?
        .iter_mut()
        .find(|sd| sd.store_device.name == device_name)
        .ok_or_else(|| "Device not found".to_string())?;

    if device
        .store_device
        .actions
        .iter()
        .any(|a| a.name == action.name)
    {
        return Err("Action name already exists".to_string());
    }

    device.store_device.actions.push(action.clone());

    devices_store.set(
        &device_name,
        serde_json::to_string(&device.store_device).map_err(|err| {
            format!(
                "Serializing device: {}, try again or restart",
                err.to_string()
            )
        })?,
    );

    Ok(())
}

#[tauri::command]
async fn run_action(
    state: tauri::State<'_, Mutex<AppState>>,
    device_name: String,
    action: Action,
) -> Result<String, String> {
    let state = state.lock().unwrap();
    let device = state
        .loaded_devices
        .as_ref()
        .ok_or_else(|| "No devices loaded".to_string())?
        .iter()
        .find(|sd| sd.store_device.name == device_name)
        .ok_or_else(|| "Device not found".to_string())?;

    let device = device
        .device
        .as_ref()
        .ok_or_else(|| "Device not connected".to_string())?;

    let res = device
        .call_method(
            &action.method,
            action.arguments.iter().map(|a| a.value.as_str()).collect(),
        )
        .map_err(|err| format!("Error calling method: {}", err))?;
    Ok(res)
}

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
    let mut dvs = state
        .lock()
        .map_err(|err| format!("Locking state, try again or restart: {}", err.to_string()))?
        .device_types
        .clone()
        .unwrap_or_default();
    dvs.sort();
    Ok(dvs)
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
async fn remove_device(
    state: tauri::State<'_, Mutex<AppState>>,
    app: tauri::AppHandle,
    name: String,
) -> Result<(), String> {
    eprintln!("Removing device: {}", name);
    let devices_store = app.store("devices.json").map_err(|err| {
        format!(
            "Opening devices store, try again or restart: {}",
            err.to_string()
        )
    })?;

    let mut err_msg = "COMPLETLY UNEXPECTED"; // This should never be seen

    // Delete from store
    let store_deleted = devices_store.delete(&name);
    if !store_deleted {
        err_msg = "Device not found on store";
    }

    // Delete from state
    let mut state_deleted = false;

    let mut app_state = state
        .lock()
        .map_err(|err| format!("Locking state, try again or restart: {}", err.to_string()))?;

    if let Some(ref mut state_devices) = app_state.loaded_devices {
        state_devices.retain(|sd| {
            if sd.store_device.name == name {
                if state_deleted {
                    eprintln!("Device found twice: {}", name);
                    return false;
                }
                state_deleted = true;
                false
            } else {
                true
            }
        });
    }

    if !state_deleted {
        err_msg = "Device not found on state";
    }

    if store_deleted && state_deleted {
        eprintln!("Device removed: {}", name);
        return Ok(());
    } else if !(store_deleted || state_deleted) {
        eprintln!("Device not found: {}", name);
        return Err("Device not found".to_string());
    } else {
        eprintln!("Unexpected Error removing device");
        return Err("Unexpected Error removing device: ".to_string() + err_msg);
    }
}

#[tauri::command]
async fn add_device(
    state: tauri::State<'_, Mutex<AppState>>,
    app: tauri::AppHandle,
    ip: String,
    token: String,
    device_type: String,
    name: String,
) -> Result<StateDevice, String> {
    // Check if device name already exists
    eprintln!("Adding device: {}", name);
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
            Vec::new(),
        ))
        .map_err(|err| format!("Serializing device: {}", err))?,
    );

    let state_device = StateDevice::from(
        StoreDevice::new(
            name.clone(),
            ip.clone(),
            token.clone(),
            device_type.clone(),
            Vec::new(),
        ),
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
        StoreDevice::new(
            name.clone(),
            ip.clone(),
            token.clone(),
            device_type.clone(),
            Vec::new(),
        ),
        device,
    );

    eprintln!("Device added: {}", name);
    Ok(state_device)
}

/// Reloads a device from the state. Preserving everything but the Option<Device>, which is updated.
#[tauri::command]
async fn reload_device(
    state: tauri::State<'_, Mutex<AppState>>,
    device_name: &str,
) -> Result<StateDevice, String> {
    let mut state = state.lock().unwrap();
    let state_device = state
        .loaded_devices
        .as_mut()
        .ok_or_else(|| "No devices loaded".to_string())?
        .iter_mut()
        .find(|sd| sd.store_device.name == device_name)
        .ok_or_else(|| "Device not found".to_string())?;

    let device = rust_py_miio::Device::create_device(
        &state_device.store_device.ip,
        &state_device.store_device.token,
        &state_device.store_device.device_type,
    )
    .map_err(|err| format!("Creating device: {}", err))
    .ok();

    state_device.device = device;

    Ok(state_device.clone())
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
        .plugin(tauri_plugin_dialog::init())
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

            Ok(())
        })
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_device_types,
            update_device_types,
            add_device,
            get_state_devices,
            remove_device,
            add_action,
            run_action,
            reload_device,
            remove_action
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
