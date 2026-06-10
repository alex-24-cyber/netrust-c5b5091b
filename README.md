# NetTrust — WiFi Security Scanner

**Is this WiFi safe to use?** NetTrust answers that question in a few seconds,
right in the browser. Tap once and it runs seven live security checks against
your real connection, then gives you a plain-English verdict — **Safe**,
**Be Careful**, or **Not Safe** — with clear advice on what to do next.

Built for the traveller in an airport lounge *and* the engineer who wants to
see the receipts. No account, no tracking, nothing leaves your device.

---

## What it checks

Every check runs live against your actual connection — there is no mock data.

| Check | What it catches | Severity |
| --- | --- | --- |
| **DNS Integrity** | DNS hijacking / redirection to fake sites | Critical |
| **Rogue Gateway / Captive Portal** | A rogue device intercepting your traffic | Critical |
| **HTTPS / SSL** | SSL stripping and downgrade attacks | Critical |
| **Content Injection** | Ads, trackers, or malware injected into HTTP pages | Critical |
| **TLS Version** | Forced downgrades to outdated, breakable encryption | High |
| **Public IP Reputation** | Traffic exiting through a proxy/datacenter instead of a real ISP | Medium |
| **WebRTC Leak** | Your local device address leaking through the browser | Low |

## The trust score

NetTrust doesn't just average the checks. The scoring engine
(`src/lib/scoring.ts`) is built to be honest:

- **Severity-weighted.** A DNS-hijack detection counts far more than an old TLS
  cipher. The seven weights sum to 100.
- **Confidence-aware.** Checks that can't complete are *excluded* from the
  math, not awarded partial credit. You always see how much of the network we
  could actually verify — and if too little completed, NetTrust says
  **"Unverified"** rather than guessing.
- **Critical-failure override.** If any critical check confidently fails, the
  score is capped into the danger band. The app will never tell you a network
  is "82/100, looks good" while your DNS is being hijacked.

## Two levels, one scan — Simple and Expert

A toggle in the header switches the depth of explanation without changing the
underlying scan:

- **Simple** — plain-English verdicts, clear next steps, zero jargon.
- **Expert** — adds the full scoring breakdown, per-check severity weights, raw
  evidence for every probe, and a timestamped live scan log.

## Install it

NetTrust is a Progressive Web App. On a supported browser you can add it to your
home screen (look for **Install NetTrust** under *More*, or your browser's
install affordance). Once installed it launches full-screen and loads instantly
offline — though a scan, of course, needs a live connection to test.

The service worker (`public/sw.js`) caches only the app shell. It deliberately
**never** caches the security probes, so every scan reflects the network you're
on right now.

## Privacy

- No account, no sign-in.
- No analytics, no tracking, no telemetry.
- All checks run in your browser; scan history and network fingerprints live in
  `localStorage` on your device and can be erased at any time from the *More*
  tab.

## Tech stack

Vite · React 18 · TypeScript · Tailwind CSS · lucide-react. No UI framework
lock-in — the component layer is hand-rolled and dependency-light.

## Develop

```sh
npm install      # install dependencies
npm run dev      # start the dev server (http://localhost:8080)
npm run build    # production build to dist/
npm run preview  # preview the production build
npm test         # run the unit tests (Vitest)
npm run lint     # lint
```

### Project layout

```
src/
  lib/
    networkChecks.ts      # the seven live security probes
    scoring.ts            # severity-weighted trust-score engine
    networkFingerprint.ts # per-network fingerprinting + change detection
    report.ts             # downloadable text report
    userMode.ts           # Simple / Expert preference
    wifiScanner.ts        # optional local backend for OS-level WiFi scanning
  components/             # screens and UI
  pages/Index.tsx         # app shell and state
  test/                   # Vitest unit tests
public/
  manifest.webmanifest    # PWA manifest
  sw.js                   # offline service worker (shell-only)
  icon.svg                # app icon
```

## Optional: nearby-network scanning

The browser can't see other SSIDs for privacy reasons. If you run the optional
local scanner backend (`http://localhost:3001`), NetTrust will additionally map
nearby networks and flag open networks, weak encryption, and **evil-twin** access
points (one SSID broadcasting from multiple BSSIDs). Without the backend, the
seven in-browser checks run exactly as described — it's purely additive.

---

NetTrust is an informational tool, not a substitute for a professional security
audit. Only scan networks you're authorised to use.
