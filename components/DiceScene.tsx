'use client';

import { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics, RigidBody } from '@react-three/rapier';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import Dice, { DiceRef } from './Dice';

interface DiceSceneProps {
  onRollComplete?: (value: number) => void;
  diceRef?: React.RefObject<DiceRef | null>;
}

// 床面コンポーネント
function Floor() {
  return (
    <RigidBody type="fixed" colliders="cuboid">
      <mesh receiveShadow position={[0, -0.5, 0]}>
        <boxGeometry args={[20, 1, 20]} />
        <meshStandardMaterial color="#2a4858" />
      </mesh>
    </RigidBody>
  );
}

// 壁コンポーネント（サイコロが飛び出さないように）
function Walls() {
  return (
    <>
      {/* 前の壁 */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, 2, -5]} visible={false}>
          <boxGeometry args={[10, 5, 0.5]} />
          <meshStandardMaterial transparent opacity={0} />
        </mesh>
      </RigidBody>
      {/* 後ろの壁 */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, 2, 5]} visible={false}>
          <boxGeometry args={[10, 5, 0.5]} />
          <meshStandardMaterial transparent opacity={0} />
        </mesh>
      </RigidBody>
      {/* 左の壁 */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[-5, 2, 0]} visible={false}>
          <boxGeometry args={[0.5, 5, 10]} />
          <meshStandardMaterial transparent opacity={0} />
        </mesh>
      </RigidBody>
      {/* 右の壁 */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[5, 2, 0]} visible={false}>
          <boxGeometry args={[0.5, 5, 10]} />
          <meshStandardMaterial transparent opacity={0} />
        </mesh>
      </RigidBody>
    </>
  );
}

// シーンの内容
function SceneContent({ onRollComplete, diceRef }: DiceSceneProps) {
  return (
    <>
      {/* ライティング */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <pointLight position={[-5, 5, -5]} intensity={0.5} />

      {/* 環境マップ */}
      <Environment preset="studio" />

      {/* コンタクトシャドウ */}
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.5}
        scale={10}
        blur={2}
        far={4}
      />

      {/* 物理エンジン */}
      <Physics gravity={[0, -20, 0]}>
        <Floor />
        <Walls />
        <Dice ref={diceRef} onRollComplete={onRollComplete} />
      </Physics>

      {/* カメラコントロール */}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={3}
        maxDistance={15}
        minPolarAngle={0.3}
        maxPolarAngle={Math.PI / 2 - 0.1}
      />
    </>
  );
}

// ローディング表示
function Loader() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#888" wireframe />
    </mesh>
  );
}

export default function DiceScene({ onRollComplete, diceRef }: DiceSceneProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 5, 8], fov: 50 }}
      style={{ background: 'linear-gradient(to bottom, #1a1a2e, #16213e)' }}
    >
      <Suspense fallback={<Loader />}>
        <SceneContent onRollComplete={onRollComplete} diceRef={diceRef} />
      </Suspense>
    </Canvas>
  );
}
