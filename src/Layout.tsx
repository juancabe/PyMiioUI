import { useEffect, useState } from "react";
import { Outlet, Link } from "react-router-dom";
import AddDevice from "./AddDevice/AddDevice";
import "./Layout.css";
import { CircleX } from "lucide-react";
import LogsDisplay, { Log } from "./LogsDisplay/LogsDisplay";

function Layout() {
  // const navigate = useNavigate();
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [showActionLogs, setShowActionLogs] = useState(false);

  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    const handleNewLog = (event: CustomEvent<Log>) => {
      setLogs((prevLogs) => [event.detail, ...prevLogs]);
    };

    window.addEventListener("newLog", handleNewLog as EventListener);
    return () =>
      window.removeEventListener("newLog", handleNewLog as EventListener);
  }, []);

  return (
    <div>
      <header>
        {/* <button className="layout-button" onClick={() => navigate(-1)}>
          Back
        </button> */}
        <button
          className="layout-button"
          onClick={() => setShowActionLogs(true)}
        >
          Action Logs 🪵
        </button>
        <nav>
          <Link to="/" style={{ color: "#FFFFFF" }}>
            Your devices
          </Link>
        </nav>
        <button
          className="layout-button"
          onClick={() => setShowAddDevice(true)}
        >
          Add Device
        </button>
      </header>
      <main>
        <Outlet />
      </main>
      {showAddDevice && (
        <div className="modal-overlay" onClick={() => setShowAddDevice(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <CircleX
              className="xSquare"
              onClick={() => setShowAddDevice(false)}
            />
            <div className="modal-content">
              <AddDevice />
            </div>
          </div>
        </div>
      )}
      {showActionLogs && (
        <div className="modal-overlay" onClick={() => setShowActionLogs(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <CircleX
              className="xSquare"
              onClick={() => setShowActionLogs(false)}
            />
            <div className="modal-content">
              <LogsDisplay logs={logs} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Layout;
