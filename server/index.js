import express from "express";
import cors from "cors";
import { scanWifiNetworks, getCurrentConnection } from "./wifi-scanner.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "nettrust-wifi-scanner" });
});

// Scan for nearby WiFi networks
app.get("/api/wifi/scan", async (_req, res) => {
  try {
    const networks = await scanWifiNetworks();
    res.json({ success: true, networks, scannedAt: Date.now() });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      hint: "WiFi scanning requires system-level access. Run the server with appropriate permissions.",
    });
  }
});

// Get current WiFi connection details
app.get("/api/wifi/current", async (_req, res) => {
  try {
    const connection = await getCurrentConnection();
    res.json({ success: true, connection });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[NetTrust WiFi Scanner] listening on http://localhost:${PORT}`);
  console.log(`[NetTrust WiFi Scanner] GET /api/wifi/scan   — scan nearby networks`);
  console.log(`[NetTrust WiFi Scanner] GET /api/wifi/current — current connection`);
});
