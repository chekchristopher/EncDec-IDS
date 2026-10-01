/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { 
  Globe, Shield, ShieldAlert, Crosshair, 
  Play, Pause, RefreshCw, Zap, ExternalLink, MapPin
} from 'lucide-react';
import { Alert } from '../types.js';

// Target Headquarters & Server Location (COOU Portal / West Africa Edge)
const TARGET_NODE = {
  name: 'portal.coou.edu.ng (Edge SOC)',
  ip: '104.24.12.83',
  coords: [6.87, 5.86] as [number, number] // [Longitude, Latitude]
};

// Known threat origin hotspots for IP geolocation resolution
const GEO_DATABASE: Record<string, { country: string; city: string; coords: [number, number] }> = {
  '185.220.101.42': { country: 'Germany', city: 'Frankfurt', coords: [8.68, 50.11] },
  '185.220.101.99': { country: 'Germany', city: 'Frankfurt', coords: [8.68, 50.11] },
  '198.51.100.42': { country: 'United States', city: 'Ashburn', coords: [-77.48, 39.04] },
  '45.33.32.156': { country: 'United States', city: 'Dallas', coords: [-96.79, 32.77] },
  '94.102.61.12': { country: 'Netherlands', city: 'Amsterdam', coords: [4.90, 52.37] },
  '95.173.136.24': { country: 'Russia', city: 'Moscow', coords: [37.61, 55.75] },
  '103.203.57.18': { country: 'China', city: 'Beijing', coords: [116.40, 39.90] },
  '177.105.12.84': { country: 'Brazil', city: 'São Paulo', coords: [-46.63, -23.55] },
  '51.89.145.22': { country: 'United Kingdom', city: 'London', coords: [-0.12, 51.50] },
  '128.199.202.10': { country: 'Singapore', city: 'Singapore', coords: [103.81, 1.35] },
  '197.89.21.4': { country: 'South Africa', city: 'Johannesburg', coords: [28.04, -26.20] },
  '103.112.63.14': { country: 'India', city: 'Mumbai', coords: [72.87, 19.07] },
  '105.112.18.42': { country: 'Nigeria', city: 'Lagos', coords: [3.37, 6.52] },
  '197.210.8.104': { country: 'Nigeria', city: 'Abuja', coords: [7.49, 9.07] }
};

// Fallback pool of threat locations for arbitrary IP hashes
const THREAT_LOCATIONS_POOL: { country: string; city: string; coords: [number, number] }[] = [
  { country: 'Germany', city: 'Frankfurt', coords: [8.68, 50.11] },
  { country: 'United States', city: 'Ashburn', coords: [-77.48, 39.04] },
  { country: 'Netherlands', city: 'Amsterdam', coords: [4.90, 52.37] },
  { country: 'Russia', city: 'Moscow', coords: [37.61, 55.75] },
  { country: 'China', city: 'Beijing', coords: [116.40, 39.90] },
  { country: 'Brazil', city: 'São Paulo', coords: [-46.63, -23.55] },
  { country: 'United Kingdom', city: 'London', coords: [-0.12, 51.50] },
  { country: 'Singapore', city: 'Singapore', coords: [103.81, 1.35] },
  { country: 'South Africa', city: 'Johannesburg', coords: [28.04, -26.20] },
  { country: 'India', city: 'Mumbai', coords: [72.87, 19.07] }
];

export interface ThreatMarker {
  id: string;
  sourceIp: string;
  country: string;
  city: string;
  sourceCoords: [number, number];
  targetCoords: [number, number];
  targetName: string;
  vector: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  timestamp: string;
  blocked: boolean;
}

