import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSound } from "./SoundProvider.jsx";
import { setSandLevel, tone, noteFromUnit } from "../lib/audio.js";

const RADIUS = 0.8;       // pointer influence radius (world units)
const PUSH = 0.028;       // repulsion strength
const SPRING = 0.05;      // restoring force toward home (incl. the wave)
const DAMP = 0.87;        // velocity damping
const TARGET_COUNT = 5200;

const vertex = /* glsl */ `
  uniform float uSize;
  uniform float uPixelRatio;
  uniform vec2 uHalf;
  attribute vec3 aBase;
  varying float vDisp;
  varying float vFade;
  void main() {
    vec3 p = position;
    vDisp = length(p - aBase);
    // soft falloff toward the field edges so there's no hard rectangle
    vec2 nrm = abs(aBase.xy) / uHalf;
    float edge = max(nrm.x, nrm.y);
    vFade = 1.0 - smoothstep(0.62, 1.0, edge);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * uPixelRatio * (1.0 + vDisp * 1.8) * (1.0 / -mv.z);
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
    // soft matte grain (no harsh glow)
    float alpha = smoothstep(0.5, 0.12, d);
    float m = clamp(vDisp * 1.3, 0.0, 1.0);
    vec3 col = mix(uSand, uSpice, m);
    gl_FragColor = vec4(col, alpha * (0.5 + m * 0.35) * vFade);
  }
`;

function buildField(vw, vh) {
  const marginX = vw * 0.12;
  const marginY = vh * 0.12;
  const W = vw + marginX * 2;
  const H = vh + marginY * 2;
  let spacing = Math.sqrt((W * H) / TARGET_COUNT);
  spacing = Math.max(spacing, 0.09);
  const cols = Math.max(2, Math.floor(W / spacing));
  const rows = Math.max(2, Math.floor(H / spacing));
  const N = cols * rows;

  const positions = new Float32Array(N * 3);
  const base = new Float32Array(N * 3);
  const vel = new Float32Array(N * 3);
  let i = 0;
  for (let gx = 0; gx < cols; gx++) {
    for (let gy = 0; gy < rows; gy++) {
      const x = -W / 2 + (gx / (cols - 1)) * W + (Math.random() - 0.5) * spacing * 0.6;
      const y = -H / 2 + (gy / (rows - 1)) * H + (Math.random() - 0.5) * spacing * 0.6;
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
  return { geometry, positions, base, vel, N, halfX: W / 2, halfY: H / 2 };
}

function Grains({ reduced }) {
  const { viewport } = useThree();
  const { on } = useSound();
  const pointer = useRef({ x: 0, y: 0, active: false, wasActive: false });
  const matRef = useRef();

  const dimsKey =
    Math.round(viewport.width * 4) + "x" + Math.round(viewport.height * 4);
  const field = useMemo(
    () => buildField(viewport.width || 6, viewport.height || 4),
    [dimsKey]
  );
  useEffect(() => () => field.geometry.dispose(), [field]);

  const uniforms = useMemo(
    () => ({
      uSize: { value: 30.0 },
      uPixelRatio: {
        value: Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 2),
      },
      uHalf: { value: new THREE.Vector2(field.halfX, field.halfY) },
      uSand: { value: new THREE.Color("#c9b391") }, // muted matte sand
      uSpice: { value: new THREE.Color("#d6a468") }, // soft amber crest
    }),
    []
  );

  // keep the edge-fade extents in sync when the field is rebuilt on resize
  useEffect(() => {
    if (matRef.current) matRef.current.uniforms.uHalf.value.set(field.halfX, field.halfY);
  }, [field]);

  useFrame((state, dt) => {
    const { positions, base, vel, N } = field;
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

      // slow, soothing dune surface
      const homeZ = reduced
        ? 0
        : Math.sin(bx * 0.9 + t * 0.28) * 0.08 + Math.cos(by * 1.1 - t * 0.22) * 0.08;

      if (p.active) {
        const dx = positions[ix] - px;
        const dy = positions[iy] - py;
        const d2 = dx * dx + dy * dy;
        if (d2 < r2 && d2 > 0.00001) {
          const d = Math.sqrt(d2);
          const f = (1 - d / RADIUS) * PUSH;
          vel[ix] += (dx / d) * f;
          vel[iy] += (dy / d) * f;
          vel[iz] += f * 1.2;
        }
      }

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

    field.geometry.attributes.position.needsUpdate = true;

    if (on) {
      const level = Math.min(1, (energy / N) * 120);
      setSandLevel(level);
      if (p.active && level > 0.16 && Math.random() < 0.035) {
        const u = (py / (field.halfY || 1) + 1) / 2;
        tone(noteFromUnit(u), 1.9, 0.28 + level * 0.4);
      }
      if (p.active && !p.wasActive) tone(noteFromUnit(0.5), 2.0, 0.35);
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
        <planeGeometry args={[field.halfX * 2.2, field.halfY * 2.2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <points geometry={field.geometry}>
        <shaderMaterial
          ref={matRef}
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
        <Grains reduced={reduced} />
      </Canvas>
    </div>
  );
}
