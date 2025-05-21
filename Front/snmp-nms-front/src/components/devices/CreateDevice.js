import React, { useState } from "react";
import useFetch from "../useFetch"; // Update path if necessary
import { useNavigate } from "react-router-dom";

const CreateDevice = () => {
  const [ipAddress, setIpAddress] = useState("");
  const [snmpVersion, setSnmpVersion] = useState("v2c");
  const [communityString, setCommunityString] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { fetchData } = useFetch(); // Assuming useFetch includes POST method capability
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!ipAddress) {
      setError("IP address is required.");
      return;
    }
    if (snmpVersion === "v3" && (!username || !password)) {
      setError("Username and password are required for SNMP v3.");
      return;
    }

    const deviceData = {
      ipAddress,
      snmpVersion,
      credentials:
        snmpVersion === "v2c"
          ? communityString || "public"
          : { username, password },
    };

    const result = await fetchData(`http://localhost:5000/api/devices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(deviceData),
    });

    if (result && result.status === 201) {
      alert("Device created successfully");
      navigate("/device"); // Redirecting to the device listing page or wherever is appropriate
    } else {
      setError(
        "Failed to create the device. Please check the details and try again."
      );
    }
  };

  return (
    <div className="create-device">
      <h1>Create New Device</h1>
      <form onSubmit={handleSubmit}>
        {error && <div className="error">{error}</div>}
        <div className="inputGroup">
          <label htmlFor="ipAddress">IP Address:</label>
          <input
            type="text"
            id="ipAddress"
            value={ipAddress}
            onChange={(e) => setIpAddress(e.target.value)}
            placeholder="Enter IP address"
          />
        </div>
        <div className="inputGroup">
          <label htmlFor="snmpVersion">SNMP Version:</label>
          <select
            id="snmpVersion"
            value={snmpVersion}
            onChange={(e) => setSnmpVersion(e.target.value)}
          >
            <option value="v2c">v2c</option>
            <option value="v3">v3</option>
          </select>
        </div>
        {snmpVersion === "v2c" && (
          <div className="inputGroup">
            <label htmlFor="communityString">
              Community String (Optional):
            </label>
            <input
              type="text"
              id="communityString"
              value={communityString}
              onChange={(e) => setCommunityString(e.target.value)}
              placeholder="Enter community string"
            />
          </div>
        )}
        {snmpVersion === "v3" && (
          <>
            <div className="inputGroup">
              <label htmlFor="username">Username:</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
              />
            </div>
            <div className="inputGroup">
              <label htmlFor="password">Password:</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>
          </>
        )}
        <button type="submit">Create Device</button>
      </form>
    </div>
  );
};

export default CreateDevice;
