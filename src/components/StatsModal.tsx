import React from 'react';
import { GameStats, Achievement } from '../types';
import { X, Award, Flame, Target, Sparkles, CheckCircle2 } from 'lucide-react';
import { sound } from '../utils/audio';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: GameStats;
  achievements: Achievement[];
}

export const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose, stats, achievements }) => {
  if (!isOpen) return null;

  const accuracy = stats.totalThrows > 0 ? Math.round((stats.successfulLanded / stats.totalThrows) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-700/80 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-white animate-in zoom-in duration-200">
        {/* Header */}
        <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-amber-100">Career Stats & Trophies</h2>
              <p className="text-xs text-stone-400">Your tea steeping history and achievements</p>
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

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Stats Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-stone-800/60 border border-stone-700/50 p-3 rounded-xl text-center">
              <Target className="w-4 h-4 text-sky-400 mx-auto mb-1" />
              <div className="text-[10px] text-stone-400 font-bold uppercase">Accuracy</div>
              <div className="text-xl font-black font-mono text-white">{accuracy}%</div>
            </div>

            <div className="bg-stone-800/60 border border-stone-700/50 p-3 rounded-xl text-center">
              <Sparkles className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <div className="text-[10px] text-stone-400 font-bold uppercase">Swishes</div>
              <div className="text-xl font-black font-mono text-amber-300">{stats.swishes}</div>
            </div>

            <div className="bg-stone-800/60 border border-stone-700/50 p-3 rounded-xl text-center">
              <Flame className="w-4 h-4 text-rose-400 mx-auto mb-1" />
              <div className="text-[10px] text-stone-400 font-bold uppercase">Best Streak</div>
              <div className="text-xl font-black font-mono text-rose-300">{stats.bestStreak}x</div>
            </div>

            <div className="bg-stone-800/60 border border-stone-700/50 p-3 rounded-xl text-center">
              <Award className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <div className="text-[10px] text-stone-400 font-bold uppercase">Total Cups</div>
              <div className="text-xl font-black font-mono text-emerald-300">{stats.successfulLanded}</div>
            </div>
          </div>

          {/* Achievements Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">Achievements</h3>

            <div className="space-y-2">
              {achievements.map((ach) => (
                <div
                  key={ach.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                    ach.unlocked
                      ? 'bg-amber-500/10 border-amber-500/50'
                      : 'bg-stone-800/40 border-stone-800 text-stone-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl ${
                        ach.unlocked ? 'bg-amber-500 text-stone-950 font-bold' : 'bg-stone-800 text-stone-500'
                      }`}
                    >
                      <Award className="w-4 h-4" />
                    </div>

                    <div>
                      <h4 className={`text-sm font-bold ${ach.unlocked ? 'text-amber-100' : 'text-stone-300'}`}>
                        {ach.title}
                      </h4>
                      <p className="text-xs text-stone-400">{ach.description}</p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    {ach.unlocked ? (
                      <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>UNLOCKED</span>
                      </span>
                    ) : (
                      <span className="text-xs text-stone-500 font-mono">
                        {ach.progress}/{ach.maxProgress}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
