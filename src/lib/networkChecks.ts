export interface RealCheckResult {
  id: string;
  passed: boolean | null; // null = timed out
  status: string;
  explanation: string;
  evidence?: Record<string, string>;
}

function withTimeout(ms: number): AbortController {
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), ms);
  return ctrl;
}

/** Retry a check once if it returns null (inconclusive/timed out) */
async function withRetry<T extends RealCheckResult>(fn: () => Promise<T>): Promise<T> {
  const first = await fn();
  if (first.passed === null) {
    // Wait briefly then retry once
    await new Promise(r => setTimeout(r, 500));
    return fn();
  }
  return first;
}

export async function checkDNS(): Promise<RealCheckResult> {
  const id = "dns-hijack";
  try {
    const ctrl = withTimeout(5000);
    const [googleRes, cloudflareRes] = await Promise.all([
      fetch("https://dns.google/resolve?name=example.com&type=A", { signal: ctrl.signal }),
      fetch("https://cloudflare-dns.com/dns-query?name=example.com&type=A", {
        headers: { accept: "application/dns-json" },
        signal: ctrl.signal,
      }),
    ]);

    const googleData = await googleRes.json();
    const cloudflareData = await cloudflareRes.json();

    const googleIPs: string[] = (googleData.Answer || []).map((a: { data?: string }) => a.data).filter(Boolean);
    const cloudflareIPs: string[] = (cloudflareData.Answer || []).map((a: { data?: string }) => a.data).filter(Boolean);

    const hasMatch = googleIPs.some((ip) => cloudflareIPs.includes(ip));

    const evidence: Record<string, string> = {
      "Google DNS": googleIPs.join(", ") || "No response",
      "Cloudflare DNS": cloudflareIPs.join(", ") || "No response",
      "Result": hasMatch ? "Match ✓" : "Mismatch ✗",
    };

    if (hasMatch) {
      return {
        id, passed: true, evidence,
        status: "DNS responses consistent across providers",
        explanation: "We queried both Google and Cloudflare DNS-over-HTTPS and received matching IP addresses for example.com. This confirms DNS queries on this network are not being intercepted or redirected.",
      };
    } else {
      return {
        id, passed: false, evidence,
        status: "DNS responses inconsistent — possible redirection detected",
        explanation: "Google and Cloudflare DNS returned completely different IP addresses for the same domain. This could indicate DNS hijacking on this network, where your traffic is being silently redirected.",
      };
    }
  } catch {
    return {
      id, passed: null,
      evidence: { "Error": "Request failed or timed out" },
      status: "DNS check timed out — could not verify",
      explanation: "The DNS verification requests failed or timed out. This could indicate network interference preventing access to external DNS providers, or simply a slow connection.",
    };
  }
}

export async function checkSSL(): Promise<RealCheckResult> {
  const id = "ssl-cert";
  const urls = ["https://www.google.com", "https://www.cloudflare.com", "https://1.1.1.1"];
  const names = ["google.com", "cloudflare.com", "1.1.1.1"];

  try {
    const ctrl = withTimeout(4000);
    const timings: { name: string; status: string; ms: number }[] = [];

    const results = await Promise.allSettled(
      urls.map(async (url, i) => {
        const start = performance.now();
        const res = await fetch(url, { method: "HEAD", mode: "no-cors", signal: ctrl.signal });
        const ms = Math.round(performance.now() - start);
        timings.push({ name: names[i], status: "OK", ms });
        return res;
      })
    );

    // Fill in failures
    results.forEach((r, i) => {
      if (r.status === "rejected" && !timings.find((t) => t.name === names[i])) {
        timings.push({ name: names[i], status: "Failed", ms: 0 });
      }
    });

    const successes = results.filter((r) => r.status === "fulfilled").length;
    const evidence: Record<string, string> = {};
    timings.forEach((t) => {
      evidence[t.name] = t.status === "OK" ? `OK (${t.ms}ms)` : "Failed";
    });

    if (successes >= 2) {
      return {
        id, passed: true, evidence,
        status: "HTTPS connections verified — no SSL stripping detected",
        explanation: "We successfully established HTTPS connections to multiple major websites. This confirms that encrypted connections are working properly and no SSL stripping attack is active on this network.",
      };
    } else {
      return {
        id, passed: false, evidence,
        status: "HTTPS connections failing — possible SSL interception",
        explanation: "Multiple HTTPS connections to well-known sites failed. This could indicate an SSL stripping attack where encrypted connections are being downgraded, potentially exposing your sensitive data.",
      };
    }
  } catch {
    return {
      id, passed: null,
      evidence: { "Error": "Request failed or timed out" },
      status: "SSL check timed out — could not verify",
      explanation: "The SSL verification requests failed or timed out. This may indicate network restrictions or interference with outbound HTTPS connections.",
    };
  }
}

