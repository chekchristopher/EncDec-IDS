/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

interface CyberDefenseCanvas3DProps {
  className?: string;
  interactive?: boolean;
  scrollFactor?: number;
  accentMode?: 'nominal' | 'inspecting' | 'alert';
  pulseTrigger?: number;
}

// Pre-allocated scratch helpers outside render loop (zero GC churn)
const _dummyObj = new THREE.Object3D();
const _tmpColor = new THREE.Color();
const _tmpVec = new THREE.Vector3();

function detectSoftwareWebGL(): { supported: boolean; isSoftwareGl: boolean } {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return { supported: false, isSoftwareGl: true };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    return { supported: true, isSoftwareGl };
  } catch {
    return { supported: false, isSoftwareGl: true };
  }
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const cx = size / 2;
    const grad = ctx.createRadialGradient(cx, cx, 8, cx, cx, cx);
    grad.addColorStop(0, 'rgba(6, 182, 212, 0.34)');
    grad.addColorStop(0.45, 'rgba(14, 165, 233, 0.14)');
    grad.addColorStop(0.8, 'rgba(2, 6, 23, 0.05)');
    grad.addColorStop(1, 'rgba(2, 6, 23, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export default function CyberDefenseCanvas3D({
  className = '',
  interactive = true,
  scrollFactor = 0,
  accentMode = 'nominal',
  pulseTrigger = 0,
}: CyberDefenseCanvas3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const scrollRef = useRef(scrollFactor);
  const accentRef = useRef(accentMode);
  const pulseTriggerRef = useRef(pulseTrigger);
  const lastSeenPulseRef = useRef(pulseTrigger);
  const [webglFallback, setWebglFallback] = useState(false);

  scrollRef.current = scrollFactor;
  accentRef.current = accentMode;
  pulseTriggerRef.current = pulseTrigger;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const { supported, isSoftwareGl } = detectSoftwareWebGL();
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
    renderer.toneMappingExposure = 1.18;
    const isNarrowViewport = () => container.clientWidth < 520;
    const maxDpr = isNarrowViewport() ? 1.5 : 2;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, maxDpr));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x020617, 0);

    const width = Math.max(container.clientWidth, 240);
    const height = Math.max(container.clientHeight, 240);
    renderer.setSize(width, height);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'pan-y';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020617, 0.052);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 80);
    let baseCameraZ = isNarrowViewport() ? 8.8 : 7.5;
    camera.position.set(0, 0.55, baseCameraZ);
    camera.lookAt(0, 0.1, 0);

    // Mandatory Studio Reflection Environment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // Balanced 3-Point Warm/Cool Studio Rig
    const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x0b1120, 0.95);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e6, 2.0);
    keyLight.position.set(5.5, 7.2, 6.2);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 1.65);
    rimLight.position.set(-6.0, -2.0, -4.5);
    scene.add(rimLight);

    // =========================================================================
    // COMPOSITE MULTI-PART PROCEDURAL 3D SUBJECT (EncDec Geodesic Defense Core)
    // =========================================================================
    const rootGroup = new THREE.Group();
    // Slight upward offset so the bottom command dock never clips the core silhouette
    rootGroup.position.y = 0.28;
    scene.add(rootGroup);

    const disposables: Array<{ dispose: () => void }> = [envTarget];

    // 1. Primary Silhouette: Faceted Obsidian Core Chassis
    const coreGeo = new THREE.IcosahedronGeometry(1.42, 2);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0x0b1326,
      metalness: 0.48,
      roughness: 0.48,
      clearcoat: 0.55,
      clearcoatRoughness: 0.24,
      flatShading: true,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.castShadow = !isSoftwareGl;
    coreMesh.receiveShadow = !isSoftwareGl;
    rootGroup.add(coreMesh);
    disposables.push(coreGeo, coreMat);

    // 2. Primary Telemetry Lattice Wireframe (crisp edge topology)
    const latticeGeo = new THREE.IcosahedronGeometry(1.52, 2);
    const edgesGeo = new THREE.EdgesGeometry(latticeGeo);
    const edgesMat = new THREE.LineBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.42,
    });
    const latticeMesh = new THREE.LineSegments(edgesGeo, edgesMat);
    rootGroup.add(latticeMesh);
    latticeGeo.dispose();
    disposables.push(edgesGeo, edgesMat);

    // 3. Inner Luminous Security Core Heart
    const innerCoreGeo = new THREE.OctahedronGeometry(0.74, 1);
    const innerCoreMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.95,
      metalness: 0.8,
      roughness: 0.16,
    });
    const innerCoreMesh = new THREE.Mesh(innerCoreGeo, innerCoreMat);
    rootGroup.add(innerCoreMesh);
    disposables.push(innerCoreGeo, innerCoreMat);

    // 4. Secondary Read: Outer Brushed-Titanium Equatorial Inspection Ring
    const outerRingGroup = new THREE.Group();
    const outerRingGeo = new THREE.TorusGeometry(2.38, 0.048, 16, 96);
    const outerRingMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      metalness: 0.9,
      roughness: 0.18,
      clearcoat: 0.82,
    });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRingGroup.add(outerRing);
    disposables.push(outerRingGeo, outerRingMat);

    // Precision Beveled Shield Arcs (ExtrudeGeometry) mounted to outer orbital ring
    const arcShape = new THREE.Shape();
    const innerR = 2.26;
    const outerR = 2.52;
    const span = 0.42;
    arcShape.absarc(0, 0, outerR, -span, span, false);
    arcShape.absarc(0, 0, innerR, span, -span, true);
    arcShape.closePath();

    const vaneGeo = new THREE.ExtrudeGeometry(arcShape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 2,
      curveSegments: 24,
    });
    vaneGeo.center();
    const vaneMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.24,
    });
    disposables.push(vaneGeo, vaneMat);

    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const pivot = new THREE.Group();
      pivot.rotation.z = angle;
      const vane = new THREE.Mesh(vaneGeo, vaneMat);
      vane.position.set(2.39, 0, 0);
      pivot.add(vane);
      outerRingGroup.add(pivot);
    }
    outerRingGroup.rotation.set(Math.PI * 0.36, Math.PI * 0.14, 0);
    rootGroup.add(outerRingGroup);

    // 5. Secondary Read: Inclined HIDS Perimeter Ring + Radial Struts
    const midRingGroup = new THREE.Group();
    const midRingGeo = new THREE.TorusGeometry(1.98, 0.026, 14, 84);
    const midRingMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.38,
      metalness: 0.78,
      roughness: 0.24,
    });
    const midRing = new THREE.Mesh(midRingGeo, midRingMat);
    midRingGroup.add(midRing);

    const strutGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.44, 8);
    const strutMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.88,
      roughness: 0.22,
    });
    for (let i = 0; i < 6; i++) {
      const theta = (i * Math.PI) / 3;
      const strut = new THREE.Mesh(strutGeo, strutMat);
      strut.position.set(Math.cos(theta) * 1.76, Math.sin(theta) * 1.76, 0);
      strut.rotation.z = theta - Math.PI / 2;
      midRingGroup.add(strut);
    }
    midRingGroup.rotation.set(-Math.PI * 0.28, Math.PI * 0.24, Math.PI * 0.12);
    rootGroup.add(midRingGroup);
    disposables.push(midRingGeo, midRingMat, strutGeo, strutMat);

    // 6. Geodesic Packet-Inspection Arcs + 16 Traveling Data Pulses
    const arcGroup = new THREE.Group();
    const arcMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.45,
      roughness: 0.3,
      metalness: 0.6,
      transparent: true,
      opacity: 0.72,
    });
    disposables.push(arcMat);

    const arcPairs: Array<[THREE.Vector3, THREE.Vector3, number]> = [
      [new THREE.Vector3(-1.35, 0.55, 0.45), new THREE.Vector3(1.15, -0.4, 0.85), 2.38],
      [new THREE.Vector3(0.45, 1.32, -0.4), new THREE.Vector3(-0.95, -0.95, 0.68), 2.28],
      [new THREE.Vector3(1.22, 0.35, -0.78), new THREE.Vector3(-0.35, 0.85, 1.18), 2.24],
      [new THREE.Vector3(-0.65, -1.18, -0.65), new THREE.Vector3(0.95, 0.92, 0.55), 2.42],
    ];

    const arcCurves: THREE.QuadraticBezierCurve3[] = [];
    for (const [start, end, apex] of arcPairs) {
      const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(apex);
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      arcCurves.push(curve);
      const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.012, 6, false);
      const tubeMesh = new THREE.Mesh(tubeGeo, arcMat);
      arcGroup.add(tubeMesh);
      disposables.push(tubeGeo);
    }

    // 16 Instanced traveling packet pulses gliding along the 4 Bezier inspection arcs
    const pulseCount = 16;
    const pulseGeo = new THREE.SphereGeometry(0.052, 10, 10);
    const pulseMat = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.95,
    });
    const pulseMesh = new THREE.InstancedMesh(pulseGeo, pulseMat, pulseCount);
    pulseMesh.frustumCulled = false;
    arcGroup.add(pulseMesh);
    disposables.push(pulseGeo, pulseMat);
    rootGroup.add(arcGroup);

    // 7. Expanding 3D Shockwave Shield Ring (triggered on Live DPI Probe intercept)
    const shockwaveGeo = new THREE.TorusGeometry(1.5, 0.036, 12, 72);
    const shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const shockwaveRing = new THREE.Mesh(shockwaveGeo, shockwaveMat);
    shockwaveRing.rotation.x = Math.PI * 0.35;
    shockwaveRing.visible = false;
    rootGroup.add(shockwaveRing);

    const shockwaveRing2Geo = new THREE.TorusGeometry(1.5, 0.022, 12, 72);
    const shockwaveRing2Mat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const shockwaveRing2 = new THREE.Mesh(shockwaveRing2Geo, shockwaveRing2Mat);
    shockwaveRing2.rotation.set(-Math.PI * 0.28, Math.PI * 0.25, 0);
    shockwaveRing2.visible = false;
    rootGroup.add(shockwaveRing2);
    disposables.push(shockwaveGeo, shockwaveMat, shockwaveRing2Geo, shockwaveRing2Mat);

    // 8. InstancedMesh: 54 Orbiting Sensor Nodes (HIDS/NIDS Endpoints)
    const nodeCount = 54;
    const nodeGeo = new THREE.OctahedronGeometry(0.055, 0);
    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.4,
      metalness: 0.6,
      roughness: 0.28,
    });
    const sensorNodes = new THREE.InstancedMesh(nodeGeo, nodeMat, nodeCount);
    sensorNodes.frustumCulled = false;

    interface OrbitMeta {
      radius: number;
      theta: number;
      phi: number;
      speed: number;
      scale: number;
    }
    const orbitData: OrbitMeta[] = [];
    const paletteHex = [0x22d3ee, 0x38bdf8, 0x10b981, 0x7dd3fc];

    for (let i = 0; i < nodeCount; i++) {
      const goldenRatio = (1 + Math.sqrt(5)) / 2;
      const theta = (2 * Math.PI * i) / goldenRatio;
      const phi = Math.acos(1 - (2 * (i + 0.5)) / nodeCount);
      const radius = 2.65 + (i % 5) * 0.24;
      const scale = 0.85 + ((i * 19) % 30) / 100;
      const speed = (i % 2 === 0 ? 1 : -1) * (0.08 + (i % 4) * 0.035);
      orbitData.push({ radius, theta, phi, speed, scale });

      _dummyObj.position.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi) * 0.72,
        radius * Math.sin(phi) * Math.sin(theta)
      );
      _dummyObj.scale.setScalar(scale);
      _dummyObj.updateMatrix();
      sensorNodes.setMatrixAt(i, _dummyObj.matrix);

      _tmpColor.setHex(paletteHex[i % paletteHex.length]);
      sensorNodes.setColorAt(i, _tmpColor);
    }
    sensorNodes.instanceMatrix.needsUpdate = true;
    if (sensorNodes.instanceColor) sensorNodes.instanceColor.needsUpdate = true;
    sensorNodes.computeBoundingSphere();
    rootGroup.add(sensorNodes);
    disposables.push(nodeGeo, nodeMat);

    // 9. Grounded Calibration Base Ring & Soft Radial Contact Plane
    const shadowTex = createContactShadowTexture();
    shadowTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const shadowGeo = new THREE.PlaneGeometry(5.8, 5.8);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.68,
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -2.1;
    scene.add(shadowPlane);

    const floorRingGeo = new THREE.RingGeometry(2.15, 2.21, 72);
    const floorRingMat = new THREE.MeshBasicMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const floorRing = new THREE.Mesh(floorRingGeo, floorRingMat);
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.y = -2.08;
    scene.add(floorRing);
    disposables.push(shadowTex, shadowGeo, shadowMat, floorRingGeo, floorRingMat);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // WebGL context loss / restore handling
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      contextLost = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
    };
    const handleContextRestored = () => {
      contextLost = false;
      clock.getDelta();
      scheduleResume();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost, false);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored, false);

    // Pointer tracking (mouse/pen only — never fight mobile touch scrolling)
    const handlePointerMove = (e: PointerEvent) => {
      if (!interactive || e.pointerType === 'touch') return;
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      pointerRef.current.x = THREE.MathUtils.clamp(nx, -1, 1);
      pointerRef.current.y = THREE.MathUtils.clamp(ny, -1, 1);
    };

    const handlePointerLeave = () => {
      pointerRef.current.x = 0;
      pointerRef.current.y = 0;
    };

    if (interactive) {
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      container.addEventListener('pointerleave', handlePointerLeave);
    }

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(Math.floor(entry.contentRect.width), 1);
        const h = Math.max(Math.floor(entry.contentRect.height), 1);
        baseCameraZ = w < 520 ? 8.8 : 7.5;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        if (prefersReducedMotion) {
          renderer.render(scene, camera);
        }
      }
    });
    resizeObserver.observe(container);

    // Smart GPU budgeting: pause WebGL loop when off-screen or tab hidden
    let disposed = false;
    let contextLost = false;
    let isInViewport = true;
    let isTabVisible = typeof document === 'undefined' ? true : !document.hidden;
    let loopRunning = false;
    let frameId = 0;
    const clock = new THREE.Clock();
    let elapsed = 0;
    let smoothTiltX = 0;
    let smoothTiltY = 0;
    let smoothScroll = 0;
    let shockwaveProgress = 1.1; // > 1 means inactive
    let spinBoost = 0;

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
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 90);
      }
    }

    function updateScene(delta: number) {
      const clampedDelta = Math.min(delta, 0.08);

      // Detect newly fired live DPI probe pulse
      if (pulseTriggerRef.current !== lastSeenPulseRef.current) {
        lastSeenPulseRef.current = pulseTriggerRef.current;
        shockwaveProgress = 0;
        spinBoost = 1.0;
      }

      spinBoost = THREE.MathUtils.damp(spinBoost, 0, 2.2, clampedDelta);
      elapsed += clampedDelta * (1 + spinBoost * 1.65);

      smoothTiltX = THREE.MathUtils.damp(smoothTiltX, pointerRef.current.y * 0.24, 4.5, clampedDelta);
      smoothTiltY = THREE.MathUtils.damp(smoothTiltY, pointerRef.current.x * 0.34, 4.5, clampedDelta);
      smoothScroll = THREE.MathUtils.damp(smoothScroll, scrollRef.current, 5.0, clampedDelta);

      // Accent tone modulation when user triggers live DPI inspection
      const mode = accentRef.current;
      const targetHex = mode === 'alert' ? 0xf59e0b : mode === 'inspecting' ? 0x10b981 : 0x22d3ee;
      _tmpColor.setHex(targetHex);
      edgesMat.color.lerp(_tmpColor, Math.min(1, clampedDelta * 5.5));
      innerCoreMat.emissive.lerp(_tmpColor, Math.min(1, clampedDelta * 5.5));
      pulseMat.color.lerp(_tmpColor, Math.min(1, clampedDelta * 6.5));
      rimLight.color.lerp(_tmpColor, Math.min(1, clampedDelta * 4.5));

      rootGroup.rotation.x = smoothTiltX + smoothScroll * 0.32;
      rootGroup.rotation.y = elapsed * 0.14 + smoothTiltY;
      rootGroup.position.y = 0.28 + Math.sin(elapsed * 0.85) * 0.08 - smoothScroll * 0.35;

      coreMesh.rotation.y = elapsed * 0.12;
      latticeMesh.rotation.y = -elapsed * 0.09;
      innerCoreMesh.rotation.y = elapsed * 0.45;
      innerCoreMesh.rotation.x = elapsed * 0.25;
      const heartScale = 1 + spinBoost * 0.18 + Math.sin(elapsed * 2.2) * 0.03;
      innerCoreMesh.scale.setScalar(heartScale);

      outerRingGroup.rotation.z = elapsed * 0.18;
      midRingGroup.rotation.z = -elapsed * 0.24;
      arcGroup.rotation.y = elapsed * 0.1;

      // Animate 16 packet pulses along the 4 Bezier arcs
      const pulseSpeed = mode === 'alert' ? 0.62 : mode === 'inspecting' ? 0.48 : 0.28;
      for (let i = 0; i < pulseCount; i++) {
        const curve = arcCurves[i % arcCurves.length];
        const phaseOffset = Math.floor(i / arcCurves.length) * 0.25 + (i % 3) * 0.07;
        const t = (elapsed * pulseSpeed + phaseOffset) % 1;
        curve.getPoint(t, _tmpVec);
        _dummyObj.position.copy(_tmpVec);
        const s = Math.sin(t * Math.PI) * (0.65 + spinBoost * 0.5) + 0.35;
        _dummyObj.scale.setScalar(s);
        _dummyObj.rotation.set(0, 0, 0);
        _dummyObj.updateMatrix();
        pulseMesh.setMatrixAt(i, _dummyObj.matrix);
      }
      pulseMesh.instanceMatrix.needsUpdate = true;

      // Animate expanding 3D shockwave shield rings on threat intercept
      if (shockwaveProgress < 1) {
        shockwaveProgress += clampedDelta * 0.9;
        const p = Math.min(1, shockwaveProgress);
        const easeOut = 1 - Math.pow(1 - p, 3);

        shockwaveRing.visible = true;
        shockwaveRing.scale.setScalar(1 + easeOut * 1.45);
        shockwaveMat.opacity = (1 - p) * 0.85;
        shockwaveMat.color.setHex(mode === 'inspecting' ? 0x10b981 : 0xf59e0b);

        const p2 = Math.max(0, Math.min(1, (shockwaveProgress - 0.14) / 0.86));
        const easeOut2 = 1 - Math.pow(1 - p2, 3);
        shockwaveRing2.visible = p2 > 0;
        shockwaveRing2.scale.setScalar(1 + easeOut2 * 1.55);
        shockwaveRing2Mat.opacity = (1 - p2) * 0.7;
      } else {
        shockwaveRing.visible = false;
        shockwaveRing2.visible = false;
      }

      // Orbiting HIDS/NIDS sensor nodes
      for (let i = 0; i < nodeCount; i++) {
        const meta = orbitData[i];
        const a = meta.theta + elapsed * meta.speed;
        _dummyObj.position.set(
          meta.radius * Math.sin(meta.phi) * Math.cos(a),
          meta.radius * Math.cos(meta.phi) * 0.72 + Math.sin(elapsed * 1.1 + i) * 0.05,
          meta.radius * Math.sin(meta.phi) * Math.sin(a)
        );
        _dummyObj.rotation.set(elapsed * 0.6 + i, elapsed * 0.8, 0);
        _dummyObj.scale.setScalar(meta.scale);
        _dummyObj.updateMatrix();
        sensorNodes.setMatrixAt(i, _dummyObj.matrix);
      }
      sensorNodes.instanceMatrix.needsUpdate = true;

      camera.position.z = THREE.MathUtils.damp(camera.position.z, baseCameraZ - smoothScroll * 0.65, 4.0, clampedDelta);
      camera.lookAt(0, 0.12 - smoothScroll * 0.18, 0);
    }

    const tick = () => {
      if (disposed || !loopRunning || contextLost) return;
      const delta = clock.getDelta();
      updateScene(delta);
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
      clock.getDelta(); // discard paused time gap
      tick();
    };

    let intersectionObserver: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          const visible = entries.some((entry) => entry.isIntersecting);
          isInViewport = visible;
          if (visible) {
            scheduleResume();
          } else {
            schedulePause();
          }
        },
        { threshold: 0.02 }
      );
      intersectionObserver.observe(container);
    }

    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible) {
        scheduleResume();
      } else {
        schedulePause();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (prefersReducedMotion) {
      updateScene(0.016);
      renderer.render(scene, camera);
    } else {
      scheduleResume();
    }

    return () => {
      disposed = true;
      loopRunning = false;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      intersectionObserver?.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      if (interactive) {
        window.removeEventListener('pointermove', handlePointerMove);
        container.removeEventListener('pointerleave', handlePointerLeave);
      }
      for (const item of disposables) {
        try {
          item.dispose();
        } catch {
          // ignore
        }
      }
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [interactive]);

  if (webglFallback) {
    const strokeAccent =
      accentMode === 'alert' ? '#f59e0b' : accentMode === 'inspecting' ? '#10b981' : '#22d3ee';
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden rounded-2xl bg-[#030917] ${className}`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 400 400" className="w-72 h-72 opacity-90">
          <defs>
            <radialGradient id="fallbackCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={strokeAccent} stopOpacity="0.45" />
              <stop offset="65%" stopColor="#0ea5e9" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="200" cy="186" r="165" fill="url(#fallbackCore)" />
          <circle cx="200" cy="186" r="134" fill="none" stroke="#38bdf8" strokeOpacity="0.28" strokeWidth="1" />
          <circle cx="200" cy="186" r="98" fill="none" stroke={strokeAccent} strokeOpacity="0.55" strokeWidth="1.4" strokeDasharray="6 6" />
          <polygon points="200,66 304,126 304,246 200,306 96,246 96,126" fill="none" stroke={strokeAccent} strokeOpacity="0.6" strokeWidth="1.5" />
          <polygon points="200,118 258,152 258,220 200,254 142,220 142,152" fill="#0b1326" stroke={strokeAccent} strokeWidth="1.2" />
        </svg>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className={`encdec-webgl-viewport relative w-full h-full select-none touch-pan-y ${className}`}
      aria-hidden="true"
    />
  );
}
