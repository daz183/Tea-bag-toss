import React from 'react';
import { EnvironmentTheme } from '../types';
import { X, Palette, Check, Coffee, Building2, Trees, Sun } from 'lucide-react';
import { sound } from '../utils/audio';

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTheme: EnvironmentTheme;
  onSelectTheme: (theme: EnvironmentTheme) => void;
}

export const ThemeModal: React.FC<ThemeModalProps> = ({
  isOpen,
  onClose,
  selectedTheme,
  onSelectTheme,
}) => {
  if (!isOpen) return null;

  const themes: { id: EnvironmentTheme; name: string; desc: string; icon: React.ReactNode; color: string }[] = [
    {
      id: 'kitchen',
      name: 'Cozy Kitchen Counter',
      desc: 'Warm honey walls and polished oak countertop.',
      icon: <Coffee className="w-5 h-5 text-amber-400" />,
      color: 'bg-gradient-to-r from-amber-900 to-amber-700',
    },
    {
      id: 'office',
      name: 'Modern Office Desk',
      desc: 'Clean slate backdrop and sleek steel worktable.',
      icon: <Building2 className="w-5 h-5 text-sky-400" />,
      color: 'bg-gradient-to-r from-slate-800 to-slate-600',
    },
    {
      id: 'teahouse',
      name: 'Zen Garden Teahouse',
      desc: 'Tranquil matcha green atmosphere with dark teakwood.',
      icon: <Trees className="w-5 h-5 text-emerald-400" />,
      color: 'bg-gradient-to-r from-emerald-900 to-emerald-700',
    },
    {
      id: 'porch',
      name: 'Sunlit Porch Table',
      desc: 'Bright sunny afternoon breeze on the wooden porch.',
      icon: <Sun className="w-5 h-5 text-yellow-400" />,
      color: 'bg-gradient-to-r from-sky-700 to-amber-700',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-700/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-white animate-in zoom-in duration-200">
        {/* Header */}
        <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-amber-100">Environment Themes</h2>
              <p className="text-xs text-stone-400">Choose your favorite room setting</p>
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

        {/* List of Themes */}
        <div className="p-4 space-y-3">
          {themes.map((t) => {
            const isSelected = selectedTheme === t.id;
            return (
              <div
                key={t.id}
                onClick={() => {
                  sound.playClick();
                  onSelectTheme(t.id);
                  onClose();
                }}
                className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between gap-4 ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500 shadow-md'
                    : 'bg-stone-800/50 border-stone-700/60 hover:bg-stone-800'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`p-3 rounded-xl ${t.color} border border-white/20 shadow-md`}>{t.icon}</div>
                  <div>
                    <h3 className="font-bold text-amber-100 text-sm">{t.name}</h3>
                    <p className="text-xs text-stone-400 mt-0.5">{t.desc}</p>
                  </div>
                </div>

                {isSelected && (
                  <div className="bg-amber-500 text-stone-950 p-1.5 rounded-full font-bold">
                    <Check className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
