/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ExamQuestion } from '../../src/types.js';

export const EXAM_BANK_PART_2: ExamQuestion[] = [
  // =========================================================================
  // CHAPTER 6: Real-Time TopoJSON Geodesic Incursion Telemetry (Q-111 to Q-132)
  // =========================================================================
  {
    id: 'Q-111',
    chapterNumber: 6,
    topic: 'Chapter 6: Real-Time TopoJSON Geodesic Incursion Telemetry',
    difficulty: 'Hard',
    question: 'In `RealTimeMap.tsx`, which combination of libraries and geographic projection renders continents and country boundaries onto the EncDec Threat Map?',
    options: [
      '`topojson-client` decoding topological arcs passed into `d3.geoNaturalEarth1()` and `d3.geoPath()`',
      'Google Maps Raster Tiles streamed over WebRTC Canvas pixels',
      '`leaflet-heatmap` using Web Mercator EPSG:3857 bitmap tiles',
      '`three.js` computing unprojected polar azimuthal heights'
    ],
    correctIndex: 0,
    explanation: 'Chapter 6 details `topojson-client` decoding TopoJSON geometries into `d3.geoNaturalEarth1()` and `d3.geoPath()` SVG vectors.'
  },
  {
    id: 'Q-112',
    chapterNumber: 6,
    topic: 'Chapter 6: Real-Time TopoJSON Geodesic Incursion Telemetry',
    difficulty: 'Advanced',
    question: 'Why does TopoJSON typically achieve up to ~80% smaller payload sizes than equivalent GeoJSON for world country boundary datasets?',
    options: [
      'TopoJSON deletes Antarctica and all island nations automatically.',
      'TopoJSON eliminates duplicate shared borders by encoding deduplicated quantized integer arcs referenced by adjacent polygons rather than repeating boundary coordinate arrays.',
      'TopoJSON converts latitude/longitude values into 16-color GIF palettes.',
      'TopoJSON stores coordinates exclusively inside MSSQL stored procedures.'
    ],
    correctIndex: 1,
    explanation: 'Unlike GeoJSON where neighboring borders are stored twice, TopoJSON stores shared boundaries once as quantized integer arcs and stitches polygons via arc references.'
  },
  {
    id: 'Q-113',
    chapterNumber: 6,
    topic: 'Chapter 6: Real-Time TopoJSON Geodesic Incursion Telemetry',
    difficulty: 'Hard',
    question: 'Which SVG path syntax renders the curved incursion trajectories animating attack vectors from origin hotspots to defended target infrastructure in EncDec?',
    options: [
      'Linear polyline segments `L x y` without control points',
      'Quadratic Bézier curves `M sx sy Q mx my tx ty` computed across projected Natural Earth coordinates',
      'Static JPEG sprites rotated by CSS `transform: skewX`',
      'Unbounded cubic spline polynomials rendered via `eval()`'
    ],
    correctIndex: 1,
    explanation: 'EncDec calculates Quadratic Bézier paths (`M sx sy Q mx my tx ty`) with elevated midpoint control coordinates `(mx, my)` to create clear geodesic incursion arcs.'
  },
  {
    id: 'Q-114',
    chapterNumber: 6,
    topic: 'Chapter 6: Real-Time TopoJSON Geodesic Incursion Telemetry',
    difficulty: 'Advanced',
    question: 'In SVG Quadratic Bézier syntax `M sx sy Q mx my tx ty`, what geometric property determines the apex height of the attack arc at parameter `t = 0.5`?',
    options: [
      'The midpoint lies strictly on the straight chord joining `(sx, sy)` and `(tx, ty)`.',
      'Evaluating `B(0.5) = 0.25*P0 + 0.5*P1 + 0.25*P2` places the curve apex halfway toward the elevated perpendicular control point `(mx, my)` relative to the chord midpoint.',
      'The control point `(mx, my)` must always equal `(0, 0)` at the North Pole.',
      'The SVG `viewBox` width divides the Euclidean distance by `Math.PI` squared.'
    ],
    correctIndex: 1,
    explanation: 'For a quadratic Bézier curve `B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2`, at `t=0.5`, `B(0.5) = (P0 + 2P1 + P2)/4`, smoothly bowing the arc toward control point `P1=(mx, my)`.'
  },
  {
    id: 'Q-115',
    chapterNumber: 6,
    topic: 'Chapter 6: Real-Time TopoJSON Geodesic Incursion Telemetry',
    difficulty: 'Hard',
    question: 'Why is `d3.geoNaturalEarth1()` advantageous over a standard Web Mercator projection for a global SOC Incursion Threat Map?',
    options: [
      'Natural Earth is a pseudocylindrical compromise projection that renders the whole globe without extreme polar area inflation or cutting off Antarctica/high latitudes.',
      'Web Mercator cannot project coordinates in the Southern Hemisphere.',
      'Natural Earth automatically geolocates private RFC 1918 IP addresses to real street addresses.',
      'Web Mercator only supports 8-bit grayscale SVGs.'
    ],
    correctIndex: 0,
    explanation: 'Web Mercator blows up high-latitude regions toward infinity; Natural Earth preserves balanced continental proportions and shows the entire globe cleanly.'
  },
  {
    id: 'Q-116',
    chapterNumber: 6,
    topic: 'Chapter 6: Real-Time TopoJSON Geodesic Incursion Telemetry',
    difficulty: 'Hard',
    question: 'Why does EncDec bundle offline world topologies inside the client build alongside `RealTimeMap.tsx`?',
    options: [
      'So air-gapped or strictly egress-firewalled SCIF/SOC environments render full geographic telemetry with zero external CDN dependencies.',
      'Because browsers block JSON files served from the same localhost origin.',
      'To leak internal firewall topologies to public map tile servers.',
      'Because `topojson-client` forbids online HTTP fetching.'
    ],
    correctIndex: 0,
    explanation: 'High-security SOC consoles frequently lack outbound public internet access; bundled offline topologies ensure zero-dependency rendering reliability.'
  },
  {
    id: 'Q-117',
    chapterNumber: 6,
    topic: 'Chapter 6: Real-Time TopoJSON Geodesic Incursion Telemetry',
    difficulty: 'Advanced',
    question: 'How does the D3 transition loop smoothly move an incursion projectile particle along an arbitrary Quadratic Bézier SVG path element without manual trigonometry per frame?',
    options: [
      'By calling `pathNode.getTotalLength()` and interpolating `pathNode.getPointAtLength(t * totalLength)` across `t ∈ [0, 1]` inside a custom D3 attrTween.',
      'By recompiling the entire React DOM tree at 120 Hz via `localStorage`.',
      'By sending HTTP POST requests for every animation pixel.',
      'By rendering 360 hidden `<img>` elements along the curve.'
    ],
    correctIndex: 0,
    explanation: 'SVGPathElement’s native `getTotalLength()` and `getPointAtLength()` compute exact arc-length parameterized `(x, y)` coordinates along the Bézier curve for constant-velocity animation.'
  },
  {
    id: 'Q-118',
    chapterNumber: 6,
    topic: 'Chapter 6: Real-Time TopoJSON Geodesic Incursion Telemetry',
    difficulty: 'Hard',
    question: 'What visual mechanism on `RealTimeMap.tsx` communicates attack severity at origin threat hotspots (e.g., Frankfurt, Ashburn, Beijing, São Paulo)?',
    options: [
      'Static grey text labels without motion',
      'Pulsing concentric SVG radar rings expanding and fading rhythmically scaled to attack severity',
      'Audible system beep alarms using Flash Player',
      'Fullscreen browser `window.alert()` popups'
    ],
    correctIndex: 1,
    explanation: 'Origin hotspots display pulsing concentric SVG radar rings whose rhythm and prominence mirror incoming attack severity.'
  },
  {
    id: 'Q-119',
    chapterNumber: 6,
    topic: 'Chapter 6: Real-Time TopoJSON Geodesic Incursion Telemetry',
    difficulty: 'Hard',
    question: 'What visual feedback executes at the defended target node anchor when an incursion projectile arrives at `(tx, ty)`?',
    options: [
      'The target server shuts down via ACPI poweroff.',
      'An animated rotating radar sweep ring and destination ripple shockwave trigger around the shielded target node.',
      'The map resets its scale to 0x0 pixels.',
      'All resolved alerts revert to unhandled status.'
    ],
    correctIndex: 1,
    explanation: 'Arrival triggers a destination ripple shockwave paired with the rotating radar sweep ring and cyber glow filter on the protected node.'
  },
  {
    id: 'Q-120',
    chapterNumber: 6,
    topic: 'Chapter 6: Real-Time TopoJSON Geodesic Incursion Telemetry',
    difficulty: 'Advanced',
    question: 'Suppose an incoming alert carries a spoofed source IP from an unroutable bogon prefix (`198.51.100.0/24` TEST-NET-2) or RFC 1918 LAN (`10.x.x.x`). What architectural nuance must an analyst keep in mind when interpreting map origin arcs?',
    options: [
      'MaxMind/GeoIP databases map RFC 1918 addresses directly to Antarctica.',
      'Geolocation cannot pinpoint real physical attackers behind spoofed stateless UDP/SYN headers or private internal lateral hosts, so fallback coordinates/markers represent telemetry heuristics rather than verified legal attribution.',
      'Bogon IPs automatically crash `d3.geoNaturalEarth1()`.',
      'TopoJSON converts bogon IPs into SHA-256 certificates.'
    ],
    correctIndex: 1,
    explanation: 'Stateless spoofed packets (e.g., SYN floods) and NAT/VPN relays can misrepresent true physical origin; analysts distinguish synthetic/mapped telemetry from confirmed attribution.'
  },
  {
    id: 'Q-121',
    chapterNumber: 6,
    topic: 'Chapter 6: Real-Time TopoJSON Geodesic Incursion Telemetry',
    difficulty: 'Hard',
    question: 'How does `RealTimeMap.tsx` maintain zero-latency synchronization when Suricata, Zeek, or Host anomalies arrive in the SOC stream?',
    options: [
      'The component accepts the live `alerts` prop and resolves origin coordinates dynamically as alerts stream in.',
      'An operator must manually upload a CSV coordinates file every 5 minutes.',
      'It polls Cloud Firestore once every 24 hours at midnight.',
      'It reads coordinates exclusively from browser bookmarks.'
    ],
    correctIndex: 0,
    explanation: 'Passing the live reactive `alerts` stream directly as a prop lets `RealTimeMap.tsx` resolve and animate new incursion vectors immediately.'
  },
  {
    id: 'Q-122',
    chapterNumber: 6,
    topic: 'Chapter 6: Real-Time TopoJSON Geodesic Incursion Telemetry',
    difficulty: 'Advanced',
    question: 'Why must React unmount / cleanup hooks cancel active D3 `.transition()` timers inside `RealTimeMap.tsx` when an analyst navigates away from the threat map view?',
    options: [
      'To prevent detached DOM timer leaks, runaway animation callbacks updating unmounted `<svg>` nodes, and memory growth across long SOC shifts.',
      'Because browsers prohibit more than two SVG `<path>` elements per origin.',
      'Because failing to clear D3 transitions deletes `workbookProgress` in Firestore.',
      'To rotate the Admin Gmail OAuth access token.'
    ],
    correctIndex: 0,
    explanation: 'Continuous D3 animation loops can hold references to detached DOM nodes or fire callbacks post-unmount unless `.interrupt()` and cleanup intervals run on unmount.'
  },
  {
    id: 'Q-123',
    chapterNumber: 6,
    topic: 'Chapter 6: Real-Time TopoJSON Geodesic Incursion Telemetry',
    difficulty: 'Hard',
    question: 'What transformation does `topojson.feature(topology, topology.objects.countries)` perform before `d3.geoPath()` draws SVG land masses?',
    options: [
      'Encrypts country coordinates using AES-256-GCM.',
      'Converts quantized TopoJSON delta-encoded arcs back into standard GeoJSON Feature/FeatureCollection polygon geometries.',
      'Translates SVG strokes directly into MSSQL binary BLOBs.',
      'Applies MITRE ATT&CK technique tags to ocean grids.'
    ],
    correctIndex: 1,
    explanation: '`topojson-client`’s `feature()` method reconstructs standard GeoJSON polygon geometry objects from compact TopoJSON arcs so `d3.geoPath` can project them.'
  },
  {
    id: 'Q-124',
    chapterNumber: 6,
    topic: 'Chapter 6: Real-Time TopoJSON Geodesic Incursion Telemetry',
    difficulty: 'Advanced',
    question: 'When drawing a geodesic or projected Bézier arc from Tokyo `(139.69° E)` to San Francisco `(-122.41° W)` across the Pacific antimeridian (`±180°` longitude), what visual artifact occurs if naive linear screen-space midpoint interpolation is not bounded or curated?',
    options: [
      'The arc wraps seamlessly outside the SVG viewport without any visual trace.',
      'Naively projecting endpoints at far left/right map edges stretches a huge horizontal line straight across Europe and Asia instead of crossing the Pacific unless antimeridian-aware clipping/projection is handled.',
      'D3 automatically swaps latitude and longitude coordinates.',
      'The browser throws a synchronous SQL syntax exception.'
    ],
    correctIndex: 1,
    explanation: 'On planar projections split at `±180°`, endpoints at opposite edges produce screen-spanning chords unless paths use spherical geodesic clipping (`d3.geoInterpolate`) or projected arc safeguards.'
  },
  {
    id: 'Q-125',
    chapterNumber: 6,
    topic: 'Chapter 6: Real-Time TopoJSON Geodesic Incursion Telemetry',
    difficulty: 'Hard',
    question: 'What SVG filter capability enhances threat trajectories and target shield telemetry visibility in dark SOC environments?',
    options: [
      'A cyber glow filter (`feGaussianBlur` + `feMerge`) giving arcs and shield rings high visual contrast against dark backgrounds',
      'An `<audio>` waveform equalizer filter',
      'A grayscale print-only DPI downsampler',
      'An `eval()`-based CSS parser'
    ],
    correctIndex: 0,
    explanation: 'SVG glow filters (`feGaussianBlur` composited via `feMerge`) make active projectiles and shield rings immediately scannable on dark command displays.'
  },
  {
    id: 'Q-126',
    chapterNumber: 6,
    topic: 'Chapter 6: Real-Time TopoJSON Geodesic Incursion Telemetry',
    difficulty: 'Hard',
    question: 'Which specific D3 path generator consumes GeoJSON geometries + a configured projection function to produce SVG `d="..."` attribute strings?',
    options: [
      '`d3.geoPath().projection(projection)`',
      '`d3.csvParse()`',
      '`d3.scaleOrdinal()`',
      '`d3.forceSimulation()`'
    ],
    correctIndex: 0,
    explanation: '`d3.geoPath()` converts projected GeoJSON polygon/line geometries into valid SVG `<path d="...">` strings.'
  },
  {
    id: 'Q-127',
    chapterNumber: 6,
    topic: 'Chapter 6: Real-Time TopoJSON Geodesic Incursion Telemetry',
    difficulty: 'Advanced',
    question: 'Why does `RealTimeMap.tsx` provide GPU-accelerated, crisp visualization across 4K SOC video walls and compact analyst laptops alike?',
    options: [
      'Vector SVG paths scale resolution-independently from mathematical coordinates and transform compositing without raster pixelation.',
      'It pre-renders 12 distinct 8K PNG screenshots on startup.',
      'It lowers monitor DPI down to 720p automatically.',
      'It offloads SVG parsing onto Cloud Firestore triggers.'
    ],
    correctIndex: 0,
    explanation: 'Mathematical SVG vector paths and CSS/compositor opacity/transform transitions remain razor-sharp at any display density without raster blur.'
  },
  {
    id: 'Q-128',
    chapterNumber: 6,
    topic: 'Chapter 6: Real-Time TopoJSON Geodesic Incursion Telemetry',
    difficulty: 'Hard',
    question: 'During a distributed botnet brute-force surge hitting from multiple continents simultaneously, what immediate operational insight does the Geo-Radar provide?',
    options: [
      'Distinguishes geographically distributed multi-origin DDoS/credential-stuffing bursts from isolated single-region probes visually within seconds.',
      'Automatically decrypts SSH private keys on remote botnet hosts.',
      'Replaces the need for SIEM audit logging.',
      'Grants admin subscription status to visiting analysts.'
    ],
    correctIndex: 0,
    explanation: 'Chapter 6 emphasizes immediate spatial awareness during distributed brute-force or DDoS surges when simultaneous arcs converge from disparate global hotspots.'
  },
  {
    id: 'Q-129',
    chapterNumber: 6,
    topic: 'Chapter 6: Real-Time TopoJSON Geodesic Incursion Telemetry',
    difficulty: 'Hard',
    question: 'In `M sx sy Q mx my tx ty`, which two coordinate pairs define the starting source hotspot and the ending defended node?',
    options: [
      '`(sx, sy)` is the source origin hotspot; `(tx, ty)` is the target defended infrastructure',
      '`(mx, my)` is the source hotspot; `(sx, sy)` is the ocean center',
      '`(tx, ty)` is the source hotspot; `(mx, my)` is the target infrastructure',
      'All three pairs represent identical browser viewport corners'
    ],
    correctIndex: 0,
    explanation: '`M sx sy` moves to the starting source coordinates `(sx, sy)`, and `Q mx my tx ty` curves through control `(mx, my)` to endpoint target `(tx, ty)`.'
  },
  {
    id: 'Q-130',
    chapterNumber: 6,
    topic: 'Chapter 6: Real-Time TopoJSON Geodesic Incursion Telemetry',
    difficulty: 'Advanced',
    question: 'What mathematical reason explains why `d3.geoNaturalEarth1().fitSize([width, height], geojson)` is preferred over hardcoding magic scale/translate pixels across responsive containers?',
    options: [
      '`fitSize` dynamically computes optimal scale and `[tx, ty]` translation bounding the exact TopoJSON landmass geometry inside any responsive container aspect ratio.',
      '`fitSize` prevents users from resizing browser windows.',
      'Hardcoded pixel translations always invert North and South latitudes.',
      '`fitSize` converts Natural Earth into Mercator automatically on mobile screens.'
    ],
    correctIndex: 0,
    explanation: '`fitSize([width, height], feature)` guarantees the projected world fills the responsive container cleanly without clipping continents on desktop or mobile viewports.'
  },
  {
    id: 'Q-131',
    chapterNumber: 6,
    topic: 'Chapter 6: Real-Time TopoJSON Geodesic Incursion Telemetry',
    difficulty: 'Hard',
    question: 'When `RealTimeMap.tsx` receives an empty `alerts` array during quiet baseline monitoring, what should remain visibly rendered on the map?',
    options: [
      'An unhandled blank white screen crashing D3',
      'The world vector topology grid, defended node shield anchor, and rotating radar sweep ring confirming passive readiness',
      'Fake synthetic attacks fabricated randomly to keep the screen busy',
      'An error modal asking the user to restart the Express server'
    ],
    correctIndex: 1,
    explanation: 'Even with zero active attacks, the map displays real geographic topology and the shielded target telemetry sweep without fabricating false threats.'
  },
  {
    id: 'Q-132',
    chapterNumber: 6,
    topic: 'Chapter 6: Real-Time TopoJSON Geodesic Incursion Telemetry',
    difficulty: 'Advanced',
    question: 'If hundreds of alerts arrive within 2 seconds during a SYN flood burst, what visualization hygiene prevents browser main-thread jank in `RealTimeMap.tsx`?',
    options: [
      'Capping concurrent animated SVG projectiles/rings in a bounded sliding window while keeping underlying alert counts accurate in state.',
      'Spawning 10,000 simultaneous unthrottled CSS box-shadow loops inside `window.setInterval(1)`.',
      'Re-fetching the TopoJSON world dataset from disk on every single packet.',
      'Converting every alert into a blocking `confirm()` modal.'
    ],
    correctIndex: 0,
    explanation: 'Rendering a bounded window of active animated arcs/particles preserves smooth 60fps UI responsiveness during massive DoS telemetry floods.'
  },

  // =========================================================================
  // CHAPTER 7: Distributed Sensor Fabric & Autonomous Containment (Q-133 to Q-154)
  // =========================================================================
  {
    id: 'Q-133',
    chapterNumber: 7,
    topic: 'Chapter 7: Distributed Sensor Fabric & Autonomous Containment',
    difficulty: 'Hard',
    question: 'Which four discrete telemetry collection agents are unified inside EncDec’s Distributed Sensor Fabric?',
    options: [
      'Suricata NIDS, Zeek NSM, Endpoint eBPF Host Agents, and Central Syslog',
      'Nginx, PostgreSQL, Grafana, and Kubernetes Scheduler',
      'Metasploit, Wireshark, Putty, and Chrome DevTools',
      'Docker Compose, Webpack, Babel, and Jest'
    ],
    correctIndex: 0,
    explanation: 'Chapter 7 defines the four-agent sensor mesh: Suricata NIDS, Zeek NSM, Endpoint eBPF Host Agents, and Central Syslog.'
  },
  {
    id: 'Q-134',
    chapterNumber: 7,
    topic: 'Chapter 7: Distributed Sensor Fabric & Autonomous Containment',
    difficulty: 'Hard',
    question: 'By roughly what percentage does multi-stage Incident Correlation (e.g., grouping alerts into `INC-1042`) reduce alert fatigue compared to inspecting raw uncorrelated logs?',
    options: [
      'Up to 15%',
      'Up to 85%',
      'Exactly 5%',
      'It doubles alert fatigue by duplicating every raw packet'
    ],
    correctIndex: 1,
    explanation: 'Chapter 7 highlights that correlated multi-stage incidents reduce alert fatigue by up to 85% compared to raw alert streams.'
  },
  {
    id: 'Q-135',
    chapterNumber: 7,
    topic: 'Chapter 7: Distributed Sensor Fabric & Autonomous Containment',
    difficulty: 'Advanced',
    question: 'In autonomous active containment, how does gateway "IP Null-Routing" (`blackhole` routing) protect upstream firewall CPU resources better than stateful connection tracking drops during high-rate hostile floods?',
    options: [
      'Null-routing forwards packets back to the attacker in an infinite TTL loop.',
      'Kernel/BGP RIB blackhole routes drop matching hostile source/prefix traffic statelessly at forwarding lookup without allocating firewall conntrack state table memory.',
      'Null-routing decrypts TLS payloads before dropping.',
      'Null-routing stores every dropped packet inside Cloud Firestore.'
    ],
    correctIndex: 1,
    explanation: 'Stateless blackhole/null routing drops hostile traffic prior to expensive stateful inspection tables, preventing firewall conntrack exhaustion.'
  },
  {
    id: 'Q-136',
    chapterNumber: 7,
    topic: 'Chapter 7: Distributed Sensor Fabric & Autonomous Containment',
    difficulty: 'Hard',
    question: 'What exact POSIX signal does EncDec’s Automated Active Response Engine dispatch to terminate a confirmed rogue daemon spawned by a web service?',
    options: [
      '`SIGSTOP`',
      '`SIGKILL` (`kill -9`)',
      '`SIGUSR1`',
      '`SIGHUP`'
    ],
    correctIndex: 1,
    explanation: 'Chapter 7 specifies dispatching instant `SIGKILL` orders to rogue daemons—a non-catchable, non-ignorable kernel termination signal.'
  },
  {
    id: 'Q-137',
    chapterNumber: 7,
    topic: 'Chapter 7: Distributed Sensor Fabric & Autonomous Containment',
    difficulty: 'Advanced',
    question: 'During automated "Endpoint Isolation" of a compromised host, why does EncDec preserve an encrypted management/forensics channel instead of simply pulling the server’s power cord?',
    options: [
      'Powering off volatile RAM destroys running malware artifacts, unencrypted socket tables, and live kernel forensics needed for root-cause IR, whereas network quarantine blocks lateral spread while retaining telemetry.',
      'Because pulling power corrupts Suricata SID strings permanently.',
      'Because Linux kernels cannot boot twice in 24 hours.',
      'So the attacker can continue SSH lateral movement unimpeded.'
    ],
    correctIndex: 0,
    explanation: 'Isolating normal east-west/north-south network routes stops attacker lateral spread/exfiltration while keeping volatile RAM forensics and SOC control-plane telemetry intact.'
  },
  {
    id: 'Q-138',
    chapterNumber: 7,
    topic: 'Chapter 7: Distributed Sensor Fabric & Autonomous Containment',
    difficulty: 'Hard',
    question: 'Which kill-chain progression is exemplified by parent correlated incident `INC-1042: Multi-Stage Incursion & Lateral Traversal`?',
    options: [
      'Grouping initial access, privilege escalation, and data exfiltration telemetry spanning multiple sensors into one cohesive Incident timeline.',
      'Archiving old PDF certificates into cold storage.',
      'Translating Dark Mode CSS colors into MSSQL tables.',
      'Renewing Google Workspace OAuth scopes every hour.'
    ],
    correctIndex: 0,
    explanation: '`INC-1042` correlates multi-layer events across Reconnaissance, Initial Access, Privilege Escalation, Lateral Movement, and Exfiltration into a unified incident timeline.'
  },
  {
    id: 'Q-139',
    chapterNumber: 7,
    topic: 'Chapter 7: Distributed Sensor Fabric & Autonomous Containment',
    difficulty: 'Advanced',
    question: 'Why does EncDec enforce an "Operator Override & Approval / Rollback" safety layer alongside autonomous active responses?',
    options: [
      'To guard against false-positive self-DoS—such as accidentally null-routing a critical DNS upstream, load balancer, or executive gateway—by allowing inspection, approval gates, and one-click rollback.',
      'To slow response latency intentionally past 24 hours.',
      'Because `SIGKILL` cannot execute unless an admin types a 64-character password per PID.',
      'To disable audit logging during containment.'
    ],
    correctIndex: 0,
    explanation: 'Safety guardrails (`manual`, `approval_required`, `automatic` modes plus rollback) balance sub-second machine defense with human oversight over high-blast-radius changes.'
  },
  {
    id: 'Q-140',
    chapterNumber: 7,
    topic: 'Chapter 7: Distributed Sensor Fabric & Autonomous Containment',
    difficulty: 'Hard',
    question: 'Why must a correlation engine compute a `confidenceScore` (0–100%) before firing autonomous containment actions like `isolate_host` or `block_ip`?',
    options: [
      'Low-confidence single telemetry blips should inform analysts rather than autonomously severing production servers; only corroborated multi-signal high-confidence thresholds warrant auto-containment.',
      'Because scores below 50 crash Node.js integer parsing.',
      'Because `confidenceScore` sets the browser zoom level.',
      'So Zeek NSM skips logging DNS queries.'
    ],
    correctIndex: 0,
    explanation: 'Corroboration across sensors raises confidence; gating autonomous quarantine on strict confidence thresholds drastically reduces disruptive false-positive lockouts.'
  },
  {
    id: 'Q-141',
    chapterNumber: 7,
    topic: 'Chapter 7: Distributed Sensor Fabric & Autonomous Containment',
    difficulty: 'Advanced',
    question: 'Consider four raw events within 90 seconds: (1) Suricata detects Nmap scan from `203.0.113.5`, (2) Syslog logs 40 failed SSH attempts, (3) Suricata catches SQLi probe on web host, (4) eBPF sees `www-data` fork `/bin/sh`. Which correlation insight is missed if an analyst only reviews event (4) in isolation?',
    options: [
      'Nothing is missed; event (4) alone reveals the attacker’s external recon IP and prior failed SSH pivoting attempts.',
      'Without linking (1)–(3) to (4), the analyst wouldn’t trace the external initial-access source (`203.0.113.5`) or rule out an internal admin mistake.',
      'Event (4) automatically deletes events (1)–(3) from MSSQL.',
      'Correlating (1)–(4) turns HTTP into ICMP.'
    ],
    correctIndex: 1,
    explanation: 'Cross-layer correlation links the endpoint shell execution back to the exact upstream reconnaissance and ingress exploit source IP.'
  },
  {
    id: 'Q-142',
    chapterNumber: 7,
    topic: 'Chapter 7: Distributed Sensor Fabric & Autonomous Containment',
    difficulty: 'Hard',
    question: 'Which four `ActiveResponseAction` action types are modeled natively in EncDec’s autonomous containment subsystem?',
    options: [
      '`block_ip`, `isolate_host`, `kill_process`, and `quarantine_file`',
      '`reboot_router`, `wipe_disk`, `reset_bios`, and `send_invoice`',
      '`drop_table`, `truncate_logs`, `grant_admin`, and `pause_cron`',
      '`compile_pdf`, `rotate_qr`, `switch_theme`, and `ping_google`'
    ],
    correctIndex: 0,
    explanation: 'EncDec supports `block_ip`, `isolate_host`, `kill_process`, and `quarantine_file` active containment primitives.'
  },
  {
    id: 'Q-143',
    chapterNumber: 7,
    topic: 'Chapter 7: Distributed Sensor Fabric & Autonomous Containment',
    difficulty: 'Advanced',
    question: 'What potential failure mode occurs if autonomous `kill_process` terminates a persistent malware worker with `SIGKILL` *before* inspecting cron, systemd units, or parent watchdog supervisors?',
    options: [
      'A systemd `Restart=always` or cron persistence entry immediately respawns the backdoor within seconds unless persistence artifacts are also quarantined.',
      'The Linux kernel automatically grants root to `nobody`.',
      'SIGKILL rewrites the binary’s SHA-256 hash to match `/bin/ls`.',
      'Firestore permanently locks out the analyst account.'
    ],
    correctIndex: 0,
    explanation: 'Killing only the child worker without disabling its supervisor/cron persistence (`quarantine_file` + persistence cleanup) causes immediate respawn loops.'
  },
  {
    id: 'Q-144',
    chapterNumber: 7,
    topic: 'Chapter 7: Distributed Sensor Fabric & Autonomous Containment',
    difficulty: 'Hard',
    question: 'Why does the Sensor Fabric track `lastHeartbeat`, `eventRateSec`, and `droppedEvents` on every `SensorStatus` record?',
    options: [
      'To ensure tampering, sensor crashes, or traffic-saturation packet loss across Suricata/Zeek/eBPF probes trigger immediate operational visibility.',
      'To calculate user subscription expiration dates.',
      'To rank candidate exam scores alphabetically.',
      'To render world coastline borders in D3.'
    ],
    correctIndex: 0,
    explanation: 'Blind sensors equal zero security: heartbeat, throughput rate, and drop counters immediately reveal tampered, degraded, or saturated collectors.'
  },
  {
    id: 'Q-145',
    chapterNumber: 7,
    topic: 'Chapter 7: Distributed Sensor Fabric & Autonomous Containment',
    difficulty: 'Hard',
    question: 'How does unifying Suricata, Zeek, eBPF, and Syslog eliminate "detection blind spots" across an infrastructure perimeter and kernel?',
    options: [
      'Encrypted perimeter tunnels invisible to Suricata payloads are caught via Zeek JA3/flow metadata and eBPF endpoint syscalls, while network recon preceding host compromise is caught at the perimeter.',
      'By forcing all four sensors to run inside the user’s Chrome extension.',
      'By disabling IPv6 routing everywhere in the data center.',
      'By storing user passwords inside `/etc/hosts`.'
    ],
    correctIndex: 0,
    explanation: 'Complementary sensor vantage points—wire signatures, protocol metadata, kernel syscalls, and OS auth logs—close blind spots inherent to any single tool.'
  },
  {
    id: 'Q-146',
    chapterNumber: 7,
    topic: 'Chapter 7: Distributed Sensor Fabric & Autonomous Containment',
    difficulty: 'Advanced',
    question: 'In an active incident where an analyst chooses `quarantine_file` over `rm -rf` deletion for a suspected dropper executable, why is quarantine superior forensically?',
    options: [
      'Quarantine revokes execute permissions and moves the artifact into a locked staging vault preserving hashes, timestamps, and malware samples for reverse engineering—whereas deletion destroys evidence.',
      'Quarantine automatically submits the corporate database to public forums.',
      '`rm -rf` leaves the binary running forever in userland.',
      'Quarantine lowers CPU temperature by 20°C.'
    ],
    correctIndex: 0,
    explanation: 'Quarantining neutralizes execution risk while preserving chain-of-custody evidence needed for threat intel extraction and legal/regulatory forensics.'
  },
  {
    id: 'Q-147',
    chapterNumber: 7,
    topic: 'Chapter 7: Distributed Sensor Fabric & Autonomous Containment',
    difficulty: 'Hard',
    question: 'Within `IncidentTimelineEvent`, which four logical detection `layer` sources structure the chronological attack story?',
    options: [
      '`network`, `host`, `auth`, and `correlation`',
      '`css`, `html`, `pdf`, and `qr`',
      '`billing`, `oauth`, `theme`, and `cron`',
      '`arp`, `icmp`, `font`, and `svg`'
    ],
    correctIndex: 0,
    explanation: 'EncDec structures multi-stage timelines across `network`, `host`, `auth`, and `correlation` telemetry layers.'
  },
  {
    id: 'Q-148',
    chapterNumber: 7,
    topic: 'Chapter 7: Distributed Sensor Fabric & Autonomous Containment',
    difficulty: 'Advanced',
    question: 'Why can autonomous containment execute within "sub-second execution windows" compared to manual ticket-based SOC triage?',
    options: [
      'Pre-authorized policy rules trigger machine-to-machine enforcement APIs immediately once multi-sensor correlation crosses confidence thresholds, stopping fast automated ransomware before human pager wakeups.',
      'Human analysts are prohibited from inspecting incident logs.',
      'Sub-second execution deletes the MSSQL transaction log automatically.',
      'It runs only inside offline PDF files.'
    ],
    correctIndex: 0,
    explanation: 'Automated worms and ransomware spread faster than human reaction times; deterministic policy-driven machine response contains blast radius immediately.'
  },
  {
    id: 'Q-149',
    chapterNumber: 7,
    topic: 'Chapter 7: Distributed Sensor Fabric & Autonomous Containment',
    difficulty: 'Hard',
    question: 'Which sensor type in EncDec is best suited to capture a process invoking `execve("/bin/sh", ...)` with anomalous file descriptors inside an isolated Linux container?',
    options: [
      'Perimeter Suricata NIDS',
      'Endpoint eBPF Host Agent',
      'External BGP Looking Glass',
      'Gmail OAuth Inspector'
    ],
    correctIndex: 1,
    explanation: 'Kernel-level eBPF host agents observe namespace/container syscalls (`execve`, `openat`, `connect`) directly from the host kernel.'
  },
  {
    id: 'Q-150',
    chapterNumber: 7,
    topic: 'Chapter 7: Distributed Sensor Fabric & Autonomous Containment',
    difficulty: 'Advanced',
    question: 'Suppose an incident moves sequentially through `Reconnaissance` -> `Initial Access` -> `Execution` -> `Lateral Movement`. Why should automated rollback of a containment `block_ip` require administrator clearance and log `approvedBy`?',
    options: [
      'Prematurely unblocking a live threat actor re-opens attack paths; dual-control approval and audit attribution protect against accidental or coerced exposure.',
      'Because Linux routing tables only allow adding routes, never deleting them, without kernel recompilation.',
      'Because rollback wipes all user certificates.',
      'So attackers can test whether they were detected.'
    ],
    correctIndex: 0,
    explanation: 'Unblocking confirmed hostile infrastructure carries severe re-infection risk, requiring verified admin authorization and immutable audit provenance.'
  },
  {
    id: 'Q-151',
    chapterNumber: 7,
    topic: 'Chapter 7: Distributed Sensor Fabric & Autonomous Containment',
    difficulty: 'Hard',
    question: 'What status lifecycle transitions occur on a correlated `Incident` (`new`, `investigating`, `contained`, `resolved`, `closed`)?',
    options: [
      'Only `new` and `deleted` exist.',
      'Analysts track progression from `new` triage through active `investigating`, threat isolation (`contained`), verified remediation (`resolved`), and final audit closure (`closed`).',
      'Incidents transition directly from `new` to `closed` automatically every 10 seconds.',
      'Only `contained` writes logs to MSSQL.'
    ],
    correctIndex: 1,
    explanation: 'The 5-stage incident lifecycle cleanly separates active containment from post-mitigation verification and formal IR closure.'
  },
  {
    id: 'Q-152',
    chapterNumber: 7,
    topic: 'Chapter 7: Distributed Sensor Fabric & Autonomous Containment',
    difficulty: 'Advanced',
    question: 'Why must `ActiveResponseAction` persist exact `commandExecuted` and `resultOutput` telemetry strings?',
    options: [
      'For forensic verification, post-incident debugging, and deterministic rollback command generation if containment caused unintended side effects.',
      'Because React throws syntax errors unless every button shows bash commands.',
      'To email raw root shell output publicly on Twitter.',
      'To populate D3 projection scales.'
    ],
    correctIndex: 0,
    explanation: 'Recording exact executed remediation primitives and stdout/stderr outcomes proves whether containment actually succeeded on the target node and guides safe rollback.'
  },
  {
    id: 'Q-153',
    chapterNumber: 7,
    topic: 'Chapter 7: Distributed Sensor Fabric & Autonomous Containment',
    difficulty: 'Hard',
    question: 'When `SensorStatus` reports `status: degraded` on `syslog_collector` with rising `droppedEvents`, what immediate security risk does the SOC face?',
    options: [
      'Authentication brute-force and `sudo` privilege escalation trails could be truncated or missing from real-time correlation.',
      'D3 maps automatically switch to Mercator projection.',
      'Admin Gmail OAuth switches from auto to manual mode.',
      'Certificate QR codes stop encoding URLs.'
    ],
    correctIndex: 0,
    explanation: 'Degraded syslog collection threatens visibility into `auth.log` / Windows Security Event streams, hiding credential attacks and lateral privilege jumps.'
  },
  {
    id: 'Q-154',
    chapterNumber: 7,
    topic: 'Chapter 7: Distributed Sensor Fabric & Autonomous Containment',
    difficulty: 'Advanced',
    question: 'Which architectural pattern allows EncDec’s correlation engine to attribute an external `attackerIp` to an internal compromised host `targetHostId` across a NAT/reverse-proxy tier?',
    options: [
      'Ingesting L7 `X-Forwarded-For` / reverse-proxy headers via Zeek/HTTP DPI alongside host socket/process lineage telemetry mapped onto unified timestamps.',
      'Assuming every internal host shares the exact same MAC address.',
      'Dropping all traffic that traverses a load balancer.',
      'Checking only ICMP echo request sequence IDs.'
    ],
    correctIndex: 0,
    explanation: 'Correlating proxy/HTTP header telemetry with backend server socket-to-PID telemetry preserves true attacker attribution across NAT boundaries.'
  },

  // =========================================================================
  // CHAPTER 8: Dual Database Architecture (Firestore + MSSQL) (Q-155 to Q-176)
  // =========================================================================
  {
    id: 'Q-155',
    chapterNumber: 8,
    topic: 'Chapter 8: Dual Database Architecture (Firestore + MSSQL)',
    difficulty: 'Hard',
    question: 'In EncDec’s hybrid persistence architecture, why does the platform retain Microsoft SQL Server alongside Google Cloud Firestore rather than relying exclusively on NoSQL?',
    options: [
      'MSSQL ensures strict ACID relational integrity, structured SQL indexing, and regulatory enterprise audit archiving while Firestore delivers sub-millisecond cloud WebSocket streaming.',
      'Firestore cannot store string fields longer than 32 bytes.',
      'MSSQL renders SVG maps natively inside database triggers.',
      'Firestore automatically deletes all alert logs every 30 minutes.'
    ],
    correctIndex: 0,
    explanation: 'Combining Firestore (real-time cloud sync) with MSSQL (ACID relational integrity, complex joins/indexing, enterprise compliance) delivers both live UX and audit rigor.'
  },
  {
    id: 'Q-156',
    chapterNumber: 8,
    topic: 'Chapter 8: Dual Database Architecture (Firestore + MSSQL)',
    difficulty: 'Hard',
    question: 'Which canonical MSSQL schema table names are maintained by EncDec for enterprise relational auditing (Chapter 8)?',
    options: [
      '`EncDec_SecurityAlerts`, `EncDec_AuditLogs`, `EncDec_EmailLogs`, `EncDec_Users`, `EncDec_Rules`, and `EncDec_Hosts`',
      '`wp_posts`, `wp_users`, `pg_catalog`, and `redis_streams`',
      '`tbl_cookies`, `tbl_themes`, `tbl_fonts`, and `tbl_icons`',
      '`sys_packets_raw` and `anon_certs_temp` only'
    ],
    correctIndex: 0,
    explanation: 'Chapter 8 explicitly names `EncDec_SecurityAlerts`, `EncDec_AuditLogs`, `EncDec_EmailLogs`, `EncDec_Users`, `EncDec_Rules`, and `EncDec_Hosts`.'
  },
  {
    id: 'Q-157',
    chapterNumber: 8,
    topic: 'Chapter 8: Dual Database Architecture (Firestore + MSSQL)',
    difficulty: 'Advanced',
    question: 'When Google Cloud Firestore returns `RESOURCE_EXHAUSTED` (quota limit exceeded) during an alert surge, how does EncDec’s Circuit Breaker safeguard telemetry continuity?',
    options: [
      'It crashes the Node.js Express server with `process.exit(1)` until midnight UTC quota reset.',
      'It flips an internal circuit-breaker flag, suppressing cascading cloud write failures while continuing smooth writes to local persistent storage and MSSQL.',
      'It drops all new alerts and disables authentication checks.',
      'It emails raw SQL dumps to unauthenticated users.'
    ],
    correctIndex: 1,
    explanation: 'The Firestore circuit breaker detects `RESOURCE_EXHAUSTED` / `not-found`, halts wasteful cloud retries temporarily, and sustains continuous persistence locally and in MSSQL.'
  },
  {
    id: 'Q-158',
    chapterNumber: 8,
    topic: 'Chapter 8: Dual Database Architecture (Firestore + MSSQL)',
    difficulty: 'Hard',
    question: 'Which two authentication modes (`authType`) are supported for configuring enterprise Microsoft SQL Server connectivity in EncDec?',
    options: [
      '`sql` (SQL Server Login/Password) and `windows` (Windows Integrated Domain Authentication)',
      '`oauth_popup` and `anonymous_guest`',
      '`ssh_agent` and `kerberos_dns_txt`',
      '`qr_scan` and `jwt_cookie`'
    ],
    correctIndex: 0,
    explanation: '`MssqlConfig` and `mssqlConfigureSchema` support both `sql` and `windows` authentication with optional `domain`, `encrypt`, and `trustServerCertificate` settings.'
  },
  {
    id: 'Q-159',
    chapterNumber: 8,
    topic: 'Chapter 8: Dual Database Architecture (Firestore + MSSQL)',
    difficulty: 'Advanced',
    question: 'Why must production MSSQL connections traversing untrusted segments enable `encrypt: true` and validate server certificates (`trustServerCertificate: false` with trusted CA) rather than leaving `trustServerCertificate: true` blindly?',
    options: [
      'Unvalidated TLS certificates allow on-path MITM attackers to intercept TDS credentials, audit trails, and security query results cleanly.',
      'Because `encrypt: true` compresses integers by 90%.',
      'Because SQL Server refuses port 1433 connections unless `trustServerCertificate` is undefined.',
      'Because Firestore requires TDS packets on port 443.'
    ],
    correctIndex: 0,
    explanation: 'Encrypting TDS without validating the server certificate leaves connections vulnerable to active TLS MITM interception; CA validation prevents spoofed SQL endpoints.'
  },
  {
    id: 'Q-160',
    chapterNumber: 8,
    topic: 'Chapter 8: Dual Database Architecture (Firestore + MSSQL)',
    difficulty: 'Hard',
    question: 'In `DualDatabaseStatus`, what operational telemetry can administrators inspect from the Dual Database Console?',
    options: [
      'Firestore & MSSQL connection health, project/database IDs, table/collection record counts (`users`, `alerts`, `auditLogs`, `emailLogs`, `rules`, `hosts`, `threatIntel`), last sync time, and errors.',
      'Client monitor gamma calibration and GPU clock speeds.',
      'Remote attackers’ home router passwords.',
      'Unencrypted user password cleartexts.'
    ],
    correctIndex: 0,
    explanation: 'The Dual Database Console surfaces connectivity status, active schema targets, per-table record counts, timestamps, and diagnostic errors.'
  },
  {
    id: 'Q-161',
    chapterNumber: 8,
    topic: 'Chapter 8: Dual Database Architecture (Firestore + MSSQL)',
    difficulty: 'Advanced',
    question: 'Why does Firestore sync in EncDec use a debounced background batch queue (`triggerSync` with debounce timer + `sanitizeForFirestore`) rather than synchronous inline `await setDoc(...)` on every tiny state mutation?',
    options: [
      'Debouncing coalesces rapid bursts (saving Spark/cloud write quotas and eliminating API request latency), while `sanitizeForFirestore` strips `undefined` values that Firestore’s SDK rejects.',
      'Because `await setDoc` cannot run inside TypeScript async functions.',
      'Because Firestore drops every document containing arrays unless delayed 2.5 seconds.',
      'To force MSSQL to reject duplicate primary keys.'
    ],
    correctIndex: 0,
    explanation: 'Coalescing frequent updates preserves write quotas and keeps HTTP response times fast, while removing `undefined` keys prevents Firestore serialization exceptions.'
  },
  {
    id: 'Q-162',
    chapterNumber: 8,
    topic: 'Chapter 8: Dual Database Architecture (Firestore + MSSQL)',
    difficulty: 'Hard',
    question: 'What primary security risk must be mitigated in any "Dual Database Console" endpoint that allows administrators to execute diagnostic SQL queries against MSSQL?',
    options: [
      'Restricting access strictly to authenticated `admin` roles + gateway passkey verification and guarding against destructive DDL/unscoped injection hazards.',
      'Allowing unauthenticated visitors to run `DROP DATABASE` from the landing page.',
      'Converting all SQL queries into SVG Bézier paths.',
      'Disabling TLS encryption on `/api/*`.'
    ],
    correctIndex: 0,
    explanation: 'Diagnostic query consoles carry massive privilege power and must be strictly gated behind admin JWT + secondary gateway verification and audit logging.'
  },
  {
    id: 'Q-163',
    chapterNumber: 8,
    topic: 'Chapter 8: Dual Database Architecture (Firestore + MSSQL)',
    difficulty: 'Advanced',
    question: 'Under the CAP theorem during a cloud WAN partition splitting the EncDec backend server from Cloud Firestore, which two properties does EncDec’s local + MSSQL fallback prioritize for security telemetry?',
    options: [
      'Availability and Partition Tolerance (AP) at the edge/backend persistence tier—continuing to record alerts locally/MSSQL immediately rather than halting ingestion—followed by post-partition reconciliation.',
      'Total system shutdown until global linearizability across all continents is restored.',
      'Throwing away every incoming alert to guarantee zero local disk writes.',
      'Converting relational SQL tables into unindexed text CSVs.'
    ],
    correctIndex: 0,
    explanation: 'Security monitoring must never drop intrusion evidence during cloud outages; prioritizing local Availability + Partition Tolerance preserves every alert cleanly.'
  },
  {
    id: 'Q-164',
    chapterNumber: 8,
    topic: 'Chapter 8: Dual Database Architecture (Firestore + MSSQL)',
    difficulty: 'Hard',
    question: 'What default TCP port is configured for Microsoft SQL Server (`mssqlConfigureSchema`) unless overridden by an administrator?',
    options: [
      'Port `1433`',
      'Port `53`',
      'Port `25`',
      'Port `3000`'
    ],
    correctIndex: 0,
    explanation: 'MSSQL defaults to TCP port `1433`, as reflected in `mssqlConfigureSchema` (`Number(v) || 1433`).'
  },
  {
    id: 'Q-165',
    chapterNumber: 8,
    topic: 'Chapter 8: Dual Database Architecture (Firestore + MSSQL)',
    difficulty: 'Advanced',
    question: 'Why does EncDec store `EncDec_AuditLogs` in an ACID relational store like MSSQL alongside cloud telemetry?',
    options: [
      'ACID atomicity, durable transaction logs, and indexed time/user/action relational queries support strict legal discovery, compliance reporting, and tamper-evident historical auditing.',
      'Because NoSQL documents cannot store ISO 8601 date strings.',
      'Because ACID automatically encrypts browser cookies.',
      'So analysts can share audit logs via public anonymous GET routes.'
    ],
    correctIndex: 0,
    explanation: 'Enterprise security compliance requires durable ACID semantics and fast indexed relational reporting across years of user/admin actions.'
  },
  {
    id: 'Q-166',
    chapterNumber: 8,
    topic: 'Chapter 8: Dual Database Architecture (Firestore + MSSQL)',
    difficulty: 'Hard',
    question: 'What happens if an organization disables MSSQL (`enabled: false`) while Cloud Firestore remains active?',
    options: [
      'The entire EncDec dashboard locks out every user permanently.',
      'EncDec continues operating cleanly via Firestore and local persistent storage without requiring an external MSSQL instance.',
      'Suricata stops inspecting TCP packets on port 80.',
      'Gmail dispatch templates lose their subject lines.'
    ],
    correctIndex: 1,
    explanation: 'MSSQL is configurable as an enterprise relational tier; disabling it leaves Firestore and local persistence functioning seamlessly.'
  },
  {
    id: 'Q-167',
    chapterNumber: 8,
    topic: 'Chapter 8: Dual Database Architecture (Firestore + MSSQL)',
    difficulty: 'Advanced',
    question: 'Why is an idempotent `MERGE` / upsert keyed on deterministic IDs (`docId`, `alert.id`, `certificateId`) critical when executing manual or automatic re-syncs from local state to MSSQL and Firestore?',
    options: [
      'Idempotent upserts guarantee retrying a partial sync never inserts duplicate phantom alert rows or inflates incident counts.',
      'Idempotency strips `status` fields from every database row.',
      'Upserts force browsers to reload WebSockets every 500ms.',
      'Deterministic IDs disable SHA-256 certificate hashing.'
    ],
    correctIndex: 0,
    explanation: 'Without idempotent key-matched upserts, network retries or manual sync buttons would create duplicate alert and billing rows.'
  },
  {
    id: 'Q-168',
    chapterNumber: 8,
    topic: 'Chapter 8: Dual Database Architecture (Firestore + MSSQL)',
    difficulty: 'Hard',
    question: 'Which table count metric is NOT one of the seven tracked table counts inside `DualDatabaseStatus.mssql.tableCounts`?',
    options: [
      '`threatIntel`',
      '`auditLogs`',
      '`browserThemes`',
      '`emailLogs`'
    ],
    correctIndex: 2,
    explanation: '`tableCounts` tracks `users`, `alerts`, `auditLogs`, `emailLogs`, `rules`, `hosts`, and `threatIntel`—not browser theme preferences.'
  },
  {
    id: 'Q-169',
    chapterNumber: 8,
    topic: 'Chapter 8: Dual Database Architecture (Firestore + MSSQL)',
    difficulty: 'Advanced',
    question: 'Why does Firestore’s circuit breaker check both `RESOURCE_EXHAUSTED` and `NOT_FOUND` (error code 5) before opening the fallback state?',
    options: [
      'Both quota exhaustion and unprovisioned/missing cloud database conditions would otherwise spam synchronous write retries on every save; tripping the breaker ensures silent, zero-downtime fallback.',
      'Error code 5 means a SQL syntax error inside `EncDec_Users`.',
      'Because Firestore returns `NOT_FOUND` whenever Light Mode is selected.',
      'To purge all local JSON files immediately.'
    ],
    correctIndex: 0,
    explanation: 'Handling both quota exhaustion and unprovisioned project/DB (`NOT_FOUND`) gracefully ensures the backend never stalls or crashes waiting on unreachable cloud endpoints.'
  },
  {
    id: 'Q-170',
    chapterNumber: 8,
    topic: 'Chapter 8: Dual Database Architecture (Firestore + MSSQL)',
    difficulty: 'Hard',
    question: 'In `DualDatabaseStatus.firebase`, what identifier confirms which Google Cloud Firestore project backs EncDec’s cloud stream tier?',
    options: [
      '`projectId` (e.g., `ai-studio-encdecids-bc136ca4-82a5-408e-ae8f-57533ab6060c`) and `databaseId`',
      '`certQrCodeUrl`',
      '`adminSafeBoxPasskeyHash`',
      '`mitreMapping`'
    ],
    correctIndex: 0,
    explanation: 'Chapter 8 and `DualDatabaseStatus` track `projectId`, `databaseId`, `collectionsCount`, `connected`, and `lastSynced`.'
  },
  {
    id: 'Q-171',
    chapterNumber: 8,
    topic: 'Chapter 8: Dual Database Architecture (Firestore + MSSQL)',
    difficulty: 'Advanced',
    question: 'Suppose a forensic auditor queries `EncDec_AuditLogs` in MSSQL spanning 12 million events across 18 months for a single `userId`. Which database structure keeps query latency predictable without full table scans?',
    options: [
      'Composite B-tree indexing on `(userId, timestamp)`',
      'Converting every row into unindexed base64 strings inside one column',
      'Disabling transaction logging in SQL Server',
      'Sorting rows inside client-side React state'
    ],
    correctIndex: 0,
    explanation: 'Composite B-tree indexes over `(userId, timestamp)` allow seek-based range retrieval over millions of relational audit rows in milliseconds.'
  },
  {
    id: 'Q-172',
    chapterNumber: 8,
    topic: 'Chapter 8: Dual Database Architecture (Firestore + MSSQL)',
    difficulty: 'Hard',
    question: 'What role do Firestore `WebSocket` / real-time listeners and backend WS broadcasts play together in EncDec?',
    options: [
      'Delivering instant telemetry updates (alerts, billing updates, certification progress) to active analyst consoles without manual page refreshes.',
      'Recompiling Vite TypeScript bundles in production browsers.',
      'Encrypting user passwords before hashing with bcrypt.',
      'Blocking outbound SMTP traffic on port 587.'
    ],
    correctIndex: 0,
    explanation: 'Real-time listeners push telemetry changes immediately to all connected SOC consoles.'
  },
  {
    id: 'Q-173',
    chapterNumber: 8,
    topic: 'Chapter 8: Dual Database Architecture (Firestore + MSSQL)',
    difficulty: 'Advanced',
    question: 'Why should an enterprise SIEM persist `WorkbookProgress` and `certificates` outside volatile memory in addition to security alerts?',
    options: [
      'So operator training mastery, timed exam attempts, anti-cheat cooldown/resets, and issued CE-SOC credentials survive server restarts and verify reliably for external employers.',
      'Because JavaScript garbage-collects all strings after 10 minutes.',
      'So uncertified users can edit their scores directly in `localStorage`.',
      'To generate random IPv4 addresses for TopoJSON.'
    ],
    correctIndex: 0,
    explanation: 'Persisting workbook/exam state server-side enforces anti-malpractice rules (10-minute expiration, reset to Chapter 1, unique questions) and guarantees durable employer verification.'
  },
  {
    id: 'Q-174',
    chapterNumber: 8,
    topic: 'Chapter 8: Dual Database Architecture (Firestore + MSSQL)',
    difficulty: 'Hard',
    question: 'When writing JSON objects to Cloud Firestore in `firestore.ts`, why does `sanitizeForFirestore` recursively strip `undefined` properties?',
    options: [
      'Cloud Firestore SDK throws validation errors if an object contains explicit `undefined` field values rather than omitted keys or `null`.',
      'Because `undefined` triggers SQL injection inside MSSQL.',
      'To compress PDF certificates by 50%.',
      'Because TypeScript forbids optional fields (`?`) in interfaces.'
    ],
    correctIndex: 0,
    explanation: 'Firestore strictly rejects `undefined` values in document payloads unless `ignoreUndefinedProperties` is enabled or keys are sanitized beforehand.'
  },
  {
    id: 'Q-175',
    chapterNumber: 8,
    topic: 'Chapter 8: Dual Database Architecture (Firestore + MSSQL)',
    difficulty: 'Advanced',
    question: 'If an administrator resets `workbookProgress` or revokes a certificate on the server, why must backend state always override stale browser `localStorage` caches on reconnect?',
    options: [
      'Browser `localStorage` is trivially user-modifiable and can hold pre-reset state; server authority ensures tampering or stale client caches cannot bypass certification requirements.',
      'Because `localStorage` erases data whenever HTTPS is active.',
      'Because MSSQL ignores client timestamps.',
      'So users must re-buy their NOWPayments subscription daily.'
    ],
    correctIndex: 0,
    explanation: 'Server-authoritative state prevents users from forging completion badges or stale progress via client-side storage manipulation.'
  },
  {
    id: 'Q-176',
    chapterNumber: 8,
    topic: 'Chapter 8: Dual Database Architecture (Firestore + MSSQL)',
    difficulty: 'Hard',
    question: 'Which operational button/action in the Dual Database Console verifies live connectivity across both persistence layers for administrators?',
    options: [
      'Checking connection statuses, table counts, running manual syncs, and testing database health',
      'Recompiling the Suricata C source code',
      'Formatting the host SSD',
      'Changing Dark Mode to Light Mode'
    ],
    correctIndex: 0,
    explanation: 'Chapter 8 outlines inspecting live connection statuses, table counts, manual syncs, and one-click database health checks.'
  },

  // =========================================================================
  // CHAPTER 9: Google Workspace & RFC 2822 Gmail Security Dispatch (Q-177 to Q-198)
  // =========================================================================
  {
    id: 'Q-177',
    chapterNumber: 9,
    topic: 'Chapter 9: Google Workspace & RFC 2822 Gmail Security Dispatch',
    difficulty: 'Hard',
    question: 'Why does EncDec use client-side Google OAuth 2.0 authorization rather than asking users to type their raw Google account password into web forms?',
    options: [
      'OAuth 2.0 issues scoped, revocable bearer tokens via Google’s consent boundary without ever exposing the user’s underlying Google password or storing static credentials on disk.',
      'Because Google accounts have no passwords.',
      'Because RFC 2822 forbids characters longer than 8 letters in passwords.',
      'To permit anonymous unauthenticated users to read admin Gmail inboxes.'
    ],
    correctIndex: 0,
    explanation: 'OAuth 2.0 delegates authentication to Google and returns least-privilege scoped access tokens that can be held ephemerally in memory and revoked cleanly.'
  },
  {
    id: 'Q-178',
    chapterNumber: 9,
    topic: 'Chapter 9: Google Workspace & RFC 2822 Gmail Security Dispatch',
    difficulty: 'Advanced',
    question: 'When encoding an RFC 2822 message payload (`To`, `Subject`, `Content-Type`, body) for the Gmail REST `messages/send` API, which exact binary-to-text encoding is mandated by Google’s specification?',
    options: [
      'Standard Base64 with `+`, `/`, and mandatory `=` padding preserved',
      'URL-safe Base64 (`base64url` replacing `+` -> `-`, `/` -> `_`, and trimming trailing `=` padding) over UTF-8 MIME bytes',
      'Hexadecimal lowercase ASCII without headers',
      'ROT13 encoded UTF-16LE'
    ],
    correctIndex: 1,
    explanation: 'Gmail API’s `raw` field strictly requires RFC 4648 `base64url` encoding of the full RFC 2822 MIME message.'
  },
  {
    id: 'Q-179',
    chapterNumber: 9,
    topic: 'Chapter 9: Google Workspace & RFC 2822 Gmail Security Dispatch',
    difficulty: 'Advanced',
    question: 'What injection vulnerability occurs if user-supplied email `Subject` or `To` fields are interpolated unescaped into an RFC 2822 header block, and how do you neutralize it?',
    options: [
      'CRLF Header Injection (`\\r\\nBcc: attacker@evil.tld`); neutralized by stripping/rejecting CR (`\\r`) and LF (`\\n`) control characters from all single-line header fields and properly MIME-encoding non-ASCII subjects.',
      'Buffer overflow in browser CSS rules; neutralized by switching to Dark Mode.',
      'DNS Cache Poisoning; neutralized by shortening `TTL` to 1.',
      'ICMP Ping of Death; neutralized by base64 encoding CSS styles.'
    ],
    correctIndex: 0,
    explanation: 'Unescaped CR/LF sequences terminate the active MIME header and inject arbitrary `Bcc:`/`Content-Type:` headers; stripping CR/LF eliminates SMTP/MIME header injection.'
  },
  {
    id: 'Q-180',
    chapterNumber: 9,
    topic: 'Chapter 9: Google Workspace & RFC 2822 Gmail Security Dispatch',
    difficulty: 'Hard',
    question: 'Which core incident telemetry fields are automatically populated by EncDec’s pre-configured RFC 2822 Incident Dispatch Templates to reduce Mean-Time-to-Notify (MTTN)?',
    options: [
      'Severity, MITRE TTP, Origin IP, and Recommended Mitigation Steps',
      'User password hash, JWT secret, and MSSQL sa password',
      'TopoJSON polygon vertex count and browser window width',
      'Candidate middle initial and PDF page margin'
    ],
    correctIndex: 0,
    explanation: 'Chapter 9 lists Severity, MITRE TTP, Origin IP, and Recommended Mitigation Steps inside RFC-compliant dispatch templates.'
  },
  {
    id: 'Q-181',
    chapterNumber: 9,
    topic: 'Chapter 9: Google Workspace & RFC 2822 Gmail Security Dispatch',
    difficulty: 'Hard',
    question: 'In accordance with Google Workspace Security best practices (Chapter 9), what safeguard protects destructive Gmail actions (sending email, trashing messages, disconnecting accounts)?',
    options: [
      'Auto-executing after a 1-second hover delay',
      'Explicit two-step user confirmation dialogs plus cross-recording dispatched emails into the EncDec SOC Audit Trail',
      'Sending test drafts to all contacts before deleting',
      'Storing raw OAuth tokens inside public URL query parameters'
    ],
    correctIndex: 1,
    explanation: 'Chapter 9 mandates two-step user confirmation dialogs for high-impact/destructive workspace actions and full audit logging of every dispatched alert.'
  },
  {
    id: 'Q-182',
    chapterNumber: 9,
    topic: 'Chapter 9: Google Workspace & RFC 2822 Gmail Security Dispatch',
    difficulty: 'Advanced',
    question: 'Why does EncDec guard non-admin or login tokens with a Gmail scope check (`hasGmailScopes`) before invoking Gmail REST endpoints rather than blindly calling `gmail.googleapis.com` with any Google ID token?',
    options: [
      'Calling Gmail APIs with a basic profile/email sign-in token lacking `gmail.send`/`gmail.readonly` scopes triggers 403 `ACCESS_TOKEN_SCOPE_INSUFFICIENT` errors; checking granted scopes first prevents failed RPC cascades and cleanly prompts scoped authorization only when needed.',
      'Because basic sign-in tokens are encrypted with AES-128.',
      'Because Gmail APIs reject HTTP `Authorization: Bearer` headers completely.',
      'So non-admin users can silently access the admin’s personal inbox.'
    ],
    correctIndex: 0,
    explanation: 'Checking granted scopes prevents spurious HTTP 403 `ACCESS_TOKEN_SCOPE_INSUFFICIENT` failures and separates identity login from explicit Gmail workspace dispatch delegation.'
  },
  {
    id: 'Q-183',
    chapterNumber: 9,
    topic: 'Chapter 9: Google Workspace & RFC 2822 Gmail Security Dispatch',
    difficulty: 'Hard',
    question: 'How does the Google Workspace Security Inbox filter help SOC operators triage critical external bulletins efficiently?',
    options: [
      'Isolates incoming security bulletins, vendor advisories, and system alerts under a dedicated "Security Alerts" filter away from routine administrative noise.',
      'Automatically executes SQL queries embedded inside spam attachments.',
      'Marks every incoming email from external domains as resolved.',
      'Forwards all incoming emails to port 1433.'
    ],
    correctIndex: 0,
    explanation: 'Dedicated "Security Alerts" filtering prevents vendor advisories and automated incident notices from drowning in general inbox clutter.'
  },
  {
    id: 'Q-184',
    chapterNumber: 9,
    topic: 'Chapter 9: Google Workspace & RFC 2822 Gmail Security Dispatch',
    difficulty: 'Advanced',
    question: 'Why does keeping ephemeral OAuth access tokens in memory (instead of persisting long-lived tokens unencrypted in `localStorage` or plaintext cookies) strengthen browser security?',
    options: [
      'Any XSS gadget or malicious third-party script can exfiltrate `localStorage` tokens offline; in-memory tokens narrow exposure lifetime and cannot be harvested after tab close.',
      'Because `localStorage` converts OAuth tokens into invalid integers.',
      'Because Chrome deletes `localStorage` every 15 seconds.',
      'In-memory tokens bypass Google server expiration checks forever.'
    ],
    correctIndex: 0,
    explanation: 'Eliminating persistent disk/storage copies of bearer access tokens reduces the impact of post-session local inspection or storage-harvesting XSS scripts.'
  },
  {
    id: 'Q-185',
    chapterNumber: 9,
    topic: 'Chapter 9: Google Workspace & RFC 2822 Gmail Security Dispatch',
    difficulty: 'Hard',
    question: 'What happens to every email dispatched via EncDec’s Gmail integration from an accountability perspective?',
    options: [
      'It vanishes immediately with zero server record.',
      'It is cross-recorded into the EncDec SOC Audit Trail (`emailLogs` & `auditLogs`) with delivery status (`delivered` vs `queued`).',
      'It triggers a mandatory 10-minute workbook reset.',
      'It drops all Suricata NIDS rules temporarily.'
    ],
    correctIndex: 1,
    explanation: 'All dispatched messages are logged with recipient, subject, timestamp, and verified delivery outcome (`delivered`/`queued`) in the audit trail.'
  },
  {
    id: 'Q-186',
    chapterNumber: 9,
    topic: 'Chapter 9: Google Workspace & RFC 2822 Gmail Security Dispatch',
    difficulty: 'Advanced',
    question: 'Why does an Admin Gmail Session configured for automated security OTPs and login alerts track an `expiresAt` timestamp and distinguish between `auto` vs `manual` refresh modes?',
    options: [
      'Google OAuth access tokens expire ~60 minutes after issuance; tracking expiry enables proactive renewal (automatically in `auto` mode or via explicit admin prompt in `manual` mode) so security alerts never stall silently.',
      'Because Gmail accounts self-destruct unless refreshed every 60 seconds.',
      'Because RFC 2822 limits emails to one message per hour.',
      'To reset analyst passwords every 60 minutes.'
    ],
    correctIndex: 0,
    explanation: 'Short-lived OAuth tokens expire (~1 hour); explicit expiry tracking + configurable `auto`/`manual` refresh ensures continuous alert delivery with administrator governance.'
  },
  {
    id: 'Q-187',
    chapterNumber: 9,
    topic: 'Chapter 9: Google Workspace & RFC 2822 Gmail Security Dispatch',
    difficulty: 'Hard',
    question: 'What security benefit does routing forgotten-password OTP delivery through a verified Administrative Gmail Sender channel provide compared to unauthenticated spoofable relay headers?',
    options: [
      'Messages authenticate via SPF, DKIM, and DMARC alignment under the authorized Google Workspace sender, preventing spoofing and dramatically improving legitimate inbox deliverability over spam folders.',
      'Users no longer need to enter the 6-digit OTP at all.',
      'Plaintext passwords are sent instead of OTPs.',
      'It eliminates HTTPS requirements on `/api/auth/*`.'
    ],
    correctIndex: 0,
    explanation: 'Verified Google Workspace / SMTP relay sending passes DKIM/SPF/DMARC checks so critical OTPs reach user inboxes promptly without failing spoofing filters.'
  },
  {
    id: 'Q-188',
    chapterNumber: 9,
    topic: 'Chapter 9: Google Workspace & RFC 2822 Gmail Security Dispatch',
    difficulty: 'Advanced',
    question: 'Why should password-reset OTP codes stored on the backend (`PasswordResetOtpChallenge`) save a salted cryptographic hash (`codeHash` + `salt`) rather than plaintext digits, alongside an `expiresAt` and `attempts` counter?',
    options: [
      'Hashing with a per-challenge salt prevents an attacker with read access to DB backups from reading active reset OTPs, while expiry + attempt throttling defeat online 6-digit brute forcing.',
      'Because JSON strings cannot contain 6 numeric digits.',
      'To embed the OTP inside the certificate QR code.',
      'Because `crypto.timingSafeEqual` only operates on plaintext emails.'
    ],
    correctIndex: 0,
    explanation: 'Salted hashing defends OTPs at rest; strict short TTL + failed-attempt caps prevent brute-forcing the 10^6 keyspace.'
  },
  {
    id: 'Q-189',
    chapterNumber: 9,
    topic: 'Chapter 9: Google Workspace & RFC 2822 Gmail Security Dispatch',
    difficulty: 'Hard',
    question: 'Inside an embedded iframe preview (such as Cloud AI Studio environments), why is silent/cached Firebase OAuth token reuse safer and more reliable than aggressively opening background `gsi/client` auth popups?',
    options: [
      'Browsers block unprompted popups inside cross-origin sandboxed iframes (`[GSI_LOGGER]: Failed to open popup window`), whereas explicit user-initiated clicks or cached session tokens respect popup blockers cleanly.',
      'Because iframes block all HTTP POST requests.',
      'Because `gsi/client` disables CSS animations.',
      'Because OAuth popups only work on HTTP port 80.'
    ],
    correctIndex: 0,
    explanation: 'Programmatic or background Google popup calls fail in sandboxed iframes (`Failed to open popup window`); gating renewal behind explicit user clicks or cached tokens eliminates console/runtime failures.'
  },
  {
    id: 'Q-190',
    chapterNumber: 9,
    topic: 'Chapter 9: Google Workspace & RFC 2822 Gmail Security Dispatch',
    difficulty: 'Hard',
    question: 'Which core Gmail OAuth scopes are discussed in Chapter 9 for reading security alerts and transmitting incident dispatches?',
    options: [
      '`mail.google.com`, `gmail.send`, and `gmail.readonly`',
      '`calendar.events` and `drive.file` only',
      '`youtube.upload` and `maps.routing`',
      '`sql.admin` and `firestore.root`'
    ],
    correctIndex: 0,
    explanation: 'Chapter 9 names `mail.google.com`, `gmail.send`, and `gmail.readonly` as the core Google Workspace Gmail scopes.'
  },
  {
    id: 'Q-191',
    chapterNumber: 9,
    topic: 'Chapter 9: Google Workspace & RFC 2822 Gmail Security Dispatch',
    difficulty: 'Advanced',
    question: 'When a dispatch failure occurs (e.g., an admin session expired with a `401 Unauthorized` from Gmail REST API), why must EncDec mark the log as `queued` rather than `delivered` and preserve `lastConnectedEmail`?',
    options: [
      'Falsely logging a failed 401 send as `delivered` blinds operators to undelivered alerts, while preserving `lastConnectedEmail` enables targeted 1-click renewal and automatic queue flushing.',
      'Because `delivered` consumes 10x more disk space in MSSQL.',
      'Because `401 Unauthorized` means the recipient email does not exist.',
      'To force all analysts back to Chapter 1 of the workbook.'
    ],
    correctIndex: 0,
    explanation: 'Accurate `queued` vs `delivered` telemetry prevents false delivery confidence, and retaining `lastConnectedEmail` allows seamless session re-authorization and pending queue flush.'
  },
  {
    id: 'Q-192',
    chapterNumber: 9,
    topic: 'Chapter 9: Google Workspace & RFC 2822 Gmail Security Dispatch',
    difficulty: 'Hard',
    question: 'What is Mean-Time-to-Notify (MTTN), and how do pre-populated RFC 2822 incident templates minimize it?',
    options: [
      'The elapsed delay between confirming an incident and alerting stakeholders/asset owners; pre-filled technical templates eliminate manual copy-pasting errors under high stress.',
      'The time required to download a static PDF.',
      'The average packet RTT between eth0 and localhost.',
      'The duration of a Light-to-Dark theme CSS transition.'
    ],
    correctIndex: 0,
    explanation: 'Pre-populated incident emails trim precious minutes off stakeholder notification while ensuring critical technical context (IP, TTP, mitigation) isn’t omitted.'
  },
  {
    id: 'Q-193',
    chapterNumber: 9,
    topic: 'Chapter 9: Google Workspace & RFC 2822 Gmail Security Dispatch',
    difficulty: 'Advanced',
    question: 'When building an HTML + plaintext multipart email in RFC 2822 security dispatches, why must untrusted fields (e.g., user names, alert payloads, or hostnames) be HTML-escaped before template insertion?',
    options: [
      'To prevent Stored HTML/Script Injection inside victim webmail clients or SOC preview panes when malicious packet strings contain `<script>`, `<img onerror>`, or spoofed phishing buttons.',
      'Because SMTP servers drop emails containing spaces.',
      'Because HTML tags reduce SHA-256 hash entropy.',
      'To guarantee base64 strings stay divisible by 8.'
    ],
    correctIndex: 0,
    explanation: 'Adversaries craft malicious HTTP `User-Agent` or DNS strings containing HTML/phishing markup; escaping HTML entities ensures alert payloads render safely as literal data.'
  },
  {
    id: 'Q-194',
    chapterNumber: 9,
    topic: 'Chapter 9: Google Workspace & RFC 2822 Gmail Security Dispatch',
    difficulty: 'Hard',
    question: 'Why must Google Workspace OAuth tokens in AI Studio/browser architectures be passed or refreshed without embedding static OAuth client secrets inside browser JavaScript bundles?',
    options: [
      'Client-side JS bundles are inspectable by every browser user; embedding client secrets publicly violates OAuth 2.0 public-client security guarantees.',
      'Because JavaScript strings cannot contain hyphens or underscores.',
      'Because Vite minification deletes secrets starting with `GOCSPX-`.',
      'Because MSSQL parses React bundles directly.'
    ],
    correctIndex: 0,
    explanation: 'Any secret compiled into frontend JavaScript is exposed to all users; PKCE/client-side OAuth flows keep secrets out of client bundles.'
  },
  {
    id: 'Q-195',
    chapterNumber: 9,
    topic: 'Chapter 9: Google Workspace & RFC 2822 Gmail Security Dispatch',
    difficulty: 'Hard',
    question: 'When an analyst resolves a high-severity host alert via Gmail Dispatch, why is cross-referencing the email log ID with `EncDec_AuditLogs` essential?',
    options: [
      'Provides end-to-end evidentiary linkage proving *who* notified *whom*, *when*, and *what telemetry* was transmitted during incident response.',
      'Allows recipients to edit audit logs over SMTP replies.',
      'Automatically unlocks Admin Gateway without the secret passkey.',
      'Disables MFA for the recipient account.'
    ],
    correctIndex: 0,
    explanation: 'Breach notification regulations (GDPR 72h, SEC rules) require provable timestamps and content logs of stakeholder incident communications.'
  },
  {
    id: 'Q-196',
    chapterNumber: 9,
    topic: 'Chapter 9: Google Workspace & RFC 2822 Gmail Security Dispatch',
    difficulty: 'Advanced',
    question: 'What happens when both a connected Admin Gmail OAuth sender AND an SMTP Google App Password fallback exist, or when the primary OAuth token rejects with `401`?',
    options: [
      'Proper fault-tolerant mail service transitions cleanly or preserves queued dispatches while notifying administrators, rather than crashing login/OTP endpoints (`200 OK` resilience).',
      'User login immediately fails with HTTP 500 Internal Server Error.',
      'The server wipes `dbState.users` cleanly.',
      'All pending OTP codes are logged to the public homepage.'
    ],
    correctIndex: 0,
    explanation: 'Authentication flows should remain resilient against transient mail transport interruptions while accurately recording `queued`/`delivered` status and surfacing actionable admin renewal state.'
  },
  {
    id: 'Q-197',
    chapterNumber: 9,
    topic: 'Chapter 9: Google Workspace & RFC 2822 Gmail Security Dispatch',
    difficulty: 'Hard',
    question: 'What role does `login_hint` or user email matching play when checking if an already signed-in administrator can serve as the active Gmail Dispatch sender?',
    options: [
      'Ensures only verified `role === "admin"` identities with active Gmail scopes activate the privileged platform mail sender rather than any standard analyst signing in with Google.',
      'Allows standard analysts to impersonate the CISO on login.',
      'Bypasses Google OAuth consent screens globally without tokens.',
      'Forces every analyst to use `@example.com` email addresses.'
    ],
    correctIndex: 0,
    explanation: 'Privilege separation requires strictly gating platform-wide mail sender activation to authenticated administrators with granted Gmail scopes.'
  },
  {
    id: 'Q-198',
    chapterNumber: 9,
    topic: 'Chapter 9: Google Workspace & RFC 2822 Gmail Security Dispatch',
    difficulty: 'Advanced',
    question: 'Why does EncDec avoid storing raw email bodies in Firestore/MSSQL if excessive, yet preserve subject, recipient, role, eventType, and bounded preview snippets on `EmailLog`?',
    options: [
      'Balances compliance traceability and audit inspection with database storage efficiency and sensitive token/OTP hygiene.',
      'Because RFC 2822 forbids email subjects longer than 10 characters.',
      'Because Node.js strings truncate automatically at 100 bytes.',
      'To hide security alerts from the Admin Portal.'
    ],
    correctIndex: 0,
    explanation: 'Structured metadata + safe preview logging captures full audit accountability while preventing credential/OTP leakage or unbounded DB bloat.'
  },

  // =========================================================================
  // CHAPTER 10: Console Usability, Dual-Theme Engine & Certification (Q-199 to Q-220)
  // =========================================================================
  {
    id: 'Q-199',
    chapterNumber: 10,
    topic: 'Chapter 10: Console Usability, Dual-Theme Engine & Certification',
    difficulty: 'Hard',
    question: 'Under WCAG 2.1 AA accessibility compliance implemented in EncDec’s Dual-Theme Engine (Chapter 10), what minimum luminance contrast ratios are required for normal text versus graphical/UI elements?',
    options: [
      '4.5:1 for normal text and 3:1 for graphical/UI elements',
      '2.0:1 for normal text and 1.5:1 for graphical elements',
      '10.0:1 for normal text and 8.0:1 for graphical elements',
      'Contrast ratios apply only to Dark Mode, not Light Mode'
    ],
    correctIndex: 0,
    explanation: 'Chapter 10 specifies WCAG AA standards: minimum 4.5:1 contrast for body/normal text and 3:1 for graphical components and UI controls.'
  },
  {
    id: 'Q-200',
    chapterNumber: 10,
    topic: 'Chapter 10: Console Usability, Dual-Theme Engine & Certification',
    difficulty: 'Advanced',
    question: 'In WCAG relative luminance contrast math `(L1 + 0.05) / (L2 + 0.05)`, why can muted cyan text (`#06b6d4`) pass 4.5:1 on deep slate (`#020617`) in Dark Mode yet fail AA contrast on pure white (`#ffffff`) in Light Mode?',
    options: [
      'Cyan’s relative luminance (~0.40) yields high contrast against dark `#020617` (`L ≈ 0.002` -> ~8.6:1), but against white (`L = 1.0`) gives `(1.05)/(0.45) ≈ 2.33:1`, requiring darker semantic teal/cyan (`#0e7490`+) in Light Mode.',
      'Because CSS hexadecimal colors automatically invert brightness inside React hooks.',
      'Because Dark Mode disables sRGB gamma correction.',
      'Because browsers multiply `L1` by 100 in Light Mode.'
    ],
    correctIndex: 0,
    explanation: 'Bright cyan sits near mid-luminance, providing great legibility on dark canvases but low contrast (< 3:1) on white paper backgrounds unless swapped for deeper teal tokens in Light Mode.'
  },
  {
    id: 'Q-201',
    chapterNumber: 10,
    topic: 'Chapter 10: Console Usability, Dual-Theme Engine & Certification',
    difficulty: 'Hard',
    question: 'Why does EncDec emphasize keyboard accessibility (`focus-visible` rings) and responsive layout engineering across the SOC console?',
    options: [
      'During high-stress incident triaging or on screen-reader/keyboard-only workstations, clear focus indicators and unobstructed controls prevent misclicks and enable rapid keyboard navigation.',
      'Because `focus-visible` rings disable mouse pointer clicks.',
      'So users can bypass 10-minute certification exam timers.',
      'Because CSS Grid stops working if `focus-visible` is omitted.'
    ],
    correctIndex: 0,
    explanation: 'Clear `:focus-visible` affordances enable rapid, error-free triage for keyboard operators and assistive technologies without cluttering pointer clicks.'
  },
  {
    id: 'Q-202',
    chapterNumber: 10,
    topic: 'Chapter 10: Console Usability, Dual-Theme Engine & Certification',
    difficulty: 'Hard',
    question: 'What critical distinction separates downloading the offline workbook PDF versus earning the official Certified EncDec IDS SOC Specialist (CE-SOC) credential?',
    options: [
      'Offline PDF export is for convenient study anytime, whereas official CE-SOC certification requires completing all 10 chapters interactively within the platform and passing the proctored assessment (>= 80%).',
      'Downloading the PDF automatically issues a verified QR certificate without taking any exam.',
      'The PDF omits Chapters 6 through 10 intentionally.',
      'Offline reading locks the user out of Dark Mode.'
    ],
    correctIndex: 0,
    explanation: 'Chapter 10 clarifies that offline PDF study aids flexible reading, while live platform completion + examination verification governs official digital credential issuance.'
  },
  {
    id: 'Q-203',
    chapterNumber: 10,
    topic: 'Chapter 10: Console Usability, Dual-Theme Engine & Certification',
    difficulty: 'Advanced',
    question: 'Why does EncDec generate certification verification QR codes using `errorCorrectionLevel: "H"` (High ~30% Reed-Solomon recovery) inside `api.ts` and `certificatePdf.ts`?',
    options: [
      'Level H allows employer smartphones or damaged/compressed PDF scans to still reconstruct the embedded verification URL accurately even if up to 30% of codewords are obscured or creased.',
      'Level H embeds the entire 10-chapter workbook PDF inside the QR matrix.',
      'Level H encrypts the URL with AES-256.',
      'Level H disables scanning unless the user holds an admin passkey.'
    ],
    correctIndex: 0,
    explanation: 'Reed-Solomon High (`H`) error correction recovers up to 30% lost symbol codewords, ensuring reliable verification scans on printed parchment or lower-resolution mobile cameras.'
  },
  {
    id: 'Q-204',
    chapterNumber: 10,
    topic: 'Chapter 10: Console Usability, Dual-Theme Engine & Certification',
    difficulty: 'Hard',
    question: 'Under EncDec’s anti-malpractice CE-SOC examination protocol, what happens if a candidate’s 10-minute timer expires or they score below 80%?',
    options: [
      'Only their current question clears; Chapters 1–10 remain marked completed permanently.',
      'Everything in the user’s workbook curriculum resets back to Chapter 1, requiring full re-study before re-attempting certification.',
      'The user is automatically marked certified at 75%.',
      'The exact same 6 questions are immediately shown with correct answers highlighted for instant retry.'
    ],
    correctIndex: 1,
    explanation: 'Both timeout (> 10:00) and scoring < 80% trigger a full reset back to Chapter 1 so candidates genuinely re-read and master the curriculum.'
  },
  {
    id: 'Q-205',
    chapterNumber: 10,
    topic: 'Chapter 10: Console Usability, Dual-Theme Engine & Certification',
    difficulty: 'Advanced',
    question: 'Why must the CE-SOC examination engine assign randomized 6-question subsets per candidate on the server without transmitting `correctIndex` to the candidate browser prior to grading?',
    options: [
      'Server-side random draw from a 200+ question bank paired with server-side grading prevents candidates from sharing fixed answer keys or inspecting DevTools JSON payloads to cheat.',
      'Because React components cannot store numbers between 0 and 3.',
      'Because transferring 200 strings crashes TCP port 3000.',
      'To hide the candidate’s own first and last name until graduation.'
    ],
    correctIndex: 0,
    explanation: 'Previously hardcoded client-side questions/answers were inspectable in JS bundles; server-authoritative draws from 200+ items + withheld answer keys neutralize client tampering and collusion.'
  },
  {
    id: 'Q-206',
    chapterNumber: 10,
    topic: 'Chapter 10: Console Usability, Dual-Theme Engine & Certification',
    difficulty: 'Hard',
    question: 'How does EncDec’s Dual-Theme Engine support round-the-clock 24/7 Security Operations Center (SOC) ergonomics?',
    options: [
      'High-contrast Dark SOC Command mode lowers glare during dim night shifts, while bright Light Mode improves legibility under bright daytime office lighting across Header, Sidebar, Landing Page, and Settings.',
      'It locks analysts into Dark Mode from 18:00 to 06:00 via hardware BIOS calls.',
      'It shuts down the map renderer during daylight hours.',
      'It prints alerts in neon yellow on white backgrounds.'
    ],
    correctIndex: 0,
    explanation: 'Dual-theme parity across all global views adapts comfortably to dim SOC command centers and sunlit office environments alike.'
  },
  {
    id: 'Q-207',
    chapterNumber: 10,
    topic: 'Chapter 10: Console Usability, Dual-Theme Engine & Certification',
    difficulty: 'Advanced',
    question: 'When verifying a CE-SOC certificate publicly via `/verify/:certificateId` or Employer QR Validation, what protects against someone forging a visually identical PDF parchment with a fabricated Certificate ID?',
    options: [
      'Real-time lookup against the authoritative server certificate registry (`certificates` collection/table), matching recipient name, score, issue date, active/revoked status, and cryptographic verification code.',
      'Checking whether the PDF uses Helvetica bold fonts.',
      'Validating that the candidate typed three name parts.',
      'Verifying that Light Mode was disabled during download.'
    ],
    correctIndex: 0,
    explanation: 'Visual PDFs can be cloned, so employer trust relies on cryptographic/server registry verification at `/verify/:id` confirming active authenticity and holder identity.'
  },
  {
    id: 'Q-208',
    chapterNumber: 10,
    topic: 'Chapter 10: Console Usability, Dual-Theme Engine & Certification',
    difficulty: 'Hard',
    question: 'In `evaluateUserCertificationStatus`, what are the minimum requirements for an uncertified analyst to reach `isCertified: true` and `100%` progress?',
    options: [
      'Completing all 10 workbook chapters (`0..9`) AND passing the timed Knowledge Check (`quizPassed: true`, score >= 80%), or holding an active non-revoked CE-SOC certificate.',
      'Reading Chapter 1 only and exporting the offline PDF.',
      'Switching themes between Light and Dark mode 10 times.',
      'Submitting any NOWPayments invoice hash even if unverified.'
    ],
    correctIndex: 0,
    explanation: 'Both all 10 curriculum modules and passing the >= 80% Knowledge Check are required to earn and unlock official certification.'
  },
  {
    id: 'Q-209',
    chapterNumber: 10,
    topic: 'Chapter 10: Console Usability, Dual-Theme Engine & Certification',
    difficulty: 'Advanced',
    question: 'Why must the 10-minute exam timer enforce `expiresAt` on the backend server rather than trusting a browser `setInterval` counter alone?',
    options: [
      'A user could pause browser JavaScript via DevTools breakpoints, sleep the laptop, or tamper with client timers; enforcing `Date.now() > activeExam.expiresAt` on the server guarantees strict 10:00 expiration.',
      'Because JavaScript `setInterval` runs backwards in Firefox.',
      'Because React clears `useState` variables after 9 minutes automatically.',
      'Because server clocks synchronize directly with TopoJSON projections.'
    ],
    correctIndex: 0,
    explanation: 'Client timers are advisory UX only; server timestamps (`startedAt`, `expiresAt`) remain immune to browser throttling, reloads, or DevTools tampering.'
  },
  {
    id: 'Q-210',
    chapterNumber: 10,
    topic: 'Chapter 10: Console Usability, Dual-Theme Engine & Certification',
    difficulty: 'Hard',
    question: 'What academic purpose does Candidate Name Arrangement (First Name, Middle Name, Last Name across Standard, Middle Initial, or Formal Surname-First styles) fulfill before certificate generation?',
    options: [
      'Ensures legal and academic naming conventions are formatted with exact fidelity on the verified A4 Landscape credential and QR registry record.',
      'Allows candidates to impersonate other analysts after passing.',
      'Bypasses email verification during signup.',
      'Encrypts the workbook chapters using the candidate’s surname.'
    ],
    correctIndex: 0,
    explanation: 'Formal verification prevents truncated or misordered names on permanent accredited PDF certificates and public verification pages.'
  },
  {
    id: 'Q-211',
    chapterNumber: 10,
    topic: 'Chapter 10: Console Usability, Dual-Theme Engine & Certification',
    difficulty: 'Hard',
    question: 'What happens if a candidate’s existing CE-SOC certificate status is set to `revoked` in the database?',
    options: [
      'Employer verification and `evaluateUserCertificationStatus` ignore/invalidate the revoked credential so it no longer confers active `isCertified: true` status.',
      'The user is promoted automatically to Administrator.',
      'All 10 chapters turn invisible in the PDF export.',
      'The certificate score increases to 100%.'
    ],
    correctIndex: 0,
    explanation: '`certificationStatus.ts` explicitly filters out certificates where `cert.status === "revoked"`, ensuring revoked credentials cannot masquerade as active mastery.'
  },
  {
    id: 'Q-212',
    chapterNumber: 10,
    topic: 'Chapter 10: Console Usability, Dual-Theme Engine & Certification',
    difficulty: 'Advanced',
    question: 'If a user closes their browser tab 4 minutes into the 10-minute certification exam and reopens it 2 minutes later, how should a robust server-backed exam system behave?',
    options: [
      'Grant a brand-new 10:00 timer and 6 brand-new questions so they can cherry-pick easy questions endlessly.',
      'Resume the exact same `attemptId` and 6 assigned questions with only the remaining ~4:00 left on the original server `expiresAt` deadline (or auto-reset to Chapter 1 if 10 minutes elapsed).',
      'Pass the candidate immediately at 80% due to session disconnect.',
      'Delete the user’s account permanently.'
    ],
    correctIndex: 1,
    explanation: 'Persisting the active attempt server-side prevents "refresh shopping" for easier questions or resetting the 10-minute clock.'
  },
  {
    id: 'Q-213',
    chapterNumber: 10,
    topic: 'Chapter 10: Console Usability, Dual-Theme Engine & Certification',
    difficulty: 'Hard',
    question: 'Why does the EncDec Workbook track section-level reading checkpoints (`paragraphIndex`) in cloud persistence alongside chapter completion?',
    options: [
      'Enables candidates to resume seamlessly at the exact module and section across sessions and devices without losing place.',
      'Tracks mouse speed to grade quiz answers.',
      'Disables Dark Mode after Section 3.',
      'Compresses Suricata PCAP dumps.'
    ],
    correctIndex: 0,
    explanation: 'Bookmarking `(chapterIndex, paragraphIndex)` server-side lets analysts pick up deep technical reading seamlessly across sessions.'
  },
  {
    id: 'Q-214',
    chapterNumber: 10,
    topic: 'Chapter 10: Console Usability, Dual-Theme Engine & Certification',
    difficulty: 'Advanced',
    question: 'Under WCAG 2.1 usability guidelines in a SOC incident table where severity badges use Red/Orange/Cyan cues, why must text labels or icons ALWAYS accompany color?',
    options: [
      'Colorblind operators (~8% of male analysts) and high-glare screens cannot rely on hue alone; pairing semantic labels (`CRITICAL`, `HIGH`) and distinct icons preserves unambiguous triage.',
      'Because CSS colors increase Cloud Firestore bandwidth costs.',
      'Because Tailwind strips background colors in Safari.',
      'So printers use less black ink.'
    ],
    correctIndex: 0,
    explanation: 'WCAG 1.4.1 (Use of Color) forbids conveying critical operational state by hue alone; accompanying text/icons prevent fatal severity misreads.'
  },
  {
    id: 'Q-215',
    chapterNumber: 10,
    topic: 'Chapter 10: Console Usability, Dual-Theme Engine & Certification',
    difficulty: 'Hard',
    question: 'In a 6-question CE-SOC exam with an 80% minimum passing threshold, how many questions MUST a candidate answer correctly within the 10-minute window to earn certification rather than resetting to Chapter 1?',
    options: [
      'At least 4 of 6 (67%)',
      'At least 5 of 6 (83%) or 6 of 6 (100%)',
      'At least 3 of 6 (50%)',
      '1 of 6 (17%) if finished under 2 minutes'
    ],
    correctIndex: 1,
    explanation: '4/6 equals 67% (< 80% -> reset to Chapter 1); 5/6 rounds to 83% (>= 80%) and 6/6 equals 100%, so >= 5 correct answers are strictly required.'
  },
  {
    id: 'Q-216',
    chapterNumber: 10,
    topic: 'Chapter 10: Console Usability, Dual-Theme Engine & Certification',
    difficulty: 'Advanced',
    question: 'Why does EncDec restrict access to the full 200+ question bank WITH marked correct answers and rationales exclusively to the Admin Portal behind role + gateway passkey checks?',
    options: [
      'Allows administrators to audit curriculum quality, answer keys, and expand the bank while keeping active answer keys inaccessible to regular exam candidates.',
      'Because unauthenticated users would crash the pagination component.',
      'Because analyst browsers lack permissions to render `<select>` dropdowns.',
      'So admins can skip reading the workbook chapters.'
    ],
    correctIndex: 0,
    explanation: 'Separating admin curriculum inspection/management (`requireRole(["admin"])` + passkey) from candidate exam APIs preserves exam integrity while offering full administrative governance.'
  },
  {
    id: 'Q-217',
    chapterNumber: 10,
    topic: 'Chapter 10: Console Usability, Dual-Theme Engine & Certification',
    difficulty: 'Hard',
    question: 'What happens to a candidate’s `readChapters` and `quizPassed` flags when `/api/workbook/progress` receives a normal chapter-reading update?',
    options: [
      'A client cannot forge `quizPassed: true` or bypass the timed exam via the reading-progress endpoint; only server-side grading >= 80% unlocks `quizPassed: true`.',
      'Sending `quizPassed: true` in any POST body certifies the user immediately without taking the exam.',
      'Every chapter click lowers `quizScore` by 10 points.',
      'Chapters 1–5 auto-mark Chapters 6–10 as read.'
    ],
    correctIndex: 0,
    explanation: 'Hardening `/api/workbook/progress` ensures certification state (`quizPassed`, `completed`) is authoritative from server exam grading, blocking trivial API spoofing.'
  },
  {
    id: 'Q-218',
    chapterNumber: 10,
    topic: 'Chapter 10: Console Usability, Dual-Theme Engine & Certification',
    difficulty: 'Advanced',
    question: 'When `AdminPortal` triggers "Notify Uncertified", which operators are targeted by email and live dashboard alerts?',
    options: [
      'Active (non-suspended) operators whose `certificationStatus.isCertified` evaluates to `false`',
      'Only suspended administrators',
      'Already certified operators with 100% exam scores',
      'Unregistered external visitors on the login page'
    ],
    correctIndex: 0,
    explanation: 'Compliance outreach targets active uncertified operators so leadership maintains full operational readiness across the SOC.'
  },
  {
    id: 'Q-219',
    chapterNumber: 10,
    topic: 'Chapter 10: Console Usability, Dual-Theme Engine & Certification',
    difficulty: 'Hard',
    question: 'What visual PDF standard is produced by EncDec’s Certificate Issuance Station when a certified analyst exports their credential?',
    options: [
      'A4 Landscape high-resolution vector PDF (`certificatePdf.ts`) featuring arranged candidate name, score, CISO/Director signatures, official seal, registry ID, and scannable QR verification',
      'Unformatted 72px plain text `.txt` file',
      'Low-res 320x200 animated GIF',
      'Encrypted `.sql` dump'
    ],
    correctIndex: 0,
    explanation: 'Chapter 10 and `certificatePdf.ts` generate an A4 Landscape vector certificate complete with arranged name, signatures, seal, registry hash, and QR verification.'
  },
  {
    id: 'Q-220',
    chapterNumber: 10,
    topic: 'Chapter 10: Console Usability, Dual-Theme Engine & Certification',
    difficulty: 'Advanced',
    question: 'Before a user can initiate the 10-minute randomized certification exam, why must both frontend stepper controls and backend `/exam/start` verify all 10 chapters are marked read?',
    options: [
      'Defense-in-depth validation: UI locking guides user flow while backend prerequisite enforcement stops bypassed REST calls—especially immediately after a timeout or <80% reset back to Chapter 1.',
      'Because the server crashes if `chapterIndex` is less than 10.',
      'So users must wait 10 hours between Chapters 1 and 2.',
      'Because Chapter 10 contains the static answer key.'
    ],
    correctIndex: 0,
    explanation: 'Never trusting UI locks alone: enforcing the 10-chapter prerequisite server-side ensures reset candidates genuinely re-traverse Chapters 1–10 before another timed attempt.'
  }
];
