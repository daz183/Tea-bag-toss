import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameMode, EnvironmentTheme, WindState, GameStats, ShotResult, Achievement } from './types';
import { TEA_TYPES, MUG_TYPES, INITIAL_ACHIEVEMENTS } from './data/items';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { ShopModal } from './components/ShopModal';
import { GameOverModal } from './components/GameOverModal';
import { StatsModal } from './components/StatsModal';
import { SettingsModal } from './components/SettingsModal';
import { ThemeModal } from './components/ThemeModal';
import { sound } from './utils/audio';
import { Coffee, Timer, Target, Sparkles, RefreshCw } from 'lucide-react';

const STORAGE_KEY = 'tea_bag_toss_stats_v1';

export default function App() {
  // Game Modes & Playing State
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false);
  const [teaLeavesEarnedSession, setTeaLeavesEarnedSession] = useState<number>(0);

  // Persistent Game Stats & Unlocks
  const [stats, setStats] = useState<GameStats>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Ignore fallback
    }
    return {
      totalThrows: 0,
      successfulLanded: 0,
      swishes: 0,
      rimShots: 0,
      totalTeaLeaves: 100, // Starter bonus leaves
      bestStreak: 0,
      highScores: { classic: 0, timed: 0, precision: 0, zen: 0 },
      unlockedTeas: ['earl_grey'],
      unlockedMugs: ['classic_white'],
      selectedTea: 'earl_grey',
      selectedMug: 'classic_white',
      selectedTheme: 'kitchen',
      soundEnabled: true,
    };
  });

  // Achievements
  const [achievements, setAchievements] = useState<Achievement[]>(INITIAL_ACHIEVEMENTS);

  // Wind State
  const [wind, setWind] = useState<WindState>({
    speed: 3.5,
    direction: 1,
  });

  // Modals
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);

  // Save Stats to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    } catch {
      // Ignore storage errors
    }
  }, [stats]);

  // Sync sound manager
  useEffect(() => {
    sound.setSoundEnabled(stats.soundEnabled);
  }, [stats.soundEnabled]);

  // Randomize Wind Helper
  const randomizeWind = useCallback(() => {
    const maxWind = gameMode === 'zen' ? 4 : 11;
    const speed = Math.round((Math.random() * maxWind) * 10) / 10;
    const direction = Math.random() > 0.5 ? 1 : -1;
    setWind({ speed, direction });
  }, [gameMode]);

  // Timed Mode Countdown Timer
  useEffect(() => {
    if (gameMode !== 'timed' || !isPlaying || isGameOver) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Trigger Game Over for Timed Mode
          handleGameOver();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameMode, isPlaying, isGameOver]);

  // Trigger Game Over
  const handleGameOver = useCallback(() => {
    setIsGameOver(true);
    setIsPlaying(false);

    const currentHighScore = stats.highScores[gameMode] || 0;
    const newHigh = score > currentHighScore;

    if (newHigh) {
      setIsNewHighScore(true);
      setStats((prev) => ({
        ...prev,
        highScores: {
          ...prev.highScores,
          [gameMode]: score,
        },
      }));
    } else {
      setIsNewHighScore(false);
    }
  }, [gameMode, score, stats.highScores]);

  // Handle Shot Result from GameCanvas
  const handleShotComplete = useCallback(
    (result: ShotResult) => {
      setStats((prev) => ({
        ...prev,
        totalThrows: prev.totalThrows + 1,
      }));

      if (result.type === 'swish' || result.type === 'landed') {
        const newScore = score + result.scoreGained;
        const newStreak = streak + 1;
        const leavesEarned = Math.round(result.scoreGained / 2);

        setScore(newScore);
        setStreak(newStreak);
        setTeaLeavesEarnedSession((prev) => prev + leavesEarned);

        if (newStreak > bestStreak) {
          setBestStreak(newStreak);
        }

        // Update stats
        setStats((prev) => ({
          ...prev,
          successfulLanded: prev.successfulLanded + 1,
          swishes: result.type === 'swish' ? prev.swishes + 1 : prev.swishes,
          totalTeaLeaves: prev.totalTeaLeaves + leavesEarned,
          bestStreak: Math.max(prev.bestStreak, newStreak),
        }));

        // Check Achievements
        setAchievements((prevAchs) =>
          prevAchs.map((ach) => {
            if (ach.id === 'first_steep' && !ach.unlocked) {
              return { ...ach, unlocked: true, progress: 1 };
            }
            if (ach.id === 'swish_master' && !ach.unlocked && result.type === 'swish') {
              const nextProg = ach.progress + 1;
              return { ...ach, progress: nextProg, unlocked: nextProg >= ach.maxProgress };
            }
            if (ach.id === 'wind_whisperer' && !ach.unlocked && wind.speed >= 7.0) {
              return { ...ach, unlocked: true, progress: 1 };
            }
            if (ach.id === 'tea_party' && !ach.unlocked && newStreak >= 5) {
              return { ...ach, unlocked: true, progress: 5 };
            }
            return ach;
          })
        );
      } else {
        // Miss or rim bounce miss
        setStreak(0);

        if (gameMode === 'classic') {
          setLives((prevLives) => {
            const nextLives = prevLives - 1;
            if (nextLives <= 0) {
              setTimeout(() => {
                handleGameOver();
              }, 600);
            }
            return Math.max(nextLives, 0);
          });
        }
      }
    },
    [score, streak, bestStreak, wind.speed, gameMode, handleGameOver]
  );

  // Restart / Reset Game Session
  const handleRestart = useCallback(() => {
    setScore(0);
    setStreak(0);
    setLives(3);
    setTimeLeft(60);
    setIsGameOver(false);
    setIsPlaying(true);
    setIsNewHighScore(false);
    setTeaLeavesEarnedSession(0);
    randomizeWind();
  }, [randomizeWind]);

  // Switch Game Mode
  const handleSelectMode = (mode: GameMode) => {
    sound.playClick();
    setGameMode(mode);
    setScore(0);
    setStreak(0);
    setLives(3);
    setTimeLeft(60);
    setIsGameOver(false);
    setIsPlaying(true);
    setIsNewHighScore(false);
    setTeaLeavesEarnedSession(0);
    randomizeWind();
  };

  // Unlock Tea
  const handleUnlockTea = (teaId: string, price: number) => {
    if (stats.totalTeaLeaves >= price && !stats.unlockedTeas.includes(teaId)) {
      setStats((prev) => ({
        ...prev,
        totalTeaLeaves: prev.totalTeaLeaves - price,
        unlockedTeas: [...prev.unlockedTeas, teaId],
        selectedTea: teaId,
      }));
    }
  };

  // Unlock Mug
  const handleUnlockMug = (mugId: string, price: number) => {
    if (stats.totalTeaLeaves >= price && !stats.unlockedMugs.includes(mugId)) {
      setStats((prev) => ({
        ...prev,
        totalTeaLeaves: prev.totalTeaLeaves - price,
        unlockedMugs: [...prev.unlockedMugs, mugId],
        selectedMug: mugId,
      }));
    }
  };

  // Equip Tea
  const handleSelectTea = (teaId: string) => {
    setStats((prev) => ({ ...prev, selectedTea: teaId }));
  };

  // Equip Mug
  const handleSelectMug = (mugId: string) => {
    setStats((prev) => ({ ...prev, selectedMug: mugId }));
  };

  // Equip Theme
  const handleSelectTheme = (theme: EnvironmentTheme) => {
    setStats((prev) => ({ ...prev, selectedTheme: theme }));
  };

  // Toggle Sound
  const handleToggleSound = () => {
    setStats((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  };

  // Current Selected Equipment Objects
  const selectedTeaObj = TEA_TYPES.find((t) => t.id === stats.selectedTea) || TEA_TYPES[0];
  const selectedMugObj = MUG_TYPES.find((m) => m.id === stats.selectedMug) || MUG_TYPES[0];

  return (
    <div className="w-screen h-screen bg-stone-950 text-white flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* Top Main Game Canvas Area */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {/* HUD Overlay */}
        <HUD
          score={score}
          highScore={stats.highScores[gameMode] || 0}
          streak={streak}
          lives={lives}
          timeLeft={timeLeft}
          wind={wind}
          gameMode={gameMode}
          selectedTea={selectedTeaObj}
          selectedMug={selectedMugObj}
          teaLeaves={stats.totalTeaLeaves}
          soundEnabled={stats.soundEnabled}
          onToggleSound={handleToggleSound}
          onOpenShop={() => setIsShopOpen(true)}
          onOpenStats={() => setIsStatsOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenThemeModal={() => setIsThemeOpen(true)}
        />

        {/* 2D Physics Canvas */}
        <GameCanvas
          gameMode={gameMode}
          theme={stats.selectedTheme}
          selectedTea={selectedTeaObj}
          selectedMug={selectedMugObj}
          wind={wind}
          isPlaying={isPlaying && !isGameOver}
          onShotComplete={handleShotComplete}
          onWindChangeNeeded={randomizeWind}
          streak={streak}
        />
      </div>

      {/* Bottom Game Mode Bar */}
      <div className="bg-stone-900 border-t border-stone-800 p-2 sm:p-3 flex items-center justify-center gap-2 z-20 overflow-x-auto shrink-0">
        <button
          onClick={() => handleSelectMode('classic')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 ${
            gameMode === 'classic'
              ? 'bg-amber-500 text-stone-950 shadow-lg scale-105'
              : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
          }`}
        >
          <Coffee className="w-4 h-4" />
          <span>Classic (3 Lives)</span>
        </button>

        <button
          onClick={() => handleSelectMode('timed')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 ${
            gameMode === 'timed'
              ? 'bg-amber-500 text-stone-950 shadow-lg scale-105'
              : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
          }`}
        >
          <Timer className="w-4 h-4" />
          <span>60s Timed Challenge</span>
        </button>

        <button
          onClick={() => handleSelectMode('precision')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 ${
            gameMode === 'precision'
              ? 'bg-amber-500 text-stone-950 shadow-lg scale-105'
              : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Precision (Moving Mug)</span>
        </button>

        <button
          onClick={() => handleSelectMode('zen')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 ${
            gameMode === 'zen'
              ? 'bg-emerald-500 text-stone-950 shadow-lg scale-105'
              : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Zen Practice</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            handleRestart();
          }}
          className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl transition ml-2"
          title="Reset Shot Position"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Modals */}
      <ShopModal
        isOpen={isShopOpen}
        onClose={() => setIsShopOpen(false)}
        teaLeaves={stats.totalTeaLeaves}
        unlockedTeas={stats.unlockedTeas}
        unlockedMugs={stats.unlockedMugs}
        selectedTeaId={stats.selectedTea}
        selectedMugId={stats.selectedMug}
        onUnlockTea={handleUnlockTea}
        onUnlockMug={handleUnlockMug}
        onSelectTea={handleSelectTea}
        onSelectMug={handleSelectMug}
      />

      <GameOverModal
        isOpen={isGameOver}
        score={score}
        highScore={stats.highScores[gameMode] || score}
        isNewHighScore={isNewHighScore}
        gameMode={gameMode}
        teaLeavesEarned={teaLeavesEarnedSession}
        bestStreak={bestStreak}
        onRestart={handleRestart}
        onOpenShop={() => {
          setIsGameOver(false);
          setIsShopOpen(true);
        }}
      />

      <StatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        stats={stats}
        achievements={achievements}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        soundEnabled={stats.soundEnabled}
        onToggleSound={handleToggleSound}
      />

      <ThemeModal
        isOpen={isThemeOpen}
        onClose={() => setIsThemeOpen(false)}
        selectedTheme={stats.selectedTheme}
        onSelectTheme={handleSelectTheme}
      />
    </div>
  );
}
