import { useState, FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./AddAction.css";
import { CirclePlus } from "lucide-react";

export interface AddActionProps {
  device: StateDevice;
}

function AddAction({ device }: AddActionProps) {
  const [actionName, setActionName] = useState<string>("");
  const [actionMethod, setActionMethod] = useState<string>("");
  const [actionArgs, setActionArgs] = useState<Argument[]>([]);
  const [message, setMessage] = useState<string>("");
  const [newArgName, setNewArgName] = useState<string>("");
  const [newArgValue, setNewArgValue] = useState<string>("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const action: Action = {
      name: actionName,
      method: actionMethod,
      arguments: actionArgs,
    };
    try {
      await invoke("add_action", {
        deviceName: device.name,
        action,
      });
      setMessage("Action added successfully!");
      device.actions.push(action);
      // Clear fields
      setActionName("");
      setActionMethod("");
      setActionArgs([]);
      // Clear argument inputs
      setNewArgName("");
      setNewArgValue("");
      // Dispatch an event to notify that an action was added
      window.dispatchEvent(new CustomEvent("actionAdded"));
    } catch (error) {
      console.error("Error adding action:", error);
      setMessage("Failed to add action: " + error);
    }
  }
  function handleAddArg() {
    if (!newArgName.trim()) return;
    if (!newArgValue.trim()) return;
    const arg: Argument = {
      name: newArgName.trim(),
      value: newArgValue.trim(),
    };
    setActionArgs([...actionArgs, arg]);
    // Clear argument inputs after adding
    setNewArgName("");
    setNewArgValue("");
  }

  return (
    <section className="add-action-container">
      <h2>Add Action</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <input
            type="text"
            id="actionName"
            placeholder="Action Name"
            value={actionName}
            onChange={(e) => setActionName(e.target.value)}
            required
          />
        </div>
        <div>
          <select
            id="actionMethod"
            value={actionMethod}
            onChange={(e) => setActionMethod(e.target.value)}
            required
          >
            <option value="" disabled>
              Select a method
            </option>
            {device.methods.map((method, index) => (
              <option key={index} value={method.name}>
                <h3>{method.name}</h3>
                <p>{method.signature}</p>
              </option>
            ))}
          </select>
        </div>
        <div className="add-arguments">
          <h3>Add Argument</h3>
          <div className="argument-inputs">
            <input
              type="text"
              id="argName"
              placeholder="Argument Name"
              value={newArgName}
              onChange={(e) => setNewArgName(e.target.value)}
            />
            <input
              type="text"
              id="argDefault"
              placeholder="Value"
              value={newArgValue}
              onChange={(e) => setNewArgValue(e.target.value)}
            />
            <button type="button" onClick={handleAddArg}>
              <CirclePlus />
            </button>
          </div>
        </div>

        {actionArgs.length > 0 && (
          <div className="argument-list">
            <h4>Added Arguments:</h4>
            <ul>
              {actionArgs.map((arg, index) => (
                <li key={index}>
                  {arg.name} {arg.value ? `= ${arg.value}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
        <button type="submit">Add Action</button>
      </form>
      {message && <p>{message}</p>}
    </section>
  );
}

export default AddAction;
