import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSound } from "./SoundProvider.jsx";
import { setEnergyLevel, tone, noteFromUnit } from "../lib/audio.js";

const COUNT = 4600;
const SPRING = 0.05;
const DAMP = 0.86;
const PUSH = 0.05;

/* ----- glowing energy grains (additive) ----- */
const pointVert = /* glsl */ `
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uGlow;
  attribute vec3 aBase;
  attribute float aCore;
  varying float vI;
  void main() {
    vec3 p = position;
    float disp = length(p - aBase);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float core = 1.0 - aCore;                 // 1 at centre, 0 at edge
    float size = uSize * (0.45 + core * 1.35) * (1.0 + disp * 3.0 + uGlow * 0.7);
    gl_PointSize = size * uPixelRatio * (1.0 / -mv.z);
    vI = core * 0.6 + disp * 2.6 + uGlow * 0.55;
    gl_Position = projectionMatrix * mv;
  }
`;
const pointFrag = /* glsl */ `
  precision mediump float;
  uniform vec3 uColorCore;
  uniform vec3 uColorEdge;
  varying float vI;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.0, d);     // soft round grain
    float i = clamp(vI, 0.0, 1.0);
    vec3 col = mix(uColorEdge, uColorCore, i);
    gl_FragColor = vec4(col, soft * clamp(vI, 0.04, 1.0) * 0.5);
  }
`;

/* ----- soft emission halo (additive) ----- */
const haloVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const haloFrag = /* glsl */ `
  precision mediump float;
  uniform float uGlow;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.0, d);
    a = pow(a, 2.4);
    gl_FragColor = vec4(uColor, a * (0.10 + uGlow * 0.55));
  }
`;

