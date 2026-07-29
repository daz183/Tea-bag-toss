export type GameMode = 'classic' | 'timed' | 'precision' | 'zen';

export type EnvironmentTheme = 'kitchen' | 'office' | 'teahouse' | 'porch';

export interface TeaType {
  id: string;
  name: string;
  flavorText: string;
  bagColor: string; // Hex or CSS color for tag/string
  teaColor: string; // Liquid color in mug when steeping
  particleColor: string;
  unlocked: boolean;
  price: number;
  scoreMultiplier: number;
  specialEffect?: 'glow' | 'leaves' | 'sparkles' | 'steam' | 'mint';
  weightLabel?: string;
  gravity?: number; // e.g. 0.38 standard
  windSensitivity?: number; // e.g. 1.0 standard, >1 floaty, <1 heavy
}

export interface MugType {
  id: string;
  name: string;
  description: string;
  widthRatio: number; // multiplier for rim width (1.0 default, 1.2 wide, 0.8 slim)
  color: string;
  rimColor: string;
  pattern?: 'stripes' | 'dots' | 'floral' | 'gold' | 'plain';
  unlocked: boolean;
  price: number;
  bonusMultiplier: number;
}

export interface WindState {
  speed: number; // in MPH (0 to 12)
  direction: number; // -1 (blowing left) to 1 (blowing right)
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  type: 'wind' | 'splash' | 'steam' | 'sparkle' | 'confetti' | 'leaf' | 'mint';
}

export interface TrajectoryPoint {
  x: number;
  y: number;
}

export interface GameStats {
  totalThrows: number;
  successfulLanded: number;
  swishes: number;
  rimShots: number;
  totalTeaLeaves: number;
  bestStreak: number;
  highScores: Record<GameMode, number>;
  unlockedTeas: string[];
  unlockedMugs: string[];
  selectedTea: string;
  selectedMug: string;
  selectedTheme: EnvironmentTheme;
  scrunchLevel?: number; // 0 = Standard, 1 = Folded, 2 = Scrunched Ball, 3 = Aerodynamic Sphere
  soundEnabled: boolean;
}

export interface ShotResult {
  type: 'swish' | 'landed' | 'rim' | 'miss';
  scoreGained: number;
  combo: number;
  message: string;
}

export interface Obstacle {
  id: string;
  name: string;
  type: 'cat_paw' | 'toaster' | 'fan' | 'paper_plane' | 'rolling_chair' | 'lantern' | 'bonsai' | 'shoji' | 'hummingbird' | 'hanging_plant' | 'pinwheel';
  x: number;
  y: number;
  radius?: number;
  width?: number;
  height?: number;
  label: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconName: string;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
}
