import React from 'react';
import { GameMode } from '../types';
import { Trophy, RotateCcw, Sparkles, Flame, Award } from 'lucide-react';
import { sound } from '../utils/audio';

interface GameOverModalProps {
  isOpen: boolean;
  score: number;
  highScore: number;
  isNewHighScore: boolean;
  gameMode: GameMode;
  teaLeavesEarned: number;
  bestStreak: number;
  onRestart: () => void;
  onOpenShop: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  score,
  highScore,
  isNewHighScore,
  gameMode,
  teaLeavesEarned,
  bestStreak,
  onRestart,
  onOpenShop,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-700/80 rounded-2xl w-full max-w-md p-6 shadow-2xl text-center text-white space-y-6 animate-in zoom-in duration-300">
        {/* Header Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-lg">
          <Trophy className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-2xl font-black text-amber-100">
            {isNewHighScore ? '🎉 NEW HIGH SCORE!' : 'TEA PARTY OVER!'}
          </h2>
          <p className="text-xs text-stone-400 mt-1 uppercase tracking-widest font-bold">
            {gameMode} mode summary
          </p>
        </div>

        {/* Score & Leaves Earned Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-stone-800/80 border border-stone-700/60 rounded-xl p-3 text-center">
            <div className="text-[10px] uppercase font-bold text-stone-400">Final Score</div>
            <div className="text-3xl font-black font-mono text-amber-300 mt-0.5">{score}</div>
          </div>

          <div className="bg-emerald-950/80 border border-emerald-600/50 rounded-xl p-3 text-center">
            <div className="text-[10px] uppercase font-bold text-emerald-400 flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Leaves Earned</span>
            </div>
            <div className="text-3xl font-black font-mono text-emerald-200 mt-0.5">+{teaLeavesEarned}</div>
          </div>
        </div>

        {/* Extra Stats */}
        <div className="bg-stone-950/60 rounded-xl p-3 border border-stone-800/80 flex items-center justify-around text-xs text-stone-300">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Best: <strong className="font-mono text-white">{highScore}</strong></span>
          </div>

          <div className="h-4 w-px bg-stone-800" />

          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-rose-400" />
            <span>Max Streak: <strong className="font-mono text-white">{bestStreak}x</strong></span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            onClick={() => {
              sound.playClick();
              onRestart();
            }}
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>PLAY AGAIN</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onOpenShop();
            }}
            className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold rounded-xl text-xs transition border border-stone-700 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Award className="w-4 h-4 text-emerald-400" />
            <span>VISIT TEA SHOP & UNLOCKS</span>
          </button>
        </div>
      </div>
    </div>
  );
};
