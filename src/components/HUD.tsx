import React, { useState, useEffect } from 'react';
import { WindState, GameMode, TeaType, MugType } from '../types';
import { Wind, Flame, Timer, Heart, Sparkles, Volume2, VolumeX, Store, BarChart3, HelpCircle, Palette, Layers, Sliders, X } from 'lucide-react';
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
  level: number;
  landedInLevel: number;
  targetShotsForLevel: number;
  scrunchLevel?: number;
  scrunchTurnsLeft?: number;
  onScrunchChange: (level: number) => void;
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
  level,
  landedInLevel,
  targetShotsForLevel,
  scrunchLevel = 0,
  scrunchTurnsLeft = 0,
  onScrunchChange,
  onToggleSound,
  onOpenShop,
  onOpenStats,
  onOpenSettings,
  onOpenThemeModal,
}) => {
  const [isScrunchOpen, setIsScrunchOpen] = useState(false);
  const [pendingScrunch, setPendingScrunch] = useState<number>(scrunchLevel);

  useEffect(() => {
    setPendingScrunch(scrunchLevel);
  }, [scrunchLevel]);

  const windDirText = wind.speed === 0 ? 'CALM' : wind.direction > 0 ? 'EAST ▶' : '◀ WEST';
  const totalMultiplier = (selectedTea.scoreMultiplier * selectedMug.bonusMultiplier).toFixed(2);

  // Scrunch cost calculations: 0% = 0 Leaves. 1% = 10 Leaves. Each +1% = +1 Leaf.
  const currentCost = scrunchLevel <= 0 ? 0 : 10 + (scrunchLevel - 1);
  const pendingCost = pendingScrunch <= 0 ? 0 : 10 + (pendingScrunch - 1);
  const costToApply = pendingScrunch > scrunchLevel ? pendingCost - currentCost : 0;
  const canAfford = teaLeaves >= costToApply;
  const isChanged = pendingScrunch !== scrunchLevel;

  const handleApplyScrunch = () => {
    onScrunchChange(pendingScrunch);
    setIsScrunchOpen(false);
  };

  return (
    <div className="absolute top-0 left-0 right-0 p-2 sm:p-3 pointer-events-none flex flex-col justify-between h-full z-10">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Left Side: Score, Level, Streak Pill */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <div className="bg-stone-900/85 backdrop-blur-md border border-stone-700/60 rounded-xl px-2.5 sm:px-3 py-1.5 text-white shadow-lg flex items-center gap-2 sm:gap-3 text-xs">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-amber-400 font-bold block leading-none">Score</span>
              <span className="text-base sm:text-lg font-black font-mono text-amber-100 leading-tight">{score}</span>
            </div>

            <div className="h-5 w-px bg-stone-700/80" />

            <div>
              <span className="text-[9px] uppercase tracking-wider text-stone-400 font-bold block leading-none">Best</span>
              <span className="text-xs font-bold font-mono text-stone-300 leading-tight">{highScore}</span>
            </div>

            <div className="h-5 w-px bg-stone-700/80" />

            {/* Level Badge */}
            <div className="flex items-center gap-1 text-[11px] font-black text-amber-300">
              <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>LVL {level}</span>
              <span className="text-stone-400 font-normal text-[10px]">({landedInLevel}/{targetShotsForLevel})</span>
            </div>
          </div>

          {/* Streak Badge */}
          {streak > 0 && (
            <div className="bg-amber-500 text-stone-950 px-2 py-1 rounded-xl font-black text-xs flex items-center gap-1 shadow-md animate-bounce">
              <Flame className="w-3.5 h-3.5 fill-stone-950" />
              <span>{streak}x</span>
            </div>
          )}
        </div>

        {/* Center: Compact Wind Meter & Scrunch Popover Toggle */}
        <div className="flex items-center gap-1.5 pointer-events-auto relative">
          {/* Wind Badge */}
          <div className="bg-stone-900/85 backdrop-blur-md border border-stone-700/60 rounded-xl px-2.5 py-1.5 text-white shadow-lg flex items-center gap-1.5 text-xs">
            <Wind className={`w-3.5 h-3.5 text-sky-400 ${wind.speed > 0 ? 'animate-pulse' : ''}`} />
            <span className="font-mono font-bold text-sky-100 text-[11px]">
              {wind.speed.toFixed(1)} <span className="text-[10px] text-amber-400">{windDirText}</span>
            </span>
          </div>

          {/* Scrunch Toggle Button */}
          <button
            onClick={() => {
              sound.playClick();
              setIsScrunchOpen(!isScrunchOpen);
            }}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition shadow-lg ${
              scrunchLevel > 0
                ? 'bg-amber-500/90 hover:bg-amber-400 text-stone-950 border-amber-300'
                : 'bg-stone-900/85 hover:bg-stone-800 text-stone-200 border-stone-700/60'
            }`}
            title="Adjust Aerodynamic Scrunch Level"
          >
            <Sliders className="w-3.5 h-3.5 shrink-0" />
            <span>
              Scrunch: <strong className="font-mono">{scrunchLevel}%</strong>
              {scrunchLevel > 0 && (
                <span className="ml-1 text-[10px] font-mono bg-stone-900/30 px-1 py-0.2 rounded font-black text-amber-950">
                  ({scrunchTurnsLeft}t)
                </span>
              )}
            </span>
          </button>

          {/* Scrunch Centered Modal */}
          {isScrunchOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-150">
              <div className="w-full max-w-sm bg-stone-900/95 backdrop-blur-xl border border-amber-500/60 rounded-2xl p-4 shadow-2xl text-white zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-stone-800">
                  <div className="flex items-center gap-1.5 text-amber-400 text-xs font-black uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 animate-spin-slow" />
                    <span>Scrunch Aerodynamics</span>
                  </div>
                  <button
                    onClick={() => setIsScrunchOpen(false)}
                    className="p-1 text-stone-400 hover:text-white rounded-lg transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Duration Limit Banner */}
                <div className="text-[11px] font-mono mb-3 bg-amber-950/60 border border-amber-500/30 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-amber-200">
                  <span>⏳ Duration: 10 turns per application</span>
                  {scrunchLevel > 0 && (
                    <span className="font-bold text-amber-400 bg-amber-900/80 px-1.5 py-0.5 rounded text-[10px]">
                      {scrunchTurnsLeft}/10 turns left
                    </span>
                  )}
                </div>

                {/* Status Info */}
                <div className="flex items-center justify-between text-xs mb-3 font-mono">
                  <span className="text-stone-300 font-bold">
                    {pendingScrunch === 0
                      ? '📄 Loose Pouch'
                      : pendingScrunch < 35
                      ? '📦 Folded'
                      : pendingScrunch < 75
                      ? '🧆 Scrunched Ball'
                      : '⚽ Aero Sphere'}
                  </span>
                  <span className="text-emerald-400 font-extrabold">
                    +{pendingScrunch}% Acc • -{Math.round(pendingScrunch * 0.75)}% Wind
                  </span>
                </div>

                {/* Slider */}
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={pendingScrunch}
                    onChange={(e) => setPendingScrunch(Number(e.target.value))}
                    className="w-full h-2.5 accent-amber-500 bg-stone-700 rounded-lg cursor-pointer"
                  />
                  <span className="font-mono text-sm font-black text-amber-300 w-10 text-right">
                    {pendingScrunch}%
                  </span>
                </div>

                {/* Presets */}
                <div className="flex items-center justify-between gap-1.5 mb-4">
                  {[0, 50, 100].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setPendingScrunch(preset)}
                      className={`flex-1 py-1.5 text-xs font-mono font-bold rounded-lg transition ${
                        pendingScrunch === preset
                          ? 'bg-amber-500 text-stone-950 font-black'
                          : 'bg-stone-800 text-stone-300 hover:bg-stone-700 border border-stone-700'
                      }`}
                    >
                      {preset === 0 ? '0% (Free)' : preset === 50 ? '50% (59🍃)' : '100% (109🍃)'}
                    </button>
                  ))}
                </div>

                {/* Apply Button */}
                {isChanged ? (
                  costToApply > 0 ? (
                    canAfford ? (
                      <button
                        onClick={handleApplyScrunch}
                        className="w-full py-2.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-md transition active:scale-95 cursor-pointer"
                      >
                        APPLY SCRUNCH ({costToApply} 🍃)
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-xl text-xs font-bold bg-rose-950/80 text-rose-300 border border-rose-500/40 cursor-not-allowed"
                      >
                        NEED {costToApply} TEA LEAVES
                      </button>
                    )
                  ) : (
                    <button
                      onClick={handleApplyScrunch}
                      className="w-full py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow transition active:scale-95 cursor-pointer"
                    >
                      APPLY (FREE)
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => setIsScrunchOpen(false)}
                    className="w-full py-2 rounded-xl text-xs font-bold bg-stone-800 text-stone-300 hover:bg-stone-700 transition"
                  >
                    CLOSE
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Tea Leaves & Icon Actions */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Tea Leaves Currency */}
          <button
            onClick={() => {
              sound.playClick();
              onOpenShop();
            }}
            className="bg-emerald-950/85 hover:bg-emerald-900/90 border border-emerald-600/50 rounded-xl px-2.5 py-1.5 text-emerald-200 shadow-lg transition flex items-center gap-1.5 text-xs font-bold"
            title="Open Shop"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono text-emerald-100">{teaLeaves} 🍃</span>
          </button>

          {/* Icon Button Group */}
          <div className="flex items-center gap-1 bg-stone-900/85 backdrop-blur-md border border-stone-700/60 rounded-xl p-1 shadow-lg">
            <button
              onClick={() => {
                sound.playClick();
                onOpenThemeModal();
              }}
              className="p-1.5 hover:bg-stone-800 text-stone-300 hover:text-white rounded-lg transition"
              title="Environment Theme"
            >
              <Palette className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                sound.playClick();
                onOpenShop();
              }}
              className="p-1.5 hover:bg-stone-800 text-amber-400 hover:text-amber-300 rounded-lg transition"
              title="Shop & Unlocks"
            >
              <Store className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                sound.playClick();
                onOpenStats();
              }}
              className="p-1.5 hover:bg-stone-800 text-stone-300 hover:text-white rounded-lg transition"
              title="Stats & Achievements"
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onToggleSound}
              className="p-1.5 hover:bg-stone-800 text-stone-300 rounded-lg transition"
              title={soundEnabled ? 'Mute SFX' : 'Enable SFX'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-stone-500" />}
            </button>

            <button
              onClick={() => {
                sound.playClick();
                onOpenSettings();
              }}
              className="p-1.5 hover:bg-stone-800 text-stone-300 hover:text-white rounded-lg transition"
              title="How to Play"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Sub-Bar: Mode Status & Equipment Tag */}
      <div className="flex items-end justify-between gap-2 pointer-events-auto">
        {/* Mode Status Indicator */}
        <div className="bg-stone-900/85 backdrop-blur-md border border-stone-700/60 rounded-xl px-2.5 py-1 text-white shadow-lg flex items-center gap-2 text-xs">
          {gameMode === 'classic' && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-stone-400 font-bold uppercase mr-1">Lives:</span>
              {[1, 2, 3, 4, 5].map((i) => (
                <Heart
                  key={i}
                  className={`w-3.5 h-3.5 ${i <= lives ? 'text-rose-500 fill-rose-500' : 'text-stone-700'}`}
                />
              ))}
            </div>
          )}

          {gameMode === 'timed' && (
            <div className="flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] text-stone-400 font-bold uppercase">Time:</span>
              <span className={`text-xs font-black font-mono ${timeLeft <= 10 ? 'text-rose-400 animate-ping' : 'text-amber-200'}`}>
                {timeLeft}s
              </span>
            </div>
          )}

          {gameMode === 'precision' && (
            <div className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">
              Moving Target
            </div>
          )}

          {gameMode === 'zen' && (
            <div className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">
              Zen Mode
            </div>
          )}
        </div>

        {/* Equipment Tag */}
        <div className="bg-stone-900/85 backdrop-blur-md border border-stone-700/60 rounded-xl px-2.5 py-1 text-stone-300 text-[10px] font-medium flex items-center gap-1.5 shadow-lg hidden sm:flex">
          <span className="text-amber-400 font-bold">{selectedTea.name}</span>
          <span className="text-stone-600">•</span>
          <span className="text-sky-300">{selectedMug.name}</span>
          <span className="text-stone-600">•</span>
          <span className="text-emerald-400 font-bold">{totalMultiplier}x Pts</span>
        </div>
      </div>
    </div>
  );
};

