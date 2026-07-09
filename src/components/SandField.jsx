import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSound } from "./SoundProvider.jsx";
import { setSandLevel, tone, noteFromUnit } from "../lib/audio.js";

const GRID = 72;          // GRID*GRID grains
const SPAN = 2.5;         // half-extent of the field in world units
const RADIUS = 0.85;      // pointer influence radius
const PUSH = 0.03;        // repulsion strength
const SPRING = 0.055;     // restoring force toward home (incl. the wave)
const DAMP = 0.86;        // velocity damping

const vertex = /* glsl */ `
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uSpan;
  attribute vec3 aBase;
  varying float vDisp;
  varying float vFade;
  void main() {
    vec3 p = position;
    vDisp = length(p - aBase);
    // soft circular falloff so the field reads as an organic form, not a block
    vFade = 1.0 - smoothstep(uSpan * 0.5, uSpan * 1.0, length(aBase.xy));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * uPixelRatio * (1.0 + vDisp * 2.2) * (1.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragment = /* glsl */ `
  precision mediump float;
  uniform vec3 uSand;
  uniform vec3 uSpice;
  varying float vDisp;
  varying float vFade;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.04, d);
    float m = clamp(vDisp * 1.7, 0.0, 1.0);
    vec3 col = mix(uSand, uSpice, m);
    gl_FragColor = vec4(col, alpha * (0.72 + m * 0.28) * vFade);
  }
`;

function Grains() {
  const { on } = useSound();
  const pointer = useRef({ x: 0, y: 0, active: false, wasActive: false });

  const { geometry, positions, base, vel } = useMemo(() => {
    const N = GRID * GRID;
    const positions = new Float32Array(N * 3);
    const base = new Float32Array(N * 3);
    const vel = new Float32Array(N * 3);
    let i = 0;
    for (let gx = 0; gx < GRID; gx++) {
      for (let gy = 0; gy < GRID; gy++) {
        const x = (gx / (GRID - 1) - 0.5) * 2 * SPAN + (Math.random() - 0.5) * 0.02;
        const y = (gy / (GRID - 1) - 0.5) * 2 * SPAN + (Math.random() - 0.5) * 0.02;
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = 0;
        base[i * 3] = x;
        base[i * 3 + 1] = y;
        base[i * 3 + 2] = 0;
        i++;
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aBase", new THREE.BufferAttribute(base, 3));
    return { geometry, positions, base, vel };
  }, []);

  const uniforms = useMemo(
    () => ({
      uSize: { value: 36.0 },
      uSpan: { value: SPAN },
      uPixelRatio: { value: Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 2) },
      uSand: { value: new THREE.Color("#e3c08a") },   // lit sand
      uSpice: { value: new THREE.Color("#ec9a3c") },  // spice amber crest
    }),
    []
  );

  useFrame((state, dt) => {
    const N = GRID * GRID;
    const p = pointer.current;
    const px = p.x;
    const py = p.y;
    const t = state.clock.elapsedTime;
    const r2 = RADIUS * RADIUS;
    let energy = 0;

    for (let i = 0; i < N; i++) {
      const ix = i * 3;
      const iy = ix + 1;
      const iz = ix + 2;
      const bx = base[ix];
      const by = base[iy];

      // soothing flowing dune surface (gentle z wave)
      const homeZ =
        Math.sin(bx * 1.1 + t * 0.45) * 0.12 +
        Math.cos(by * 1.3 - t * 0.35) * 0.12;

      // pointer repulsion (push out + lift)
      if (p.active) {
        const dx = positions[ix] - px;
        const dy = positions[iy] - py;
        const d2 = dx * dx + dy * dy;
        if (d2 < r2 && d2 > 0.00001) {
          const d = Math.sqrt(d2);
          const f = (1 - d / RADIUS) * PUSH;
          vel[ix] += (dx / d) * f;
          vel[iy] += (dy / d) * f;
          vel[iz] += f * 1.4;
        }
      }

      // restoring spring toward the flowing home position
      vel[ix] += (bx - positions[ix]) * SPRING;
      vel[iy] += (by - positions[iy]) * SPRING;
      vel[iz] += (homeZ - positions[iz]) * SPRING;

      vel[ix] *= DAMP;
      vel[iy] *= DAMP;
      vel[iz] *= DAMP;

      positions[ix] += vel[ix];
      positions[iy] += vel[iy];
      positions[iz] += vel[iz];

      energy += Math.abs(vel[ix]) + Math.abs(vel[iy]);
    }

    geometry.attributes.position.needsUpdate = true;

    if (on) {
      const level = Math.min(1, (energy / N) * 110);
      setSandLevel(level);
      // occasional zen tone while actively disturbing the sand
      if (p.active && level > 0.18 && Math.random() < 0.04) {
        const u = (py / SPAN + 1) / 2;
        tone(noteFromUnit(u), 1.8, 0.3 + level * 0.4);
      }
      if (p.active && !p.wasActive) tone(noteFromUnit(0.5), 2.0, 0.4);
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
    if (on) setSandLevel(0);
  };

  return (
    <group>
      <mesh onPointerMove={onMove} onPointerOut={onLeave} onPointerDown={onMove}>
        <planeGeometry args={[SPAN * 2.6, SPAN * 2.6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <points geometry={geometry}>
        <shaderMaterial
          vertexShader={vertex}
          fragmentShader={fragment}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </points>
    </group>
  );
}

export default function SandField() {
  return (
    <div className="hero-orb" aria-hidden="true">
      <Canvas
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        dpr={[1, 2]}
        camera={{ position: [0, 0, 6], fov: 45 }}
      >
        <Grains />
      </Canvas>
      <span className="hero-orb__hint mono">⟡ disturb the sand</span>
    </div>
  );
}
