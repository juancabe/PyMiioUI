import { useState } from "react";
import { Outlet, useNavigate, Link } from "react-router-dom";
import AddDevice from "./AddDevice/AddDevice";
import "./Layout.css";

function Layout() {
  const navigate = useNavigate();
  const [showAddDevice, setShowAddDevice] = useState(false);

  return (
    <div>
      <header>
        {/* <button onClick={() => navigate(-1)}>Back</button> */}
        <nav>
          <Link to="/">PyMiioUI</Link>
        </nav>
        <div>
          <button onClick={() => setShowAddDevice(true)}>Add Device</button>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      {showAddDevice && (
        <div className="modal-overlay" onClick={() => setShowAddDevice(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <AddDevice />
            <button className="close-button" onClick={() => setShowAddDevice(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Layout;