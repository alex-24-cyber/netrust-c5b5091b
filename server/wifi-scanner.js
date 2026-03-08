import { exec } from "node:child_process";
import { platform } from "node:os";

/**
 * Execute a shell command and return stdout.
 */
function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: 15000 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout);
    });
  });
}

/**
 * Detect the OS and pick the right scanner.
 */
export async function scanWifiNetworks() {
  const os = platform();
  switch (os) {
    case "linux":
      return scanLinux();
    case "darwin":
      return scanMacOS();
    case "win32":
      return scanWindows();
    default:
      throw new Error(`Unsupported platform: ${os}`);
  }
}

/**
 * Get details about the currently connected WiFi network.
 */
export async function getCurrentConnection() {
  const os = platform();
  switch (os) {
    case "linux":
      return getCurrentLinux();
    case "darwin":
      return getCurrentMacOS();
    case "win32":
      return getCurrentWindows();
    default:
      throw new Error(`Unsupported platform: ${os}`);
  }
}

// ─── Linux ────────────────────────────────────────────────────────────────────

async function scanLinux() {
  // Try nmcli first, fall back to iwlist
  try {
    return await scanLinuxNmcli();
  } catch {
    return await scanLinuxIwlist();
  }
}

async function scanLinuxNmcli() {
  const output = await run(
    "nmcli -t -f SSID,BSSID,SIGNAL,FREQ,SECURITY,CHAN,MODE,RATE device wifi list --rescan yes"
  );
  return output
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      // nmcli uses : as delimiter but BSSID contains colons — it escapes them with \\:
      const parts = line.replace(/\\:/g, "\uFFFF").split(":");
      const restore = (s) => s.replace(/\uFFFF/g, ":");
      return {
        ssid: restore(parts[0] || "").trim() || "<Hidden>",
        bssid: restore(parts[1] || "").trim(),
        signal: parseInt(parts[2]) || 0,
        frequency: restore(parts[3] || "").trim(),
        security: restore(parts[4] || "").trim() || "Open",
        channel: parseInt(parts[5]) || 0,
        mode: restore(parts[6] || "").trim(),
        rate: restore(parts[7] || "").trim(),
      };
    })
    .sort((a, b) => b.signal - a.signal);
}

async function scanLinuxIwlist() {
  // Find wireless interface
  const ifaceOutput = await run("iw dev | grep Interface | awk '{print $2}'");
  const iface = ifaceOutput.trim().split("\n")[0];
  if (!iface) throw new Error("No wireless interface found");

  const output = await run(`sudo iwlist ${iface} scan 2>/dev/null`);
  const cells = output.split(/Cell \d+/);
  const networks = [];

  for (const cell of cells) {
    if (!cell.includes("ESSID")) continue;

    const ssidMatch = cell.match(/ESSID:"([^"]*)"/);
    const bssidMatch = cell.match(/Address:\s*([0-9A-Fa-f:]+)/);
    const signalMatch = cell.match(/Signal level[=:](-?\d+)/);
    const channelMatch = cell.match(/Channel[=:](\d+)/);
    const freqMatch = cell.match(/Frequency[=:]([0-9.]+)/);
    const encMatch = cell.match(/Encryption key:(on|off)/);
    const wpaMatch = cell.match(/WPA2|WPA3|WPA/g);

    let security = "Open";
    if (encMatch && encMatch[1] === "on") {
      security = wpaMatch ? [...new Set(wpaMatch)].join("/") : "WEP";
    }

    networks.push({
      ssid: ssidMatch?.[1] || "<Hidden>",
      bssid: bssidMatch?.[1] || "",
      signal: signalMatch ? parseInt(signalMatch[1]) : 0,
      frequency: freqMatch ? `${freqMatch[1]} GHz` : "",
      security,
      channel: channelMatch ? parseInt(channelMatch[1]) : 0,
      mode: "",
      rate: "",
    });
  }

  return networks.sort((a, b) => b.signal - a.signal);
}

async function getCurrentLinux() {
  try {
    const output = await run("nmcli -t -f NAME,DEVICE,TYPE connection show --active");
    const wifiLine = output.split("\n").find((l) => l.includes("wireless") || l.includes("wifi"));
    if (!wifiLine) return { connected: false, ssid: null };

    const parts = wifiLine.split(":");
    const ssid = parts[0];
    const device = parts[1];

    // Get more details
    const details = await run(`iwconfig ${device} 2>/dev/null`);
    const freqMatch = details.match(/Frequency[=:]([0-9.]+)/);
    const signalMatch = details.match(/Signal level[=:](-?\d+)/);
    const bitrateMatch = details.match(/Bit Rate[=:]([0-9.]+ [A-Za-z/]+)/);
    const bssidMatch = details.match(/Access Point:\s*([0-9A-Fa-f:]+)/);

    return {
      connected: true,
      ssid,
      device,
      bssid: bssidMatch?.[1] || null,
      frequency: freqMatch ? `${freqMatch[1]} GHz` : null,
      signal: signalMatch ? parseInt(signalMatch[1]) : null,
      bitRate: bitrateMatch?.[1] || null,
    };
  } catch {
    return { connected: false, ssid: null };
  }
}

