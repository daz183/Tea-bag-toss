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
  const [lives, setLives] = useState<number>(5);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false);
  const [teaLeavesEarnedSession, setTeaLeavesEarnedSession] = useState<number>(0);

  // Level Progression State
  const [level, setLevel] = useState<number>(1);
  const [landedInLevel, setLandedInLevel] = useState<number>(0);
  const [levelUpToast, setLevelUpToast] = useState<string | null>(null);

  // Shots required to complete current level (e.g. Level 1 = 2 shots, Level 2 = 3 shots, Level 3 = 4 shots...)
  const targetShotsForLevel = level + 1;

  // Persistent Game Stats & Unlocks
  const [stats, setStats] = useState<GameStats>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          totalTeaLeaves: parsed.totalTeaLeaves ?? 20, // 20 starter leaves
        };
      }
    } catch {
      // Ignore fallback
    }
    return {
      totalThrows: 0,
      successfulLanded: 0,
      swishes: 0,
      rimShots: 0,
      totalTeaLeaves: 20, // Starter bonus leaves
      bestStreak: 0,
      highScores: { classic: 0, timed: 0, precision: 0, zen: 0 },
      unlockedTeas: ['earl_grey'],
      unlockedMugs: ['classic_white'],
      selectedTea: 'earl_grey',
      selectedMug: 'classic_white',
      selectedTheme: 'kitchen',
      soundEnabled: true,
      scrunchLevel: 0,
    };
  });

  const [scrunchLevel, setScrunchLevel] = useState<number>(stats.scrunchLevel ?? 0);
  const [scrunchTurnsLeft, setScrunchTurnsLeft] = useState<number>(() => {
    return (stats.scrunchLevel ?? 0) > 0 ? 10 : 0;
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
    const maxWind = gameMode === 'zen' ? 3 : Math.min(3.5 + (level - 1) * 2.0, 11);
    const speed = Math.round((Math.random() * maxWind) * 10) / 10;
    const direction = Math.random() > 0.5 ? 1 : -1;
    setWind({ speed, direction });
  }, [gameMode, level]);

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

      // Turn counter for active Scrunch (lasts for 10 turns)
      if (scrunchLevel > 0) {
        setScrunchTurnsLeft((prevTurns) => {
          const nextTurns = prevTurns - 1;
          if (nextTurns <= 0) {
            setScrunchLevel(0);
            setStats((prev) => ({ ...prev, scrunchLevel: 0 }));
            sound.playScrunch();
            setLevelUpToast('🍃 Scrunch wore off after 10 turns! (Tea bag un-scrunched)');
            setTimeout(() => setLevelUpToast(null), 3000);
            return 0;
          }
          return nextTurns;
        });
      }

      if (result.type === 'swish' || result.type === 'landed') {
        const newScore = score + result.scoreGained;
        const newStreak = streak + 1;
        // Rebalanced Earning Rate: Swish = 2 leaves, Landed = 1 leaf
        const leavesEarned = result.type === 'swish' ? 2 : 1;

        setScore(newScore);
        setStreak(newStreak);
        setTeaLeavesEarnedSession((prev) => prev + leavesEarned);

        if (newStreak > bestStreak) {
          setBestStreak(newStreak);
        }

        // Level Progression check
        const nextLanded = landedInLevel + 1;
        if (nextLanded >= targetShotsForLevel) {
          const nextLevel = level + 1;
          const levelBonusLeaves = nextLevel * 3; // Rebalanced Level Bonus (3 leaves * level)

          setLevel(nextLevel);
          setLandedInLevel(0);
          setTeaLeavesEarnedSession((prev) => prev + levelBonusLeaves);

          sound.playLevelUp();

          // Get level theme obstacle hint text
          const themeNames: Record<EnvironmentTheme, string> = {
            kitchen: 'Kitchen Cat Paw & Toaster',
            office: 'Paper Airplane & Desk Lamp',
            teahouse: 'Paper Lantern & Bonsai Branch',
            porch: 'Hummingbird & Hanging Plant',
          };

          setLevelUpToast(`LEVEL ${nextLevel}! Mug further away + ${themeNames[stats.selectedTheme]}! (+${levelBonusLeaves} 🍃)`);

          setTimeout(() => {
            setLevelUpToast(null);
          }, 4200);

          // Update stats with bonus leaves
          setStats((prev) => ({
            ...prev,
            successfulLanded: prev.successfulLanded + 1,
            swishes: result.type === 'swish' ? prev.swishes + 1 : prev.swishes,
            totalTeaLeaves: prev.totalTeaLeaves + leavesEarned + levelBonusLeaves,
            bestStreak: Math.max(prev.bestStreak, newStreak),
          }));
        } else {
          setLandedInLevel(nextLanded);

          // Update stats standard
          setStats((prev) => ({
            ...prev,
            successfulLanded: prev.successfulLanded + 1,
            swishes: result.type === 'swish' ? prev.swishes + 1 : prev.swishes,
            totalTeaLeaves: prev.totalTeaLeaves + leavesEarned,
            bestStreak: Math.max(prev.bestStreak, newStreak),
          }));
        }

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
    setLives(5);
    setTimeLeft(60);
    setLevel(1);
    setLandedInLevel(0);
    setLevelUpToast(null);
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
    setLives(5);
    setTimeLeft(60);
    setLevel(1);
    setLandedInLevel(0);
    setLevelUpToast(null);
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

  // Scrunch Tea Bag Slider Change (0% to 100%) - Costs Earned Tea Leaves (1% starts at 50 Leaves, +1 Leaf per additional %)
  const handleScrunchChange = useCallback(
    (targetPercent: number) => {
      const clampedTarget = Math.min(100, Math.max(0, Math.round(targetPercent)));

      if (clampedTarget === scrunchLevel) return;

      if (clampedTarget > scrunchLevel) {
        // Cost formula: 0% = 0 Leaves. 1% = 10 Leaves. Each additional % = +1 Leaf.
        const currentCost = scrunchLevel <= 0 ? 0 : 10 + (scrunchLevel - 1);
        const targetCost = clampedTarget <= 0 ? 0 : 10 + (clampedTarget - 1);
        const leavesNeeded = targetCost - currentCost;

        if (stats.totalTeaLeaves < leavesNeeded) {
          sound.playFail();
          // Calculate max scrunch level player can afford
          const budget = currentCost + stats.totalTeaLeaves;
          let maxAffordablePercent = 0;
          if (budget >= 10) {
            maxAffordablePercent = Math.min(100, budget - 9);
          }

          if (maxAffordablePercent > scrunchLevel) {
            const actualCost = (10 + (maxAffordablePercent - 1)) - currentCost;
            setScrunchLevel(maxAffordablePercent);
            setScrunchTurnsLeft(maxAffordablePercent > 0 ? 10 : 0);
            setStats((prev) => ({
              ...prev,
              totalTeaLeaves: prev.totalTeaLeaves - actualCost,
              scrunchLevel: maxAffordablePercent,
            }));
            sound.playScrunch();
            setLevelUpToast(`🍃 Scrunched to ${maxAffordablePercent}% for 10 turns! (Used ${actualCost} 🍃)`);
          } else {
            if (scrunchLevel === 0) {
              setLevelUpToast(`🍃 Need 10 Tea Leaves to start scrunching (1%)! (You have ${stats.totalTeaLeaves} 🍃)`);
            } else {
              setLevelUpToast(`🍃 Need ${leavesNeeded} Tea Leaves to scrunch to ${clampedTarget}%! (You have ${stats.totalTeaLeaves} 🍃)`);
            }
          }

          setTimeout(() => setLevelUpToast(null), 3200);
          return;
        }

        // Has enough leaves!
        setScrunchLevel(clampedTarget);
        setScrunchTurnsLeft(clampedTarget > 0 ? 10 : 0);
        setStats((prev) => ({
          ...prev,
          totalTeaLeaves: prev.totalTeaLeaves - leavesNeeded,
          scrunchLevel: clampedTarget,
        }));

        sound.playScrunch();
        setLevelUpToast(`🍃 Scrunched to ${clampedTarget}%! Active for 10 turns (${leavesNeeded} 🍃)`);
        setTimeout(() => setLevelUpToast(null), 2500);
      } else {
        // Reducing scrunch level is free
        setScrunchLevel(clampedTarget);
        setScrunchTurnsLeft(clampedTarget > 0 ? 10 : 0);
        setStats((prev) => ({
          ...prev,
          scrunchLevel: clampedTarget,
        }));
        sound.playScrunch();
      }
    },
    [scrunchLevel, stats.totalTeaLeaves]
  );

  // Current Selected Equipment Objects
  const selectedTeaObj = TEA_TYPES.find((t) => t.id === stats.selectedTea) || TEA_TYPES[0];
  const selectedMugObj = MUG_TYPES.find((m) => m.id === stats.selectedMug) || MUG_TYPES[0];

  return (
    <div className="w-screen h-screen bg-stone-950 text-white flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* Top Main Game Canvas Area */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {/* Level Up Banner Toast Overlay */}
        {levelUpToast && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none w-11/12 max-w-md animate-bounce">
            <div className="bg-amber-500/95 backdrop-blur-md text-stone-950 font-black px-4 py-2.5 rounded-2xl border-2 border-amber-300 shadow-2xl text-center text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-stone-900 shrink-0" />
              <span>{levelUpToast}</span>
            </div>
          </div>
        )}

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
          level={level}
          landedInLevel={landedInLevel}
          targetShotsForLevel={targetShotsForLevel}
          scrunchLevel={scrunchLevel}
          scrunchTurnsLeft={scrunchTurnsLeft}
          onScrunchChange={handleScrunchChange}
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
          level={level}
          scrunchLevel={scrunchLevel}
          isPlaying={isPlaying && !isGameOver}
          onShotComplete={handleShotComplete}
          onWindChangeNeeded={randomizeWind}
          streak={streak}
        />
      </div>

      {/* Bottom Game Mode Bar */}
      <div className="bg-stone-950/90 backdrop-blur-md border-t border-stone-800/80 px-2 py-1.5 sm:px-3 flex items-center justify-center gap-1.5 z-20 overflow-x-auto shrink-0">
        <button
          onClick={() => handleSelectMode('classic')}
          className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition shrink-0 ${
            gameMode === 'classic'
              ? 'bg-amber-500 text-stone-950 shadow'
              : 'bg-stone-800/80 text-stone-300 hover:bg-stone-700'
          }`}
        >
          <Coffee className="w-3.5 h-3.5" />
          <span>Classic</span>
        </button>

        <button
          onClick={() => handleSelectMode('timed')}
          className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition shrink-0 ${
            gameMode === 'timed'
              ? 'bg-amber-500 text-stone-950 shadow'
              : 'bg-stone-800/80 text-stone-300 hover:bg-stone-700'
          }`}
        >
          <Timer className="w-3.5 h-3.5" />
          <span>60s Timed</span>
        </button>

        <button
          onClick={() => handleSelectMode('precision')}
          className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition shrink-0 ${
            gameMode === 'precision'
              ? 'bg-amber-500 text-stone-950 shadow'
              : 'bg-stone-800/80 text-stone-300 hover:bg-stone-700'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>Precision</span>
        </button>

        <button
          onClick={() => handleSelectMode('zen')}
          className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition shrink-0 ${
            gameMode === 'zen'
              ? 'bg-emerald-500 text-stone-950 shadow'
              : 'bg-stone-800/80 text-stone-300 hover:bg-stone-700'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Zen</span>
        </button>

        <div className="h-4 w-px bg-stone-800 mx-0.5 shrink-0" />

        <button
          onClick={() => {
            sound.playClick();
            handleRestart();
          }}
          className="p-1 bg-stone-800/80 hover:bg-stone-700 text-stone-300 rounded-lg transition shrink-0"
          title="Reset Shot Position"
        >
          <RefreshCw className="w-3.5 h-3.5" />
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
        scrunchLevel={scrunchLevel}
        onScrunchChange={handleScrunchChange}
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
