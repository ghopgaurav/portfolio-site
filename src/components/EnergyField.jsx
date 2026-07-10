import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSound } from "./SoundProvider.jsx";
import { setEnergyLevel, spark } from "../lib/audio.js";
import { energyParams } from "../lib/energyStore.js";

const COUNT = 6000;
const SPRING = 0.055;
const DAMP = 0.86;

/* ----- glowing energy grains (additive, crisp core) ----- */
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
    float size = uSize * (0.4 + core * 1.15) * (1.0 + disp * 2.0 + uGlow * 0.5);
    gl_PointSize = clamp(size * uPixelRatio * (1.0 / -mv.z), 1.0, 26.0);
    vI = core * 0.55 + disp * 2.4 + uGlow * 0.5;
    gl_Position = projectionMatrix * mv;
  }
`;
const pointFrag = /* glsl */ `
  precision highp float;
  uniform vec3 uColorCore;
  uniform vec3 uColorEdge;
  varying float vI;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.055, d);   // crisp bright centre
    float halo = smoothstep(0.5, 0.0, d);      // soft surrounding glow
    float i = clamp(vI, 0.0, 1.4);
    vec3 col = mix(uColorEdge, uColorCore, clamp(i, 0.0, 1.0));
    float a = (core * 0.9 + halo * 0.32) * clamp(i, 0.05, 1.2) * 0.55;
    gl_FragColor = vec4(col, a);
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
  precision highp float;
  uniform float uGlow;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.0, d);
    a = pow(a, 2.6);
    gl_FragColor = vec4(uColor, a * (0.08 + uGlow * 0.5));
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
    const rr = Math.pow(Math.random(), 0.6); // denser toward the core
    const r = rr * span;
    const th = Math.random() * Math.PI * 2;
    const zz = (Math.random() - 0.5) * R * 0.55;
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
  const theta = useRef(0.0);
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
      uSize: { value: 22.0 },
      uPixelRatio: {
        value: Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 2),
      },
      uGlow: { value: 0.12 },
      uColorCore: { value: new THREE.Color("#fff3d6") }, // white-hot
      uColorEdge: { value: new THREE.Color("#ff8c1f") }, // molten amber
    }),
    []
  );
  const haloUniforms = useMemo(
    () => ({
      uGlow: { value: 0.12 },
      uColor: { value: new THREE.Color("#ffa23a") },
    }),
    []
  );

  useFrame((state, rawDt) => {
    const { positions, base, vel, seed, N } = field;
    const p = pointer.current;
    const t = state.clock.elapsedTime;
    const dt = Math.min(rawDt, 1 / 30);
    const f = Math.min(Math.max(dt * 60, 0.4), 2.2); // frame-rate normaliser

    // live physics params from the side meter
    const pr = energyParams.rotation;
    const flow = energyParams.flow;
    const react = energyParams.reactivity;
    const glowMul = energyParams.glow;

    theta.current += pr * dt * 0.6;
    const ct = Math.cos(theta.current);
    const st = Math.sin(theta.current);

    const infl = field.R * 0.5;
    const infl2 = infl * infl;
    const push = 0.05 * react;
    const amp = flow * field.R * 0.05;
    const globalPulse = reduced ? 0 : Math.sin(t * 0.9) * 0.03;
    let disturb = 0;

    for (let i = 0; i < N; i++) {
      const ix = i * 3;
      const iy = ix + 1;
      const iz = ix + 2;
      const bx = base[ix];
      const by = base[iy];
      const bz = base[iz];

      // slow rotation of the home position (keeps pointer space aligned)
      const rbx = bx * ct - by * st;
      const rby = bx * st + by * ct;

      // organic flow drift + breathing pulse
      const breath = reduced ? 0 : Math.sin(t * 0.5 + seed[i] * 6.283) * 0.05 + globalPulse;
      const fx = reduced ? 0 : Math.sin(by * 1.3 + t * 0.5 + seed[i] * 6.283) * amp;
      const fy = reduced ? 0 : Math.cos(bx * 1.3 + t * 0.6 + seed[i] * 6.283) * amp;
      const tx = rbx * (1 + breath) + fx;
      const ty = rby * (1 + breath) + fy;
      const tz = bz * (1 + breath);

      if (p.active) {
        const dx = positions[ix] - p.x;
        const dy = positions[iy] - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < infl2 && d2 > 0.00001) {
          const d = Math.sqrt(d2);
          const force = (1 - d / infl) * push;
          vel[ix] += (dx / d) * force * f;
          vel[iy] += (dy / d) * force * f;
          vel[iz] += force * 1.3 * f;
        }
      }

      vel[ix] += (tx - positions[ix]) * SPRING * f;
      vel[iy] += (ty - positions[iy]) * SPRING * f;
      vel[iz] += (tz - positions[iz]) * SPRING * f;
      const damp = Math.pow(DAMP, f);
      vel[ix] *= damp;
      vel[iy] *= damp;
      vel[iz] *= damp;
      positions[ix] += vel[ix] * f;
      positions[iy] += vel[iy] * f;
      positions[iz] += vel[iz] * f;

      disturb += Math.abs(vel[ix]) + Math.abs(vel[iy]);
    }
    field.geometry.attributes.position.needsUpdate = true;

    // energy rises with disturbance, decays to a calm breathing idle
    const level = Math.min(1, (disturb / N) * 130);
    const target = p.active ? Math.max(0.4, level) : 0.0;
    energy.current += (target - energy.current) * Math.min(1, dt * 3);
    const idleGlow = reduced ? 0.16 : 0.16 + Math.sin(t * 0.7) * 0.05;
    const glow = (idleGlow + energy.current * 0.9) * glowMul;

    if (pointMat.current) pointMat.current.uniforms.uGlow.value = glow;
    if (haloMat.current) haloMat.current.uniforms.uGlow.value = glow;
    if (haloMesh.current) {
      const s = field.R * 2.6 * (1 + energy.current * 0.18 + globalPulse);
      haloMesh.current.scale.set(s, s, 1);
    }

    if (on) {
      setEnergyLevel(0.12 + energy.current);
      if (p.active && level > 0.12 && Math.random() < 0.06) spark(0.2 + level * 0.5);
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
