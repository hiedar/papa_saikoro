'use client';

interface RollButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export default function RollButton({ onClick, disabled }: RollButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="
        px-6 py-3 md:px-8 md:py-4
        bg-gradient-to-r from-indigo-500 to-purple-600
        hover:from-indigo-600 hover:to-purple-700
        active:from-indigo-700 active:to-purple-800
        disabled:from-gray-400 disabled:to-gray-500
        disabled:cursor-not-allowed
        text-white text-base md:text-lg font-bold
        rounded-xl
        shadow-lg hover:shadow-xl
        transform hover:scale-105 active:scale-95
        transition-all duration-200
        focus:outline-none focus:ring-4 focus:ring-purple-300
      "
    >
      サイコロをふる
    </button>
  );
}
