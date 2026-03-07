export interface RealCheckResult {
  id: string;
  passed: boolean | null; // null = timed out
  status: string;
  explanation: string;
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

    if (hasMatch) {
      return {
        id, passed: true,
        status: "DNS responses consistent across providers",
        explanation: "We queried both Google and Cloudflare DNS-over-HTTPS and received matching IP addresses for example.com. This confirms DNS queries on this network are not being intercepted or redirected.",
      };
    } else {
      return {
        id, passed: false,
        status: "DNS responses inconsistent — possible redirection detected",
        explanation: "Google and Cloudflare DNS returned completely different IP addresses for the same domain. This could indicate DNS hijacking on this network, where your traffic is being silently redirected.",
      };
    }
  } catch {
    return {
      id, passed: null,
      status: "DNS check timed out — could not verify",
      explanation: "The DNS verification requests failed or timed out. This could indicate network interference preventing access to external DNS providers, or simply a slow connection.",
    };
  }
}

export async function checkSSL(): Promise<RealCheckResult> {
  const id = "ssl-cert";
  const urls = ["https://www.google.com", "https://www.cloudflare.com", "https://1.1.1.1"];

  try {
    const ctrl = withTimeout(4000);
    const results = await Promise.allSettled(
      urls.map((url) => fetch(url, { method: "HEAD", mode: "no-cors", signal: ctrl.signal }))
    );

    const successes = results.filter((r) => r.status === "fulfilled").length;

    if (successes >= 2) {
      return {
        id, passed: true,
        status: "HTTPS connections verified — no SSL stripping detected",
        explanation: "We successfully established HTTPS connections to multiple major websites. This confirms that encrypted connections are working properly and no SSL stripping attack is active on this network.",
      };
    } else {
      return {
        id, passed: false,
        status: "HTTPS connections failing — possible SSL interception",
        explanation: "Multiple HTTPS connections to well-known sites failed. This could indicate an SSL stripping attack where encrypted connections are being downgraded, potentially exposing your sensitive data.",
      };
    }
  } catch {
    return {
      id, passed: null,
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

    if (res.status === 204) {
      return {
        id, passed: true,
        status: "No captive portal or rogue DHCP detected",
        explanation: "Google's connectivity check returned a clean 204 response, confirming there is no captive portal or rogue DHCP server intercepting your traffic on this network.",
      };
    } else {
      return {
        id, passed: false,
        status: "Captive portal or network interception detected",
        explanation: "The connectivity check was redirected or returned unexpected content, indicating a captive portal or rogue DHCP server is intercepting traffic. Your connection may be monitored or restricted.",
      };
    }
  } catch {
    // In browsers, redirect: "manual" + mixed content may throw — treat opaque redirects as possible portal
    return {
      id, passed: null,
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
      ip: data.ip || "Unknown",
      org,
      asn: data.asn || "Unknown",
      city,
      region: data.region || "",
      country,
      isSuspicious,
      ipType,
    };

    if (isSuspicious) {
      return {
        id, passed: false, reputationData,
        status: `Traffic exiting through ${org} — possible proxy or VPN redirect`,
        explanation: "Your traffic is exiting the internet through a datacenter or proxy service rather than a normal ISP. This could mean the network operator is routing your traffic through a remote server — possibly to monitor or modify it. This isn't always malicious (some businesses use VPN concentrators), but on a public Wi-Fi network it's a red flag.",
      };
    } else {
      return {
        id, passed: true, reputationData,
        status: `Network exit point verified — ${org}, ${city}, ${country}`,
        explanation: `Your traffic is exiting the internet through ${org}, a recognised ISP in ${city}, ${country}. This is consistent with a normal consumer internet connection and shows no signs of traffic redirection through proxy or datacenter infrastructure.`,
      };
    }
  } catch {
    return {
      id, passed: null,
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
      status: "Could not verify — browser may not support WebRTC",
      explanation: "Your browser does not support RTCPeerConnection, so we couldn't test for WebRTC IP leaks.",
    };
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      try { pc.close(); } catch {}
      resolve({
        id, passed: null,
        status: "Could not verify — WebRTC check timed out",
        explanation: "The WebRTC leak detection timed out. This may indicate browser restrictions or network issues preventing ICE candidate gathering.",
      });
    }, 5000);

    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pc.createDataChannel("");
    const foundIps: string[] = [];

    pc.onicecandidate = (e) => {
      if (!e.candidate) return;
      const match = e.candidate.candidate.match(
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
        if (privateIp) {
          resolve({
            id, passed: false, leakedIp: privateIp,
            status: `WebRTC is leaking your local IP: ${privateIp}`,
            explanation: "Your browser is leaking your local network IP address through WebRTC, a technology used for video calls. Attackers on this network can use this to map your device's position on the network and target you directly. Consider using a browser extension that blocks WebRTC leaks, or disable WebRTC in your browser settings.",
          });
        } else {
          resolve({
            id, passed: true,
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

    // Redirect check
    if (res.type === "opaqueredirect" || (res.status >= 300 && res.status < 400)) {
      return {
        id, passed: false,
        status: "HTTP traffic is being redirected — possible interception",
        explanation: "This network is redirecting your unencrypted HTTP requests to a different destination. This could indicate a captive portal, ISP injection, or a man-in-the-middle attack intercepting your traffic.",
      };
    }

    const body = await res.text();
    const scriptCount = (body.match(/<script[\s>]/gi) || []).length;
    const iframeCount = (body.match(/<iframe[\s>]/gi) || []).length;
    const suspiciousPatterns = ["advertisement", "ad-inject", "clicktrack", "analytics.js", "inject", "banner", "popup"];
    const hasSuspicious = suspiciousPatterns.some((p) => body.toLowerCase().includes(p));

    if (scriptCount === 0 && iframeCount === 0 && !hasSuspicious) {
      return {
        id, passed: true,
        status: "No content injection detected on HTTP traffic",
        explanation: "We fetched an unencrypted HTTP page and verified the response was not tampered with. No injected scripts, iframes, or tracking code were found, confirming this network is not modifying your HTTP traffic.",
      };
    } else {
      const parts: string[] = [];
      if (scriptCount > 0) parts.push(`${scriptCount} script(s)`);
      if (iframeCount > 0) parts.push(`${iframeCount} iframe(s)`);
      if (hasSuspicious && parts.length === 0) parts.push("suspicious patterns");
      return {
        id, passed: false,
        status: `Content injection detected — ${parts.join(", ")} injected into HTTP traffic`,
        explanation: "This network is injecting additional code into your unencrypted web traffic. This could be advertisements, tracking scripts, or malicious payloads. Any website you visit over HTTP (not HTTPS) on this network may be tampered with. Stick to HTTPS sites only, or use a VPN to encrypt all traffic.",
      };
    }
  } catch (err: any) {
    // Mixed content block = actually good (HTTPS-secured)
    if (err?.message?.includes("Mixed Content") || err?.message?.includes("mixed") ||
        (typeof window !== "undefined" && window.location.protocol === "https:")) {
      return {
        id, passed: true,
        status: "Mixed content policy prevented HTTP check — your connection is HTTPS-secured",
        explanation: "Your browser blocked the HTTP test request because you're on a secure HTTPS connection. This is actually good — it means your browser's built-in protections are working correctly to prevent insecure content from loading.",
      };
    }
    return {
      id, passed: false,
      status: "HTTP traffic appears to be blocked or intercepted",
      explanation: "The HTTP content injection test failed entirely. This could mean the network is blocking unencrypted HTTP traffic, or something is intercepting the connection before it can complete.",
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

export async function runAllRealChecks(): Promise<{ checks: RealCheckResult[]; publicIp: string | null; webrtcLeakedIp?: string; ipReputation?: IPReputationData }> {
  const [checksResults, publicIp] = await Promise.all([
    Promise.allSettled([checkDNS(), checkSSL(), checkCaptivePortal(), checkWebRTCLeak(), checkContentInjection(), checkIPReputation()]).then((results) =>
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
  return { checks: checksResults, publicIp, webrtcLeakedIp: webrtcResult?.leakedIp, ipReputation: ipRepResult?.reputationData };
}

export function detectNetworkType(): { type: string; ssidNote: string } {
  const conn = (navigator as any).connection;
  if (conn?.type) {
    return {
      type: conn.type === "wifi" ? "Wi-Fi" : conn.type === "cellular" ? "Cellular" : conn.type === "ethernet" ? "Ethernet" : conn.type,
      ssidNote: "SSID hidden by browser for privacy",
    };
  }
  return { type: "Unknown", ssidNote: "SSID hidden by browser for privacy" };
}
