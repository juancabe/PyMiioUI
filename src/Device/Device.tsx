import {
  CircleDot,
  CirclePlay,
  CirclePlus,
  CircleX,
  Loader,
  Trash2,
  Unplug,
} from "lucide-react";
import "./Device.css";
import { useEffect, useState } from "react";
import AddAction from "./AddAction";
import { invoke } from "@tauri-apps/api/core";
import { Log } from "../LogsDisplay/LogsDisplay";

export interface DeviceProps {
  device: StateDevice;
  remove_device: (name: string) => void;
}

function Device({ device, remove_device }: DeviceProps) {
  const [showAddAction, setShowAddAction] = useState(false);
  const [actionsRunning, setActionsRunning] = useState<Action[]>([]);
  const [expandedAction, setExpandedAction] = useState<Action | null>(null);

  useEffect(() => {
    console.log("showAddAction:", showAddAction);
  }, [showAddAction]);

  async function handleRunAction(device: StateDevice, action: Action) {
    setActionsRunning([...actionsRunning, action]);
    let res = await invoke("run_action", {
      deviceName: device.name,
      action,
    });
    console.log("Response:", res);
    setActionsRunning(actionsRunning.filter((a) => a !== action));
    // Dispatch new log event
    const newLog: Log = {
      message: `Ran action ${action.name} on device ${device.name}`,
      emmiter: "Device Component",
      timestamp: new Date().toISOString(),
    };
    window.dispatchEvent(new CustomEvent("newLog", { detail: newLog }));
  }

  return (
    <section className="device">
      <div className="device-row">
        {device.found ? (
          <CircleDot className="device-status found" />
        ) : (
          <Unplug className="device-status disconnected" />
        )}
        <h2>{device.name}</h2>
        <button onClick={() => remove_device(device.name)} className="delete">
          <Trash2 />
        </button>
      </div>
      <p>{device.ip}</p>
      <p>{device.deviceType}</p>
      <div className="actions-container">
        <div className="actions-header-container">
          <h3 className="actions-header">Actions</h3>
          <button className="add" onClick={() => setShowAddAction(true)}>
            <CirclePlus />
          </button>
        </div>
        <ul>
          {device.actions.map((action, index) => (
            <li key={index}>
              <button onClick={() => handleRunAction(device, action)}>
                {actionsRunning.includes(action) ? (
                  <Loader className="loader-action-icon" />
                ) : (
                  <CirclePlay className="play-action-icon" />
                )}
              </button>
              <div className="action-details-container">
                <p
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                    setExpandedAction(expandedAction === action ? null : action)
                  }
                >
                  {action.name}
                </p>
                {expandedAction == action && (
                  <div className="action-details">
                    {/* Adjust below info as needed */}
                    <p>
                      <strong>Method:</strong> {action.method}
                    </p>
                    <p>
                      <strong>Arguments:</strong>{" "}
                      {action.arguments
                        ? JSON.stringify(action.arguments)
                        : "None"}
                    </p>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
      {showAddAction && (
        <div className="modal-overlay" onClick={() => setShowAddAction(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <CircleX
              className="xSquare"
              onClick={() => setShowAddAction(false)}
            />
            <div className="modal-content">
              <AddAction device={device} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default Device;
