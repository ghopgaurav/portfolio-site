import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSound } from "./SoundProvider.jsx";
import { setEnergyLevel, spark } from "../lib/audio.js";
import { energyParams } from "../lib/energyStore.js";
import { proximity } from "../lib/proximityStore.js";

const COUNT = 6000;
const FLARES = 800;
// critically-damped follow (zeta = 1, no overshoot) -> smooth, slow, "expensive"
const STIFF = 6.5; // low stiffness = long, cinematic settle
const CRIT = 2 * Math.sqrt(STIFF); // critical damping coefficient

/* ----- glowing energy grains (additive, crisp core) ----- */
const pointVert = /* glsl */ `
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uGlow;
  attribute vec3 aBase;
  attribute float aCore;
  attribute float aExcite;
  varying float vI;
  varying float vE;
  void main() {
    vec3 p = position;
    float disp = length(p - aBase);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float core = 1.0 - aCore;
    float size = uSize * (0.4 + core * 1.15) * (1.0 + disp * 2.0 + uGlow * 0.5 + aExcite * 1.7);
    gl_PointSize = clamp(size * uPixelRatio * (1.0 / -mv.z), 1.0, 30.0);
    vI = core * 0.55 + disp * 2.4 + uGlow * 0.5 + aExcite * 1.6;
    vE = aExcite;
    gl_Position = projectionMatrix * mv;
  }
`;
const pointFrag = /* glsl */ `
  precision highp float;
  uniform vec3 uColorCore;
  uniform vec3 uColorEdge;
  varying float vI;
  varying float vE;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.055, d);
    float halo = smoothstep(0.5, 0.0, d);
    float i = clamp(vI, 0.0, 1.6);
    vec3 col = mix(uColorEdge, uColorCore, clamp(i, 0.0, 1.0));
    // collision flash — excited grains bloom to white-hot then die out
    col = mix(col, vec3(1.0, 0.97, 0.9), clamp(vE, 0.0, 1.0));
    float a = (core * 0.9 + halo * 0.32) * clamp(i, 0.05, 1.4) * 0.55;
    a += vE * core * 0.55;
    gl_FragColor = vec4(col, a);
  }
`;