// Built-in compact TopoJSON representation of world continents
// Ensures guaranteed rendering offline and inside isolated iframe environments
const EMBEDDED_WORLD_TOPOJSON: any = {
  type: 'Topology',
  transform: {
    scale: [0.036, 0.018],
    translate: [-180, -90]
  },
  objects: {
    land: {
      type: 'MultiPolygon',
      arcs: [
        // North America
        [[0]],
        // South America
        [[1]],
        // Europe
        [[2]],
        // Africa
        [[3]],
        // Asia
        [[4]],
        // Australia
        [[5]]
      ]
    }
  },
  arcs: [
    // North America arc
    [[333, 8611], [222, 333], [972, 277], [1250, -166], [555, -722], [138, -722], [-555, -666], [-138, -555], [-500, -500], [277, -555], [305, -388], [-138, 0], [-222, 333], [-416, 333], [-333, 666], [-194, 444], [-277, 500], [-416, 500], [-777, 388]],
    // South America arc
    [[2861, 5444], [472, 111], [277, -555], [416, -277], [-55, -388], [-305, -888], [-277, -555], [-194, -944], [-277, 277], [55, 555], [27, 1111], [-222, 1000], [83, 555]],
    // Europe arc
    [[4722, 7000], [277, 388], [138, 222], [-250, 55], [-27, 555], [416, 0], [416, 722], [277, -166], [694, 0], [-277, -1111], [-555, -166], [-138, -277], [-277, -111], [-416, -111], [-277, 277]],
    // Africa arc
    [[4527, 6777], [333, 222], [416, 55], [416, -277], [194, -55], [305, -1055], [222, -55], [-305, -1166], [-138, -833], [-416, -555], [-83, 111], [-138, 1000], [-83, 1055], [-250, 55], [-416, 388], [-55, 500], [0, 611]],
    // Asia arc
    [[5972, 6777], [194, 555], [222, 333], [277, 1111], [1111, 555], [1111, -166], [833, -555], [-277, -555], [-555, -277], [-277, -833], [-277, -722], [-333, -555], [-222, -388], [-555, 166], [-138, 666], [-194, 277], [-361, 0], [-277, -722], [-277, 1111]],
    // Australia arc
    [[8138, 3777], [472, 555], [333, 55], [305, -944], [-83, -555], [-333, 166], [-638, 55], [-55, 666]]
  ]
};

// Helper: map any IP to geographic coordinates
function resolveIpToLocation(ip: string): { country: string; city: string; coords: [number, number] } {
  if (GEO_DATABASE[ip]) {
    return GEO_DATABASE[ip];
  }

  // Derive stable pseudo-random location from IP hash
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = (hash << 5) - hash + ip.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % THREAT_LOCATIONS_POOL.length;
  return THREAT_LOCATIONS_POOL[index];
}

interface RealTimeMapProps {
  alerts?: Alert[];
  onSelectThreat?: (threat: ThreatMarker) => void;
}

