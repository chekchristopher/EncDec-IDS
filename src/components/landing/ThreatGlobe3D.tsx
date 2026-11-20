/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

interface ThreatGlobe3DProps {
  className?: string;
}

// Pre-allocated scratch helpers (zero per-frame allocations)
const _dummy = new THREE.Object3D();
const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _tmpColor = new THREE.Color();

function latLonToVec3(latDeg: number, lonDeg: number, radius: number, out = new THREE.Vector3()): THREE.Vector3 {
  const phi = (90 - latDeg) * (Math.PI / 180);
  const theta = (lonDeg + 180) * (Math.PI / 180);
  out.set(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
  return out;
}

// Coarse land-mass approximation so dotted globe points form recognizable continents
function isApproxLand(lat: number, lon: number): boolean {
  // North America
  if (lat > 15 && lat < 70 && lon > -135 && lon < -55) return true;
  // South America
  if (lat > -52 && lat < 12 && lon > -80 && lon < -35) return true;
  // Europe
  if (lat > 36 && lat < 68 && lon > -10 && lon < 42) return true;
  // Africa
  if (lat > -34 && lat < 35 && lon > -18 && lon < 50) return true;
  // Asia
  if (lat > 8 && lat < 68 && lon > 42 && lon < 145) return true;
  // Australia
  if (lat > -38 && lat < -12 && lon > 113 && lon < 154) return true;
  return false;
}

function detectWebGL(): { supported: boolean; isSoftwareGl: boolean } {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return { supported: false, isSoftwareGl: true };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return {
      supported: true,
      isSoftwareGl: /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu),
    };
  } catch {
    return { supported: false, isSoftwareGl: true };
  }
}

interface ArcDef {
  from: [number, number];
  to: [number, number];
  colorHex: number;
  label: string;
}

// Representative geodesic telemetry corridors converging on primary SOC Gateway
const THREAT_CORRIDORS: ArcDef[] = [
  { from: [40.7, -74.0], to: [51.5, -0.1], colorHex: 0x38bdf8, label: 'US-East -> SOC-GW' },
  { from: [55.7, 37.6], to: [51.5, -0.1], colorHex: 0xef4444, label: 'EU-East -> SOC-GW' },
  { from: [35.6, 139.7], to: [51.5, -0.1], colorHex: 0xf59e0b, label: 'AP-East -> SOC-GW' },
  { from: [-23.5, -46.6], to: [51.5, -0.1], colorHex: 0x22d3ee, label: 'SA-East -> SOC-GW' },
  { from: [1.3, 103.8], to: [51.5, -0.1], colorHex: 0xf97316, label: 'AP-South -> SOC-GW' },
];