function buildField(vw, vh) {
  const R = Math.min(vw || 4, vh || 4) * 0.42;
  const positions = new Float32Array(COUNT * 3);
  const base = new Float32Array(COUNT * 3);
  const vel = new Float32Array(COUNT * 3);
  const core = new Float32Array(COUNT);
  const seed = new Float32Array(COUNT);
  const span = R * 1.25;
  for (let i = 0; i < COUNT; i++) {
    const rr = Math.pow(Math.random(), 0.62); // denser toward the core
    const r = rr * span;
    const th = Math.random() * Math.PI * 2;
    const zz = (Math.random() - 0.5) * R * 0.6;
    const x = Math.cos(th) * r;
    const y = Math.sin(th) * r;
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = zz;
    base[i * 3] = x;
    base[i * 3 + 1] = y;
    base[i * 3 + 2] = zz;
    core[i] = Math.min(1, r / span);
    seed[i] = Math.random();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aBase", new THREE.BufferAttribute(base, 3));
  geometry.setAttribute("aCore", new THREE.BufferAttribute(core, 1));
  return { geometry, positions, base, vel, core, seed, N: COUNT, R };
}

function Core({ reduced }) {
  const { viewport } = useThree();
  const { on } = useSound();
  const pointer = useRef({ x: 0, y: 0, active: false, wasActive: false });
  const energy = useRef(0.0);
  const pointMat = useRef();
  const haloMat = useRef();
  const haloMesh = useRef();

  const dimsKey = Math.round(viewport.width * 4) + "x" + Math.round(viewport.height * 4);
  const field = useMemo(
    () => buildField(viewport.width || 4, viewport.height || 4),
    [dimsKey]
  );
  useEffect(() => () => field.geometry.dispose(), [field]);

  const pointUniforms = useMemo(
    () => ({
      uSize: { value: 26.0 },
      uPixelRatio: {
        value: Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 2),
      },
      uGlow: { value: 0.12 },
      uColorCore: { value: new THREE.Color("#e2f5ff") }, // white-hot
      uColorEdge: { value: new THREE.Color("#31aeec") }, // nuclear blue
    }),
    []
  );
  const haloUniforms = useMemo(
    () => ({
      uGlow: { value: 0.12 },
      uColor: { value: new THREE.Color("#43b9ef") },
    }),
    []
  );

  useFrame((state, dt) => {
    const { positions, base, vel, seed, N } = field;
    const p = pointer.current;
    const t = state.clock.elapsedTime;
    const infl = field.R * 0.5;
    const infl2 = infl * infl;
    const globalPulse = Math.sin(t * 0.9) * 0.03;
    let disturb = 0;

    for (let i = 0; i < N; i++) {
      const ix = i * 3;
      const iy = ix + 1;
      const iz = ix + 2;
      // breathing energy — radial pulse from the core
      const pulse = reduced ? 0 : Math.sin(t * 0.5 + seed[i] * 6.283) * 0.06 + globalPulse;
      const tx = base[ix] * (1 + pulse);
      const ty = base[iy] * (1 + pulse);
      const tz = base[iz] * (1 + pulse);

      if (p.active) {
        const dx = positions[ix] - p.x;
        const dy = positions[iy] - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < infl2 && d2 > 0.00001) {
          const d = Math.sqrt(d2);
          const f = (1 - d / infl) * PUSH;
          vel[ix] += (dx / d) * f;
          vel[iy] += (dy / d) * f;
          vel[iz] += f * 1.3;
        }
      }

      vel[ix] += (tx - positions[ix]) * SPRING;
      vel[iy] += (ty - positions[iy]) * SPRING;
      vel[iz] += (tz - positions[iz]) * SPRING;
      vel[ix] *= DAMP;
      vel[iy] *= DAMP;
      vel[iz] *= DAMP;
      positions[ix] += vel[ix];
      positions[iy] += vel[iy];
      positions[iz] += vel[iz];

      disturb += Math.abs(vel[ix]) + Math.abs(vel[iy]);
    }
    field.geometry.attributes.position.needsUpdate = true;

    // energy level rises when interacted, decays back to a calm idle glow
    const level = Math.min(1, (disturb / N) * 130);
    const target = p.active ? Math.max(0.4, level) : 0.0;
    energy.current += (target - energy.current) * Math.min(1, dt * 3);
    // gentle always-on breathing so the core reads as a living energy source
    const idleGlow = reduced ? 0.16 : 0.16 + Math.sin(t * 0.7) * 0.055;
    const glow = idleGlow + energy.current * 0.9;

    if (pointMat.current) pointMat.current.uniforms.uGlow.value = glow;
    if (haloMat.current) haloMat.current.uniforms.uGlow.value = glow;
    if (haloMesh.current) {
      const s = field.R * 2.6 * (1 + energy.current * 0.18 + globalPulse);
      haloMesh.current.scale.set(s, s, 1);
    }

    if (on) {
      setEnergyLevel(0.12 + energy.current);
      if (p.active && level > 0.14 && Math.random() < 0.035) {
        const u = (p.y / (field.R || 1) + 1) / 2;
        tone(noteFromUnit(u), 2.2, 0.25 + level * 0.4);
      }
      if (p.active && !p.wasActive) tone(noteFromUnit(0.5), 2.4, 0.4);
    }
    p.wasActive = p.active;
  });

  const onMove = (e) => {
    pointer.current.x = e.point.x;
    pointer.current.y = e.point.y;
    pointer.current.active = true;
  };
  const onLeave = () => {
    pointer.current.active = false;
    if (on) setEnergyLevel(0.12);
  };

  return (
    <group>
      <mesh ref={haloMesh} position={[0, 0, -0.3]}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          ref={haloMat}
          vertexShader={haloVert}
          fragmentShader={haloFrag}
          uniforms={haloUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh onPointerMove={onMove} onPointerOut={onLeave} onPointerDown={onMove}>
        <planeGeometry args={[(viewport.width || 6) * 1.4, (viewport.height || 6) * 1.4]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <points geometry={field.geometry}>
        <shaderMaterial
          ref={pointMat}
          vertexShader={pointVert}
          fragmentShader={pointFrag}
          uniforms={pointUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

export default function EnergyField() {
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div className="hero-orb" aria-hidden="true">
      <Canvas
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        dpr={[1, 2]}
        camera={{ position: [0, 0, 6], fov: 45 }}
      >
        <Core reduced={reduced} />
      </Canvas>
    </div>
  );
}
