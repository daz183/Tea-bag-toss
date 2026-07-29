import React from 'react';
import { X, Volume2, VolumeX, HelpCircle, Gamepad2, Wind, Sparkles } from 'lucide-react';
import { sound } from '../utils/audio';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  soundEnabled,
  onToggleSound,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-white animate-in zoom-in duration-200">
        {/* Header */}
        <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-amber-100">How to Play & Settings</h2>
              <p className="text-xs text-stone-400">Master the art of the perfect tea bag flick!</p>
            </div>
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

        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Sound Toggle */}
          <div className="p-3.5 bg-stone-800/60 border border-stone-700/60 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              {soundEnabled ? (
                <Volume2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <VolumeX className="w-5 h-5 text-stone-500" />
              )}
              <div>
                <div className="text-sm font-bold text-white">Audio Sound Effects</div>
                <div className="text-xs text-stone-400">Flick swooshes, ceramic rim clinks, and liquid splashes</div>
              </div>
            </div>

            <button
              onClick={() => {
                onToggleSound();
                sound.playClick();
              }}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
                soundEnabled
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-stone-700 hover:bg-stone-600 text-stone-300'
              }`}
            >
              {soundEnabled ? 'ENABLED' : 'MUTED'}
            </button>
          </div>

          {/* Instructions */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Gamepad2 className="w-4 h-4" />
              <span>Flick Controls</span>
            </h3>

            <div className="grid gap-2.5 text-xs text-stone-300">
              <div className="p-3 bg-stone-950/60 rounded-xl border border-stone-800/80 flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0">
                  1
                </div>
                <div>
                  <strong className="text-amber-200">Two Ways to Throw:</strong> You can either <strong>Flick/Swipe Up</strong> forward across the screen, or <strong>Pull Down & Release</strong> like a slingshot to launch the tea bag toward the mug!
                </div>
              </div>

              <div className="p-3 bg-stone-950/60 rounded-xl border border-stone-800/80 flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  <strong className="text-amber-200">Watch the Crosswind:</strong> The electric fan on the wall blows wind left or right! Adjust your trajectory arc to compensate for wind speed.
                </div>
              </div>

              <div className="p-3 bg-stone-950/60 rounded-xl border border-stone-800/80 flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  <strong className="text-amber-200">Score Perfect Swishes:</strong> Landing clean in the center without hitting the rim grants double points and builds your streak combo!
                </div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="p-3.5 bg-amber-950/40 border border-amber-800/50 rounded-xl text-xs text-amber-200/90 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Earn <strong>Tea Leaves</strong> with every successful throw to unlock premium Earl Grey, Matcha Green Tea, Chamomile, and giant custom mugs in the Tea Shop!
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
