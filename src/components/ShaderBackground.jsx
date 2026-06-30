import { useRef, useMemo } from "react";
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
    float v = 0.0, a = 0.5;
    for(int i = 0; i < 5; i++){
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

    // studio palette
    vec3 bg   = vec3(0.047, 0.043, 0.035);
    vec3 lime = vec3(0.784, 1.0, 0.30);
    vec3 blue = vec3(0.616, 0.706, 1.0);
    vec3 rust = vec3(1.0, 0.42, 0.29);

    vec3 col = bg;
    col = mix(col, blue, smoothstep(0.05, 0.55, field) * 0.16);
    col = mix(col, lime, smoothstep(0.35, 0.85, n1) * 0.12);
    col = mix(col, rust, smoothstep(0.45, 0.95, n2) * 0.07);

    // soft vignette
    float vig = smoothstep(1.25, 0.2, length(p));
    col *= 0.55 + 0.45 * vig;

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
  return (
    <div className="shader-layer">
      <Canvas
        gl={{ antialias: false, powerPreference: "low-power" }}
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 1] }}
        frameloop="always"
      >
        <Plane />
      </Canvas>
    </div>
  );
}
