'use client';

import { useRef, forwardRef, useImperativeHandle } from 'react';
import { RigidBody, RapierRigidBody } from '@react-three/rapier';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// サイコロの出目を判定するための面の法線ベクトル（ローカル座標）
const FACE_NORMALS = [
  { value: 1, normal: new THREE.Vector3(1, 0, 0) },   // +X面 = 1
  { value: 6, normal: new THREE.Vector3(-1, 0, 0) },  // -X面 = 6
  { value: 2, normal: new THREE.Vector3(0, 1, 0) },   // +Y面 = 2
  { value: 5, normal: new THREE.Vector3(0, -1, 0) },  // -Y面 = 5
  { value: 3, normal: new THREE.Vector3(0, 0, 1) },   // +Z面 = 3
  { value: 4, normal: new THREE.Vector3(0, 0, -1) },  // -Z面 = 4
];

// サイコロの目のパターン（各数字に対応する点の位置）- 正規化座標 (-0.35 ~ 0.35)
const DOT_PATTERNS: { [key: number]: [number, number][] } = {
  1: [[0, 0]],
  2: [[-0.25, -0.25], [0.25, 0.25]],
  3: [[-0.25, -0.25], [0, 0], [0.25, 0.25]],
  4: [[-0.25, -0.25], [-0.25, 0.25], [0.25, -0.25], [0.25, 0.25]],
  5: [[-0.25, -0.25], [-0.25, 0.25], [0, 0], [0.25, -0.25], [0.25, 0.25]],
  6: [[-0.25, -0.25], [-0.25, 0], [-0.25, 0.25], [0.25, -0.25], [0.25, 0], [0.25, 0.25]],
};

// 各面のドット配置情報（circleGeometryはXY平面で+Z向き）
const FACE_CONFIG = [
  { value: 1, position: [0.51, 0, 0], rotation: [0, Math.PI / 2, 0] },     // +X面
  { value: 6, position: [-0.51, 0, 0], rotation: [0, -Math.PI / 2, 0] },   // -X面
  { value: 2, position: [0, 0.51, 0], rotation: [-Math.PI / 2, 0, 0] },    // +Y面（上）
  { value: 5, position: [0, -0.51, 0], rotation: [Math.PI / 2, 0, 0] },    // -Y面（下）
  { value: 3, position: [0, 0, 0.51], rotation: [0, 0, 0] },               // +Z面
  { value: 4, position: [0, 0, -0.51], rotation: [0, Math.PI, 0] },        // -Z面
];

// ドットコンポーネント
function Dot({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position}>
      <circleGeometry args={[0.08, 32]} />
      <meshStandardMaterial color="#1a1a1a" />
    </mesh>
  );
}

// 面のドット群
function FaceDots({ value, position, rotation }: {
  value: number;
  position: [number, number, number];
  rotation: [number, number, number];
}) {
  const pattern = DOT_PATTERNS[value];

  return (
    <group position={position} rotation={rotation}>
      {pattern.map(([x, y], index) => (
        <Dot key={index} position={[x, y, 0]} />
      ))}
    </group>
  );
}

export interface DiceRef {
  roll: () => void;
}

interface DiceProps {
  onRollComplete?: (value: number) => void;
}

