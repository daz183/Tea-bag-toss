import React from 'react';
import { WindState, GameMode, TeaType, MugType } from '../types';
import { Wind, Flame, Timer, Heart, Sparkles, Volume2, VolumeX, Store, BarChart3, HelpCircle, Palette } from 'lucide-react';
import { sound } from '../utils/audio';

interface HUDProps {
  score: number;
  highScore: number;
  streak: number;
  lives: number;
  timeLeft: number;
  wind: WindState;
  gameMode: GameMode;
  selectedTea: TeaType;
  selectedMug: MugType;
  teaLeaves: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenShop: () => void;
  onOpenStats: () => void;
  onOpenSettings: () => void;
  onOpenThemeModal: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  score,
  highScore,
  streak,
  lives,
  timeLeft,
  wind,
  gameMode,
  selectedTea,
  selectedMug,
  teaLeaves,
  soundEnabled,
  onToggleSound,
  onOpenShop,
  onOpenStats,
  onOpenSettings,
  onOpenThemeModal,
}) => {
  const windDirText = wind.speed === 0 ? 'CALM' : wind.direction > 0 ? 'EAST ▶' : '◀ WEST';
  const totalMultiplier = (selectedTea.scoreMultiplier * selectedMug.bonusMultiplier).toFixed(2);

  return (
    <div className="absolute top-0 left-0 right-0 p-3 sm:p-4 pointer-events-none flex flex-col justify-between h-full z-10">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Left Side: Score & Streak */}
        <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
          <div className="bg-stone-900/80 backdrop-blur-md border border-stone-700/60 rounded-xl px-3 sm:px-4 py-2 text-white shadow-lg flex items-center gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-amber-400 font-bold">Score</div>
              <div className="text-xl sm:text-2xl font-black font-mono text-amber-100">{score}</div>
            </div>

            <div className="h-8 w-px bg-stone-700/80" />

            <div>
              <div className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">Best</div>
              <div className="text-sm font-semibold font-mono text-stone-300">{highScore}</div>
            </div>
          </div>

          {/* Streak Counter */}
          {streak > 0 && (
            <div className="bg-amber-500/90 backdrop-blur-md text-stone-900 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-lg animate-bounce">
              <Flame className="w-4 h-4 fill-amber-900 text-amber-900" />
              <span className="text-xs uppercase tracking-wide">Streak</span>
              <span className="text-sm font-black font-mono">{streak}x</span>
            </div>
          )}
        </div>

        {/* Center: Wind Meter Indicator */}
        <div className="bg-stone-900/80 backdrop-blur-md border border-stone-700/60 rounded-xl px-3 sm:px-4 py-2 text-white shadow-lg flex items-center gap-2 pointer-events-auto">
          <Wind className={`w-5 h-5 text-sky-400 ${wind.speed > 0 ? 'animate-pulse' : ''}`} />
          <div className="text-center min-w-[70px]">
            <div className="text-[10px] uppercase tracking-wider text-sky-300 font-bold">Crosswind</div>
            <div className="text-sm font-bold font-mono text-sky-100 flex items-center justify-center gap-1">
              <span>{wind.speed.toFixed(1)} MPH</span>
              <span className="text-[11px] text-amber-400">{windDirText}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Tea Leaves Currency & Control Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Tea Leaves Currency */}
          <div
            onClick={onOpenShop}
            className="bg-emerald-950/80 hover:bg-emerald-900/90 border border-emerald-600/50 rounded-xl px-3 py-2 text-emerald-200 cursor-pointer shadow-lg transition flex items-center gap-2"
            title="Open Shop"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold">Tea Leaves</div>
              <div className="text-sm font-black font-mono text-emerald-100">{teaLeaves}</div>
            </div>
          </div>

          {/* Icon Controls */}
          <button
            onClick={() => {
              sound.playClick();
              onOpenThemeModal();
            }}
            className="p-2.5 bg-stone-900/80 hover:bg-stone-800 text-stone-200 rounded-xl border border-stone-700/60 transition shadow-md"
            title="Environment Theme"
          >
            <Palette className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onOpenShop();
            }}
            className="p-2.5 bg-stone-900/80 hover:bg-stone-800 text-amber-400 rounded-xl border border-stone-700/60 transition shadow-md relative"
            title="Shop & Unlocks"
          >
            <Store className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onOpenStats();
            }}
            className="p-2.5 bg-stone-900/80 hover:bg-stone-800 text-stone-200 rounded-xl border border-stone-700/60 transition shadow-md"
            title="Stats & Achievements"
          >
            <BarChart3 className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleSound}
            className="p-2.5 bg-stone-900/80 hover:bg-stone-800 text-stone-200 rounded-xl border border-stone-700/60 transition shadow-md"
            title={soundEnabled ? 'Mute SFX' : 'Enable SFX'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-stone-500" />}
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onOpenSettings();
            }}
            className="p-2.5 bg-stone-900/80 hover:bg-stone-800 text-stone-200 rounded-xl border border-stone-700/60 transition shadow-md"
            title="How to Play"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Sub-Bar: Mode Status / Lives / Multipliers */}
      <div className="flex items-end justify-between gap-2 pointer-events-auto">
        {/* Mode Status Indicator */}
        <div className="bg-stone-900/80 backdrop-blur-md border border-stone-700/60 rounded-xl px-3 py-2 text-white shadow-lg flex items-center gap-3">
          {gameMode === 'classic' && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-stone-400 font-bold uppercase">Lives:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((i) => (
                  <Heart
                    key={i}
                    className={`w-4 h-4 ${i <= lives ? 'text-rose-500 fill-rose-500 animate-pulse' : 'text-stone-600'}`}
                  />
                ))}
              </div>
            </div>
          )}

          {gameMode === 'timed' && (
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-stone-400 font-bold uppercase">Time:</span>
              <span className={`text-base font-black font-mono ${timeLeft <= 10 ? 'text-rose-400 animate-ping' : 'text-amber-200'}`}>
                {timeLeft}s
              </span>
            </div>
          )}

          {gameMode === 'precision' && (
            <div className="text-xs text-amber-300 font-bold uppercase tracking-wider">
              Target Mode (Moving Mug)
            </div>
          )}

          {gameMode === 'zen' && (
            <div className="text-xs text-emerald-300 font-bold uppercase tracking-wider">
              Zen Relaxed Steeping
            </div>
          )}
        </div>

        {/* Equipped Equipment Tag */}
        <div className="bg-stone-900/80 backdrop-blur-md border border-stone-700/60 rounded-xl px-3 py-1.5 text-stone-300 text-xs font-medium flex items-center gap-2 shadow-lg hidden sm:flex">
          <span className="text-amber-400 font-bold">{selectedTea.name}</span>
          <span className="text-stone-500">•</span>
          <span className="text-sky-300">{selectedMug.name}</span>
          <span className="text-stone-500">•</span>
          <span className="text-emerald-400 font-bold">{totalMultiplier}x Pts</span>
        </div>
      </div>
    </div>
  );
};
