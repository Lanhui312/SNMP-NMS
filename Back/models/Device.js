import pool from "../config/database.js";
import fs from "fs";
import path from "path";
import { parseMibFile } from "../snmptranslate/test.js";

// Load SNMP data from JSON file
const snmpDataPath = path.resolve("snmp-data.json");
const snmpData = JSON.parse(fs.readFileSync(snmpDataPath, "utf8"));

export const Device = {
  // Find device information in JSON file
  findInJson: (ipAddress, snmpVersion, credentials) => {
    console.log("Searching for Device:", ipAddress, snmpVersion, credentials);
    console.log("Available SNMP Data:", snmpData);

    // looks for a device with matching parameters
    const device = snmpData.find(
      (d) =>
        d.ipAddress === ipAddress &&
        d.snmpVersion === snmpVersion &&
        (snmpVersion === "v2c"
          ? d.credential === credentials // For v2c, check the credential string
          : d.credential.username === credentials.username &&
            d.credential.password === credentials.password) // For v3, check username & password
    );

    console.log("Found Device:", device || "Not Found");
    if (!device) return null;

    // If this device entry has a fileName, then run test.js
    if (device.fileName) {
      try {
        const parsedDeviceInfo = parseMibFile(device.fileName);
        return parsedDeviceInfo;
      } catch (err) {
        console.error("Error parsing MIB file:", err);
        return null;
      }
    } else {
      // Otherwise, just return the embedded data
      return device.information;
    }
  },

  // Create device in database with separate fields
  create: async (deviceData) => {
    const {
      ipAddress,
      name,
      model,
      version,
      status,
      speed,
      type,
      serialNumber,
    } = deviceData;

    // Generate a new unique ID from the database
    const [existingIds] = await pool.query(
      "SELECT MAX(id) AS maxId FROM devices"
    );
    const newId = existingIds[0].maxId ? existingIds[0].maxId + 1 : 1;

    const [result] = await pool.query(
      `INSERT INTO devices (id, ipAddress, name, model, version, status, speed, type, serialNumber)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId,
        ipAddress,
        name,
        model,
        version,
        status,
        speed,
        type,
        serialNumber,
      ]
    );

    return newId;
  },

  // Fetch all devices from the database
  findAll: async () => {
    const [rows] = await pool.query("SELECT * FROM devices");
    return rows;
  },

  // Delete device by IP address
  deleteByIp: async (ipAddress) => {
    const [result] = await pool.query(
      "DELETE FROM devices WHERE ipAddress = ?",
      [ipAddress]
    );
    return result.affectedRows > 0;
  },
};