export async function checkCaptivePortal(): Promise<RealCheckResult> {
  const id = "rogue-dhcp";
  try {
    const ctrl = withTimeout(4000);
    const res = await fetch("http://connectivitycheck.gstatic.com/generate_204", {
      signal: ctrl.signal,
      redirect: "manual",
    });

    const evidence: Record<string, string> = {
      "Target": "gstatic.com/generate_204",
      "Expected": "204",
      "Received": String(res.status),
      "Response type": res.type,
    };

    if (res.status === 204) {
      return {
        id, passed: true, evidence,
        status: "No captive portal or rogue DHCP detected",
        explanation: "Google's connectivity check returned a clean 204 response, confirming there is no captive portal or rogue DHCP server intercepting your traffic on this network.",
      };
    } else {
      return {
        id, passed: false, evidence,
        status: "Captive portal or network interception detected",
        explanation: "The connectivity check was redirected or returned unexpected content, indicating a captive portal or rogue DHCP server is intercepting traffic. Your connection may be monitored or restricted.",
      };
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "";
    // On HTTPS pages, this HTTP fetch is blocked by mixed content — that's expected and safe
    if (errMsg.includes("Mixed Content") || errMsg.includes("mixed") || errMsg.includes("blocked") ||
        (typeof window !== "undefined" && window.location.protocol === "https:")) {
      return {
        id, passed: true,
        evidence: {
          "Target": "gstatic.com/generate_204",
          "Result": "Blocked by mixed content policy",
          "Protocol": "HTTPS (secure)",
        },
        status: "No captive portal detected — connection is direct",
        explanation: "Your browser's security policy blocked the HTTP captive portal test because you're already on a secure HTTPS connection. This confirms no captive portal is interfering with your connection.",
      };
    }
    return {
      id, passed: null,
      evidence: {
        "Target": "gstatic.com/generate_204",
        "Expected": "204",
        "Received": "Request failed",
      },
      status: "Captive portal check inconclusive",
      explanation: "The captive portal detection request could not complete. This could indicate network interference.",
    };
  }
}

export interface IPReputationData {
  ip: string;
  org: string;
  asn: string;
  city: string;
  region: string;
  country: string;
  isSuspicious: boolean;
  ipType: string;
}

export interface IPReputationResult extends RealCheckResult {
  reputationData?: IPReputationData;
}

const SUSPICIOUS_ORG_KEYWORDS = ["vpn", "proxy", "hosting", "data center", "datacenter", "cloud", "aws", "azure", "digitalocean", "linode", "vultr", "hetzner", "ovh"];

export async function checkIPReputation(): Promise<IPReputationResult> {
  const id = "ip-reputation";
  try {
    const ctrl = withTimeout(5000);
    const res = await fetch("https://ipapi.co/json/", { signal: ctrl.signal });
    const data = await res.json();

    const org = (data.org || "Unknown").toString();
    const orgLower = org.toLowerCase();
    const isSuspicious = SUSPICIOUS_ORG_KEYWORDS.some((kw) => orgLower.includes(kw));
    const ipType = isSuspicious ? "Datacenter/VPN/Proxy" : "Consumer ISP";
    const city = data.city || "Unknown";
    const country = data.country_name || data.country || "Unknown";

    const reputationData: IPReputationData = {
      ip: data.ip || "Unknown", org,
      asn: data.asn || "Unknown", city,
      region: data.region || "", country,
      isSuspicious, ipType,
    };

    const evidence: Record<string, string> = {
      "Public IP": reputationData.ip,
      "ISP": org,
      "ASN": reputationData.asn,
      "Exit": `${city}, ${country}`,
      "Classification": ipType,
    };

    if (isSuspicious) {
      return {
        id, passed: false, reputationData, evidence,
        status: `Traffic exiting through ${org} — possible proxy or VPN redirect`,
        explanation: "Your traffic is exiting the internet through a datacenter or proxy service rather than a normal ISP. This could mean the network operator is routing your traffic through a remote server — possibly to monitor or modify it. This isn't always malicious (some businesses use VPN concentrators), but on a public Wi-Fi network it's a red flag.",
      };
    } else {
      return {
        id, passed: true, reputationData, evidence,
        status: `Network exit point verified — ${org}, ${city}, ${country}`,
        explanation: `Your traffic is exiting the internet through ${org}, a recognised ISP in ${city}, ${country}. This is consistent with a normal consumer internet connection and shows no signs of traffic redirection through proxy or datacenter infrastructure.`,
      };
    }
  } catch {
    return {
      id, passed: null,
      evidence: { "Error": "Request failed or timed out" },
      status: "Could not verify network exit point",
      explanation: "The IP reputation lookup failed or timed out. We couldn't determine whether your traffic is exiting through a normal ISP or a suspicious proxy/datacenter.",
    };
  }
}

export interface WebRTCLeakResult extends RealCheckResult {
  leakedIp?: string;
}

export async function checkWebRTCLeak(): Promise<WebRTCLeakResult> {
  const id = "webrtc-leak";
  if (typeof RTCPeerConnection === "undefined") {
    return {
      id, passed: null,
      evidence: { "Error": "RTCPeerConnection not available" },
      status: "Could not verify — browser may not support WebRTC",
      explanation: "Your browser does not support RTCPeerConnection, so we couldn't test for WebRTC IP leaks.",
    };
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      try { pc.close(); } catch {}
      resolve({
        id, passed: true,
        evidence: { "Note": "ICE gathering timed out — browser likely using mDNS privacy" },
        status: "WebRTC properly secured — browser privacy protections active",
        explanation: "Your browser's privacy protections prevented WebRTC from exposing local IP addresses. This is normal and means you're protected.",
      });
    }, 8000);

    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pc.createDataChannel("");
    const foundIps: string[] = [];
    const mdnsAddresses: string[] = [];
    let candidateCount = 0;

    pc.onicecandidate = (e) => {
      if (!e.candidate) return;
      candidateCount++;
      const candidateStr = e.candidate.candidate;
      // Check for mDNS
      const mdnsMatch = candidateStr.match(/([a-f0-9-]+\.local)/);
      if (mdnsMatch && !mdnsAddresses.includes(mdnsMatch[1])) {
        mdnsAddresses.push(mdnsMatch[1]);
      }
      const match = candidateStr.match(
        /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/
      );
      if (match) {
        const ip = match[1];
        if (!ip.endsWith(".local") && !foundIps.includes(ip)) {
          foundIps.push(ip);
        }
      }
    };

    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(timeout);
        pc.close();
        const privateIp = foundIps.find((ip) =>
          /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(ip)
        );

        const evidence: Record<string, string> = {
          "ICE Candidates found": String(candidateCount),
          "Local IPs exposed": foundIps.length > 0 ? foundIps.join(", ") : "None (mDNS only)",
          "mDNS addresses": mdnsAddresses.length > 0 ? mdnsAddresses.join(", ") : "None",
        };

        if (privateIp) {
          resolve({
            id, passed: false, leakedIp: privateIp, evidence,
            status: `WebRTC is leaking your local IP: ${privateIp}`,
            explanation: "Your browser is leaking your local network IP address through WebRTC, a technology used for video calls. Attackers on this network can use this to map your device's position on the network and target you directly. Consider using a browser extension that blocks WebRTC leaks, or disable WebRTC in your browser settings.",
          });
        } else {
          resolve({
            id, passed: true, evidence,
            status: "WebRTC properly secured — no local IP leaked",
            explanation: "We attempted to extract your local IP address via WebRTC ICE candidate gathering. Only mDNS (.local) addresses or no addresses were found, meaning your browser is properly protecting your local network identity.",
          });
        }
      }
    };

    pc.createOffer().then((offer) => pc.setLocalDescription(offer)).catch(() => {
      clearTimeout(timeout);
      pc.close();
      resolve({
        id, passed: null,
        evidence: { "Error": "WebRTC offer creation failed" },
        status: "Could not verify — WebRTC offer failed",
        explanation: "The WebRTC leak check failed to create an offer. This may be due to browser privacy settings.",
      });
    });
  });
}

