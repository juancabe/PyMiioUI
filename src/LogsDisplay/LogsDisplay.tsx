import React from "react";
import "./LogsDisplay.css";

export interface Log {
  id?: string; // optional unique identifier
  message: string;
  emmiter: string;
  timestamp: string;
}

interface LogItemProps {
  log: Log;
}

const LogItem = React.memo(({ log }: LogItemProps) => {
  // Example formatting for timestamp
  const formattedTimestamp = new Date(log.timestamp).toLocaleString();

  return (
    <div className="log">
      <p className="timestamp">{formattedTimestamp}</p>
      <p className="emmiter">{log.emmiter}</p>
      <p className="message">{log.message}</p>
    </div>
  );
});

function LogsDisplay({ logs }: { logs: Log[] }) {
  return (
    <div className="logs-display">
      <h1>Logs Display</h1>
      <div className="logs-container">
        {logs.length === 0 ? (
          <p className="no-logs">No logs available.</p>
        ) : (
          logs.map((log, index) => <LogItem key={log.id || index} log={log} />)
        )}
      </div>
    </div>
  );
}

export default LogsDisplay;
