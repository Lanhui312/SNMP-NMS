import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import MIB from "./mib.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prepare MIB parser
const mibParser = new MIB();

// Specify the import order to avoid error
const importOrder = [
  "SNMPv2-SMI.txt",
  "SNMPv2-TC.txt",
  "SNMPv2-CONF.txt",
  "SNMPv2-MIB.txt",
  "IANAifType-MIB.txt",
  "INET-ADDRESS-MIB.txt",
  "IF-MIB.txt",
  "IP-MIB.txt",
  "RFC1155-SMI.txt",
  "RFC1158-MIB.txt",
  "RFC-1212.txt",
  "RFC1213-MIB.txt",
];

for (const fileName of importOrder) {
  // Each file is imported into the parser before serialization
  mibParser.Import(path.join(__dirname, "mibs", fileName));
}

mibParser.Serialize();

// Field mapping
const fieldMapping = {
  ifSpeed: "speed",
  ifOperStatus: "status",
  ifType: "type",
  ipAdEntAddr: "ipAddress",
  ipAddressAddr: "ipAddress",
};

// Find a symbol in the MIB data by its OID string
function lookupSymbolByOid(baseOid, parser) {
  for (const moduleName in parser.Modules) {
    const mod = parser.Modules[moduleName];
    for (const objName in mod) {
      const obj = mod[objName];
      if (obj.OID && obj.OID === baseOid) {
        return { moduleName, objName, obj };
      }
    }
  }
  return null;
}

// Interprets raw SNMP integer/string values into something more readable
function interpretValue(objectName, rawVal) {
  switch (objectName) {
    case "ifSpeed":
      return `${rawVal} bps`;
    case "ifOperStatus":
      if (rawVal === "1") return "Active";
      if (rawVal === "2") return "Inactive";
      return `unknown(${rawVal})`;
    case "ipAdEntAddr":
    case "ipAddressAddr":
      return rawVal;
    default:
      return rawVal;
  }
}

// Export the function to other modules
export function parseMibFile(fileName) {
  // Build the path to the .txt file
  const rawDataPath = path.join(__dirname, "data", `${fileName}.txt`);
  const fileContents = fs.readFileSync(rawDataPath, "utf8");
  const lines = fileContents.split(/\r?\n/).filter(Boolean);

  // Blank device info
  let deviceInfo = {
    ipAddress: "",
    name: "",
    model: "",
    version: "",
    status: "",
    speed: "",
    type: "",
    serialNumber: "",
  };

  let enterpriseOid = null;

  function parseLine(line) {
    const [oidPart, valuePartRaw] = line.split(" = ");
    if (!oidPart || !valuePartRaw) return null;

    let oid = oidPart.trim();
    if (oid.startsWith(".")) {
      oid = oid.substring(1);
    }

    let valuePart = valuePartRaw.trim();
    // Remove SNMP type prefixes
    valuePart = valuePart.replace(
      /^(STRING|OID|INTEGER|Gauge32|Timeticks|Hex-STRING|IpAddress):\s*/,
      ""
    );
    return { oid, value: valuePart };
  }

  // Process each line
  for (const line of lines) {
    const parsed = parseLine(line);
    if (!parsed) continue;

    const { oid, value } = parsed;

    // System OIDs
    if (oid === "1.3.6.1.2.1.1.5.0") {
      deviceInfo.name = value;
    } else if (oid === "1.3.6.1.2.1.1.1.0") {
      // Hard-coded model in this example
      deviceInfo.model = "Cisco 2801";
      const match = value.match(/Version\s+([\w.\(\)]+)/i);
      if (match) {
        deviceInfo.version = match[1];
      }
    } else if (oid === "1.3.6.1.2.1.1.2.0") {
      enterpriseOid = value;
    } else if (oid.startsWith("1.3.6.1.2.1.4.20.1.1.")) {
      // IP address
      const parts = oid.split(".");
      const ipOctets = parts.splice(-4, 4);
      const baseOid = parts.join(".");
      const ipString = ipOctets.join(".");

      const found = lookupSymbolByOid(baseOid, mibParser);
      if (found) {
        const field = fieldMapping[found.objName];
        if (field === "ipAddress" && !deviceInfo.ipAddress) {
          deviceInfo.ipAddress = ipString;
        }
      }
    } else {
      // Possibly an interface or other OID
      const parts = oid.split(".");
      parts.pop(); // instance not used
      const baseOid = parts.join(".");

      const found = lookupSymbolByOid(baseOid, mibParser);
      if (found) {
        const field = fieldMapping[found.objName];
        if (field) {
          deviceInfo[field] = interpretValue(found.objName, value);
        }
      }
    }
  }

  // Identify enterprise
  let enterpriseName = "Unknown";
  if (enterpriseOid && enterpriseOid.startsWith(".1.3.6.1.4.1.9")) {
    enterpriseName = "Cisco";
  }
  deviceInfo.enterprise = enterpriseName;

  // Return the final object
  return deviceInfo;
}
