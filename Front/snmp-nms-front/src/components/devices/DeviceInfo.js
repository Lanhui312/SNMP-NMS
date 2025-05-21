import React from "react";
import { useNavigate } from "react-router-dom";

const DeviceInfo = ({ devices, handleDelete }) => {
  // Ensure devices is always treated as an array
  const safeDevices = Array.isArray(devices) ? devices : [];
  const navigate = useNavigate();

  return (
    <div className="devices">
      <h1>Device Information</h1>
      <button
        onClick={() => navigate("/createDevice")}
        className="createDevice"
      >
        {" "}
        Add Device{" "}
      </button>
      <table>
        <thead>
          <tr>
            <th>IP Address</th>
            <th>Name</th>
            <th>Model</th>
            <th>Version</th>
            <th>Status</th>
            <th>Speed</th>
            <th>Type</th>
            <th>Serial Number</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {safeDevices.map((device, index) => (
            <tr key={index}>
              <td>{device.ipAddress}</td>
              <td>{device.name}</td>
              <td>{device.model}</td>
              <td>{device.version}</td>
              <td style={getStatusStyle(device.status)}>{device.status}</td>
              <td>{device.speed}</td>
              <td>{device.type}</td>
              <td>{device.serialNumber}</td>
              <td>
                <button onClick={() => handleDelete(device.ipAddress)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Dynamic styles for status
const getStatusStyle = (status) => ({
  color:
    status === "Active" ? "green" : status === "Inactive" ? "red" : "orange",
  fontWeight: "bold",
});

export default DeviceInfo;
