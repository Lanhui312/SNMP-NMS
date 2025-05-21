import React from "react";
// Generate the logs record as a table's view
const LogRecord = ({ logs }) => {
  return (
    <div className="logs">
      <h1>Log Records</h1>
      <table>
        <thead>
          <tr>
            <th>User ID</th>
            <th>Action</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, index) => (
            <tr key={index}>
              <td>{log.user_id}</td>
              <td>{log.action}</td>
              <td>{new Date(log.timestamp).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LogRecord;
