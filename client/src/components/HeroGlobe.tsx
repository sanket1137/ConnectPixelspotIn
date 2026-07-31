import React, { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import gsap from "gsap";

// ==========================================
// 1. CONSTANTS & CONFIGURATIONS
// ==========================================
const GLOBE_RADIUS = 2.0;
const NODE_COUNT = 200;
const PARTICLE_COUNT = 100000;
const AMBIENT_PARTICLE_COUNT = 20000;
const CONNECTION_MAX_DIST = 1.2;
const CONNECTION_MIN_DIST = 0.5;

// Color cycling helper for RGB data packets
const cyclePacketColor = (progress: number, time: number, index: number, color: THREE.Color) => {
  // Hue cycles through: Blue (240) -> Cyan (180) -> Purple (280) -> Pink (330) -> Orange (30) -> Green (120) -> Blue
  const cycleTime = time * 0.4 + index * 0.05 + progress * 2.0;
  const cycleStep = Math.floor(cycleTime) % 6;
  const cycleFrac = cycleTime % 1.0;

  // HSL Hues
  const hues = [240, 180, 280, 330, 30, 120];
  const startHue = hues[cycleStep];
  const endHue = hues[(cycleStep + 1) % 6];
  
  // Handle circular interpolation
  let hue = startHue + (endHue - startHue) * cycleFrac;
  if (Math.abs(endHue - startHue) > 180) {
    if (endHue > startHue) {
      hue = startHue + (endHue - 360 - startHue) * cycleFrac;
    } else {
      hue = startHue + (endHue + 360 - startHue) * cycleFrac;
    }
  }
  
  color.setHSL(((hue + 360) % 360) / 360, 0.9, 0.6);
};

// ==========================================
// 2. SHADERS (GLSL)
// ==========================================

// Custom shader for the 100,000+ Globe Particles
const GlobeParticlesShader = {
  vertexShader: `
    uniform float uTime;
    uniform float uBreathing;
    attribute float aRandom;
    varying float vRandom;
    varying vec3 vPosition;
    
    void main() {
      vRandom = aRandom;
      vPosition = position;
      
      // Breathing scale animation (subtle expansion & contraction)
      vec3 pos = position * (1.0 + uBreathing * 0.015);
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      // Size attenuation based on depth and custom breathing fluctuation
      float sizeOffset = sin(uTime * 1.5 + aRandom * 20.0) * 0.4;
      gl_PointSize = (1.5 + sizeOffset) * (300.0 / -mvPosition.z);
    }
  `,
  fragmentShader: `
    varying float vRandom;
    varying vec3 vPosition;
    
    void main() {
      // Soft circular glowing particle
      vec2 center = gl_PointCoord - vec2(0.5);
      float dist = length(center);
      if (dist > 0.5) discard;
      
      // Calculate soft alpha transition
      float alpha = smoothstep(0.5, 0.08, dist) * 0.35;
      
      // Dynamic vertical gradient (cyan to blue) representing electric holographic feel
      vec3 colorBlue = vec3(0.02, 0.40, 1.0); // Electric Blue
      vec3 colorCyan = vec3(0.05, 0.85, 0.9); // Soft Cyan
      vec3 finalColor = mix(colorBlue, colorCyan, (vPosition.y + 2.0) / 4.0);
      
      gl_FragColor = vec4(finalColor, alpha);
    }
  `
};

// Custom shader for Billboarding Screen Icons (Rounded Rectangles)
const ScreenIconShader = {
  vertexShader: `
    uniform float uTime;
    uniform float uScale;
    attribute vec3 aInstancePos;
    attribute float aInstanceGlow;
    varying vec2 vUv;
    varying float vGlow;
    
    void main() {
      vUv = uv;
      vGlow = aInstanceGlow;
      
      // Extract position of node and translate to view space for billboarding
      vec4 mvPosition = modelViewMatrix * vec4(aInstancePos, 1.0);
      
      // Offset by geometry vertex position in plane coords (billboarding)
      float sizeScale = uScale * (1.0 + aInstanceGlow * 0.5);
      mvPosition.xy += position.xy * sizeScale;
      
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying float vGlow;
    
    // Signed Distance Field (SDF) for a 2D rounded rectangle
    float roundedRectSDF(vec2 p, vec2 size, float radius) {
      vec2 d = abs(p) - size + radius;
      return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - radius;
    }
    
    void main() {
      // Map UVs to [-0.5, 0.5] coordinate space
      vec2 p = vUv - vec2(0.5);
      
      // Screen dimensions and border radius
      vec2 size = vec2(0.48, 0.33);
      float radius = 0.08;
      
      float dist = roundedRectSDF(p, size, radius);
      
      // Draw screen outline border
      float borderThickness = 0.03;
      float edgeSoftness = 0.01;
      float border = smoothstep(borderThickness + edgeSoftness, borderThickness, abs(dist));
      
      // Faint transparent filling
      float fill = smoothstep(0.0, -edgeSoftness, dist) * 0.15;
      
      // Combine border and fill with node-pulse intensity
      vec3 colorBlue = vec3(0.0, 0.5, 1.0);
      vec3 colorWhite = vec3(0.8, 0.95, 1.0);
      vec3 finalColor = mix(colorBlue, colorWhite, vGlow * 0.7);
      
      float finalAlpha = max(border * 0.85, fill) * (0.35 + vGlow * 0.65);
      
      gl_FragColor = vec4(finalColor, finalAlpha);
    }
  `
};

// ==========================================
// 3. INTERNAL 3D SCENE OBJECT
// ==========================================
interface HeroGlobeSceneProps {
  mouseRotation: React.MutableRefObject<{ x: number; y: number }>;
}

const HeroGlobeScene: React.FC<HeroGlobeSceneProps> = ({ mouseRotation }) => {
  const { size } = useThree();
  const globeGroupRef = useRef<THREE.Group>(null);
  
  // Animation states
  const timeRef = useRef(0);
  const breathingScaleRef = useRef(0);
  const lastCampaignTimeRef = useRef(0);
  
  // Core shader uniform refs
  const globeUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uBreathing: { value: 0 }
  }), []);

  const screenUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uScale: { value: 0.12 }
  }), []);

  // 3.1 Globe 100,000+ Particles Setup
  const [globeGeometry, globeMaterial] = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const randoms = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Golden spiral distribution on sphere shell
      const phi = Math.acos(1 - 2 * (i / PARTICLE_COUNT));
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      
      // Random offset to shell thickness
      const r = GLOBE_RADIUS + (Math.random() - 0.5) * 0.03;
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      randoms[i] = Math.random();
    }

    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.setAttribute("aRandom", new THREE.BufferAttribute(randoms, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: GlobeParticlesShader.vertexShader,
      fragmentShader: GlobeParticlesShader.fragmentShader,
      uniforms: globeUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    return [geom, mat];
  }, [globeUniforms]);

  // 3.2 Network Nodes Setup (Fibonacci sphere distribution)
  const nodes = useMemo(() => {
    const list: THREE.Vector3[] = [];
    const phiAngle = Math.PI * (Math.sqrt(5) - 1); // Golden angle
    
    for (let i = 0; i < NODE_COUNT; i++) {
      const y = 1 - (i / (NODE_COUNT - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = phiAngle * i;
      
      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;
      
      list.push(new THREE.Vector3(x * GLOBE_RADIUS, y * GLOBE_RADIUS, z * GLOBE_RADIUS));
    }
    return list;
  }, []);

  // Pulse intensity tracks campaigns propagating
  const nodePulseStates = useMemo(() => {
    return new Float32Array(NODE_COUNT);
  }, []);

  // Pre-generate connection curves between nearby nodes
  const { connections, connectionGeometry } = useMemo(() => {
    const list: { start: number; end: number; curve: THREE.QuadraticBezierCurve3 }[] = [];
    const positions: number[] = [];
    
    for (let i = 0; i < NODE_COUNT; i++) {
      let connectionCount = 0;
      // Connect to 2-3 closest nodes
      const distances = nodes.map((n, idx) => ({ idx, dist: n.distanceTo(nodes[i]) }));
      distances.sort((a, b) => a.dist - b.dist);
      
      for (const d of distances) {
        if (d.idx === i) continue;
        if (d.dist > CONNECTION_MAX_DIST || d.dist < CONNECTION_MIN_DIST) continue;
        if (connectionCount >= 2) break;
        
        // Prevent duplicate connection lines visually
        if (i < d.idx) {
          const p1 = nodes[i];
          const p2 = nodes[d.idx];
          
          // Bulge control point outwards
          const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
          const bulgeRadius = GLOBE_RADIUS + d.dist * 0.15;
          midPoint.normalize().multiplyScalar(bulgeRadius);
          
          const curve = new THREE.QuadraticBezierCurve3(p1, midPoint, p2);
          list.push({ start: i, end: d.idx, curve });
          
          // Populate geometry line segments (approximate line using 16 subdivisions)
          const points = curve.getPoints(16);
          for (let p = 0; p < points.length - 1; p++) {
            positions.push(points[p].x, points[p].y, points[p].z);
            positions.push(points[p+1].x, points[p+1].y, points[p+1].z);
          }
          connectionCount++;
        }
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
    return { connections: list, connectionGeometry: geom };
  }, [nodes]);

  // 3.3 Dynamic RGB Data Packets Setup
  const PACKET_COUNT = 150;
  const packets = useMemo(() => {
    const arr = [];
    for (let i = 0; i < PACKET_COUNT; i++) {
      arr.push({
        connectionIdx: Math.floor(Math.random() * connections.length),
        progress: Math.random(), // Start randomly along the line
        speed: 0.15 + Math.random() * 0.25,
        color: new THREE.Color()
      });
    }
    return arr;
  }, [connections]);

  const packetGeometry = useMemo(() => new THREE.BufferGeometry(), []);
  const packetPosAttr = useMemo(() => new THREE.BufferAttribute(new Float32Array(PACKET_COUNT * 3), 3), []);
  const packetColAttr = useMemo(() => new THREE.BufferAttribute(new Float32Array(PACKET_COUNT * 3), 3), []);

  useEffect(() => {
    packetGeometry.setAttribute("position", packetPosAttr);
    packetGeometry.setAttribute("color", packetColAttr);
  }, [packetGeometry, packetPosAttr, packetColAttr]);

  // 3.4 Floating Screen Icons Instanced Mesh setup
  const screenGeom = useMemo(() => new THREE.PlaneGeometry(1.6, 1.0), []);
  
  // Custom screen instance positions attribute
  const screenInstPos = useMemo(() => {
    const arr = new Float32Array(NODE_COUNT * 3);
    for (let i = 0; i < NODE_COUNT; i++) {
      const offsetPos = nodes[i].clone().multiplyScalar(1.04); // Float slightly above nodes
      arr[i * 3] = offsetPos.x;
      arr[i * 3 + 1] = offsetPos.y;
      arr[i * 3 + 2] = offsetPos.z;
    }
    return new THREE.BufferAttribute(arr, 3);
  }, [nodes]);

  const screenInstGlow = useMemo(() => {
    return new THREE.BufferAttribute(new Float32Array(NODE_COUNT), 1);
  }, []);

  const screenMaterial = useMemo(() => {
    screenGeom.setAttribute("aInstancePos", screenInstPos);
    screenGeom.setAttribute("aInstanceGlow", screenInstGlow);

    return new THREE.ShaderMaterial({
      vertexShader: ScreenIconShader.vertexShader,
      fragmentShader: ScreenIconShader.fragmentShader,
      uniforms: screenUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }, [screenGeom, screenInstPos, screenInstGlow, screenUniforms]);

  // 3.5 Ambient drift particle system
  const ambientGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(AMBIENT_PARTICLE_COUNT * 3);
    
    for (let i = 0; i < AMBIENT_PARTICLE_COUNT; i++) {
      // Spawn particles inside a large 3D shell enclosing the scene
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 2.8 + Math.random() * 4.5;
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geom;
  }, []);

  const ambientMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      size: 0.04,
      color: new THREE.Color("#06b6d4"), // Soft Cyan
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }, []);

  // Simple state queue to sequence propagation delays
  const campaignQueue = useMemo<{ targetNodeIdx: number; intensity: number; triggerTime: number }[]>(() => [], []);

  // 3.6 Frame updates (Main Loop)
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    timeRef.current = time;

    // Apply uniforms
    globeUniforms.uTime.value = time;
    screenUniforms.uTime.value = time;
    
    // Slow breathing animation (scale ranges between 0.99 and 1.01)
    breathingScaleRef.current = Math.sin(time * 0.8) * 0.45;
    globeUniforms.uBreathing.value = breathingScaleRef.current;

    // Continuous smooth rotation + floating tilt
    if (globeGroupRef.current) {
      // Rotation
      globeGroupRef.current.rotation.y = time * 0.025;
      globeGroupRef.current.rotation.x = Math.sin(time * 0.2) * 0.04;
      
      // Interpolate slowly towards mouse rotation
      globeGroupRef.current.rotation.y += mouseRotation.current.y * 0.35;
      globeGroupRef.current.rotation.x += mouseRotation.current.x * 0.35;
    }

    // Decay current node campaign pulse values
    for (let i = 0; i < NODE_COUNT; i++) {
      if (nodePulseStates[i] > 0.0) {
        nodePulseStates[i] -= delta * 1.5;
        if (nodePulseStates[i] < 0.0) nodePulseStates[i] = 0.0;
        screenInstGlow.setX(i, nodePulseStates[i]);
      }
    }

    // Process queued cascading campaign pulse waves
    const nowMs = time * 1000;
    while (campaignQueue.length > 0 && campaignQueue[0].triggerTime <= nowMs) {
      const q = campaignQueue.shift();
      if (q) {
        const { targetNodeIdx, intensity } = q;
        nodePulseStates[targetNodeIdx] = Math.max(nodePulseStates[targetNodeIdx], intensity);
        screenInstGlow.setX(targetNodeIdx, nodePulseStates[targetNodeIdx]);
      }
    }

    // Spawn a campaign broadcast periodically
    if (nowMs - lastCampaignTimeRef.current > 6000) {
      lastCampaignTimeRef.current = nowMs;
      const originIdx = Math.floor(Math.random() * NODE_COUNT);
      
      // Light up origin node
      nodePulseStates[originIdx] = 3.0; 
      screenInstGlow.setX(originIdx, 3.0);
      
      // Propagation level 1: Connected neighbors
      const directConns = connections.filter(c => c.start === originIdx || c.end === originIdx);
      directConns.forEach(c => {
        const neighbor = c.start === originIdx ? c.end : c.start;
        // Schedule next pulse wave with a delay
        campaignQueue.push({
          targetNodeIdx: neighbor,
          intensity: 1.8,
          triggerTime: nowMs + 300
        });

        // Propagation level 2: Next level outward (subtle cascade)
        const secondTier = connections.filter(subC => subC.start === neighbor || subC.end === neighbor);
        secondTier.forEach(subC => {
          const secondNeighbor = subC.start === neighbor ? subC.end : subC.start;
          if (secondNeighbor !== originIdx) {
            campaignQueue.push({
              targetNodeIdx: secondNeighbor,
              intensity: 1.0,
              triggerTime: nowMs + 700
            });
          }
        });
      });
      // Sort propagation queue by execution time
      campaignQueue.sort((a, b) => a.triggerTime - b.triggerTime);
    }
    
    // Notify instance attributes of updates
    screenInstGlow.needsUpdate = true;

    // Update RGB Data Packets positions along curves
    const posArr = packetPosAttr.array as Float32Array;
    const colArr = packetColAttr.array as Float32Array;
    const packetTempVec = new THREE.Vector3();
    const packetTempCol = new THREE.Color();

    for (let i = 0; i < PACKET_COUNT; i++) {
      const p = packets[i];
      p.progress += delta * p.speed;
      
      // Loop packets
      if (p.progress >= 1.0) {
        p.progress = 0.0;
        p.connectionIdx = Math.floor(Math.random() * connections.length);
      }

      // Calculate 3D position along Bezier curve
      const conn = connections[p.connectionIdx];
      conn.curve.getPointAt(p.progress, packetTempVec);

      posArr[i * 3] = packetTempVec.x;
      posArr[i * 3 + 1] = packetTempVec.y;
      posArr[i * 3 + 2] = packetTempVec.z;

      // Cycle RGB color representation
      cyclePacketColor(p.progress, time, i, packetTempCol);
      colArr[i * 3] = packetTempCol.r;
      colArr[i * 3 + 1] = packetTempCol.g;
      colArr[i * 3 + 2] = packetTempCol.b;
    }

    packetPosAttr.needsUpdate = true;
    packetColAttr.needsUpdate = true;

    // Slow cinematic drift of ambient particle system
    if (ambientGeometry.attributes.position) {
      const pos = ambientGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < AMBIENT_PARTICLE_COUNT; i++) {
        // Slow rotation around the local Y-axis
        const x = pos[i * 3];
        const z = pos[i * 3 + 2];
        const angle = delta * 0.015;
        pos[i * 3] = x * Math.cos(angle) - z * Math.sin(angle);
        pos[i * 3 + 2] = x * Math.sin(angle) + z * Math.cos(angle);
      }
      ambientGeometry.attributes.position.needsUpdate = true;
    }
  });

  // Calculate dynamic scaling for the Canvas layout based on viewport width
  const globeGroupScale = useMemo(() => {
    const width = size.width;
    if (width < 640) return 0.55; // Mobile (size scaled down)
    if (width < 1024) return 0.75; // Tablet
    return 1.0; // Desktop (normal size)
  }, [size.width]);

  return (
    <group ref={globeGroupRef} scale={globeGroupScale}>
      {/* 100,000+ Glowing Holographic Globe Points */}
      <points geometry={globeGeometry} material={globeMaterial} />

      {/* Network Connection Lines */}
      <lineSegments geometry={connectionGeometry}>
        <lineBasicMaterial
          color={new THREE.Color("#0284c7")} // Soft Blue
          transparent
          opacity={0.16}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      {/* RGB Data Packets */}
      <points geometry={packetGeometry}>
        <pointsMaterial
          size={0.065}
          vertexColors
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Instanced Screen Border Icons */}
      <instancedMesh args={[screenGeom, screenMaterial, NODE_COUNT]} />

      {/* Cinematic Ambient Particles */}
      <points geometry={ambientGeometry} material={ambientMaterial} />
    </group>
  );
};

// ==========================================
// 4. MAIN CONTAINER COMPONENT (WRAPPER)
// ==========================================
export const HeroGlobe: React.FC = () => {
  const mouseRotation = useRef({ x: 0, y: 0 });

  // Track mouse coordinates to apply a slow, natural rotation on cursor movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Translate to screen coordinates range [-0.5, 0.5]
      const nx = (e.clientX / window.innerWidth) - 0.5;
      const ny = (e.clientY / window.innerHeight) - 0.5;
      
      // Target smooth rotation limit (low scale to maintain subtle interaction)
      mouseRotation.current.x = ny * 0.12;
      mouseRotation.current.y = nx * 0.12;
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="w-full h-full relative select-none pointer-events-none opacity-45 transition-opacity duration-1000">
      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 60 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}
      >
        {/* Soft Ambient lighting to highlight particles */}
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#e0f2fe" />
        
        <HeroGlobeScene mouseRotation={mouseRotation} />

        {/* Cinematic Post-Processing (Bloom Filter) */}
        <EffectComposer>
          <Bloom
            intensity={0.7}
            luminanceThreshold={0.15}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
};

export default HeroGlobe;
