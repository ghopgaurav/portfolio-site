import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSound } from "./SoundProvider.jsx";
import { setEnergyLevel, spark } from "../lib/audio.js";
import { energyParams } from "../lib/energyStore.js";
import { proximity } from "../lib/proximityStore.js";

const COUNT = 6000;
const FLARES = 800;
const SPRING = 0.055;
const DAMP = 0.86;

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
    float size = uSize * (0.4 + core * 1.15) * (1.0 + disp * 2.0 + uGlow * 0.5 + aExcite * 2.6);
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
    gl_PointSize = clamp(uSize * aSize * uPixelRatio * (1.0 / -mv.z), 1.0, 22.0);
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

    const infl = field.R * 0.5;
    const infl2 = infl * infl;
    const push = 0.05 * react * (0.25 + prox); // stronger the closer you are
    const swirl = 1.7; // tangential vortex around the pointer
    const bulge = push * 2.6; // z-projection dome (multidimensional feel)
    const edec = Math.pow(0.86, f); // excitation flash decay
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
      const tx = rbx * (1 + breath) + fx;
      const ty = rby * (1 + breath) + fy;
      const tz = bz * (1 + breath);

      exc[i] *= edec; // fade any previous flash

      if (p.active) {
        const dx = positions[ix] - p.x;
        const dy = positions[iy] - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < infl2 && d2 > 0.00001) {
          const d = Math.sqrt(d2);
          const nrm = 1 - d / infl; // 0 at edge .. 1 at pointer
          const force = nrm * push;
          const ux = dx / d;
          const uy = dy / d;
          // radial bulge outward
          vel[ix] += ux * force * f;
          vel[iy] += uy * force * f;
          // tangential vortex swirl → orbiting, quantum-ish motion
          const sw = nrm * push * swirl;
          vel[ix] += -uy * sw * f;
          vel[iy] += ux * sw * f;
          // z-projection dome toward the camera (power-shaped)
          vel[iz] += nrm * nrm * bulge * f;
          // collision excitation — spike, brighter with pointer speed
          const tgtE = nrm * (0.4 + speedN * 0.9);
          if (tgtE > exc[i]) exc[i] = Math.min(1.2, tgtE);
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
    field.geometry.attributes.aExcite.needsUpdate = true;

    // reaction level is driven by proximity (max at the centre)
    const level = Math.min(1, (disturb / N) * 130);
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

    // --- sun flares ejected from the core surface (more the closer you are) ---
    const fl = flares;
    emitCarry.current += prox * prox * 30 * f;
    let emit = Math.floor(emitCarry.current);
    emitCarry.current -= emit;
    const spawnR = field.R * 0.3;
    while (emit-- > 0) {
      const s = fhead.current;
      fhead.current = (fhead.current + 1) % fl.N;
      const s3 = s * 3;
      let dx = Math.random() * 2 - 1;
      let dy = Math.random() * 2 - 1;
      let dz = Math.random() * 2 - 1;
      const dl = Math.hypot(dx, dy, dz) || 1;
      dx /= dl;
      dy /= dl;
      dz /= dl;
      fl.positions[s3] = dx * spawnR;
      fl.positions[s3 + 1] = dy * spawnR;
      fl.positions[s3 + 2] = dz * spawnR;
      const sp = field.R * (0.5 + Math.random() * 0.9);
      fl.vel[s3] = dx * sp - dy * sp * 0.3;
      fl.vel[s3 + 1] = dy * sp + dx * sp * 0.3;
      fl.vel[s3 + 2] = dz * sp;
      fl.life[s] = 0;
      fl.max[s] = 0.6 + Math.random() * 1.1;
      fl.alpha[s] = 0.001;
    }
    const gback = field.R * 0.5;
    const fdamp = Math.pow(0.92, f);
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
      fl.vel[i3] += (-px / pl) * gback * dt;
      fl.vel[i3 + 1] += (-py / pl) * gback * dt;
      fl.vel[i3 + 2] += (-pz / pl) * gback * dt;
      fl.vel[i3] *= fdamp;
      fl.vel[i3 + 1] *= fdamp;
      fl.vel[i3 + 2] *= fdamp;
      fl.positions[i3] += fl.vel[i3] * dt;
      fl.positions[i3 + 1] += fl.vel[i3 + 1] * dt;
      fl.positions[i3 + 2] += fl.vel[i3 + 2] * dt;
      const age = fl.life[i] / fl.max[i];
      fl.alpha[i] = Math.sin(age * Math.PI);
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