const Dice = forwardRef<DiceRef, DiceProps>(({ onRollComplete }, ref) => {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const isRolling = useRef(false);
  const isCentering = useRef(false);
  const stableFrames = useRef(0);
  const lastPosition = useRef(new THREE.Vector3());

  // サイコロを振る関数
  const roll = () => {
    if (!rigidBodyRef.current) return;

    isRolling.current = true;
    isCentering.current = false;
    stableFrames.current = 0;

    // 初期位置にリセット
    rigidBodyRef.current.setTranslation({ x: 0, y: 3, z: 0 }, true);

    // ランダムな回転
    const randomRotation = {
      x: Math.random() * Math.PI * 2,
      y: Math.random() * Math.PI * 2,
      z: Math.random() * Math.PI * 2,
    };
    rigidBodyRef.current.setRotation(
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(randomRotation.x, randomRotation.y, randomRotation.z)
      ),
      true
    );

    // 速度をリセット
    rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
    rigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);

    // ランダムな力と回転を加える
    const force = {
      x: (Math.random() - 0.5) * 8,
      y: -5,
      z: (Math.random() - 0.5) * 8,
    };
    const torque = {
      x: (Math.random() - 0.5) * 15,
      y: (Math.random() - 0.5) * 15,
      z: (Math.random() - 0.5) * 15,
    };

    rigidBodyRef.current.applyImpulse(force, true);
    rigidBodyRef.current.applyTorqueImpulse(torque, true);
  };

  useImperativeHandle(ref, () => ({
    roll,
  }));

  // 毎フレームの処理（停止検知＆中央移動）
  useFrame(() => {
    if (!rigidBodyRef.current) return;

    // 中央への移動アニメーション
    if (isCentering.current) {
      const position = rigidBodyRef.current.translation();
      const targetX = 0;
      const targetZ = 0;
      const speed = 0.3;

      const newX = THREE.MathUtils.lerp(position.x, targetX, speed);
      const newZ = THREE.MathUtils.lerp(position.z, targetZ, speed);

      rigidBodyRef.current.setTranslation(
        { x: newX, y: position.y, z: newZ },
        true
      );

      // 十分に中央に近づいたら停止
      if (Math.abs(newX) < 0.01 && Math.abs(newZ) < 0.01) {
        rigidBodyRef.current.setTranslation(
          { x: 0, y: position.y, z: 0 },
          true
        );
        isCentering.current = false;
      }
      return;
    }

    if (!isRolling.current) return;

    const position = rigidBodyRef.current.translation();
    const linvel = rigidBodyRef.current.linvel();
    const angvel = rigidBodyRef.current.angvel();

    // 速度が十分に小さいかチェック
    const linearSpeed = Math.sqrt(linvel.x ** 2 + linvel.y ** 2 + linvel.z ** 2);
    const angularSpeed = Math.sqrt(angvel.x ** 2 + angvel.y ** 2 + angvel.z ** 2);

    // 位置の変化もチェック
    const positionDelta = Math.sqrt(
      (position.x - lastPosition.current.x) ** 2 +
      (position.y - lastPosition.current.y) ** 2 +
      (position.z - lastPosition.current.z) ** 2
    );

    lastPosition.current.set(position.x, position.y, position.z);

    if (linearSpeed < 0.1 && angularSpeed < 0.1 && positionDelta < 0.001) {
      stableFrames.current++;

      // 15フレーム安定したら停止と判定
      if (stableFrames.current > 15) {
        isRolling.current = false;

        // 出目を判定
        const rotation = rigidBodyRef.current.rotation();
        const quaternion = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
        const upVector = new THREE.Vector3(0, 1, 0);

        let maxDot = -Infinity;
        let result = 1;

        FACE_NORMALS.forEach(({ value, normal }) => {
          const worldNormal = normal.clone().applyQuaternion(quaternion);
          const dot = worldNormal.dot(upVector);
          if (dot > maxDot) {
            maxDot = dot;
            result = value;
          }
        });

        // 速度を完全に停止
        rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
        rigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);

        // 中央への移動を開始
        isCentering.current = true;

        onRollComplete?.(result);
      }
    } else {
      stableFrames.current = 0;
    }
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      colliders="cuboid"
      restitution={0.2}
      friction={1.0}
      linearDamping={1.5}
      angularDamping={2.0}
      position={[0, 3, 0]}
    >
      <group>
        {/* サイコロ本体 */}
        <RoundedBox
          args={[1, 1, 1]}
          radius={0.1}
          smoothness={4}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.1} />
        </RoundedBox>

        {/* 各面のドット */}
        {FACE_CONFIG.map(({ value, position, rotation }) => (
          <FaceDots
            key={value}
            value={value}
            position={position as [number, number, number]}
            rotation={rotation as [number, number, number]}
          />
        ))}
      </group>
    </RigidBody>
  );
});

Dice.displayName = 'Dice';

export default Dice;
