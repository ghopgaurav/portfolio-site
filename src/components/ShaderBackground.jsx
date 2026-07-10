import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ScreenQuad } from "@react-three/drei";
import * as THREE from "three";

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uRes;
  uniform vec2 uMouse;

  // Simplex 2D noise (Ashima)
  vec3 permute(vec3 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0))
                    + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                            dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float fbm(vec2 p){
    // 3 octaves is plenty for a soft, out-of-focus background — much cheaper
    // per pixel than 5, which matters a lot on integrated GPUs.
    float v = 0.0, a = 0.5;
    for(int i = 0; i < 3; i++){
      v += a * snoise(p);
      p *= 2.0; a *= 0.5;
    }
    return v;
  }

  void main(){
    vec2 uv = vUv;
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);

    float t = uTime * 0.06;
    vec2 q = p * 1.4;
    q += 0.35 * (uMouse - 0.5);

    float n1 = fbm(q + vec2(t, -t));
    float n2 = fbm(q * 1.8 - vec2(t * 0.7, t));
    float field = n1 * 0.6 + n2 * 0.4;

    // dark room — cold, dystopian, faint light scatter
    vec3 bg    = vec3(0.031, 0.035, 0.043);   // near-black, cool
    vec3 steel = vec3(0.30, 0.35, 0.42);      // cold steel light
    vec3 glow  = vec3(0.20, 0.55, 0.72);      // faint nuclear blue
    vec3 shade = vec3(0.015, 0.018, 0.024);   // deep shadow

    vec3 col = bg;
    col = mix(col, shade, smoothstep(0.1, 0.7, 1.0 - field) * 0.5);
    col = mix(col, steel, smoothstep(0.15, 0.7, field) * 0.09);
    col = mix(col, glow, smoothstep(0.55, 0.98, n1) * 0.05);

    // soft vignette — light pooling toward the centre of the room
    float vig = smoothstep(1.35, 0.1, length(p));
    col *= 0.5 + 0.5 * vig;

    gl_FragColor = vec4(col, 1.0);
  }
`;

function Plane() {
  const matRef = useRef();
  const { size, viewport } = useThree();
  const mouse = useRef(new THREE.Vector2(0.5, 0.5));

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    }),
    []
  );

  useFrame((state) => {
    if (!matRef.current) return;
    const dpr = Math.min(viewport.dpr || 1, 2);
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    matRef.current.uniforms.uRes.value.set(size.width * dpr, size.height * dpr);
    const m = matRef.current.uniforms.uMouse.value;
    m.x += (mouse.current.x - m.x) * 0.04;
    m.y += (mouse.current.y - m.y) * 0.04;
  });

  const onPointerMove = (e) => {
    mouse.current.set(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
  };
  if (typeof window !== "undefined") {
    window.onpointermove = onPointerMove;
  }

  return (
    <ScreenQuad>
      <shaderMaterial
        ref={matRef}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
      />
    </ScreenQuad>
  );
}

export default function ShaderBackground() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return (
    <div className="shader-layer">
      <Canvas
        gl={{ antialias: false, powerPreference: "low-power" }}
        dpr={[1, 1.25]}
        camera={{ position: [0, 0, 1] }}
        frameloop={visible ? "always" : "never"}
      >
        <Plane />
      </Canvas>
    </div>
  );
}
