import { useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSound } from "./SoundProvider.jsx";
import { noteFromUnit } from "../lib/audio.js";

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uHover;
  varying vec3 vNormal;
  varying vec3 vPos;
  varying float vDisp;

  // Ashima 3D simplex noise
  vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 1.0/7.0;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main(){
    vNormal = normal;
    float t = uTime * 0.35;
    float amp = 0.18 + uHover * 0.28;
    float freq = 1.4 + uHover * 0.8;
    float d = snoise(normal * freq + vec3(t)) * amp;
    d += snoise(normal * (freq * 2.3) - vec3(t * 0.6)) * amp * 0.4;
    vDisp = d;
    vec3 pos = position + normal * d;
    vPos = pos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform float uHover;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  varying vec3 vNormal;
  varying vec3 vPos;
  varying float vDisp;

  void main(){
    vec3 viewDir = normalize(-vPos);
    float fres = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 2.2);

    vec3 base = mix(uColorA, uColorB, smoothstep(-0.2, 0.3, vDisp));
    base = mix(base, uColorC, smoothstep(0.1, 0.35, vDisp) * (0.4 + uHover * 0.5));

    vec3 col = base * (0.25 + fres * 1.4);
    col += fres * uColorC * (0.5 + uHover);

    gl_FragColor = vec4(col, 1.0);
  }
`;

function Orb() {
  const mesh = useRef();
  const matRef = useRef();
  const [hovered, setHovered] = useState(false);
  const { on, note } = useSound();
  const targetHover = useRef(0);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHover: { value: 0 },
      uColorA: { value: new THREE.Color("#10131c") },
      uColorB: { value: new THREE.Color("#7c5cff") }, // neon violet
      uColorC: { value: new THREE.Color("#36f1cd") }, // cyan-mint
    }),
    []
  );

  useFrame((state, dt) => {
    if (!matRef.current || !mesh.current) return;
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    const cur = matRef.current.uniforms.uHover.value;
    matRef.current.uniforms.uHover.value += (targetHover.current - cur) * Math.min(1, dt * 6);
    mesh.current.rotation.y += dt * 0.12;
    mesh.current.rotation.x = state.pointer.y * 0.25;
    mesh.current.rotation.z = state.pointer.x * 0.12;
  });

  return (
    <mesh
      ref={mesh}
      onPointerOver={() => {
        setHovered(true);
        targetHover.current = 1;
        if (on) note();
      }}
      onPointerOut={() => {
        setHovered(false);
        targetHover.current = 0;
      }}
      onPointerMove={(e) => {
        if (on && Math.random() < 0.06) {
          const u = (e.point.y + 1.4) / 2.8;
          note(noteFromUnit(u));
        }
      }}
    >
      <icosahedronGeometry args={[1.25, 48]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
      />
    </mesh>
  );
}

export default function HeroOrb() {
  return (
    <div className="hero-orb" aria-hidden="true">
      <Canvas
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 3.4], fov: 45 }}
      >
        <ambientLight intensity={0.6} />
        <Orb />
      </Canvas>
      <span className="hero-orb__hint mono">⟡ hover / move</span>
    </div>
  );
}
