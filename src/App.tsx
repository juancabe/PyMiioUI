import { useEffect, useState } from "react";
import "./App.css";
import { invoke } from "@tauri-apps/api/core";

function App() {

  const [devices, setDevices] = useState<StateDevice[]>([])

  async function getDevices() {
    try {
      const fetched_devices: StateDevice[] = await invoke("get_state_devices");
      setDevices(fetched_devices);
      fetched_devices.forEach((device) => {
        console.log("Device found:", device.name);
      })
    } catch (error) {
      console.error("Error fetching device types:", error);
    }
  }

  useEffect(() => {
    getDevices();
  }, []);

  return (
    <main className="container">
      <h1>Your devices</h1>
      <ul>
        {devices.map((device) => (
          <li key={device.ip}>
            <h2>{device.name}</h2>
            <p>{device.ip}</p>
            <p>{device.deviceType}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}

export default App;
