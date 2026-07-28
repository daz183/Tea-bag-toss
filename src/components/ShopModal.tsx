import React, { useState } from 'react';
import { TeaType, MugType } from '../types';
import { TEA_TYPES, MUG_TYPES } from '../data/items';
import { X, Check, Lock, Sparkles, Coffee, Shirt, ShieldCheck } from 'lucide-react';
import { sound } from '../utils/audio';

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  teaLeaves: number;
  unlockedTeas: string[];
  unlockedMugs: string[];
  selectedTeaId: string;
  selectedMugId: string;
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
  onUnlockTea,
  onUnlockMug,
  onSelectTea,
  onSelectMug,
}) => {
  const [activeTab, setActiveTab] = useState<'teas' | 'mugs'>('teas');

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
            <Shirt className="w-4 h-4" />
            <span>Custom Mugs ({unlockedMugs.length}/{MUG_TYPES.length})</span>
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
                    {/* Tag preview badge */}
                    <div
                      className="w-10 h-12 rounded-md flex items-center justify-center font-bold text-[10px] text-white shadow-md border border-white/20 shrink-0"
                      style={{ backgroundColor: tea.bagColor }}
                    >
                      TEA
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-amber-100">{tea.name}</h3>
                        <span className="text-xs bg-amber-950/80 text-amber-400 border border-amber-800/60 px-2 py-0.5 rounded-md font-mono">
                          +{Math.round((tea.scoreMultiplier - 1) * 100)}% Pts
                        </span>
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
                    {/* Mug swatch circle */}
                    <div
                      className="w-10 h-10 rounded-full border-2 border-white/20 shadow-inner shrink-0"
                      style={{ backgroundColor: mug.color }}
                    />

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
        </div>
      </div>
    </div>
  );
};