export default function ThreatGlobe3D({ className = '' }: ThreatGlobe3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglFallback, setWebglFallback] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const { supported, isSoftwareGl } = detectWebGL();
    if (!supported) {
      setWebglFallback(true);
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglFallback(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x020617, 0);

    const width = Math.max(container.clientWidth, 240);
    const height = Math.max(container.clientHeight, 200);
    renderer.setSize(width, height);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'pan-y';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 60);
    camera.position.set(0, 0.45, 5.25);
    camera.lookAt(0, 0, 0);

    // Studio IBL reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x0b1120, 0.9);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e6, 1.8);
    keyLight.position.set(5, 6, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 1.5);
    rimLight.position.set(-5, -2, -4);
    scene.add(rimLight);

    const disposables: Array<{ dispose: () => void }> = [envTarget];
    const globeGroup = new THREE.Group();
    // Tilt slightly toward Europe/Atlantic so all 5 arcs & primary gateway are immediately visible
    globeGroup.rotation.set(0.24, -1.38, 0.08);
    scene.add(globeGroup);

    const R = 1.55;

    // 1. Matte Obsidian Planetary Core
    const sphereGeo = new THREE.SphereGeometry(R * 0.985, 36, 28);
    const sphereMat = new THREE.MeshPhysicalMaterial({
      color: 0x071022,
      metalness: 0.35,
      roughness: 0.62,
      clearcoat: 0.35,
      clearcoatRoughness: 0.35,
    });
    const coreSphere = new THREE.Mesh(sphereGeo, sphereMat);
    globeGroup.add(coreSphere);
    disposables.push(sphereGeo, sphereMat);

    // 2. Subtle Geodesic Wireframe Graticule Shell
    const graticuleGeo = new THREE.SphereGeometry(R * 1.004, 24, 14);
    const graticuleMat = new THREE.MeshBasicMaterial({
      color: 0x1e3a5f,
      wireframe: true,
      transparent: true,
      opacity: 0.24,
    });
    const graticuleMesh = new THREE.Mesh(graticuleGeo, graticuleMat);
    globeGroup.add(graticuleMesh);
    disposables.push(graticuleGeo, graticuleMat);

    // 3. InstancedMesh Continental Lattice Dots (Fibonacci Sphere filtered by continents)
    const sampleCount = 720;
    const landPoints: THREE.Vector3[] = [];
    const oceanPoints: THREE.Vector3[] = [];
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    for (let i = 0; i < sampleCount; i++) {
      const y = 1 - (i / (sampleCount - 1)) * 2;
      const lat = Math.asin(y) * (180 / Math.PI);
      const lon = (((i / goldenRatio) % 1) * 360) - 180;
      const p = latLonToVec3(lat, lon, R * 1.012);
      if (isApproxLand(lat, lon)) {
        landPoints.push(p);
      } else if (i % 5 === 0) {
        oceanPoints.push(p);
      }
    }

    const totalDots = landPoints.length + oceanPoints.length;
    const dotGeo = new THREE.CircleGeometry(0.024, 6);
    const dotMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const dotMesh = new THREE.InstancedMesh(dotGeo, dotMat, totalDots);
    dotMesh.frustumCulled = false;

    let idx = 0;
    for (const p of landPoints) {
      _dummy.position.copy(p);
      _dummy.lookAt(p.clone().multiplyScalar(2));
      _dummy.scale.setScalar(1.0);
      _dummy.updateMatrix();
      dotMesh.setMatrixAt(idx, _dummy.matrix);
      _tmpColor.setHex(idx % 4 === 0 ? 0x38bdf8 : 0x22d3ee);
      dotMesh.setColorAt(idx, _tmpColor);
      idx++;
    }
    for (const p of oceanPoints) {
      _dummy.position.copy(p);
      _dummy.lookAt(p.clone().multiplyScalar(2));
      _dummy.scale.setScalar(0.55);
      _dummy.updateMatrix();
      dotMesh.setMatrixAt(idx, _dummy.matrix);
      _tmpColor.setHex(0x1e3a5f);
      dotMesh.setColorAt(idx, _tmpColor);
      idx++;
    }
    dotMesh.instanceMatrix.needsUpdate = true;
    if (dotMesh.instanceColor) dotMesh.instanceColor.needsUpdate = true;
    globeGroup.add(dotMesh);
    disposables.push(dotGeo, dotMat);

    // 4. Primary SOC Gateway Beacon (Emerald Node + Halo Ring)
    const gatewayPos = latLonToVec3(51.5, -0.1, R * 1.02);
    const beaconGeo = new THREE.SphereGeometry(0.06, 12, 12);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    beaconMesh.position.copy(gatewayPos);
    globeGroup.add(beaconMesh);

    const haloGeo = new THREE.RingGeometry(0.08, 0.125, 24);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.position.copy(gatewayPos.clone().multiplyScalar(1.01));
    haloMesh.lookAt(gatewayPos.clone().multiplyScalar(2));
    globeGroup.add(haloMesh);
    disposables.push(beaconGeo, beaconMat, haloGeo, haloMat);

    // 5. Elevated 3D Geodesic Attack Arcs + Traveling Threat Pulses
    const arcCurves: THREE.QuadraticBezierCurve3[] = [];
    const arcColors: number[] = [];
    const originGeo = new THREE.SphereGeometry(0.036, 8, 8);
    disposables.push(originGeo);

    for (const corridor of THREAT_CORRIDORS) {
      const start = latLonToVec3(corridor.from[0], corridor.from[1], R * 1.015);
      const end = latLonToVec3(corridor.to[0], corridor.to[1], R * 1.015);
      const dist = start.distanceTo(end);
      const mid = start
        .clone()
        .add(end)
        .multiplyScalar(0.5)
        .normalize()
        .multiplyScalar(R + Math.min(0.85, dist * 0.32));

      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      arcCurves.push(curve);
      arcColors.push(corridor.colorHex);

      const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.011, 6, false);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: corridor.colorHex,
        transparent: true,
        opacity: 0.62,
      });
      globeGroup.add(new THREE.Mesh(tubeGeo, tubeMat));
      disposables.push(tubeGeo, tubeMat);

      const originMat = new THREE.MeshBasicMaterial({ color: corridor.colorHex });
      const originDot = new THREE.Mesh(originGeo, originMat);
      originDot.position.copy(start);
      globeGroup.add(originDot);
      disposables.push(originMat);
    }

    // 15 Instanced traveling threat pulses along the 5 corridors
    const pulseCount = THREAT_CORRIDORS.length * 3;
    const pulseGeo = new THREE.SphereGeometry(0.038, 8, 8);
    const pulseMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pulseMesh = new THREE.InstancedMesh(pulseGeo, pulseMat, pulseCount);
    pulseMesh.frustumCulled = false;
    for (let i = 0; i < pulseCount; i++) {
      _tmpColor.setHex(arcColors[i % arcColors.length]);
      pulseMesh.setColorAt(i, _tmpColor);
    }
    if (pulseMesh.instanceColor) pulseMesh.instanceColor.needsUpdate = true;
    globeGroup.add(pulseMesh);
    disposables.push(pulseGeo, pulseMat);

    // 6. Subtle Atmospheric Equatorial Orbit Ring
    const eqRingGeo = new THREE.TorusGeometry(R * 1.24, 0.008, 8, 96);
    const eqRingMat = new THREE.MeshBasicMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.25,
    });
    const eqRing = new THREE.Mesh(eqRingGeo, eqRingMat);
    eqRing.rotation.x = Math.PI * 0.44;
    globeGroup.add(eqRing);
    disposables.push(eqRingGeo, eqRingMat);

    // Drag-to-orbit on mouse/pen (touch keeps native pan-y scroll unobstructed)
    let isDragging = false;
    let lastX = 0;
    let userYawOffset = 0;
    let velocityYaw = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      isDragging = true;
      lastX = e.clientX;
      renderer.domElement.style.cursor = 'grabbing';
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      velocityYaw = dx * 0.006;
      userYawOffset += velocityYaw;
    };
    const onPointerUp = () => {
      if (!isDragging) return;
      isDragging = false;
      renderer.domElement.style.cursor = 'grab';
    };

    renderer.domElement.style.cursor = 'grab';
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp);

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(Math.floor(entry.contentRect.width), 1);
        const h = Math.max(Math.floor(entry.contentRect.height), 1);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        if (prefersReducedMotion) renderer.render(scene, camera);
      }
    });
    resizeObserver.observe(container);

    // Context Loss Handling
    let contextLost = false;
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      contextLost = true;
      schedulePause();
    };
    const handleContextRestored = () => {
      contextLost = false;
      scheduleResume();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    // Smart GPU Budgeting: Pause when off-screen or tab hidden
    let disposed = false;
    let isInViewport = true;
    let isTabVisible = typeof document === 'undefined' ? true : !document.hidden;
    let loopRunning = false;
    let frameId = 0;
    const clock = new THREE.Clock();
    let elapsed = 0;

    function afterDraw(cb: () => void) {
      if (disposed || !loopRunning) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed || !loopRunning) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 85);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 95);
      }
    }

    function updateGlobe(delta: number) {
      const dt = Math.min(delta, 0.08);
      elapsed += dt;

      if (!isDragging) {
        velocityYaw *= Math.pow(0.08, dt);
        userYawOffset += velocityYaw;
      }

      globeGroup.rotation.y = -1.38 + elapsed * 0.14 + userYawOffset;

      // Subtle breathing halo on primary SOC gateway
      const haloScale = 1 + Math.sin(elapsed * 2.8) * 0.22;
      haloMesh.scale.setScalar(haloScale);
      haloMat.opacity = 0.55 + Math.sin(elapsed * 2.8) * 0.25;

      // Advance 15 threat pulses along arcs
      for (let i = 0; i < pulseCount; i++) {
        const curve = arcCurves[i % arcCurves.length];
        const lane = Math.floor(i / arcCurves.length);
        const t = (elapsed * 0.34 + lane * 0.33 + (i % 2) * 0.11) % 1;
        curve.getPoint(t, _vecA);
        _dummy.position.copy(_vecA);
        const s = Math.sin(t * Math.PI) * 0.9 + 0.3;
        _dummy.scale.setScalar(s);
        _dummy.rotation.set(0, 0, 0);
        _dummy.updateMatrix();
        pulseMesh.setMatrixAt(i, _dummy.matrix);
      }
      pulseMesh.instanceMatrix.needsUpdate = true;
    }

    const tick = () => {
      if (disposed || !loopRunning || contextLost) return;
      updateGlobe(clock.getDelta());
      renderer.render(scene, camera);
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    const schedulePause = () => {
      if (!loopRunning) return;
      loopRunning = false;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
    };

    const scheduleResume = () => {
      if (disposed || prefersReducedMotion || contextLost) return;
      if (!isInViewport || !isTabVisible) return;
      if (loopRunning) return;
      loopRunning = true;
      clock.getDelta();
      tick();
    };

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        (entries) => {
          isInViewport = entries.some((e) => e.isIntersecting);
          if (isInViewport) scheduleResume();
          else schedulePause();
        },
        { threshold: 0.02 }
      );
      io.observe(container);
    }

    const onVisibility = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible) scheduleResume();
      else schedulePause();
    };
    document.addEventListener('visibilitychange', onVisibility);

    if (prefersReducedMotion) {
      updateGlobe(0.016);
      renderer.render(scene, camera);
    } else {
      scheduleResume();
    }

    return () => {
      disposed = true;
      loopRunning = false;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      for (const d of disposables) {
        try {
          d.dispose();
        } catch {
          // ignore
        }
      }
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (webglFallback) {
    return (
      <div
        className={`encdec-webgl-viewport relative flex items-center justify-center rounded-lg bg-[#030917] border border-white/10 overflow-hidden ${className}`}
      >
        <svg
          viewBox="0 0 640 240"
          className="w-full h-full"
          role="img"
          aria-label="3D geodesic threat trajectory globe preview"
        >
          <defs>
            <radialGradient id="globeFallbackGlow" cx="50%" cy="50%" r="48%">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.28" />
              <stop offset="65%" stopColor="#071022" stopOpacity="0.92" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="320" cy="120" r="102" fill="url(#globeFallbackGlow)" stroke="#1e3a5f" strokeWidth="1.2" />
          <ellipse cx="320" cy="120" rx="102" ry="38" fill="none" stroke="#1e3a5f" strokeWidth="0.9" />
          <ellipse cx="320" cy="120" rx="52" ry="102" fill="none" stroke="#1e3a5f" strokeWidth="0.9" />
          <path d="M238,94 Q280,44 330,104" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 4" />
          <path d="M394,82 Q364,52 330,104" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 4" />
          <path d="M404,136 Q370,110 330,104" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 4" />
          <circle cx="238" cy="94" r="3.5" fill="#38bdf8" />
          <circle cx="394" cy="82" r="3.5" fill="#ef4444" />
          <circle cx="404" cy="136" r="3.5" fill="#f59e0b" />
          <circle cx="330" cy="104" r="7" fill="rgba(16,185,129,0.22)" stroke="#10b981" strokeWidth="1.5" />
          <circle cx="330" cy="104" r="2.8" fill="#10b981" />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={`encdec-webgl-viewport relative rounded-lg bg-[#030917] border border-white/10 overflow-hidden select-none touch-pan-y ${className}`}
    >
      <div ref={mountRef} className="w-full h-full" aria-label="Interactive 3D geodesic threat globe" role="img" />
      <div className="pointer-events-none absolute bottom-2 right-2.5 px-2 py-0.5 rounded bg-[#050c1a]/88 border border-white/10 font-mono text-[10px] text-slate-300 hidden sm:block">
        Drag to rotate globe
      </div>
    </div>
  );
}
