import {
  Bomb,
  CircleDot,
  CirclePlay,
  CirclePlus,
  CircleX,
  Loader,
  PlugZap,
  RefreshCcw,
  Trash2,
  Unplug,
} from "lucide-react";
import "./Device.css";
import { useEffect, useRef, useState } from "react";
import AddAction from "./AddAction";
import { invoke } from "@tauri-apps/api/core";
import { ask } from "@tauri-apps/plugin-dialog";
import { Log } from "../LogsDisplay/LogsDisplay";

export interface DeviceProps {
  device: StateDevice;
  remove_device: (name: string) => void;
  set_device: (device: StateDevice) => void;
}

function Device({ device, remove_device, set_device }: DeviceProps) {
  const [showAddAction, setShowAddAction] = useState(false);
  const [actionsRunning, setActionsRunning] = useState<Action[]>([]);
  const [expandedAction, setExpandedAction] = useState<Action | null>(null);
  const [reloadingDevice, setReloadingDevice] = useState(false);
  const [ip, setIP] = useState(device.ip);

  const [ipEditable, setIpEditable] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    console.log("showAddAction:", showAddAction);
  }, [showAddAction]);

  async function handleRemoveDevice() {
    const isConfirmed = await ask(
      "Are you sure you want to remove the device?",
      {
        title: "Confirm removal",
        kind: "warning",
      }
    );
    if (isConfirmed) {
      remove_device(device.name);
    }
  }

  async function handleRunAction(device: StateDevice, action: Action) {
    setActionsRunning((prev) => [...prev, action]);
    let res = await invoke("run_action", {
      deviceName: device.name,
      action,
    });
    console.log("Response:", res);
    setActionsRunning((prev) => prev.filter((a) => a !== action));
    const newLog: Log = {
      message: `[${action.name}]: ${res}`,
      emmiter: device.name,
      timestamp: new Date().toISOString(),
    };
    window.dispatchEvent(new CustomEvent("newLog", { detail: newLog }));
  }

  async function handleRemoveAction(device: StateDevice, action: Action) {
    let newLog;
    try {
      await invoke("remove_action", {
        deviceName: device.name,
        actionName: action.name,
      });
      device.actions = device.actions.filter((a) => a !== action);
      set_device(device);
      newLog = {
        message: `Removed action ${action.name} from device ${device.name}`,
        emmiter: `${device.name}`,
        timestamp: new Date().toISOString(),
      };
    } catch (e) {
      console.error(e);
      newLog = {
        message: `Error removing action ${action.name} from device ${device.name}`,
        emmiter: "Device Component",
        timestamp: new Date().toISOString(),
      };
    }
    window.dispatchEvent(new CustomEvent("newLog", { detail: newLog }));
  }

  async function handleReloadDevice(device: StateDevice) {
    try {
      setReloadingDevice(true);
      device = await invoke("reload_device", {
        deviceName: device.name,
      });
      set_device(device);
    } catch (e) {
      console.error(e);
    }
    setReloadingDevice(false);
  }

  async function handleUpdateDeviceIP(device: StateDevice) {
    try {
      console.log("Updating device IP...");
      setReloadingDevice(true);
      device = await invoke("update_device_ip", {
        deviceName: device.name,
        ip,
      });
      console.log("Device updated:", device);
      set_device(device);
    } catch (e) {
      console.error(e);
    }
    setReloadingDevice(false);
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
        <button onClick={handleRemoveDevice} className="delete">
          <Trash2 />
        </button>
      </div>
      <div className="ip-container">
        <input
          value={ip}
          readOnly={!ipEditable}
          onChange={(e) => setIP(e.target.value)}
          onMouseDown={() => {
            // start a timer for 2 seconds on mousedown
            pressTimer.current = setTimeout(() => {
              setIpEditable(true);
            }, 2000);
          }}
          onMouseUp={() => {
            // cancel timer if released before 2 seconds
            if (pressTimer.current) {
              clearTimeout(pressTimer.current);
              pressTimer.current = null;
            }
          }}
          onMouseLeave={() => {
            // cancel timer if leaving the input area
            if (pressTimer.current) {
              clearTimeout(pressTimer.current);
              pressTimer.current = null;
            }
          }}
          onBlur={async () => {
            // When leaving, disable editing and update device IP
            setIpEditable(false);
            await handleUpdateDeviceIP(device);
          }}
        />
        {reloadingDevice ? (
          <button>
            <Loader className="loader-action-icon" />
          </button>
        ) : (
          <button onClick={() => handleReloadDevice(device)}>
            {device.found ? (
              <RefreshCcw className="remove-action-icon" />
            ) : (
              <PlugZap className="remove-action-icon" />
            )}
          </button>
        )}
      </div>
      <p className="device-type">{device.deviceType}</p>
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
              <div className="action-buttons-container">
                <button onClick={() => handleRunAction(device, action)}>
                  {actionsRunning.includes(action) ? (
                    <Loader className="loader-action-icon" />
                  ) : (
                    <CirclePlay className="play-action-icon" />
                  )}
                </button>
                {expandedAction === action && (
                  <button onClick={() => handleRemoveAction(device, action)}>
                    <Bomb className="remove-action-icon" />
                  </button>
                )}
              </div>
              <div className="action-details-container">
                <p
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                    setExpandedAction(expandedAction === action ? null : action)
                  }
                >
                  {action.name}
                </p>
                {expandedAction === action && (
                  <div className="action-details">
                    {action.steps.map((step, idx) => (
                      <div key={idx} className="step-detail">
                        <p>
                          <strong>Method:</strong> {step.command.method}
                        </p>
                        <p>
                          <strong>Input Delay:</strong> {step.input_delay} |{" "}
                          <strong>Output Delay:</strong> {step.output_delay} |{" "}
                          <strong>Repeat:</strong> {step.repeat}
                        </p>
                        {step.command.arguments.length > 0 ? (
                          <p>
                            <strong>Arguments:</strong>{" "}
                            {step.command.arguments.map((arg, i) => (
                              <span key={i}>
                                {arg.name} = {arg.value}
                                {i < step.command.arguments.length - 1 && ", "}
                              </span>
                            ))}
                          </p>
                        ) : (
                          <p>
                            <strong>Arguments:</strong> None
                          </p>
                        )}
                      </div>
                    ))}
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
