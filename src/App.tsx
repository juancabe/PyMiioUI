/// <reference types="vite-plugin-svgr/client" />
import { useEffect, useState } from "react";
import "./App.css";
import { invoke } from "@tauri-apps/api/core";
import ShowError, { ShowErrorProps } from "./ShowError/ShowError";
import Device from "./Device/Device";
import { CircleX } from "lucide-react";

function App() {
  const [devices, setDevices] = useState<StateDevice[]>([]);
  const [showError, setShowError] = useState(false);
  const [errorProps, setErrorProps] = useState<ShowErrorProps | undefined>(
    undefined
  );

  async function getDevices() {
    try {
      const fetched_devices: StateDevice[] = await invoke("get_state_devices");
      setDevices(fetched_devices);
      fetched_devices.forEach((device) => {
        console.log("Device found:", device.name);
        console.log(device);
      });
    } catch (error: unknown) {
      const errorMessage = error as string;
      console.error("Error fetching device types:", error);

      setErrorProps({
        errorName: "Error fetching device types",
        description: errorMessage,
      });
      setShowError(true);
    }
  }

  async function remove_device(name: String) {
    try {
      console.log("Removing device:", name);
      await invoke("remove_device", { name });
      console.log("Device removed:", name);
      getDevices();
    } catch (error) {
      const errorMessage = error as string;
      console.error("Error removing device:", error);

      setErrorProps({
        errorName: "Error removing device",
        description: errorMessage,
      });
      setShowError(true);
    }
  }

  useEffect(() => {
    // initial load
    getDevices();

    const handleDeviceAdded = () => {
      getDevices();
    };

    window.addEventListener("deviceAdded", handleDeviceAdded);
    return () => {
      window.removeEventListener("deviceAdded", handleDeviceAdded);
    };
  }, []);

  return (
    <div>
      <main className="container">
        <ul className="devices">
          {devices.map((device) => (
            <li className="devices-item" key={device.name}>
              <Device device={device} remove_device={remove_device} />
            </li>
          ))}
        </ul>
      </main>
      {showError && errorProps && (
        <div className="modal-overlay" onClick={() => setShowError(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <CircleX className="xSquare" onClick={() => setShowError(false)} />
            <div className="modal-content">
              <ShowError {...errorProps} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
