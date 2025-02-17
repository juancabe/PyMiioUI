import { useState, FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./AddAction.css";
import { CirclePlus, PanelTopClose, PanelTopOpen } from "lucide-react";

export interface AddActionProps {
  device: StateDevice;
}

function AddAction({ device }: AddActionProps) {
  const [actionName, setActionName] = useState<string>("");
  const [actionSteps, setActionSteps] = useState<ActionStep[]>([]);
  const [message, setMessage] = useState<string>("");

  // Step form state
  const [stepMethod, setStepMethod] = useState<string>("");
  const [stepArgs, setStepArgs] = useState<Argument[]>([]);
  const [stepInputDelay, setStepInputDelay] = useState<number | undefined>(
    undefined
  );
  const [stepOutputDelay, setStepOutputDelay] = useState<number | undefined>(
    undefined
  );
  const [stepRepeat, setStepRepeat] = useState<number | undefined>(undefined);

  // Argument for step
  const [newStepArgName, setNewStepArgName] = useState<string>("");
  const [newStepArgValue, setNewStepArgValue] = useState<string>("");

  // Added states show
  const [showAddedSteps, setShowAddedSteps] = useState<boolean>(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const action: Action = {
      name: actionName,
      steps: actionSteps,
    };
    try {
      await invoke("add_action", {
        deviceName: device.name,
        action,
      });
      setMessage("Action added successfully!");
      device.actions.push(action);
      // Clear entire form
      setActionName("");
      setActionSteps([]);
      clearStepForm();
      window.dispatchEvent(new CustomEvent("actionAdded"));
    } catch (error) {
      console.error("Error adding action:", error);
      setMessage("Failed to add action: " + error);
    }
  }

  function clearStepForm() {
    setStepMethod("");
    setStepArgs([]);
    setStepInputDelay(undefined);
    setStepOutputDelay(undefined);
    setStepRepeat(undefined);
    setNewStepArgName("");
    setNewStepArgValue("");
  }

  function handleAddStep() {
    if (!stepMethod) return;
    const newStep: ActionStep = {
      command: {
        method: stepMethod,
        arguments: stepArgs,
      },
      input_delay: stepInputDelay ? stepInputDelay : 0,
      output_delay: stepOutputDelay ? stepOutputDelay : 0,
      repeat: stepRepeat ? stepRepeat : 0,
    };
    setActionSteps([...actionSteps, newStep]);
    clearStepForm();
  }

  function handleAddStepArg() {
    if (!newStepArgName.trim() || !newStepArgValue.trim()) return;
    const arg: Argument = {
      name: newStepArgName.trim(),
      value: newStepArgValue.trim(),
    };
    setStepArgs([...stepArgs, arg]);
    setNewStepArgName("");
    setNewStepArgValue("");
  }

  function getOrdinal(n: number): string {
    const j = n % 10;
    const k = n % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
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

        <form className="step-form">
          <legend>Configure Step</legend>
          <select
            className="step-method"
            value={stepMethod}
            onChange={(e) => setStepMethod(e.target.value)}
            required
          >
            <option value="" disabled>
              Select a method
            </option>
            {device.methods.map((method, index) => (
              <option key={index} value={method.name}>
                {method.name} - {method.signature}
              </option>
            ))}
          </select>

          <div className="step-delays">
            <input
              type="number"
              id="inputDelay"
              placeholder="Input Delay"
              value={stepInputDelay}
              onChange={(e) => setStepInputDelay(Number(e.target.value))}
            />
            <input
              type="number"
              id="outputDelay"
              placeholder="Output Delay"
              value={stepOutputDelay}
              onChange={(e) => setStepOutputDelay(Number(e.target.value))}
            />
            <input
              type="number"
              id="repeat"
              placeholder="Repeat"
              value={stepRepeat}
              onChange={(e) => setStepRepeat(Number(e.target.value))}
            />
          </div>

          <div className="add-arguments">
            <h3>Add Argument for Step</h3>
            <div className="argument-inputs">
              <input
                type="text"
                id="stepArgName"
                placeholder="Argument Name"
                value={newStepArgName}
                onChange={(e) => setNewStepArgName(e.target.value)}
              />
              <input
                type="text"
                id="stepArgValue"
                placeholder="Value"
                value={newStepArgValue}
                onChange={(e) => setNewStepArgValue(e.target.value)}
              />
              <button type="button" onClick={handleAddStepArg}>
                <CirclePlus />
              </button>
            </div>
            {stepArgs.length > 0 && (
              <div className="argument-list">
                <h4>Added Arguments:</h4>
                <ul>
                  {stepArgs.map((arg, index) => (
                    <li key={index}>
                      {arg.name} {arg.value ? `= ${arg.value}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <button type="button" onClick={handleAddStep}>
            Add Step
          </button>
        </form>

        {actionSteps.length > 0 && (
          <div className="step-list">
            <div className="row">
              <h3>
                <span className="no-bold">{actionSteps.length}</span> Added Step
                {actionSteps.length > 1 ? "s" : ""}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddedSteps(!showAddedSteps)}
              >
                {showAddedSteps ? <PanelTopOpen /> : <PanelTopClose />}
              </button>
            </div>
            <ul>
              {showAddedSteps &&
                actionSteps.map((step, index) => (
                  <li key={index} className="step-added-item">
                    <div className="step-added-name">
                      <span>
                        {index + 1}
                        <span className="ordinal">{getOrdinal(index + 1)}</span>
                      </span>
                    </div>
                    <div className="step-added-method-args">
                      <div className="method-item">
                        <strong>Method</strong> {step.command.method}
                      </div>
                      <div className="method-item">
                        <strong>Arguments</strong>
                        {step.command.arguments.length > 0 && (
                          <ul>
                            {step.command.arguments.map((arg, idx) => (
                              <li key={idx}>
                                {arg.name}
                                {arg.value ? `: ${arg.value}` : ""}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                    <div className="step-added-delays">
                      <div className="delay-item">
                        <strong>Input Delay</strong> {step.input_delay} ms
                      </div>
                      <div className="delay-item">
                        <strong>Output Delay</strong> {step.output_delay} ms
                      </div>
                      <div className="delay-item">
                        <strong>Repeat</strong> {step.repeat} times
                      </div>
                    </div>
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