// ─── macOS ────────────────────────────────────────────────────────────────────

async function scanMacOS() {
  const output = await run(
    "/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -s"
  );
  const lines = output.trim().split("\n");
  if (lines.length < 2) return [];

  // Parse header to find column positions
  const header = lines[0];
  const ssidEnd = header.indexOf("BSSID");
  const bssidEnd = header.indexOf("RSSI");
  const rssiEnd = header.indexOf("CHANNEL");
  const channelEnd = header.indexOf("HT");
  const secStart = header.indexOf("SECURITY");

  return lines.slice(1).map((line) => {
    const ssid = line.substring(0, ssidEnd).trim() || "<Hidden>";
    const bssid = line.substring(ssidEnd, bssidEnd).trim();
    const rssi = parseInt(line.substring(bssidEnd, rssiEnd).trim()) || 0;
    const channel = line.substring(rssiEnd, channelEnd).trim();
    const security = line.substring(secStart).trim() || "Open";

    // Convert RSSI (dBm) to percentage (rough)
    const signalPercent = Math.max(0, Math.min(100, 2 * (rssi + 100)));

    return {
      ssid,
      bssid,
      signal: signalPercent,
      signalDbm: rssi,
      frequency: parseInt(channel) > 14 ? "5 GHz" : "2.4 GHz",
      security,
      channel: parseInt(channel) || 0,
      mode: "",
      rate: "",
    };
  }).sort((a, b) => b.signal - a.signal);
}

async function getCurrentMacOS() {
  try {
    const output = await run(
      "/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I"
    );
    const ssidMatch = output.match(/\s+SSID:\s*(.+)/);
    const bssidMatch = output.match(/\s+BSSID:\s*([0-9a-fA-F:]+)/);
    const rssiMatch = output.match(/\s+agrCtlRSSI:\s*(-?\d+)/);
    const channelMatch = output.match(/\s+channel:\s*(\d+)/);

    if (!ssidMatch) return { connected: false, ssid: null };

    return {
      connected: true,
      ssid: ssidMatch[1].trim(),
      bssid: bssidMatch?.[1] || null,
      signal: rssiMatch ? parseInt(rssiMatch[1]) : null,
      channel: channelMatch ? parseInt(channelMatch[1]) : null,
    };
  } catch {
    return { connected: false, ssid: null };
  }
}

// ─── Windows ──────────────────────────────────────────────────────────────────

async function scanWindows() {
  const output = await run("netsh wlan show networks mode=bssid");
  const blocks = output.split(/^SSID \d+/m);
  const networks = [];

  for (const block of blocks) {
    if (!block.includes("BSSID")) continue;

    const ssidMatch = block.match(/:\s*(.+)/);
    const authMatch = block.match(/Authentication\s*:\s*(.+)/i);
    const encMatch = block.match(/Encryption\s*:\s*(.+)/i);
    const bssidMatch = block.match(/BSSID \d+\s*:\s*([0-9a-fA-F:]+)/i);
    const signalMatch = block.match(/Signal\s*:\s*(\d+)%/i);
    const channelMatch = block.match(/Channel\s*:\s*(\d+)/i);
    const radioMatch = block.match(/Radio type\s*:\s*(.+)/i);

    const auth = authMatch?.[1]?.trim() || "";
    const enc = encMatch?.[1]?.trim() || "";
    let security = "Open";
    if (auth.includes("WPA3")) security = "WPA3";
    else if (auth.includes("WPA2")) security = "WPA2";
    else if (auth.includes("WPA")) security = "WPA";
    else if (enc && enc !== "None") security = enc;

    networks.push({
      ssid: ssidMatch?.[1]?.trim() || "<Hidden>",
      bssid: bssidMatch?.[1]?.trim() || "",
      signal: signalMatch ? parseInt(signalMatch[1]) : 0,
      frequency: radioMatch?.[1]?.trim() || "",
      security,
      channel: channelMatch ? parseInt(channelMatch[1]) : 0,
      mode: "",
      rate: "",
    });
  }

  return networks.sort((a, b) => b.signal - a.signal);
}

async function getCurrentWindows() {
  try {
    const output = await run("netsh wlan show interfaces");
    const ssidMatch = output.match(/^\s*SSID\s*:\s*(.+)$/m);
    const bssidMatch = output.match(/BSSID\s*:\s*([0-9a-fA-F:]+)/i);
    const signalMatch = output.match(/Signal\s*:\s*(\d+)%/i);
    const channelMatch = output.match(/Channel\s*:\s*(\d+)/i);
    const authMatch = output.match(/Authentication\s*:\s*(.+)/i);

    if (!ssidMatch) return { connected: false, ssid: null };

    return {
      connected: true,
      ssid: ssidMatch[1].trim(),
      bssid: bssidMatch?.[1] || null,
      signal: signalMatch ? parseInt(signalMatch[1]) : null,
      channel: channelMatch ? parseInt(channelMatch[1]) : null,
      security: authMatch?.[1]?.trim() || null,
    };
  } catch {
    return { connected: false, ssid: null };
  }
}
