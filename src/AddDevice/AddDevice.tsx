import { useEffect, useState, FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./AddDevice.css";
import { Loader } from "lucide-react";

function AddDevice() {
  const [deviceName, setDeviceName] = useState<string>("");
  const [deviceType, setDeviceType] = useState<string>("");
  const [deviceIP, setDeviceIP] = useState<string>("");
  const [deviceToken, setDeviceToken] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [deviceTypes, setDeviceTypes] = useState<string[]>([]);
  const [addingDevice, setAddingDevice] = useState<boolean>(false);

  useEffect(() => {
    async function getDeviceTypes() {
      try {
        const types = await invoke("get_device_types");
        setDeviceTypes(types as string[]);
      } catch (error) {
        console.error("Error fetching device types:", error);
      }
    }
    getDeviceTypes();
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      setAddingDevice(true);
      let res: StateDevice = await invoke("add_device", {
        ip: deviceIP,
        token: deviceToken,
        deviceType: deviceType,
        name: deviceName,
      });
      if (res.found) {
        setMessage("Device added successfully!");
      } else {
        setMessage("Error while connecting to device, added to saved devices");
      }

      // Clear fields
      setDeviceName("");
      setDeviceType("");
      setDeviceIP("");
      setDeviceToken("");

      // Dispatch an event to notify that a device was added
      window.dispatchEvent(new CustomEvent("deviceAdded"));
    } catch (error) {
      console.error("Error adding device:", error);
      setMessage("Failed to add device: " + error);
    }
    setAddingDevice(false);
  }

  return (
    <section className="add-device-container">
      <h2>Add Device</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <input
            type="text"
            id="deviceName"
            placeholder="Device Name"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            required
          />
        </div>
        <div>
          <select
            id="deviceType"
            value={deviceType}
            onChange={(e) => setDeviceType(e.target.value)}
            required
          >
            <option value="" disabled>
              Select a device type
            </option>
            {deviceTypes.map((type, index) => (
              <option key={index} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <input
            type="text"
            id="deviceIP"
            placeholder="Device IP"
            value={deviceIP}
            onChange={(e) => setDeviceIP(e.target.value)}
            required
          />
        </div>
        <div>
          <input
            type="text"
            id="deviceToken"
            placeholder="Device Token"
            value={deviceToken}
            onChange={(e) => setDeviceToken(e.target.value)}
            required
          />
        </div>
        <button type="submit">
          {addingDevice ? (
            <Loader className="loader-action-icon" />
          ) : (
            <span>Add Device</span>
          )}
        </button>
      </form>
      {message && <p>{message}</p>}
    </section>
  );
}

export default AddDevice;