/* ----- ejected sun-flares (recycled pool) ----- */
const flareVert = /* glsl */ `
  uniform float uSize;
  uniform float uPixelRatio;
  attribute float aAlpha;
  attribute float aSize;
  varying float vA;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    // size follows the brightness arc: born small, swells at peak, shrinks as it dies
    float grow = 0.35 + 0.95 * aAlpha;
    gl_PointSize = clamp(uSize * aSize * grow * uPixelRatio * (1.0 / -mv.z), 1.0, 24.0);
    vA = aAlpha;
    gl_Position = projectionMatrix * mv;
  }
`;
const flareFrag = /* glsl */ `
  precision highp float;
  uniform vec3 uHot;
  uniform vec3 uAmber;
  varying float vA;
  void main() {
    if (vA <= 0.002) discard;
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.04, d);
    float halo = smoothstep(0.5, 0.0, d);
    vec3 col = mix(uAmber, uHot, clamp(vA, 0.0, 1.0));
    gl_FragColor = vec4(col, (core * 0.9 + halo * 0.3) * vA * 0.9);
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
  const exc = new Float32Array(COUNT);
  const span = R * 1.25;
  for (let i = 0; i < COUNT; i++) {
    const rr = Math.pow(Math.random(), 0.6);
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
  geometry.setAttribute("aExcite", new THREE.BufferAttribute(exc, 1));
  return { geometry, positions, base, vel, core, seed, exc, N: COUNT, R };
}

function buildFlares() {
  const positions = new Float32Array(FLARES * 3);
  const alpha = new Float32Array(FLARES);
  const size = new Float32Array(FLARES);
  const vel = new Float32Array(FLARES * 3);
  const life = new Float32Array(FLARES).fill(999);
  const max = new Float32Array(FLARES).fill(1);
  for (let i = 0; i < FLARES; i++) size[i] = 0.6 + Math.random() * 1.3;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  return { geometry, positions, alpha, size, vel, life, max, N: FLARES };
}

function Core({ reduced }) {
  const { viewport } = useThree();
  const { on } = useSound();
  const pointer = useRef({ x: 0, y: 0, px: 0, py: 0, active: false });
  const energy = useRef(0.0);
  const theta = useRef(0.0);
  const emitCarry = useRef(0);
  const fhead = useRef(0);
  const pointMat = useRef();
  const haloMat = useRef();
  const haloMesh = useRef();

  const dimsKey = Math.round(viewport.width * 4) + "x" + Math.round(viewport.height * 4);
  const field = useMemo(
    () => buildField(viewport.width || 4, viewport.height || 4),
    [dimsKey]
  );
  const flares = useMemo(() => buildFlares(), []);
  useEffect(() => () => field.geometry.dispose(), [field]);
  useEffect(() => () => flares.geometry.dispose(), [flares]);

  const pointUniforms = useMemo(
    () => ({
      uSize: { value: 22.0 },
      uPixelRatio: {
        value: Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 2),
      },
      uGlow: { value: 0.12 },
      uColorCore: { value: new THREE.Color("#fff5db") },
      uColorEdge: { value: new THREE.Color("#ff9a22") },
    }),
    []
  );
  const haloUniforms = useMemo(
    () => ({ uGlow: { value: 0.12 }, uColor: { value: new THREE.Color("#ffa23a") } }),
    []
  );
  const flareUniforms = useMemo(
    () => ({
      uSize: { value: 34.0 },
      uPixelRatio: {
        value: Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 2),
      },
      uHot: { value: new THREE.Color("#fff6e2") },
      uAmber: { value: new THREE.Color("#ff7d16") },
    }),
    []
  );

  useFrame((state, rawDt) => {
    const { positions, base, vel, seed, exc, N } = field;
    const p = pointer.current;
    const t = state.clock.elapsedTime;
    const dt = Math.min(rawDt, 1 / 30);
    const f = Math.min(Math.max(dt * 60, 0.4), 2.2);

    const prox = proximity.value; // 0 outside zone .. 1 dead centre
    const pr = energyParams.rotation;
    const flow = energyParams.flow;
    const react = energyParams.reactivity;
    const glowMul = energyParams.glow;

    theta.current += pr * dt * 0.6;
    const ct = Math.cos(theta.current);
    const st = Math.sin(theta.current);

    const infl = field.R * 0.55;
    const infl2 = infl * infl;
    // how hard the reaction bites, scaled organically by depth toward the centre
    const depth = prox * prox * (0.35 + 0.65 * react); // 0 at boundary -> 1 dead-centre
    const twist = 0.9 + prox * 1.4; // static swirl arc (rad), deeper = more coiled
    const orbit = 0.55 * prox; // slow continuous vortex spin (rad/s) — the cinematic part
    const lens = field.R * 0.07 * depth; // gentle radial lens outward
    const dome = field.R * 0.16 * depth; // z-projection toward camera
    const excDecay = Math.exp(-dt * 2.0); // flashes fade smoothly over ~0.5s
    const amp = flow * field.R * 0.05;
    const globalPulse = reduced ? 0 : Math.sin(t * 0.9) * 0.03;

    // pointer speed → brighter, wider collision flashes
    const spd = Math.hypot(p.x - p.px, p.y - p.py);
    p.px = p.x;
    p.py = p.y;
    const speedN = Math.min(1, spd / (field.R * 0.14));
    let disturb = 0;

    for (let i = 0; i < N; i++) {
      const ix = i * 3;
      const iy = ix + 1;
      const iz = ix + 2;
      const bx = base[ix];
      const by = base[iy];
      const bz = base[iz];

      const rbx = bx * ct - by * st;
      const rby = bx * st + by * ct;

      const breath = reduced ? 0 : Math.sin(t * 0.5 + seed[i] * 6.283) * 0.05 + globalPulse;
      const fx = reduced ? 0 : Math.sin(by * 1.3 + t * 0.5 + seed[i] * 6.283) * amp;
      const fy = reduced ? 0 : Math.cos(bx * 1.3 + t * 0.6 + seed[i] * 6.283) * amp;
      let tx = rbx * (1 + breath) + fx;
      let ty = rby * (1 + breath) + fy;
      let tz = bz * (1 + breath);

      exc[i] *= excDecay; // fade any previous flash

      if (p.active && depth > 0.0005) {
        const dx = tx - p.x;
        const dy = ty - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < infl2 && d2 > 0.00001) {
          const d = Math.sqrt(d2);
          const nrm = 1 - d / infl; // 0 at edge .. 1 at pointer
          const ease = nrm * nrm * (3 - 2 * nrm); // smoothstep — organic falloff
          // slow winding vortex: rotate the TARGET around the pointer (no fast impulses)
          const ang = (twist * ease + t * orbit * ease) * (0.4 + depth);
          const ca = Math.cos(ang);
          const sa = Math.sin(ang);
          const rx = p.x + dx * ca - dy * sa;
          const ry = p.y + dx * sa + dy * ca;
          const ux = dx / d;
          const uy = dy / d;
          tx = rx + ux * lens * ease;
          ty = ry + uy * lens * ease;
          tz += ease * ease * dome;
          // collision excitation — brief bright spike, brighter with pointer speed
          const tgtE = ease * (0.35 + speedN * 0.85) * (0.4 + depth);
          if (tgtE > exc[i]) exc[i] = Math.min(1.2, tgtE);
        }
      }

      // critically-damped follow toward the target — smooth, slow, no overshoot
      const ax = (tx - positions[ix]) * STIFF - vel[ix] * CRIT;
      const ay = (ty - positions[iy]) * STIFF - vel[iy] * CRIT;
      const az = (tz - positions[iz]) * STIFF - vel[iz] * CRIT;
      vel[ix] += ax * dt;
      vel[iy] += ay * dt;
      vel[iz] += az * dt;
      positions[ix] += vel[ix] * dt;
      positions[iy] += vel[iy] * dt;
      positions[iz] += vel[iz] * dt;

      disturb += Math.abs(vel[ix]) + Math.abs(vel[iy]);
    }
    field.geometry.attributes.position.needsUpdate = true;
    field.geometry.attributes.aExcite.needsUpdate = true;

    // reaction level is driven by proximity (max at the centre)
    const level = Math.min(1, (disturb / N) * 5);
    const target = Math.min(1, prox + (p.active ? level * 0.25 : 0));
    energy.current += (target - energy.current) * Math.min(1, dt * 4);
    const idleGlow = reduced ? 0.16 : 0.16 + Math.sin(t * 0.7) * 0.05;
    const glow = (idleGlow + energy.current * 1.0) * glowMul;

    if (pointMat.current) pointMat.current.uniforms.uGlow.value = glow;
    if (haloMat.current) haloMat.current.uniforms.uGlow.value = glow;
    if (haloMesh.current) {
      const s = field.R * 2.6 * (1 + energy.current * 0.22 + globalPulse);
      haloMesh.current.scale.set(s, s, 1);
    }

    // --- reaction sparks: born bright at the collision, wander/bounce, fade, die ---
    // A living "sum": ambient motes off the core + bright motes from the pointer reaction.
    const fl = flares;
    const reacting = p.active && depth > 0.02;
    emitCarry.current += (prox * prox * 8 + (reacting ? depth * 26 : 0)) * f;
    let emit = Math.floor(emitCarry.current);
    emitCarry.current -= emit;
    const coreR = field.R * 0.28;
    while (emit-- > 0) {
      const s = fhead.current;
      fhead.current = (fhead.current + 1) % fl.N;
      const s3 = s * 3;
      // most sparks are struck at the pointer reaction point; the rest simmer off the core
      const fromReaction = reacting && Math.random() < 0.72;
      let dx = Math.random() * 2 - 1;
      let dy = Math.random() * 2 - 1;
      let dz = Math.random() * 2 - 1;
      const dl = Math.hypot(dx, dy, dz) || 1;
      dx /= dl;
      dy /= dl;
      dz /= dl;
      if (fromReaction) {
        const jitter = field.R * 0.05;
        fl.positions[s3] = p.x + dx * jitter;
        fl.positions[s3 + 1] = p.y + dy * jitter;
        fl.positions[s3 + 2] = dz * jitter;
      } else {
        fl.positions[s3] = dx * coreR;
        fl.positions[s3 + 1] = dy * coreR;
        fl.positions[s3 + 2] = dz * coreR;
      }
      // slow ejection — the slow-motion is what reads as expensive
      const sp = field.R * (0.06 + Math.random() * 0.16);
      fl.vel[s3] = dx * sp - dy * sp * 0.4;
      fl.vel[s3 + 1] = dy * sp + dx * sp * 0.4;
      fl.vel[s3 + 2] = dz * sp * 0.6;
      fl.life[s] = 0;
      fl.max[s] = 1.1 + Math.random() * 1.9; // long-lived, lingering
      fl.alpha[s] = 0.001;
    }
    const gback = field.R * 0.22; // soft pull home so they arc and settle (bounce feel)
    const turb = field.R * 0.5;
    const fdamp = Math.exp(-dt * 0.9);
    for (let i = 0; i < fl.N; i++) {
      if (fl.life[i] >= fl.max[i]) {
        if (fl.alpha[i] !== 0) fl.alpha[i] = 0;
        continue;
      }
      const i3 = i * 3;
      fl.life[i] += dt;
      const px = fl.positions[i3];
      const py = fl.positions[i3 + 1];
      const pz = fl.positions[i3 + 2];
      const pl = Math.hypot(px, py, pz) || 1;
      // gentle gravity back to the core + slow curl turbulence → organic wander
      fl.vel[i3] += ((-px / pl) * gback + Math.sin(py * 1.7 + t * 0.8) * turb) * dt;
      fl.vel[i3 + 1] += ((-py / pl) * gback + Math.cos(px * 1.7 + t * 0.7) * turb) * dt;
      fl.vel[i3 + 2] += (-pz / pl) * gback * dt;
      fl.vel[i3] *= fdamp;
      fl.vel[i3 + 1] *= fdamp;
      fl.vel[i3 + 2] *= fdamp;
      fl.positions[i3] += fl.vel[i3] * dt;
      fl.positions[i3 + 1] += fl.vel[i3 + 1] * dt;
      fl.positions[i3 + 2] += fl.vel[i3 + 2] * dt;
      // brightness arc: fast attack, long decay (bright flash → slow death)
      const age = fl.life[i] / fl.max[i];
      fl.alpha[i] = age < 0.18 ? age / 0.18 : Math.pow(1 - (age - 0.18) / 0.82, 1.5);
    }
    fl.geometry.attributes.position.needsUpdate = true;
    fl.geometry.attributes.aAlpha.needsUpdate = true;

    if (on) {
      setEnergyLevel(0.1 + energy.current);
      if (prox > 0.05 && Math.random() < prox * 0.4) spark(0.15 + prox * 0.6);
    }
  });

  const onMove = (e) => {
    pointer.current.x = e.point.x;
    pointer.current.y = e.point.y;
    pointer.current.active = true;
  };
  const onLeave = () => {
    pointer.current.active = false;
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

      <points geometry={flares.geometry}>
        <shaderMaterial
          vertexShader={flareVert}
          fragmentShader={flareFrag}
          uniforms={flareUniforms}
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