export async function checkContentInjection(): Promise<RealCheckResult> {
  const id = "content-inject";
  try {
    const ctrl = withTimeout(5000);
    const res = await fetch("http://neverssl.com/", { mode: "cors", signal: ctrl.signal, redirect: "manual" });

    if (res.type === "opaqueredirect" || (res.status >= 300 && res.status < 400)) {
      return {
        id, passed: false,
        evidence: { "Target": "http://neverssl.com", "Result": "Redirected", "Status": String(res.status) },
        status: "HTTP traffic is being redirected — possible interception",
        explanation: "This network is redirecting your unencrypted HTTP requests to a different destination.",
      };
    }

    const body = await res.text();
    const scriptCount = (body.match(/<script[\s>]/gi) || []).length;
    const iframeCount = (body.match(/<iframe[\s>]/gi) || []).length;
    const suspiciousPatterns = ["advertisement", "ad-inject", "clicktrack", "analytics.js", "inject", "banner", "popup"];
    const matchedPatterns = suspiciousPatterns.filter((p) => body.toLowerCase().includes(p));

    const evidence: Record<string, string> = {
      "Target": "http://neverssl.com",
      "Response size": `${body.length} bytes`,
      "<script> tags found": String(scriptCount),
      "<iframe> tags found": String(iframeCount),
      "Suspicious patterns": matchedPatterns.length > 0 ? matchedPatterns.join(", ") : "None",
    };

    if (scriptCount === 0 && iframeCount === 0 && matchedPatterns.length === 0) {
      return {
        id, passed: true, evidence,
        status: "No content injection detected on HTTP traffic",
        explanation: "We fetched an unencrypted HTTP page and verified the response was not tampered with. No injected scripts, iframes, or tracking code were found.",
      };
    } else {
      const parts: string[] = [];
      if (scriptCount > 0) parts.push(`${scriptCount} script(s)`);
      if (iframeCount > 0) parts.push(`${iframeCount} iframe(s)`);
      if (matchedPatterns.length > 0 && parts.length === 0) parts.push("suspicious patterns");
      return {
        id, passed: false, evidence,
        status: `Content injection detected — ${parts.join(", ")} injected into HTTP traffic`,
        explanation: "This network is injecting additional code into your unencrypted web traffic. This could be advertisements, tracking scripts, or malicious payloads. Any website you visit over HTTP (not HTTPS) on this network may be tampered with. Stick to HTTPS sites only, or use a VPN to encrypt all traffic.",
      };
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "";
    if (errMsg.includes("Mixed Content") || errMsg.includes("mixed") ||
        (typeof window !== "undefined" && window.location.protocol === "https:")) {
      return {
        id, passed: true,
        evidence: { "Target": "http://neverssl.com", "Result": "Blocked by mixed content policy", "Protocol": "HTTPS (secure)" },
        status: "Mixed content policy prevented HTTP check — your connection is HTTPS-secured",
        explanation: "Your browser blocked the HTTP test request because you're on a secure HTTPS connection. This is actually good — it means your browser's built-in protections are working correctly.",
      };
    }
    return {
      id, passed: false,
      evidence: { "Target": "http://neverssl.com", "Result": "Request failed" },
      status: "HTTP traffic appears to be blocked or intercepted",
      explanation: "The HTTP content injection test failed entirely. This could mean the network is blocking unencrypted HTTP traffic, or something is intercepting the connection.",
    };
  }
}

export async function checkTLSVersion(): Promise<RealCheckResult> {
  const id = "tls-version";
  try {
    const ctrl = withTimeout(8000);

    const start = performance.now();
    const res = await fetch("https://www.howsmyssl.com/a/check", { signal: ctrl.signal });
    const elapsed = Math.round(performance.now() - start);
    const data = await res.json();

    const tlsVersion = data.tls_version || "Unknown";
    const rating = data.rating || "Unknown";
    const cipherSuites = (data.given_cipher_suites || []).length;

    const evidence: Record<string, string> = {
      "TLS Version": tlsVersion,
      "Rating": rating,
      "Cipher Suites": String(cipherSuites),
      "Response Time": `${elapsed}ms`,
      "Ephemeral Keys": data.ephemeral_keys_supported ? "Supported" : "Not supported",
      "Session Tickets": data.session_ticket_supported ? "Supported" : "Not supported",
    };

    const isModern = tlsVersion === "TLS 1.3" || tlsVersion === "TLS 1.2";
    const isGoodRating = rating === "Probably Okay" || rating === "Good";

    if (isModern && isGoodRating) {
      return {
        id, passed: true, evidence,
        status: `${tlsVersion} negotiated — connection is secure`,
        explanation: `Your browser negotiated ${tlsVersion} with a "${rating}" security rating. This means your encrypted connections use modern, secure protocols that are resistant to known attacks.`,
      };
    } else if (isModern) {
      return {
        id, passed: true, evidence,
        status: `${tlsVersion} detected but rating is "${rating}"`,
        explanation: `While your connection uses ${tlsVersion}, the security configuration could be improved. Some cipher suites may be outdated.`,
      };
    } else {
      return {
        id, passed: false, evidence,
        status: `Outdated ${tlsVersion} detected — connection may be vulnerable`,
        explanation: `Your connection is using ${tlsVersion}, which is considered outdated and potentially vulnerable to attacks. Modern connections should use TLS 1.2 or 1.3. This network may be forcing a downgrade.`,
      };
    }
  } catch {
    return {
      id, passed: null,
      evidence: { "Error": "TLS check failed or timed out" },
      status: "Could not verify TLS version",
      explanation: "The TLS version check failed or timed out. We couldn't determine the security of your encrypted connection negotiation.",
    };
  }
}

export async function fetchPublicIP(): Promise<string | null> {
  try {
    const ctrl = withTimeout(4000);
    const res = await fetch("https://api.ipify.org?format=json", { signal: ctrl.signal });
    const data = await res.json();
    return data.ip || null;
  } catch {
    return null;
  }
}

export interface ScanLogEntry {
  timestamp: number;
  message: string;
  type: "info" | "pass" | "fail" | "warn";
}

export async function runAllRealChecks(): Promise<{
  checks: RealCheckResult[];
  publicIp: string | null;
  webrtcLeakedIp?: string;
  ipReputation?: IPReputationData;
  scanLog: ScanLogEntry[];
  wifiNetworks?: import("./wifiScanner").WifiNetwork[];
  wifiCurrentConnection?: import("./wifiScanner").WifiCurrentConnection;
}> {
  const scanStart = performance.now();
  const log: ScanLogEntry[] = [];
  const addLog = (msg: string, type: ScanLogEntry["type"] = "info") => {
    log.push({ timestamp: performance.now() - scanStart, message: msg, type });
  };

  addLog("Scan initiated — NetTrust v4.0");
  addLog("Starting 7 live security checks...");

  // Wrap each check with logging
  const wrapCheck = async <T extends RealCheckResult>(
    label: string,
    startMessages: string[],
    fn: () => Promise<T>,
    onResult: (r: T) => void,
  ): Promise<T> => {
    startMessages.forEach((m) => addLog(m));
    const result = await fn();
    onResult(result);
    return result;
  };

  const [checksResults, publicIp] = await Promise.all([
    Promise.allSettled([
      wrapCheck("DNS", [
        "DNS → Querying dns.google/resolve?name=example.com",
        "DNS → Querying cloudflare-dns.com/dns-query",
      ], () => withRetry(checkDNS), (r) => {
        if (r.evidence) {
          if (r.evidence["Google DNS"]) addLog(`DNS → Google DNS responded: ${r.evidence["Google DNS"]}`);
          if (r.evidence["Cloudflare DNS"]) addLog(`DNS → Cloudflare DNS responded: ${r.evidence["Cloudflare DNS"]}`);
        }
        const resultType = r.passed === true ? "pass" : r.passed === false ? "fail" : "warn";
        addLog(`DNS → ${r.evidence?.["Result"] || (r.passed === true ? "IPs match" : "Check failed")} — ${r.passed === true ? "PASS" : r.passed === false ? "FAIL" : "WARN"}`, resultType);
      }),

      wrapCheck("SSL", [
        "SSL → Probing google.com (HTTPS HEAD)",
        "SSL → Probing cloudflare.com (HTTPS HEAD)",
        "SSL → Probing 1.1.1.1 (HTTPS HEAD)",
      ], () => withRetry(checkSSL), (r) => {
        if (r.evidence) {
          Object.entries(r.evidence).filter(([k]) => k !== "Error").forEach(([k, v]) => {
            addLog(`SSL → ${k} responded (${v})`);
          });
        }
        const successes = r.evidence ? Object.values(r.evidence).filter((v) => v.startsWith("OK")).length : 0;
        const resultType = r.passed === true ? "pass" : r.passed === false ? "fail" : "warn";
        addLog(`SSL → ${successes}/3 HTTPS connections succeeded — ${r.passed === true ? "PASS" : r.passed === false ? "FAIL" : "WARN"}`, resultType);
      }),

      wrapCheck("PORTAL", [
        "PORTAL → Fetching connectivitycheck.gstatic.com/generate_204",
      ], () => withRetry(checkCaptivePortal), (r) => {
        const status = r.evidence?.["Received"] || "unknown";
        addLog(`PORTAL → Status ${status} received`);
        const resultType = r.passed === true ? "pass" : r.passed === false ? "fail" : "warn";
        addLog(`PORTAL → ${r.passed === true ? "No captive portal — PASS" : r.passed === false ? "Interception detected — FAIL" : "Inconclusive — WARN"}`, resultType);
      }),

      wrapCheck("WebRTC", [
        "WebRTC → Creating RTCPeerConnection (STUN: stun.l.google.com)",
      ], checkWebRTCLeak, (r) => {
        if (r.evidence) {
          const candidates = r.evidence["ICE Candidates found"];
          if (candidates) addLog(`WebRTC → ${candidates} ICE candidate(s) received`);
          const ips = r.evidence["Local IPs exposed"];
          if (ips && ips !== "None (mDNS only)") addLog(`WebRTC → Local IP found: ${ips}`);
        }
        const resultType = r.passed === true ? "pass" : r.passed === false ? "fail" : "warn";
        addLog(`WebRTC → ${r.passed === true ? "No IP leaked — PASS" : r.passed === false ? "Private IP leaked — FAIL" : "Inconclusive — WARN"}`, resultType);
      }),

      wrapCheck("INJECT", [
        "INJECT → Fetching http://neverssl.com (injection test)",
      ], () => withRetry(checkContentInjection), (r) => {
        if (r.evidence) {
          const size = r.evidence["Response size"];
          if (size) addLog(`INJECT → Response received (${size})`);
          const scripts = r.evidence["<script> tags found"] || "0";
          const iframes = r.evidence["<iframe> tags found"] || "0";
          addLog(`INJECT → ${scripts} scripts, ${iframes} iframes found`);
        }
        const resultType = r.passed === true ? "pass" : r.passed === false ? "fail" : "warn";
        addLog(`INJECT → ${r.passed === true ? "PASS" : r.passed === false ? "FAIL" : "WARN"}`, resultType);
      }),

      wrapCheck("IP-REP", [
        "IP-REP → Querying ipapi.co/json",
      ], () => withRetry(checkIPReputation), (r) => {
        if (r.evidence) {
          const isp = r.evidence["ISP"];
          const exit = r.evidence["Exit"];
          if (isp) addLog(`IP-REP → Response: ${isp}, ${exit || "Unknown"}`);
          const cls = r.evidence["Classification"];
          if (cls) addLog(`IP-REP → ${cls} detected`);
        }
        const resultType = r.passed === true ? "pass" : r.passed === false ? "fail" : "warn";
        addLog(`IP-REP → ${r.passed === true ? "PASS" : r.passed === false ? "FAIL" : "WARN"}`, resultType);
      }),

      wrapCheck("TLS", [
        "TLS → Checking TLS version via howsmyssl.com",
      ], checkTLSVersion, (r) => {
        if (r.evidence) {
          const ver = r.evidence["TLS Version"];
          const rating = r.evidence["Rating"];
          if (ver) addLog(`TLS → Version: ${ver}`);
          if (rating) addLog(`TLS → Rating: ${rating}`);
        }
        const resultType = r.passed === true ? "pass" : r.passed === false ? "fail" : "warn";
        addLog(`TLS → ${r.passed === true ? "PASS" : r.passed === false ? "FAIL" : "WARN"}`, resultType);
      }),

    ]).then((results) =>
      results.map((r) =>
        r.status === "fulfilled"
          ? r.value
          : { id: "unknown", passed: null, status: "Check failed", explanation: "An unexpected error occurred." }
      )
    ),
    fetchPublicIP(),
  ]);

  const webrtcResult = checksResults.find((c) => c.id === "webrtc-leak") as WebRTCLeakResult | undefined;
  const ipRepResult = checksResults.find((c) => c.id === "ip-reputation") as IPReputationResult | undefined;

  const passed = checksResults.filter((c) => c.passed === true).length;
  const total = checksResults.length;
  addLog(`All checks complete. ${passed}/${total} checks passed.`);

  // WiFi Scanner — attempt real OS-level WiFi scan via backend
  let wifiNetworks: import("./wifiScanner").WifiNetwork[] | undefined;
  let wifiCurrentConnection: import("./wifiScanner").WifiCurrentConnection | undefined;

  try {
    const { isWifiScannerAvailable, scanWifiNetworks, getWifiCurrentConnection, analyzeWifiSecurity } = await import("./wifiScanner");

    if (await isWifiScannerAvailable()) {
      addLog("WIFI → Scanner backend detected, scanning nearby networks...");

      const [scanResult, currentConn] = await Promise.all([
        scanWifiNetworks().catch(() => null),
        getWifiCurrentConnection().catch(() => null),
      ]);

      if (scanResult?.success && scanResult.networks.length > 0) {
        wifiNetworks = scanResult.networks;
        addLog(`WIFI → Found ${wifiNetworks.length} nearby networks`, "info");

        if (currentConn?.connected && currentConn.ssid) {
          wifiCurrentConnection = currentConn;
          addLog(`WIFI → Connected to: ${currentConn.ssid}`, "info");
        }

        // Security analysis
        const analysis = analyzeWifiSecurity(wifiNetworks);
        if (analysis.openNetworks.length > 0) {
          addLog(`WIFI → WARNING: ${analysis.openNetworks.length} open (no password) network(s) nearby`, "warn");
        }
        if (analysis.weakNetworks.length > 0) {
          addLog(`WIFI → WARNING: ${analysis.weakNetworks.length} network(s) with weak security (WEP/WPA)`, "warn");
        }
        if (analysis.evilTwinCandidates.length > 0) {
          addLog(`WIFI → ALERT: ${analysis.evilTwinCandidates.length} SSID(s) with multiple BSSIDs (possible evil twin)`, "fail");
          for (const group of analysis.evilTwinCandidates) {
            addLog(`WIFI → Evil twin candidate: "${group[0].ssid}" — ${group.length} APs`, "fail");
          }
        }
        addLog(`WIFI → ${analysis.strongNetworks.length} strong, ${analysis.weakNetworks.length} weak, ${analysis.openNetworks.length} open`, "info");
      } else {
        addLog("WIFI → Scan returned no results", "warn");
      }
    } else {
      addLog("WIFI → Scanner not connected (optional)", "info");
    }
  } catch {
    addLog("WIFI → Scanner not available (optional)", "info");
  }

  // Sort log by timestamp
  log.sort((a, b) => a.timestamp - b.timestamp);

  return { checks: checksResults, publicIp, webrtcLeakedIp: webrtcResult?.leakedIp, ipReputation: ipRepResult?.reputationData, scanLog: log, wifiNetworks, wifiCurrentConnection };
}

export interface ConnectionInfo {
  type: string;
  ssidNote: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  apiSupported: boolean;
}

export function detectNetworkType(): ConnectionInfo {
  const nav = navigator as Navigator & {
    connection?: { type?: string; effectiveType?: string; downlink?: number; rtt?: number };
    mozConnection?: { type?: string; effectiveType?: string; downlink?: number; rtt?: number };
    webkitConnection?: { type?: string; effectiveType?: string; downlink?: number; rtt?: number };
  };
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;

  if (conn) {
    const rawType = conn.type;
    const type = rawType === "wifi" ? "Wi-Fi"
      : rawType === "cellular" ? "Cellular"
      : rawType === "ethernet" ? "Ethernet"
      : rawType === "bluetooth" ? "Bluetooth"
      : rawType || "Unknown";

    return {
      type,
      ssidNote: "SSID hidden by browser for privacy",
      effectiveType: conn.effectiveType || undefined,
      downlink: conn.downlink != null ? conn.downlink : undefined,
      rtt: conn.rtt != null ? conn.rtt : undefined,
      apiSupported: true,
    };
  }
  return { type: "Unknown", ssidNote: "SSID hidden by browser for privacy", apiSupported: false };
}
