import React, { useState } from 'react';
import { TeaType, MugType } from '../types';
import { TEA_TYPES, MUG_TYPES } from '../data/items';
import { X, Check, Lock, Sparkles, Coffee, ShieldCheck, ShoppingBag } from 'lucide-react';
import { sound } from '../utils/audio';
import { TeaBagIcon, MugIcon } from './ShopIcons';

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  teaLeaves: number;
  unlockedTeas: string[];
  unlockedMugs: string[];
  selectedTeaId: string;
  selectedMugId: string;
  scrunchLevel?: number;
  onScrunchChange?: (level: number) => void;
  onUnlockTea: (teaId: string, price: number) => void;
  onUnlockMug: (mugId: string, price: number) => void;
  onSelectTea: (teaId: string) => void;
  onSelectMug: (mugId: string) => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  isOpen,
  onClose,
  teaLeaves,
  unlockedTeas,
  unlockedMugs,
  selectedTeaId,
  selectedMugId,
  scrunchLevel = 0,
  onScrunchChange,
  onUnlockTea,
  onUnlockMug,
  onSelectTea,
  onSelectMug,
}) => {
  const [activeTab, setActiveTab] = useState<'teas' | 'mugs' | 'aerodynamics'>('teas');
  const [pendingScrunch, setPendingScrunch] = useState<number>(scrunchLevel);

  React.useEffect(() => {
    setPendingScrunch(scrunchLevel);
  }, [scrunchLevel]);

  const currentCost = scrunchLevel <= 0 ? 0 : 10 + (scrunchLevel - 1);
  const pendingCost = pendingScrunch <= 0 ? 0 : 10 + (pendingScrunch - 1);
  const costToApply = pendingScrunch > scrunchLevel ? pendingCost - currentCost : 0;
  const canAfford = teaLeaves >= costToApply;
  const isChanged = pendingScrunch !== scrunchLevel;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-white animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-amber-100">Tea Shop & Unlocks</h2>
              <p className="text-xs text-stone-400">Equip custom tea bags and mugs to boost your score multiplier!</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-emerald-950/80 border border-emerald-600/50 rounded-xl px-3 py-1.5 text-emerald-300 font-mono font-bold text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>{teaLeaves} Leaves</span>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="p-2 hover:bg-stone-800 text-stone-400 hover:text-white rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-stone-800 bg-stone-950/30 px-5 pt-3 gap-2">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('teas');
            }}
            className={`px-4 py-2.5 rounded-t-xl font-bold text-sm flex items-center gap-2 transition border-b-2 ${
              activeTab === 'teas'
                ? 'border-amber-500 text-amber-400 bg-stone-800/60'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Coffee className="w-4 h-4" />
            <span>Tea Bag Blends ({unlockedTeas.length}/{TEA_TYPES.length})</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('mugs');
            }}
            className={`px-4 py-2.5 rounded-t-xl font-bold text-sm flex items-center gap-2 transition border-b-2 ${
              activeTab === 'mugs'
                ? 'border-amber-500 text-amber-400 bg-stone-800/60'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Coffee className="w-4 h-4" />
            <span>Custom Mugs ({unlockedMugs.length}/{MUG_TYPES.length})</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('aerodynamics');
            }}
            className={`px-4 py-2.5 rounded-t-xl font-bold text-sm flex items-center gap-2 transition border-b-2 ${
              activeTab === 'aerodynamics'
                ? 'border-amber-500 text-amber-400 bg-stone-800/60'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Aerodynamics 🍃</span>
          </button>
        </div>

        {/* Content Items Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
          {activeTab === 'teas' &&
            TEA_TYPES.map((tea) => {
              const isUnlocked = unlockedTeas.includes(tea.id);
              const isSelected = selectedTeaId === tea.id;
              const canAfford = teaLeaves >= tea.price;

              return (
                <div
                  key={tea.id}
                  className={`p-4 rounded-xl border transition flex items-center justify-between gap-4 ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/80 shadow-md'
                      : isUnlocked
                      ? 'bg-stone-800/50 border-stone-700/60 hover:bg-stone-800'
                      : 'bg-stone-900/50 border-stone-800/80 opacity-80'
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    {/* Detailed Vector Tea Bag Icon */}
                    <TeaBagIcon tea={tea} size={58} />

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-amber-100">{tea.name}</h3>
                        <span className="text-xs bg-amber-950/80 text-amber-400 border border-amber-800/60 px-2 py-0.5 rounded-md font-mono">
                          +{Math.round((tea.scoreMultiplier - 1) * 100)}% Pts
                        </span>
                        {tea.weightLabel && (
                          <span className="text-xs bg-stone-950/80 text-stone-300 border border-stone-700/80 px-2 py-0.5 rounded-md font-mono">
                            ⚖️ {tea.weightLabel}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-400 mt-1">{tea.flavorText}</p>
                    </div>
                  </div>

                  {/* Unlock / Select Button */}
                  <div className="shrink-0">
                    {isSelected ? (
                      <div className="bg-amber-500 text-stone-900 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        <span>EQUIPPED</span>
                      </div>
                    ) : isUnlocked ? (
                      <button
                        onClick={() => {
                          sound.playClick();
                          onSelectTea(tea.id);
                        }}
                        className="bg-stone-700 hover:bg-amber-500 hover:text-stone-900 text-stone-100 font-bold px-4 py-1.5 rounded-xl text-xs transition"
                      >
                        EQUIP
                      </button>
                    ) : (
                      <button
                        disabled={!canAfford}
                        onClick={() => {
                          sound.playUnlock();
                          onUnlockTea(tea.id, tea.price);
                        }}
                        className={`font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition ${
                          canAfford
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-lg'
                            : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700/50'
                        }`}
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Unlock ({tea.price} Leaves)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

          {activeTab === 'mugs' &&
            MUG_TYPES.map((mug) => {
              const isUnlocked = unlockedMugs.includes(mug.id);
              const isSelected = selectedMugId === mug.id;
              const canAfford = teaLeaves >= mug.price;

              return (
                <div
                  key={mug.id}
                  className={`p-4 rounded-xl border transition flex items-center justify-between gap-4 ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/80 shadow-md'
                      : isUnlocked
                      ? 'bg-stone-800/50 border-stone-700/60 hover:bg-stone-800'
                      : 'bg-stone-900/50 border-stone-800/80 opacity-80'
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    {/* Detailed Vector Mug Icon */}
                    <MugIcon mug={mug} size={58} />

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-amber-100">{mug.name}</h3>
                        <span className="text-xs bg-sky-950/80 text-sky-400 border border-sky-800/60 px-2 py-0.5 rounded-md font-mono">
                          {mug.bonusMultiplier}x Bonus
                        </span>
                      </div>
                      <p className="text-xs text-stone-400 mt-1">{mug.description}</p>
                    </div>
                  </div>

                  {/* Unlock / Select Button */}
                  <div className="shrink-0">
                    {isSelected ? (
                      <div className="bg-amber-500 text-stone-900 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4" />
                        <span>EQUIPPED</span>
                      </div>
                    ) : isUnlocked ? (
                      <button
                        onClick={() => {
                          sound.playClick();
                          onSelectMug(mug.id);
                        }}
                        className="bg-stone-700 hover:bg-amber-500 hover:text-stone-900 text-stone-100 font-bold px-4 py-1.5 rounded-xl text-xs transition"
                      >
                        EQUIP
                      </button>
                    ) : (
                      <button
                        disabled={!canAfford}
                        onClick={() => {
                          sound.playUnlock();
                          onUnlockMug(mug.id, mug.price);
                        }}
                        className={`font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition ${
                          canAfford
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-lg'
                            : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700/50'
                        }`}
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Unlock ({mug.price} Leaves)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

          {activeTab === 'aerodynamics' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-950/40 border border-amber-600/40 rounded-2xl space-y-3">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="font-bold text-amber-200 text-base flex items-center gap-2 flex-wrap">
                      <span>Scrunch Bag Aerodynamics Slider</span>
                      <span className="text-xs bg-stone-800 text-amber-300 font-mono font-black px-2.5 py-0.5 rounded-full border border-amber-500/40">
                        Active: {scrunchLevel}%
                      </span>
                      {isChanged && (
                        <span className="text-xs bg-amber-500 text-stone-950 font-black px-2.5 py-0.5 rounded-full shadow">
                          Selected: {pendingScrunch}%
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                      Slide to preview your tea bag scrunch level! Starts at 10 🍃 Tea Leaves for 1%, plus 1 🍃 per additional % (100% Aero Sphere = 109 🍃). Each application lasts for <strong>10 turns</strong>. Click <strong>APPLY SCRUNCH LEVEL</strong> below to confirm and spend tea leaves.
                    </p>
                  </div>
                </div>

                {/* Interactive Slider Input */}
                <div className="bg-stone-900/80 p-3.5 rounded-xl border border-stone-700/60 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono font-bold flex-wrap gap-1">
                    <span className="text-stone-400">📄 0% (Loose)</span>
                    <span className="text-emerald-400">
                      🎯 Accuracy: +{pendingScrunch}% • 💨 Wind Drift: -{Math.round(pendingScrunch * 0.75)}%
                    </span>
                    <span className="text-amber-400">⚽ 100% (Aero Sphere)</span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={pendingScrunch}
                    onChange={(e) => setPendingScrunch(Number(e.target.value))}
                    className="w-full h-3 accent-amber-500 bg-stone-700 rounded-lg cursor-pointer hover:bg-stone-600 transition"
                  />

                  <div className="flex justify-between gap-1.5 pt-1 flex-wrap">
                    {[
                      { label: '0% (Loose)', val: 0, icon: '📄' },
                      { label: '25% (Folded)', val: 25, icon: '📦' },
                      { label: '50% (Ball)', val: 50, icon: '🧆' },
                      { label: '75% (Tight)', val: 75, icon: '🌕' },
                      { label: '100% (Sphere)', val: 100, icon: '⚽' },
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        onClick={() => setPendingScrunch(preset.val)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold font-mono transition flex items-center gap-1.5 ${
                          pendingScrunch === preset.val
                            ? 'bg-amber-500 text-stone-950 shadow-md font-extrabold ring-2 ring-amber-300'
                            : 'bg-stone-800 text-stone-300 hover:text-white border border-stone-700'
                        }`}
                      >
                        <span>{preset.icon}</span>
                        <span className="hidden sm:inline">{preset.label}</span>
                        <span className="sm:hidden">{preset.val}%</span>
                      </button>
                    ))}
                  </div>

                  {/* Apply Button in Shop Modal */}
                  <div className="pt-2 border-t border-stone-800 flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-xs font-mono">
                      {isChanged ? (
                        costToApply > 0 ? (
                          <span className="text-amber-300 font-bold">
                            Cost to Apply: <strong className="text-amber-400 text-sm">{costToApply} 🍃</strong> (You have {teaLeaves} 🍃)
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-bold">Cost to Apply: FREE</span>
                        )
                      ) : (
                        <span className="text-stone-400">Currently active at {scrunchLevel}%</span>
                      )}
                    </div>

                    {isChanged ? (
                      costToApply > 0 ? (
                        canAfford ? (
                          <button
                            onClick={() => onScrunchChange?.(pendingScrunch)}
                            className="px-4 py-2 rounded-xl text-xs font-mono font-black bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-lg shadow-amber-500/20 transition active:scale-95 cursor-pointer flex items-center gap-2 animate-pulse"
                          >
                            <Sparkles className="w-4 h-4" />
                            <span>APPLY SCRUNCH LEVEL ({costToApply} 🍃)</span>
                          </button>
                        ) : (
                          <button
                            disabled
                            className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-rose-950/80 text-rose-300 border border-rose-500/50 cursor-not-allowed opacity-90"
                          >
                            NEED {costToApply} 🍃 TEA LEAVES
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => onScrunchChange?.(pendingScrunch)}
                          className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition active:scale-95 cursor-pointer flex items-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          <span>APPLY SCRUNCH LEVEL (FREE)</span>
                        </button>
                      )
                    ) : (
                      <button
                        disabled
                        className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-stone-800 text-stone-500 border border-stone-700/60 cursor-default"
                      >
                        SCRUNCH LEVEL APPLIED
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    range: '0% - 20%',
                    icon: '📄',
                    title: 'Loose Filter Pouch',
                    desc: 'Standard un-scrunched tea bag with natural fluttering and full wind draft.',
                    windRed: '0% Drift Reduction',
                    accuracy: 'Standard Line Guide',
                  },
                  {
                    range: '21% - 50%',
                    icon: '📦',
                    title: 'Compact Folded Bag',
                    desc: 'Tucked corners reduce fluttering for cleaner flight trajectory.',
                    windRed: '-15% to -37% Wind Drift',
                    accuracy: '+25% Extended Trajectory',
                  },
                  {
                    range: '51% - 80%',
                    icon: '🧆',
                    title: 'Scrunched Tea Ball',
                    desc: 'Dense crinkled ball shape that pierces crosswinds cleanly.',
                    windRed: '-38% to -60% Wind Drift',
                    accuracy: '+60% Extended Trajectory',
                  },
                  {
                    range: '81% - 100%',
                    icon: '⚽',
                    title: 'Aerodynamic Sphere',
                    desc: 'A golden sphere with high flight momentum, laser targeting crosshair, and maximum precision!',
                    windRed: '-61% to -75% Wind Drift',
                    accuracy: '🎯 Precision Targeting Crosshair',
                  },
                ].map((item) => {
                  const isActiveCategory =
                    (scrunchLevel <= 20 && item.range === '0% - 20%') ||
                    (scrunchLevel > 20 && scrunchLevel <= 50 && item.range === '21% - 50%') ||
                    (scrunchLevel > 50 && scrunchLevel <= 80 && item.range === '51% - 80%') ||
                    (scrunchLevel > 80 && item.range === '81% - 100%');

                  return (
                    <div
                      key={item.range}
                      className={`p-4 rounded-xl border transition ${
                        isActiveCategory
                          ? 'bg-amber-500/15 border-amber-500 text-amber-100 shadow-md ring-1 ring-amber-500/50'
                          : 'bg-stone-800/40 border-stone-700/60 text-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{item.icon}</span>
                          <div>
                            <h4 className="font-bold text-sm flex items-center gap-2">
                              <span>{item.title}</span>
                              {isActiveCategory && (
                                <span className="text-[10px] bg-amber-500 text-stone-950 font-extrabold px-2 py-0.5 rounded-full">
                                  ACTIVE ({scrunchLevel}%)
                                </span>
                              )}
                            </h4>
                            <div className="text-[11px] font-mono text-emerald-400 font-bold mt-0.5">
                              {item.windRed} • {item.accuracy}
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-stone-400 mt-2">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
