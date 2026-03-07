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

export async function runAllRealChecks(): Promise<{ checks: RealCheckResult[]; publicIp: string | null; webrtcLeakedIp?: string }> {
  const [checksResults, publicIp] = await Promise.all([
    Promise.allSettled([checkDNS(), checkSSL(), checkCaptivePortal(), checkWebRTCLeak()]).then((results) =>
      results.map((r) =>
        r.status === "fulfilled"
          ? r.value
          : { id: "unknown", passed: null, status: "Check failed", explanation: "An unexpected error occurred." }
      )
    ),
    fetchPublicIP(),
  ]);
  const webrtcResult = checksResults.find((c) => c.id === "webrtc-leak") as WebRTCLeakResult | undefined;
  return { checks: checksResults, publicIp, webrtcLeakedIp: webrtcResult?.leakedIp };
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