export default function RealTimeMap({ alerts = [], onSelectThreat }: RealTimeMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  
  const [dimensions, setDimensions] = useState({ width: 920, height: 450 });
  const [isLive, setIsLive] = useState(true);
  const [activeThreatMarkers, setActiveThreatMarkers] = useState<ThreatMarker[]>([]);
  const [hoveredThreat, setHoveredThreat] = useState<ThreatMarker | null>(null);
  const [selectedThreat, setSelectedThreat] = useState<ThreatMarker | null>(null);
  const [topoData, setTopoData] = useState<any>(null);
  const [incursionCounter, setIncursionCounter] = useState(14820);

  // 1. Load TopoJSON data (Fetch remote with instant local fallback)
  useEffect(() => {
    let isMounted = true;

    // Use embedded TopoJSON immediately to guarantee instant render
    try {
      const landGeo = topojson.feature(EMBEDDED_WORLD_TOPOJSON, EMBEDDED_WORLD_TOPOJSON.objects.land);
      if (isMounted) setTopoData(landGeo);
    } catch (e) {
      console.warn('Failed to parse embedded TopoJSON:', e);
    }

    // Attempt to enrich with high-resolution world atlas TopoJSON if online
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(res => {
        if (!res.ok) throw new Error('CDN unavailable');
        return res.json();
      })
      .then(topology => {
        if (isMounted && topology?.objects?.countries) {
          const countriesGeo = topojson.feature(topology, topology.objects.countries);
          setTopoData(countriesGeo);
        }
      })
      .catch(() => {
        // Quiet fallback to embedded TopoJSON
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Responsive viewport resize handling
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { clientWidth } = containerRef.current;
        const width = Math.max(320, clientWidth);
        const height = Math.min(520, Math.max(330, width * 0.48));
        setDimensions({ width, height });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 3. Dynamically update markers whenever the `alerts` prop updates
  useEffect(() => {
    if (alerts && alerts.length > 0) {
      const mappedFromAlerts: ThreatMarker[] = alerts.slice(0, 10).map((alert, idx) => {
        const sourceIp = alert.source || '185.220.101.42';
        const geo = resolveIpToLocation(sourceIp);

        return {
          id: `marker_${alert.id}_${idx}`,
          sourceIp,
          country: geo.country,
          city: geo.city,
          sourceCoords: geo.coords,
          targetCoords: TARGET_NODE.coords,
          targetName: alert.target || TARGET_NODE.name,
          vector: alert.title || alert.category || 'Intrusion Detection Alert',
          severity: (alert.severity as any) || 'high',
          timestamp: alert.timestamp || new Date().toISOString(),
          blocked: alert.status === 'resolved'
        };
      });

      setActiveThreatMarkers(mappedFromAlerts);
    } else {
      // Seed default active threats if alerts array is empty
      const defaultMarkers: ThreatMarker[] = THREAT_LOCATIONS_POOL.slice(0, 6).map((loc, idx) => ({
        id: `marker_seed_${idx}`,
        sourceIp: ['185.220.101.42', '198.51.100.42', '94.102.61.12', '95.173.136.24', '103.203.57.18', '51.89.145.22'][idx],
        country: loc.country,
        city: loc.city,
        sourceCoords: loc.coords,
        targetCoords: TARGET_NODE.coords,
        targetName: TARGET_NODE.name,
        vector: [
          'CVE-2021-44228 Log4j Exploit',
          'Cobalt Strike C2 Beaconing',
          'Apache Struts RCE Payload',
          'SSH Credential Stuffing',
          'SYN Stealth Port Sweep',
          'Nginx Path Traversal'
        ][idx],
        severity: idx === 0 ? 'critical' : idx < 3 ? 'high' : 'medium',
        timestamp: new Date(Date.now() - idx * 7000).toISOString(),
        blocked: idx % 2 === 0
      }));

      setActiveThreatMarkers(defaultMarkers);
    }
  }, [alerts]);

  // 4. Live periodic simulation loop to inject continuous real-time threats when live mode is active
  useEffect(() => {
    if (!isLive) return;

    const timer = setInterval(() => {
      const loc = THREAT_LOCATIONS_POOL[Math.floor(Math.random() * THREAT_LOCATIONS_POOL.length)];
      const sampleIps = ['185.220.101.99', '45.33.32.156', '185.156.73.55', '112.85.42.91', '177.105.12.84', '197.89.21.4'];
      const randomIp = sampleIps[Math.floor(Math.random() * sampleIps.length)];
      const vectors = [
        'Log4j JNDI Lookup Attempt',
        'WordPress wp-login Password Spray',
        'Nginx Memory Corruption Probe',
        'Outbound C2 Reverse Shell',
        'Mirai Scanner Probe',
        'SQLi UNION SELECT Probe'
      ];
      const severities: ThreatMarker['severity'][] = ['critical', 'high', 'medium'];

      const newIncursion: ThreatMarker = {
        id: `marker_live_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sourceIp: randomIp,
        country: loc.country,
        city: loc.city,
        sourceCoords: loc.coords,
        targetCoords: TARGET_NODE.coords,
        targetName: TARGET_NODE.name,
        vector: vectors[Math.floor(Math.random() * vectors.length)],
        severity: severities[Math.floor(Math.random() * severities.length)],
        timestamp: new Date().toISOString(),
        blocked: Math.random() > 0.12
      };

      setIncursionCounter(prev => prev + 1);
      setActiveThreatMarkers(prev => [newIncursion, ...prev.slice(0, 8)]);
    }, 3200);

    return () => clearInterval(timer);
  }, [isLive]);

  // 5. Render D3 Map with TopoJSON features and animated projectile markers
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;

    // D3 Geographic Projection
    const projection = d3.geoNaturalEarth1()
      .scale(width / 5.75)
      .translate([width / 2, height / 1.72]);

    const pathGenerator = d3.geoPath().projection(projection);

    // Definitions (Gradients & Filters)
    const defs = svg.append('defs');

    // Glow filter
    const glowFilter = defs.append('filter')
      .attr('id', 'topo-glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '3.5')
      .attr('result', 'coloredBlur');

    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Subtle Graticules (Latitude & Longitude gridlines)
    const graticule = d3.geoGraticule().step([30, 30]);

    svg.append('path')
      .datum(graticule)
      .attr('class', 'graticule')
      .attr('d', pathGenerator)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(255, 255, 255, 0.04)')
      .attr('stroke-width', 0.5);

    // Render Land Mass Polygons from TopoJSON
    if (topoData) {
      svg.append('g')
        .attr('class', 'topo-land')
        .selectAll('path')
        .data(topoData.features || (topoData.geometries ? [topoData] : []))
        .enter()
        .append('path')
        .attr('d', pathGenerator as any)
        .attr('fill', '#091322')
        .attr('stroke', '#1e293b')
        .attr('stroke-width', 1.1)
        .attr('opacity', 0.95);
    }

    // Monitored Target Asset Node (COOU Portal)
    const targetXY = projection(TARGET_NODE.coords);
    if (targetXY) {
      const [tx, ty] = targetXY;
      const targetGroup = svg.append('g').attr('class', 'target-node');

      // Rotating radar sweep ring
      targetGroup.append('circle')
        .attr('cx', tx)
        .attr('cy', ty)
        .attr('r', 18)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(34, 211, 238, 0.4)')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3, 3')
        .append('animateTransform')
        .attr('attributeName', 'transform')
        .attr('type', 'rotate')
        .attr('from', `0 ${tx} ${ty}`)
        .attr('to', `360 ${tx} ${ty}`)
        .attr('dur', '12s')
        .attr('repeatCount', 'indefinite');

      // Glowing Center Pin
      targetGroup.append('circle')
        .attr('cx', tx)
        .attr('cy', ty)
        .attr('r', 6.5)
        .attr('fill', '#22d3ee')
        .attr('filter', 'url(#topo-glow)');

      // Target Label
      targetGroup.append('text')
        .attr('x', tx + 10)
        .attr('y', ty - 10)
        .attr('fill', '#22d3ee')
        .attr('font-size', '10px')
        .attr('font-family', 'ui-monospace, monospace')
        .attr('font-weight', 'bold')
        .text('PORTAL.COOU.EDU.NG');
    }

    // Render Animated Intrusion Markers & Arcs
    const incursionGroup = svg.append('g').attr('class', 'incursion-arcs');

    activeThreatMarkers.forEach((marker, index) => {
      const sourceXY = projection(marker.sourceCoords);
      const targetXY = projection(marker.targetCoords);

      if (!sourceXY || !targetXY) return;

      const [sx, sy] = sourceXY;
      const [tx, ty] = targetXY;

      // Calculate Quadratic Bezier Arc Midpoint
      const dx = tx - sx;
      const dy = ty - sy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const mx = (sx + tx) / 2;
      const my = (sy + ty) / 2 - Math.min(110, Math.max(35, dist * 0.3));

      const pathData = `M ${sx} ${sy} Q ${mx} ${my} ${tx} ${ty}`;

      const isCritical = marker.severity === 'critical';
      const strokeColor = isCritical ? '#ef4444' : marker.severity === 'high' ? '#f97316' : '#eab308';

      // Arc Trajectory Path
      const arcPath = incursionGroup.append('path')
        .attr('d', pathData)
        .attr('fill', 'none')
        .attr('stroke', strokeColor)
        .attr('stroke-width', isCritical ? 2.2 : 1.4)
        .attr('stroke-opacity', 0.65)
        .attr('filter', 'url(#topo-glow)');

      // Animated Projectile Particle
      const particle = incursionGroup.append('circle')
        .attr('r', isCritical ? 3.5 : 2.5)
        .attr('fill', '#ffffff')
        .attr('filter', 'url(#topo-glow)');

      // Smooth path transition loop
      function launchProjectile() {
        const pathNode = arcPath.node();
        if (!pathNode) return;
        const totalLength = pathNode.getTotalLength();

        particle
          .transition()
          .duration(1900 + (index * 150))
          .ease(d3.easeLinear)
          .attrTween('transform', () => {
            return (t: number) => {
              const point = pathNode.getPointAtLength(t * totalLength);
              return `translate(${point.x}, ${point.y})`;
            };
          })
          .on('end', () => {
            // Ripple impact wave at destination
            svg.append('circle')
              .attr('cx', tx)
              .attr('cy', ty)
              .attr('r', 4)
              .attr('fill', 'none')
              .attr('stroke', strokeColor)
              .attr('stroke-width', 1.5)
              .transition()
              .duration(750)
              .attr('r', 26)
              .attr('opacity', 0)
              .remove();

            launchProjectile();
          });
      }

      launchProjectile();

      // Pulsing Attacker Origin Node
      const originNode = incursionGroup.append('g')
        .attr('class', 'threat-origin cursor-pointer')
        .on('mouseenter', () => setHoveredThreat(marker))
        .on('mouseleave', () => setHoveredThreat(null))
        .on('click', () => {
          setSelectedThreat(marker);
          if (onSelectThreat) onSelectThreat(marker);
        });

      // Core dot
      originNode.append('circle')
        .attr('cx', sx)
        .attr('cy', sy)
        .attr('r', isCritical ? 5 : 4)
        .attr('fill', strokeColor)
        .attr('filter', 'url(#topo-glow)');

      // Concentric expanding ring 1
      originNode.append('circle')
        .attr('cx', sx)
        .attr('cy', sy)
        .attr('r', 4)
        .attr('fill', 'none')
        .attr('stroke', strokeColor)
        .attr('stroke-width', 1.2)
        .append('animate')
        .attr('attributeName', 'r')
        .attr('from', 4)
        .attr('to', 18)
        .attr('dur', '2.2s')
        .attr('repeatCount', 'indefinite');

      // Concentric fading ring 2
      originNode.append('circle')
        .attr('cx', sx)
        .attr('cy', sy)
        .attr('r', 4)
        .attr('fill', 'none')
        .attr('stroke', strokeColor)
        .append('animate')
        .attr('attributeName', 'opacity')
        .attr('from', 1)
        .attr('to', 0)
        .attr('dur', '2.2s')
        .attr('repeatCount', 'indefinite');
    });

  }, [dimensions, topoData, activeThreatMarkers]);

  return (
    <div 
      ref={containerRef}
      className="bg-slate-900 border border-white/10 rounded-xl p-5 shadow-2xl relative overflow-hidden flex flex-col font-sans"
      id="realtime-topojson-map"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Control & Live Metric Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/30">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
              LIVE TOPOJSON INGRESS MAP
            </span>
            <span className="text-xs font-mono text-slate-400">
              D3.js Geographic Projection Engine
            </span>
          </div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-mono">
            <Globe className="w-4 h-4 text-cyan-400" />
            Global Intrusion Telemetry & Geodesic Attack Vectors
          </h3>
        </div>

        {/* Live Attack Metrics Counters */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-white/5">
            <span className="text-slate-500 text-[10px] uppercase block">Total Incursions</span>
            <span className="text-white font-bold text-sm">{(incursionCounter).toLocaleString()}</span>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-white/5">
            <span className="text-slate-500 text-[10px] uppercase block">Active Origins</span>
            <span className="text-amber-400 font-bold text-sm">{activeThreatMarkers.length} Nodes</span>
          </div>

          <button
            onClick={() => setIsLive(!isLive)}
            className={`px-3 py-1.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
              isLive 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' 
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
            }`}
            title={isLive ? 'Pause Live Stream' : 'Resume Live Stream'}
          >
            {isLive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isLive ? 'STREAMING' : 'PAUSED'}</span>
          </button>
        </div>
      </div>

      {/* SVG Map Canvas */}
      <div className="relative w-full overflow-hidden my-2 flex items-center justify-center min-h-[340px]">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          className="w-full h-auto select-none"
        />

        {/* Interactive Threat HUD Tooltip */}
        {(hoveredThreat || selectedThreat) && (
          <div className="absolute top-4 left-4 bg-slate-950/95 border border-cyan-500/40 p-3.5 rounded-xl shadow-2xl backdrop-blur-md max-w-xs font-mono text-xs z-20 pointer-events-none">
            {(() => {
              const item = hoveredThreat || selectedThreat;
              if (!item) return null;
              return (
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-cyan-400 font-bold flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {item.city}, {item.country}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold ${
                      item.severity === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'
                    }`}>
                      {item.severity}
                    </span>
                  </div>
                  <div className="text-white font-bold text-sm mb-1">{item.sourceIp}</div>
                  <div className="text-slate-400 text-[11px] mb-2">{item.vector}</div>
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-500">
                    <span>Target: {item.targetName}</span>
                    <span className={item.blocked ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                      {item.blocked ? 'CONTAINED' : 'UNHANDLED'}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Target Asset Corner Badge */}
        <div className="absolute bottom-3 right-3 bg-slate-950/80 border border-white/10 px-3 py-2 rounded-lg text-xs font-mono text-slate-400 backdrop-blur-sm z-10 flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span>Protected Node: <strong className="text-cyan-300">portal.coou.edu.ng</strong></span>
        </div>
      </div>

      {/* Real-time Threat Card Strip */}
      <div className="pt-3 border-t border-white/5">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
          <span className="flex items-center gap-1.5 text-slate-300 font-semibold uppercase text-[11px]">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Live Incursion Feed ({activeThreatMarkers.length} Active Nodes)
          </span>
          <span className="text-[11px] text-slate-500">Click any threat node to inspect</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {activeThreatMarkers.slice(0, 4).map((threat) => (
            <div
              key={threat.id}
              onClick={() => {
                setSelectedThreat(threat);
                if (onSelectThreat) onSelectThreat(threat);
              }}
              className="p-2.5 rounded-lg bg-slate-950 border border-white/5 hover:border-cyan-500/40 cursor-pointer transition-colors font-mono text-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-cyan-400 font-semibold truncate max-w-[120px]">
                    {threat.city}, {threat.country}
                  </span>
                  <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold ${
                    threat.severity === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {threat.severity}
                  </span>
                </div>
                <div className="text-white font-bold text-[11px] truncate mb-1">
                  {threat.sourceIp}
                </div>
                <div className="text-slate-400 text-[10px] truncate mb-2">
                  {threat.vector}
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-white/5">
                <span className="text-slate-500">{new Date(threat.timestamp).toLocaleTimeString()}</span>
                <span className={threat.blocked ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                  {threat.blocked ? 'CONTAINED' : 'EVALUATING'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
