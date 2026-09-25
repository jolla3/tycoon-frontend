'use client';

// Architectural estate illustration — light materials, windows, cyan data arcs.
// Lazy-loaded only on the landing page; respects reduced-motion via parent.
// Note: do not use JSX <line> — it maps to SVG in TypeScript, not THREE.Line.

import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

const BUILDINGS = [
  { x: -3.4, z: -0.6, h: 1.6, w: 1.2, d: 1.0 },
  { x: -1.7, z: 0.5, h: 2.4, w: 1.35, d: 1.15 },
  { x: 0.05, z: -0.7, h: 2.0, w: 1.25, d: 1.1 },
  { x: 1.8, z: 0.35, h: 2.8, w: 1.2, d: 1.05 },
  { x: 3.4, z: -0.35, h: 1.7, w: 1.25, d: 1.1 },
];

function Building({ x, z, h, w, d }: { x: number; z: number; h: number; w: number; d: number }) {
  const windows = useMemo(() => {
    const list: { px: number; py: number; pz: number }[] = [];
    const floors = Math.max(2, Math.floor(h / 0.45));
    for (let f = 0; f < floors; f++) {
      for (let col = 0; col < 2; col++) {
        list.push({
          px: (col === 0 ? -1 : 1) * (w * 0.22),
          py: 0.35 + f * (h / floors),
          pz: d / 2 + 0.01,
        });
      }
    }
    return list;
  }, [h, w, d]);

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#e8eef3" roughness={0.55} metalness={0.08} />
      </mesh>
      <mesh position={[0, h + 0.04, 0]}>
        <boxGeometry args={[w * 1.05, 0.08, d * 1.05]} />
        <meshStandardMaterial color="#c5d4de" roughness={0.7} />
      </mesh>
      {windows.map((win, i) => (
        <mesh key={i} position={[win.px, win.py - h / 2 + h / 2, win.pz]}>
          <planeGeometry args={[0.18, 0.22]} />
          <meshStandardMaterial
            color="#48CAE4"
            emissive="#0096C7"
            emissiveIntensity={0.35}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}
    </group>
  );
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[18, 12]} />
      <meshStandardMaterial color="#f2f6f8" roughness={0.95} />
    </mesh>
  );
}

function Path() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0.9]} receiveShadow>
      <planeGeometry args={[10, 0.55]} />
      <meshStandardMaterial color="#d9e2e8" roughness={0.9} />
    </mesh>
  );
}

function DataArcs() {
  const ref = useRef<THREE.Group>(null);

  const lines = useMemo(() => {
    const curves = [
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-3.2, 1.2, 0),
        new THREE.Vector3(-1, 2.4, 0.5),
        new THREE.Vector3(0, 1.5, -0.4)
      ),
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, 1.6, -0.4),
        new THREE.Vector3(1.2, 2.8, 0.2),
        new THREE.Vector3(1.8, 2.0, 0.3)
      ),
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(1.8, 2.1, 0.3),
        new THREE.Vector3(2.6, 2.6, 0),
        new THREE.Vector3(3.3, 1.3, -0.2)
      ),
    ];
    return curves.map((c) => {
      const geo = new THREE.BufferGeometry().setFromPoints(c.getPoints(24));
      const mat = new THREE.LineBasicMaterial({
        color: '#00B4D8',
        transparent: true,
        opacity: 0.55,
      });
      return new THREE.Line(geo, mat);
    });
  }, []);

  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.15) * 0.04;
  });

  return (
    <group ref={ref}>
      {lines.map((line, i) => (
        <primitive key={i} object={line} />
      ))}
    </group>
  );
}

function Scene() {
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.04;
  });
  return (
    <group ref={group}>
      <Ground />
      <Path />
      {BUILDINGS.map((b, i) => (
        <Building key={i} {...b} />
      ))}
      <DataArcs />
      <ambientLight intensity={0.75} />
      <directionalLight position={[5, 8, 4]} intensity={1.05} castShadow />
      <directionalLight position={[-3, 4, -2]} intensity={0.35} color="#48CAE4" />
    </group>
  );
}

function EstateSceneCanvas() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [6.5, 4.2, 7.5], fov: 38, near: 0.1, far: 40 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    >
      <Scene />
    </Canvas>
  );
}

export default EstateSceneCanvas;
export { EstateSceneCanvas };