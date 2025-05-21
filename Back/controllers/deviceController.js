import { Device } from "../models/Device.js";
import { Log } from "../models/Log.js";
import pool from "../config/database.js";

export const getDevices = async (req, res) => {
  try {
    const devices = await Device.findAll();
    res.json(devices);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch devices" });
  }
};

export const addDevice = async (req, res) => {
  console.log("addDevice() triggered");
  try {
    console.log("Received Request Body:", req.body); // Log request data

    const { ipAddress, snmpVersion, credentials } = req.body;
    // find the device according to the input
    const deviceInfo = Device.findInJson(ipAddress, snmpVersion, credentials);

    if (!deviceInfo) {
      console.error("Device Not Found:", ipAddress);
      return res
        .status(404)
        .json({ message: "Device not found or invalid credentials" });
    }

    // Creates a device record in the DB using the parsed data
    const deviceId = await Device.create(deviceInfo);
    await Log.create(req.user.id, `Added device ${ipAddress}`);

    res.status(201).json({
      message: "Device added successfully",
      data: { id: deviceId, ...deviceInfo },
    });
  } catch (error) {
    console.error("Add Device Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const deleteDevice = async (req, res) => {
  const { ipAddress } = req.params;
  console.log("Delete Request for IP:", ipAddress);

  try {
    // Query database for the device before attempting to delete
    const [device] = await pool.query(
      "SELECT * FROM devices WHERE ipAddress = ?",
      [ipAddress]
    );

    console.log(
      "SQL Query Executed:",
      `SELECT * FROM devices WHERE ipAddress = '${ipAddress}'`
    );
    console.log("Query Result:", device);

    if (device.length === 0) {
      console.error("Device not found in DB:", ipAddress);
      return res.status(404).json({ message: "Device not found" });
    }

    console.log("Device Found in DB:", device[0]);

    // Proceed to delete
    const [result] = await pool.query(
      "DELETE FROM devices WHERE TRIM(ipAddress) = TRIM(?)",
      [ipAddress]
    );

    if (result.affectedRows === 0) {
      console.error("Device delete query executed but no rows affected.");
      return res.status(404).json({ message: "Device not found" });
    }

    await Log.create(req.user.id, `Deleted device ${ipAddress}`);
    res.json({ message: "Device deleted successfully" });
  } catch (error) {
    console.error("Delete Device Error:", error);
    res
      .status(500)
      .json({ message: "Failed to delete device", error: error.message });
  }
};
