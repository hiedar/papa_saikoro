'use client';

import { DiceRef } from '@/components/Dice';
import RollButton from '@/components/RollButton';
import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';

// DiceScene を動的インポート（SSR無効化）
const DiceScene = dynamic(() => import('@/components/DiceScene'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-[#1a1a2e] to-[#16213e]">
      <div className="text-white text-xl animate-pulse">Loading...</div>
    </div>
  ),
});

export default function Home() {
  const diceRef = useRef<DiceRef | null>(null);
  const [result, setResult] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const handleRoll = () => {
    if (diceRef.current) {
      setIsRolling(true);
      setResult(null);
      diceRef.current.roll();
    }
  };

  const handleRollComplete = (value: number) => {
    setResult(value);
    setIsRolling(false);
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-gradient-to-b from-slate-900 to-slate-800 overflow-hidden">
      {/* ヘッダー＆コントロールエリア */}
      <div className="shrink-0 pt-4 pb-3 flex flex-col items-center gap-6 bg-slate-900/90 backdrop-blur safe-top">
        {/* ロゴ */}
        <h1
          className="text-3xl md:text-5xl tracking-wide drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
          style={{
            fontFamily: 'var(--font-dela-gothic), sans-serif',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          パパ サイコロ
        </h1>

        {/* ボタンと結果 */}
        <div className="flex items-center justify-center gap-6">
          <RollButton onClick={handleRoll} disabled={isRolling} />

          {/* 結果表示 */}
          <div className="w-32 flex items-center justify-center">
            {result !== null && (
              <div className="text-center animate-bounce-in">
                <span className="text-gray-400 text-xs">結果: </span>
                <span className="text-5xl font-bold text-white ml-1">
                  {result}
                </span>
              </div>
            )}
            {isRolling && (
              <div className="text-gray-400 text-xs animate-pulse">
                振っています...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3Dシーン - 残りのスペースを使う */}
      <div className="flex-1 min-h-0">
        <DiceScene onRollComplete={handleRollComplete} diceRef={diceRef} />
      </div>
    </div>
  );
}
