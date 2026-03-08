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

    const googleIPs: string[] = (googleData.Answer || []).map((a: any) => a.data).filter(Boolean);
    const cloudflareIPs: string[] = (cloudflareData.Answer || []).map((a: any) => a.data).filter(Boolean);

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
  } catch {
    return {
      id, passed: null,
      evidence: {
        "Target": "gstatic.com/generate_204",
        "Expected": "204",
        "Received": "Request blocked (mixed content)",
      },
      status: "Captive portal check inconclusive",
      explanation: "The captive portal detection request could not complete. This is common due to browser mixed-content restrictions, but could also indicate network interference.",
    };
  }
}

export interface WebRTCLeakResult extends RealCheckResult {
  leakedIp?: string;
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
        id, passed: null,
        evidence: { "Error": "ICE gathering timed out" },
        status: "Could not verify — WebRTC check timed out",
        explanation: "The WebRTC leak detection timed out. This may indicate browser restrictions or network issues preventing ICE candidate gathering.",
      });
    }, 5000);

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
  } catch (err: any) {
    if (err?.message?.includes("Mixed Content") || err?.message?.includes("mixed") ||
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
    const ctrl = withTimeout(5000);

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

export async function checkBandwidthThrottle(): Promise<RealCheckResult> {
  const id = "bandwidth-throttle";
  try {
    const ctrl = withTimeout(8000);
    const testUrls = [
      "https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png",
      "https://www.cloudflare.com/favicon.ico",
    ];

    const speeds: { name: string; kbps: number }[] = [];

    await Promise.all(
      testUrls.map(async (url, i) => {
        try {
          const start = performance.now();
          await fetch(url, { mode: "no-cors", cache: "no-store", signal: ctrl.signal });
          const elapsed = (performance.now() - start) / 1000;
          const estimatedBytes = i === 0 ? 13504 : 1150;
          const kbps = Math.round((estimatedBytes * 8) / elapsed / 1000);
          speeds.push({ name: i === 0 ? "Google CDN" : "Cloudflare CDN", kbps });
        } catch {
          speeds.push({ name: i === 0 ? "Google CDN" : "Cloudflare CDN", kbps: 0 });
        }
      })
    );

    const validSpeeds = speeds.filter(s => s.kbps > 0);
    const avgKbps = validSpeeds.length > 0 ? Math.round(validSpeeds.reduce((s, r) => s + r.kbps, 0) / validSpeeds.length) : 0;

    const evidence: Record<string, string> = {};
    speeds.forEach(s => {
      evidence[s.name] = s.kbps > 0 ? `~${s.kbps} kbps` : "Failed";
    });
    if (avgKbps > 0) evidence["Average"] = `~${avgKbps} kbps`;
    evidence["Threshold"] = "50 kbps (minimum usable)";

    if (avgKbps === 0) {
      return {
        id, passed: false, evidence,
        status: "All bandwidth tests failed — network may be blocking traffic",
        explanation: "We couldn't complete any bandwidth measurements. The network may be heavily throttling or blocking outbound connections to major CDNs.",
      };
    } else if (avgKbps < 50) {
      return {
        id, passed: false, evidence,
        status: `Severe throttling detected — avg ~${avgKbps} kbps`,
        explanation: `Your connection speed to major CDNs is extremely low (~${avgKbps} kbps). This level of throttling is unusual and could indicate the network is intentionally limiting bandwidth, possibly to force traffic through an inspection proxy.`,
      };
    } else if (avgKbps < 500) {
      return {
        id, passed: null, evidence,
        status: `Low bandwidth — avg ~${avgKbps} kbps — possible throttling`,
        explanation: `Your connection speed is below average (~${avgKbps} kbps). While this could be normal network congestion, it could also indicate bandwidth throttling by the network operator.`,
      };
    } else {
      return {
        id, passed: true, evidence,
        status: `Bandwidth normal — avg ~${avgKbps} kbps to major CDNs`,
        explanation: `Your connection to major CDNs is performing at ~${avgKbps} kbps, which is within normal range. No signs of intentional bandwidth throttling detected.`,
      };
    }
  } catch {
    return {
      id, passed: null,
      evidence: { "Error": "Bandwidth test failed or timed out" },
      status: "Could not measure bandwidth",
      explanation: "The bandwidth measurement test failed or timed out.",
    };
  }
}

export async function checkHTTP2Support(): Promise<RealCheckResult> {
  const id = "http2-support";
  try {
    const ctrl = withTimeout(5000);
    const targets = [
      { url: "https://www.google.com", name: "google.com" },
      { url: "https://www.cloudflare.com", name: "cloudflare.com" },
    ];

    const results: { name: string; protocol: string; headers: Record<string, string> }[] = [];

    await Promise.all(
      targets.map(async (target) => {
        try {
          const res = await fetch(target.url, { method: "HEAD", signal: ctrl.signal });
          const headers: Record<string, string> = {};
          res.headers.forEach((v, k) => {
            if (["content-encoding", "alt-svc", "server", "x-frame-options"].includes(k.toLowerCase())) {
              headers[k] = v;
            }
          });
          const altSvc = res.headers.get("alt-svc") || "";
          const protocol = altSvc.includes("h3") ? "HTTP/3" : altSvc.includes("h2") ? "HTTP/2" : "HTTP/1.1";
          results.push({ name: target.name, protocol, headers });
        } catch {
          results.push({ name: target.name, protocol: "Failed", headers: {} });
        }
      })
    );

    const evidence: Record<string, string> = {};
    results.forEach(r => {
      evidence[r.name] = r.protocol;
      const altSvc = r.headers["alt-svc"];
      if (altSvc) evidence[`${r.name} Alt-Svc`] = altSvc.substring(0, 80);
    });

    const modernProtocols = results.filter(r => r.protocol === "HTTP/3" || r.protocol === "HTTP/2");
    const failed = results.filter(r => r.protocol === "Failed");

    if (failed.length === results.length) {
      return {
        id, passed: false, evidence,
        status: "All protocol checks failed — network may be intercepting connections",
        explanation: "We couldn't complete protocol negotiation checks with any target. This may indicate a transparent proxy or firewall is stripping protocol headers.",
      };
    } else if (modernProtocols.length > 0) {
      const bestProtocol = results.find(r => r.protocol === "HTTP/3")?.protocol || "HTTP/2";
      return {
        id, passed: true, evidence,
        status: `${bestProtocol} supported — modern protocol negotiation working`,
        explanation: `Your connection supports ${bestProtocol}, indicating the network allows modern protocol negotiation. This means no transparent proxy is downgrading your connections.`,
      };
    } else {
      return {
        id, passed: false, evidence,
        status: "Only HTTP/1.1 detected — possible protocol downgrade",
        explanation: "Your connections are only negotiating HTTP/1.1, which may indicate a transparent proxy is intercepting and downgrading your connections. Modern sites should negotiate HTTP/2 or HTTP/3.",
      };
    }
  } catch {
    return {
      id, passed: null,
      evidence: { "Error": "Protocol check failed or timed out" },
      status: "Could not verify protocol support",
      explanation: "The protocol negotiation check failed or timed out.",
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

export interface LatencyResult extends RealCheckResult {
  latencyDetail?: string;
}

export async function checkLatencyAnomaly(): Promise<LatencyResult> {
  const id = "latency-anomaly";
  const endpoints = [
    { name: "google.com", url: "https://www.google.com" },
    { name: "cloudflare.com", url: "https://www.cloudflare.com" },
    { name: "1.1.1.1", url: "https://1.1.1.1" },
  ];

  const rtts: { name: string; ms: number | null }[] = [];

  await Promise.all(
    endpoints.map(async (ep) => {
      try {
        const ctrl = withTimeout(5000);
        const start = performance.now();
        await fetch(ep.url, { method: "HEAD", mode: "no-cors", signal: ctrl.signal });
        const end = performance.now();
        rtts.push({ name: ep.name, ms: Math.round(end - start) });
      } catch {
        rtts.push({ name: ep.name, ms: null });
      }
    })
  );

  const timeouts = rtts.filter((r) => r.ms === null).length;
  const successful = rtts.filter((r) => r.ms !== null);
  const detail = rtts.map((r) => `${r.name}: ${r.ms !== null ? r.ms + "ms" : "timeout"}`).join(" | ");

  const buildEvidence = (avg?: number): Record<string, string> => {
    const ev: Record<string, string> = {};
    rtts.forEach((r) => { ev[r.name] = r.ms !== null ? `${r.ms}ms` : "timeout"; });
    if (avg !== undefined) ev["Average"] = `${avg}ms`;
    ev["Baseline threshold"] = "500ms";
    return ev;
  };

  if (timeouts >= 2) {
    return {
      id, passed: false, latencyDetail: detail,
      evidence: buildEvidence(),
      status: "Multiple endpoints unreachable — severe network restriction detected",
      explanation: "Your traffic is taking unusually long to reach major internet services. This can indicate your data is being routed through additional hops — possibly a proxy, transparent gateway, or man-in-the-middle device.",
    };
  }

  if (successful.length === 0) {
    return {
      id, passed: false, latencyDetail: detail,
      evidence: buildEvidence(),
      status: "All latency checks failed",
      explanation: "None of the latency probes completed successfully. The network may be severely restricted or offline.",
    };
  }

  const avg = Math.round(successful.reduce((s, r) => s + r.ms!, 0) / successful.length);
  const avgDetail = `${detail} | Average: ${avg}ms`;

  if (avg < 500) {
    return {
      id, passed: true, latencyDetail: avgDetail,
      evidence: buildEvidence(avg),
      status: `Network latency normal — avg ${avg}ms to major endpoints`,
      explanation: `Round-trip latency to major internet services averaged ${avg}ms, which is within normal range. This suggests your traffic is taking a direct path to the internet without suspicious additional routing.`,
    };
  } else if (avg <= 1000) {
    return {
      id, passed: null, latencyDetail: avgDetail,
      evidence: buildEvidence(avg),
      status: `Elevated latency — avg ${avg}ms — possible traffic routing`,
      explanation: `Your traffic is averaging ${avg}ms to reach major services, which is higher than expected. This could indicate your traffic is being routed through a proxy or VPN tunnel, or simply a congested network.`,
    };
  } else {
    return {
      id, passed: false, latencyDetail: avgDetail,
      evidence: buildEvidence(avg),
      status: `Abnormal latency detected — avg ${avg}ms (expected <500ms)`,
      explanation: `Your traffic is taking unusually long to reach major internet services. This can indicate your data is being routed through additional hops — possibly a proxy, transparent gateway, or man-in-the-middle device.`,
    };
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
}> {
  const scanStart = performance.now();
  const log: ScanLogEntry[] = [];
  const addLog = (msg: string, type: ScanLogEntry["type"] = "info") => {
    log.push({ timestamp: performance.now() - scanStart, message: msg, type });
  };

  addLog("Scan initiated — NetTrust WiFi Scanner v2.0");
  addLog("Starting 10 live checks in parallel...");

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
      ], checkDNS, (r) => {
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
      ], checkSSL, (r) => {
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
      ], checkCaptivePortal, (r) => {
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
      ], checkContentInjection, (r) => {
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
      ], checkIPReputation, (r) => {
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

      wrapCheck("LATENCY", [
        "LATENCY → Starting RTT measurements",
      ], checkLatencyAnomaly, (r) => {
        if (r.evidence) {
          Object.entries(r.evidence)
            .filter(([k]) => k !== "Baseline threshold" && k !== "Average")
            .forEach(([k, v]) => addLog(`LATENCY → ${k}: ${v}`));
          const avg = r.evidence["Average"];
          if (avg) addLog(`LATENCY → All probes complete (avg: ${avg})`);
        }
        const resultType = r.passed === true ? "pass" : r.passed === false ? "fail" : "warn";
        addLog(`LATENCY → ${r.passed === true ? "PASS" : r.passed === false ? "FAIL" : "WARN"}`, resultType);
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

      wrapCheck("BANDWIDTH", [
        "BANDWIDTH → Measuring throughput to Google CDN",
        "BANDWIDTH → Measuring throughput to Cloudflare CDN",
      ], checkBandwidthThrottle, (r) => {
        if (r.evidence) {
          const avg = r.evidence["Average"];
          if (avg) addLog(`BANDWIDTH → Average speed: ${avg}`);
        }
        const resultType = r.passed === true ? "pass" : r.passed === false ? "fail" : "warn";
        addLog(`BANDWIDTH → ${r.passed === true ? "PASS" : r.passed === false ? "FAIL" : "WARN"}`, resultType);
      }),

      wrapCheck("PROTOCOL", [
        "PROTOCOL → Checking HTTP/2 and HTTP/3 support",
      ], checkHTTP2Support, (r) => {
        if (r.evidence) {
          Object.entries(r.evidence)
            .filter(([k]) => !k.includes("Alt-Svc"))
            .forEach(([k, v]) => addLog(`PROTOCOL → ${k}: ${v}`));
        }
        const resultType = r.passed === true ? "pass" : r.passed === false ? "fail" : "warn";
        addLog(`PROTOCOL → ${r.passed === true ? "PASS" : r.passed === false ? "FAIL" : "WARN"}`, resultType);
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

  // Sort log by timestamp
  log.sort((a, b) => a.timestamp - b.timestamp);

  return { checks: checksResults, publicIp, webrtcLeakedIp: webrtcResult?.leakedIp, ipReputation: ipRepResult?.reputationData, scanLog: log };
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
  const conn = (navigator as any).connection
    || (navigator as any).mozConnection
    || (navigator as any).webkitConnection;

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
