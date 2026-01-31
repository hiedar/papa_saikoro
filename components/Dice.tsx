'use client';

import { useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { RigidBody, RapierRigidBody } from '@react-three/rapier';
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

// サイコロの目のパターン（各数字に対応する点の位置）
const DOT_PATTERNS: { [key: number]: [number, number][] } = {
  1: [[0, 0]],
  2: [[-0.3, -0.3], [0.3, 0.3]],
  3: [[-0.3, -0.3], [0, 0], [0.3, 0.3]],
  4: [[-0.3, -0.3], [-0.3, 0.3], [0.3, -0.3], [0.3, 0.3]],
  5: [[-0.3, -0.3], [-0.3, 0.3], [0, 0], [0.3, -0.3], [0.3, 0.3]],
  6: [[-0.3, -0.3], [-0.3, 0], [-0.3, 0.3], [0.3, -0.3], [0.3, 0], [0.3, 0.3]],
};

// キャンバスでサイコロの面のテクスチャを生成
function createDiceTexture(value: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // 白背景
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 256);

  // 角丸の枠
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(8, 8, 240, 240, 16);
  ctx.stroke();

  // 点を描画
  ctx.fillStyle = '#1a1a1a';
  const pattern = DOT_PATTERNS[value];
  const centerX = 128;
  const centerY = 128;
  const scale = 80;
  const dotRadius = 20;

  pattern.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(centerX + x * scale, centerY + y * scale, dotRadius, 0, Math.PI * 2);
    ctx.fill();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
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
  const stableFrames = useRef(0);
  const lastPosition = useRef(new THREE.Vector3());

  // 各面のマテリアルを生成
  const materials = useMemo(() => {
    if (typeof window === 'undefined') return [];

    // BoxGeometry の面の順序: +X, -X, +Y, -Y, +Z, -Z
    // 対応する目: 1, 6, 2, 5, 3, 4
    const faceValues = [1, 6, 2, 5, 3, 4];

    return faceValues.map((value) => {
      const texture = createDiceTexture(value);
      return new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.3,
        metalness: 0.1,
      });
    });
  }, []);

  // サイコロを振る関数
  const roll = () => {
    if (!rigidBodyRef.current) return;

    isRolling.current = true;
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

  // 毎フレームの処理（停止検知）
  useFrame(() => {
    if (!rigidBodyRef.current || !isRolling.current) return;

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

      // 30フレーム安定したら停止と判定
      if (stableFrames.current > 30) {
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
      restitution={0.3}
      friction={0.8}
      linearDamping={0.5}
      angularDamping={0.5}
      position={[0, 3, 0]}
    >
      <mesh castShadow receiveShadow material={materials}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
    </RigidBody>
  );
});

Dice.displayName = 'Dice';

export default Dice;
