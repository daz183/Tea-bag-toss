import { TeaType, MugType, Achievement } from '../types';

export const TEA_TYPES: TeaType[] = [
  {
    id: 'earl_grey',
    name: 'Classic Earl Grey',
    flavorText: 'Bold bergamot tea with a traditional paper string tag.',
    bagColor: '#e11d48', // Crimson tag
    teaColor: '#78350f', // Amber tea
    particleColor: '#fbbf24',
    unlocked: true,
    price: 0,
    scoreMultiplier: 1.0,
  },
  {
    id: 'chamomile',
    name: 'Sleepy Chamomile',
    flavorText: 'Calming herbal blend that leaves a soft floral breeze trail.',
    bagColor: '#eab308', // Gold tag
    teaColor: '#fef08a', // Pale yellow tea
    particleColor: '#fef9c3',
    unlocked: false,
    price: 150,
    scoreMultiplier: 1.25,
    specialEffect: 'leaves',
  },
  {
    id: 'matcha_green',
    name: 'Zen Matcha Green',
    flavorText: 'Vibrant green tea bag with extra accuracy and green glow.',
    bagColor: '#16a34a', // Emerald tag
    teaColor: '#15803d', // Dark green tea
    particleColor: '#4ade80',
    unlocked: false,
    price: 300,
    scoreMultiplier: 1.5,
    specialEffect: 'glow',
  },
  {
    id: 'english_breakfast',
    name: 'Royal English Breakfast',
    flavorText: 'Strong black tea with royal golden crest and sparkling trails.',
    bagColor: '#1e3a8a', // Royal blue tag
    teaColor: '#451a03', // Deep copper tea
    particleColor: '#fcd34d',
    unlocked: false,
    price: 500,
    scoreMultiplier: 2.0,
    specialEffect: 'sparkles',
  },
  {
    id: 'mint_breeze',
    name: 'Ice Mint Breeze',
    flavorText: 'Cool peppermint leaves with frosty particles in mid-air.',
    bagColor: '#06b6d4', // Cyan tag
    teaColor: '#a5f3fc', // Cool blue-green tea
    particleColor: '#cffaff',
    unlocked: false,
    price: 800,
    scoreMultiplier: 2.5,
    specialEffect: 'mint',
  },
];

export const MUG_TYPES: MugType[] = [
  {
    id: 'classic_white',
    name: 'Classic White Mug',
    description: 'Standard ceramic mug. Reliable, clean, timeless.',
    widthRatio: 1.0,
    color: '#f8fafc',
    rimColor: '#e2e8f0',
    pattern: 'plain',
    unlocked: true,
    price: 0,
    bonusMultiplier: 1.0,
  },
  {
    id: 'giant_soup_mug',
    name: 'Giant Soup Mug',
    description: 'Generously wide opening. Easier to land swishes!',
    widthRatio: 1.35,
    color: '#0284c7',
    rimColor: '#38bdf8',
    pattern: 'stripes',
    unlocked: false,
    price: 200,
    bonusMultiplier: 1.1,
  },
  {
    id: 'vintage_floral',
    name: 'Grandma’s Floral Teacup',
    description: 'Charming vintage teacup with gold rim trim.',
    widthRatio: 1.1,
    color: '#fce7f3',
    rimColor: '#f59e0b',
    pattern: 'floral',
    unlocked: false,
    price: 450,
    bonusMultiplier: 1.3,
  },
  {
    id: 'cozy_knit',
    name: 'Cozy Sweater Mug',
    description: 'Wrapped in a knitted red sleeve. Keeps tea warm & stylish.',
    widthRatio: 1.0,
    color: '#dc2626',
    rimColor: '#fee2e2',
    pattern: 'dots',
    unlocked: false,
    price: 700,
    bonusMultiplier: 1.6,
  },
  {
    id: 'thermos_flask',
    name: 'Tall Thermos Cup',
    description: 'Narrow rim for expert steepers! Grants double bonus points.',
    widthRatio: 0.75,
    color: '#334155',
    rimColor: '#94a3b8',
    pattern: 'gold',
    unlocked: false,
    price: 1000,
    bonusMultiplier: 2.5,
  },
];

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_steep',
    title: 'First Brew',
    description: 'Land your very first tea bag into a mug.',
    iconName: 'Coffee',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: 'swish_master',
    title: 'Swish Master',
    description: 'Score 10 perfect swishes without touching the mug rim.',
    iconName: 'Sparkles',
    unlocked: false,
    progress: 0,
    maxProgress: 10,
  },
  {
    id: 'wind_whisperer',
    title: 'Wind Whisperer',
    description: 'Score a mug toss against a high crosswind (> 7.0 MPH).',
    iconName: 'Wind',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: 'tea_party',
    title: 'Tea Party Streak',
    description: 'Reach a streak of 5 consecutive landed tosses in Classic Mode.',
    iconName: 'Flame',
    unlocked: false,
    progress: 0,
    maxProgress: 5,
  },
  {
    id: 'tea_collector',
    title: 'Tea Connoisseur',
    description: 'Unlock 3 different tea bag varieties in the shop.',
    iconName: 'PackageCheck',
    unlocked: false,
    progress: 0,
    maxProgress: 3,
  },
];
