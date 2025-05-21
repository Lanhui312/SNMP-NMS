import express from "express";
import {
  getDevices,
  addDevice,
  deleteDevice,
} from "../controllers/deviceController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();
router.get("/", authenticate, getDevices);
router.post("/", authenticate, addDevice);
router.delete("/:ipAddress", authenticate, deleteDevice);
export default router;
