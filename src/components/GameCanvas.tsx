import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameMode, EnvironmentTheme, TeaType, MugType, WindState, Particle, TrajectoryPoint, ShotResult } from '../types';
import { sound } from '../utils/audio';

interface GameCanvasProps {
  gameMode: GameMode;
  theme: EnvironmentTheme;
  selectedTea: TeaType;
  selectedMug: MugType;
  wind: WindState;
  level: number;
  scrunchLevel?: number;
  isPlaying: boolean;
  onShotComplete: (result: ShotResult) => void;
  onWindChangeNeeded: () => void;
  streak: number;
}

interface TeaBagPhysics {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  vAngle: number;
  stringLength: number;
  tagX: number;
  tagY: number;
  tagVx: number;
  tagVy: number;
  isFlying: boolean;
  isSettled: boolean;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameMode,
  theme,
  selectedTea,
  selectedMug,
  wind,
  level = 1,
  scrunchLevel = 0,
  isPlaying,
  onShotComplete,
  onWindChangeNeeded,
  streak,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Dragging & Flick state using refs for smooth loop execution without re-renders
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragCurrentRef = useRef<{ x: number; y: number } | null>(null);
  const touchHistoryRef = useRef<{ x: number; y: number; time: number }[]>([]);

  // Game world references
  const teaBagRef = useRef<TeaBagPhysics>({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,
    vAngle: 0,
    stringLength: 32,
    tagX: 0,
    tagY: 0,
    tagVx: 0,
    tagVy: 0,
    isFlying: false,
    isSettled: false,
  });

  // Mug Position
  const mugPosRef = useRef({ x: 0, y: 0, width: 70, height: 90 });
  const mugTargetXRef = useRef(0);

  // Particles
  const particlesRef = useRef<Particle[]>([]);
  const steamParticlesRef = useRef<Particle[]>([]);
  const fanAngleRef = useRef(0);
  const landedTeaBagsCountRef = useRef(0);

  // Floating text feedback
  const floatingTextsRef = useRef<
    { id: number; text: string; color: string; x: number; y: number; alpha: number; scale: number }[]
  >([]);

  // Calculate spawn position (Held in front of player in lower foreground)
  const getSpawnPosition = useCallback((width: number, height: number) => {
    return {
      x: width * 0.5,
      y: height * 0.80,
    };
  }, []);

  // Reset Tea Bag
  const resetTeaBag = useCallback((width: number, height: number) => {
    const spawn = getSpawnPosition(width, height);
    teaBagRef.current = {
      x: spawn.x,
      y: spawn.y,
      vx: 0,
      vy: 0,
      angle: 0,
      vAngle: 0,
      stringLength: 32,
      tagX: spawn.x - 10,
      tagY: spawn.y - 35,
      tagVx: 0,
      tagVy: 0,
      isFlying: false,
      isSettled: false,
    };
  }, [getSpawnPosition]);

  const animTimeRef = useRef<number>(0);

  // Handle Mug Placement directly in front of the viewer on the perspective tabletop
  const setupMugPosition = useCallback((width: number, height: number) => {
    // Mug gets smaller and further away as level increases
    const levelScale = level === 1 ? 1.0 : level === 2 ? 0.85 : level === 3 ? 0.72 : Math.max(0.55, 0.65 - (level - 4) * 0.03);
    const tableYFactor = level === 1 ? 0.62 : level === 2 ? 0.55 : level === 3 ? 0.49 : Math.max(0.42, 0.45 - (level - 4) * 0.02);

    const mugWidth = 76 * selectedMug.widthRatio * levelScale;
    const mugHeight = 92 * levelScale;
    let targetX = width * 0.5;

    if (gameMode === 'precision') {
      // Vary mug position randomly directly in front of us
      targetX = width * (0.38 + Math.random() * 0.24);
    }

    mugTargetXRef.current = targetX;
    mugPosRef.current = {
      x: targetX,
      y: height * tableYFactor,
      width: mugWidth,
      height: mugHeight,
    };
  }, [selectedMug.widthRatio, gameMode, level]);

  // Main Render & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const handleResize = () => {
      if (!containerRef.current || !canvas) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      // Re-setup game objects on resize
      setupMugPosition(rect.width, rect.height);
      if (!teaBagRef.current.isFlying && !teaBagRef.current.isSettled) {
        resetTeaBag(rect.width, rect.height);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Initial setup
    const rect = containerRef.current?.getBoundingClientRect() || { width: 800, height: 600 };
    setupMugPosition(rect.width, rect.height);
    if (!teaBagRef.current.isFlying && !teaBagRef.current.isSettled) {
      resetTeaBag(rect.width, rect.height);
    }

    // Render loop
    const render = () => {
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      // 1. UPDATE PHYSICS
      animTimeRef.current += 0.016;
      fanAngleRef.current += (wind.speed + 1) * 0.15;

      const obstacles = getObstaclesForLevelAndTheme(level, theme, width, height, animTimeRef.current);

      // Animate Mug X towards target in precision mode
      if (Math.abs(mugPosRef.current.x - mugTargetXRef.current) > 1) {
        mugPosRef.current.x += (mugTargetXRef.current - mugPosRef.current.x) * 0.05;
      }

      // Wind stream particles
      if (Math.random() < Math.abs(wind.speed) * 0.3 + 0.1) {
        const startX = wind.direction > 0 ? 0 : width;
        particlesRef.current.push({
          x: startX,
          y: Math.random() * height * 0.7,
          vx: wind.speed * wind.direction * 0.9 + (Math.random() * 0.5 - 0.25),
          vy: (Math.random() - 0.5) * 0.4,
          size: Math.random() * 2 + 1,
          color: 'rgba(255, 255, 255, 0.4)',
          alpha: 0.6,
          life: 0,
          maxLife: 90 + Math.random() * 60,
          type: 'wind',
        });
      }

      // Steam rising from mug
      if (Math.random() < 0.2) {
        const mug = mugPosRef.current;
        steamParticlesRef.current.push({
          x: mug.x + (Math.random() - 0.5) * (mug.width * 0.6),
          y: mug.y - mug.height * 0.4,
          vx: (Math.random() - 0.5) * 0.3 + wind.speed * wind.direction * 0.05,
          vy: -0.6 - Math.random() * 0.4,
          size: Math.random() * 4 + 3,
          color: selectedTea.particleColor || '#ffffff',
          alpha: 0.4,
          life: 0,
          maxLife: 60 + Math.random() * 30,
          type: 'steam',
        });
      }

      // Update Particles
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        p.alpha = 0.6 * (1 - p.life / p.maxLife);
      });
      particlesRef.current = particlesRef.current.filter((p) => p.life < p.maxLife);

      steamParticlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.size += 0.08;
        p.life++;
        p.alpha = 0.35 * (1 - p.life / p.maxLife);
      });
      steamParticlesRef.current = steamParticlesRef.current.filter((p) => p.life < p.maxLife);

      // Flying Tea Bag Physics
      const bag = teaBagRef.current;
      if (bag.isFlying && !bag.isSettled) {
        // Gravity & Wind physics modified by Tea Bag Weight and Scrunch Aerodynamics (0% to 100% Slider)
        const gravity = selectedTea.gravity ?? 0.38;
        const baseWindSens = selectedTea.windSensitivity ?? 1.0;
        const scrunchRatio = Math.min(1, Math.max(0, scrunchLevel / 100));
        // Higher scrunch = up to 75% reduced wind sensitivity for laser accuracy
        const windSensitivity = baseWindSens * (1.0 - scrunchRatio * 0.75);

        bag.vy += gravity;

        // Wind force with reduced drift for scrunched bag
        bag.vx += wind.speed * wind.direction * 0.035 * windSensitivity;

        // Air drag - higher aerodynamic efficiency when scrunched into a ball
        const airDrag = 0.992 + (scrunchRatio * 0.005);
        bag.vx *= airDrag;
        bag.vy *= airDrag;

        // Update bag position in flight
        bag.x += bag.vx;
        bag.y += bag.vy;

        // Stable rotation for scrunched ball
        bag.angle += bag.vAngle * (1.0 - scrunchRatio * 0.5);

        // String and Tag follow physics
        const dx = bag.tagX - bag.x;
        const dy = bag.tagY - bag.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        bag.tagVy += 0.4; // gravity on tag
        bag.tagVx += wind.speed * wind.direction * 0.04;
        bag.tagX += bag.tagVx;
        bag.tagY += bag.tagVy;

        // SPAWN FLIGHT TRAIL PARTICLES
        const effect = selectedTea.specialEffect;
        const trailColors =
          effect === 'leaves'
            ? ['#fef08a', '#fde047', '#fef9c3', '#fef3c7']
            : effect === 'glow'
            ? ['#4ade80', '#86efac', '#22c55e', '#a7f3d0']
            : effect === 'sparkles'
            ? ['#fcd34d', '#fbbf24', '#ffffff', '#fef08a']
            : effect === 'mint'
            ? ['#a5f3fc', '#67e8f9', '#ffffff', '#cffaff']
            : ['#f59e0b', '#fbbf24', '#ffffff', '#d97706'];

        const particleType: 'leaf' | 'mint' | 'sparkle' =
          effect === 'leaves'
            ? 'leaf'
            : effect === 'mint'
            ? 'mint'
            : 'sparkle';

        // Emit 2 trail particles per frame along flight vector
        for (let i = 0; i < 2; i++) {
          const spawnOnTag = Math.random() < 0.35;
          const px = (spawnOnTag ? bag.tagX : bag.x) + (Math.random() - 0.5) * 10;
          const py = (spawnOnTag ? bag.tagY : bag.y) + (Math.random() - 0.5) * 10;

          particlesRef.current.push({
            x: px,
            y: py,
            vx: -bag.vx * 0.15 + (Math.random() - 0.5) * 1.0,
            vy: -bag.vy * 0.15 + (Math.random() - 0.5) * 1.0 + (effect === 'leaves' ? 0.2 : 0),
            size: Math.random() * 3.5 + 2.5,
            color: trailColors[Math.floor(Math.random() * trailColors.length)],
            alpha: 0.9,
            life: 0,
            maxLife: 22 + Math.floor(Math.random() * 18),
            type: particleType,
          });
        }

        // CONSTRAIN TAG TO STRING LENGTH
        if (dist > bag.stringLength) {
          const factor = bag.stringLength / dist;
          bag.tagX = bag.x + dx * factor;
          bag.tagY = bag.y + dy * factor;
          bag.tagVx *= 0.8;
          bag.tagVy *= 0.8;
        }

        // COLLISION CHECKING WITH LEVEL OBSTACLES
        for (const obs of obstacles) {
          const odx = bag.x - obs.x;
          const ody = bag.y - obs.y;
          const odist = Math.hypot(odx, ody);

          if (odist < obs.radius + 18) {
            const nx = odx / (odist || 1);
            const ny = ody / (odist || 1);
            const dot = bag.vx * nx + bag.vy * ny;

            if (dot < 0) {
              bag.vx = (bag.vx - 2 * dot * nx) * 0.75;
              bag.vy = (bag.vy - 2 * dot * ny) * 0.75;
              bag.vAngle += (Math.random() - 0.5) * 0.8;

              sound.playRimClink();

              // Sparkle particles burst
              for (let i = 0; i < 12; i++) {
                const pAngle = Math.random() * Math.PI * 2;
                const pSpeed = 2 + Math.random() * 4;
                particlesRef.current.push({
                  x: bag.x,
                  y: bag.y,
                  vx: Math.cos(pAngle) * pSpeed,
                  vy: Math.sin(pAngle) * pSpeed,
                  size: Math.random() * 3 + 2,
                  color: selectedTea.particleColor || '#f59e0b',
                  alpha: 1,
                  life: 0,
                  maxLife: 20,
                  type: 'sparkle',
                });
              }

              floatingTextsRef.current.push({
                id: Date.now() + Math.random(),
                text: obs.label,
                color: '#f59e0b',
                x: obs.x,
                y: obs.y - 25,
                alpha: 1,
                scale: 1.1,
              });
            }
          }
        }

        // COLLISION CHECKING WITH MUG
        const mug = mugPosRef.current;
        const mugTopY = mug.y - mug.height * 0.42;
        const rimLeft = mug.x - mug.width * 0.48;
        const rimRight = mug.x + mug.width * 0.48;
        const tableY = Math.max(height * 0.84, mug.y + mug.height * 0.65);

        // 1. Check if entering mug mouth (only when descending)
        if (bag.y >= mugTopY && bag.y <= mugTopY + 32 && bag.vy >= 0) {
          const distFromCenter = Math.abs(bag.x - mug.x);
          const maxLandingDist = mug.width * 0.46;

          if (distFromCenter <= maxLandingDist) {
            // SUCCESSFUL LANDING!
            bag.isSettled = true;
            bag.vx = 0;
            bag.vy = 0;
            bag.x = mug.x + (bag.x - mug.x) * 0.2;
            bag.y = mugTopY + 18;

            landedTeaBagsCountRef.current++;

            const isSwish = distFromCenter < mug.width * 0.25;
            sound.playSplash(isSwish);

            // Create splash particles
            for (let i = 0; i < 16; i++) {
              particlesRef.current.push({
                x: bag.x,
                y: mugTopY + 5,
                vx: (Math.random() - 0.5) * 5,
                vy: -Math.random() * 6 - 2,
                size: Math.random() * 3 + 2,
                color: selectedTea.teaColor,
                alpha: 0.9,
                life: 0,
                maxLife: 25 + Math.random() * 15,
                type: 'splash',
              });
            }

            // Score logic
            const baseScore = isSwish ? 100 : 50;
            const streakBonus = streak * 20;
            const totalGained = Math.round((baseScore + streakBonus) * selectedTea.scoreMultiplier * selectedMug.bonusMultiplier);

            const msg = isSwish ? 'PERFECT SWISH!' : 'DUNKED IN CUP!';
            const resultType = isSwish ? 'swish' : 'landed';

            // Add floating text
            floatingTextsRef.current.push({
              id: Date.now(),
              text: `${msg} +${totalGained}`,
              color: isSwish ? '#f59e0b' : '#10b981',
              x: mug.x,
              y: mugTopY - 30,
              alpha: 1,
              scale: 1.2,
            });

            onShotComplete({
              type: resultType,
              scoreGained: totalGained,
              combo: streak + 1,
              message: msg,
            });

            // Schedule next round reset
            setTimeout(() => {
              setupMugPosition(width, height);
              resetTeaBag(width, height);
              onWindChangeNeeded();
            }, 1200);
          }
        }

        // 2. Rim Shot bounce (only when descending onto rim)
        const isNearRimY = Math.abs(bag.y - mugTopY) < 16;
        const hitsLeftRim = Math.abs(bag.x - rimLeft) < 14 && isNearRimY;
        const hitsRightRim = Math.abs(bag.x - rimRight) < 14 && isNearRimY;

        if ((hitsLeftRim || hitsRightRim) && !bag.isSettled && bag.vy >= 0) {
          sound.playRimClink();
          if (hitsLeftRim) {
            bag.vx = -Math.abs(bag.vx || 3) * 0.7 - 1.2;
          } else {
            bag.vx = Math.abs(bag.vx || 3) * 0.7 + 1.2;
          }
          bag.vy = -Math.abs(bag.vy) * 0.5 - 2.2;
          bag.y = mugTopY - 18; // Bounce clear off the rim!
          bag.vAngle = (Math.random() - 0.5) * 0.5;

          floatingTextsRef.current.push({
            id: Date.now(),
            text: 'RIM SHOT!',
            color: '#ef4444',
            x: bag.x,
            y: bag.y - 20,
            alpha: 1,
            scale: 1,
          });
        }

        // 3. Table / Missed ground bounce
        if ((bag.vy > 0 && bag.y >= tableY) || bag.x < -50 || bag.x > width + 50 || bag.y > height + 60) {
          bag.isSettled = true;
          bag.y = Math.min(bag.y, tableY);
          sound.playTableThud();

          onShotComplete({
            type: 'miss',
            scoreGained: 0,
            combo: 0,
            message: 'MISSED!',
          });

          floatingTextsRef.current.push({
            id: Date.now(),
            text: 'MISSED!',
            color: '#6b7280',
            x: Math.min(Math.max(bag.x, 60), width - 60),
            y: tableY - 30,
            alpha: 1,
            scale: 1,
          });

          setTimeout(() => {
            setupMugPosition(width, height);
            resetTeaBag(width, height);
            onWindChangeNeeded();
          }, 1100);
        }
      }

      // Update floating score texts
      floatingTextsRef.current.forEach((ft) => {
        ft.y -= 0.8;
        ft.alpha -= 0.018;
      });
      floatingTextsRef.current = floatingTextsRef.current.filter((ft) => ft.alpha > 0);

      // 2. CLEAR CANVAS & DRAW BACKGROUND
      ctx.clearRect(0, 0, width, height);

      // Render Environment Background
      drawEnvironmentBackground(ctx, width, height, theme, animTimeRef.current);

      // Draw Wind FX & Fan
      drawFanAndWind(ctx, width, height, wind, fanAngleRef.current);

      // Draw Table Surface with Level Perspective
      drawTable(ctx, width, height, theme, level);

      // Draw Mug (rendered behind obstacles)
      drawMug(ctx, mugPosRef.current, selectedMug, selectedTea, landedTeaBagsCountRef.current);

      // Draw Environment Obstacles (rendered in front of mug)
      drawObstacles(ctx, obstacles);

      // Draw Steam
      steamParticlesRef.current.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Wind/Splash/Trail particles
      particlesRef.current.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;

        if (p.type === 'leaf') {
          // Delicate fluttering tea leaf / petal
          ctx.translate(p.x, p.y);
          ctx.rotate(p.life * 0.12);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 2.2, 0.4, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'mint') {
          // Ice mint diamond crystal
          ctx.translate(p.x, p.y);
          ctx.rotate(p.life * 0.1);
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 1.5);
          ctx.lineTo(p.size * 1.1, 0);
          ctx.lineTo(0, p.size * 1.5);
          ctx.lineTo(-p.size * 1.1, 0);
          ctx.closePath();
          ctx.fill();
        } else if (p.type === 'sparkle') {
          // Glowing starburst / sparkling dust
          ctx.translate(p.x, p.y);
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.45, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Standard circle particle
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // Draw Aim Flick Vector Guide if flicking / dragging
      if (isDraggingRef.current && dragStartRef.current && dragCurrentRef.current) {
        drawFlickVectorGuide(ctx, dragStartRef.current, dragCurrentRef.current, wind, teaBagRef.current, touchHistoryRef.current, selectedTea, scrunchLevel);
      }

      // Draw Flick Hint text badge when ready to throw
      if (!teaBagRef.current.isFlying && isPlaying && !isDraggingRef.current) {
        drawFlickHint(ctx, teaBagRef.current.x, teaBagRef.current.y);
      }

      // Draw Tea Bag
      drawTeaBag(ctx, teaBagRef.current, selectedTea, scrunchLevel);

      // Draw Floating Feedback Texts
      floatingTextsRef.current.forEach((ft) => {
        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.font = `bold ${Math.round(20 * ft.scale)}px sans-serif`;
        ctx.fillStyle = ft.color;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 6;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [
    theme,
    selectedTea,
    selectedMug,
    wind,
    gameMode,
    streak,
    scrunchLevel,
    isPlaying,
    onShotComplete,
    onWindChangeNeeded,
    resetTeaBag,
    setupMugPosition,
  ]);

  // Handle Drag / Flick Start
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPlaying || teaBagRef.current.isFlying || teaBagRef.current.isSettled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (e.pointerId !== undefined) {
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (err) {}
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const bag = teaBagRef.current;
    const width = rect.width;
    const height = rect.height;
    const spawn = getSpawnPosition(width, height);

    // Allow flicking anywhere near lower screen launch area or near bag
    if (y > height * 0.35 || Math.hypot(x - bag.x, y - bag.y) < 220) {
      isDraggingRef.current = true;
      dragStartRef.current = { x, y };
      dragCurrentRef.current = { x, y };
      const now = performance.now();
      touchHistoryRef.current = [{ x, y, time: now }];

      bag.x = spawn.x;
      bag.y = spawn.y;
      bag.vx = 0;
      bag.vy = 0;
      bag.tagX = spawn.x - 10;
      bag.tagY = spawn.y - 35;
    }
  };

  // Handle Drag / Flick Movement
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    dragCurrentRef.current = { x, y };

    const bag = teaBagRef.current;
    const width = rect.width;
    const height = rect.height;
    const spawn = getSpawnPosition(width, height);

    if (dragStartRef.current) {
      const dragDx = x - dragStartRef.current.x;
      const dragDy = y - dragStartRef.current.y;

      // Tether bag smoothly around launch pad during drag gesture
      if (dragDy > 0) {
        // Pulling down (slingshot aim)
        bag.x = spawn.x + Math.max(-70, Math.min(70, dragDx * 0.35));
        bag.y = spawn.y + Math.min(45, dragDy * 0.35);
      } else {
        // Swiping up (flick aim)
        bag.x = spawn.x + Math.max(-70, Math.min(70, dragDx * 0.25));
        bag.y = spawn.y + Math.max(-25, dragDy * 0.15);
      }

      bag.tagX = bag.x - 10;
      bag.tagY = bag.y - 32;
    }

    const now = performance.now();
    const history = touchHistoryRef.current;
    history.push({ x, y, time: now });

    // Prune history older than 120ms
    while (history.length > 0 && now - history[0].time > 120) {
      history.shift();
    }
  };

  // Handle Flick Launch (Release)
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;

    const canvas = canvasRef.current;
    if (canvas && e.pointerId !== undefined) {
      try {
        if (canvas.hasPointerCapture(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId);
        }
      } catch (err) {}
    }

    isDraggingRef.current = false;

    const rect = canvas ? canvas.getBoundingClientRect() : { width: 600, height: 400 };
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const history = touchHistoryRef.current;
    const now = performance.now();
    history.push({ x, y, time: now });

    const bag = teaBagRef.current;
    const width = canvas ? canvas.width / (window.devicePixelRatio || 1) : rect.width;
    const height = canvas ? canvas.height / (window.devicePixelRatio || 1) : rect.height;
    const spawn = getSpawnPosition(width, height);

    const dragStart = dragStartRef.current;
    const dragCurrent = dragCurrentRef.current;

    dragStartRef.current = null;
    dragCurrentRef.current = null;
    touchHistoryRef.current = [];

    // Calculate unified flick velocity from drag displacement & touch history
    const { vx: rawVx, vy: rawVy, speed: flickSpeed } = computeFlickVector(dragStart, dragCurrent, history, now);

    let vx = rawVx;
    let vy = rawVy;

    const scrunchRatio = Math.min(1, Math.max(0, scrunchLevel / 100));
    const maxSpeed = 34 + scrunchRatio * 8;

    if (vy < -0.8 && flickSpeed > 1.2) {
      if (flickSpeed > maxSpeed) {
        vx = (vx / flickSpeed) * maxSpeed;
        vy = (vy / flickSpeed) * maxSpeed;
      }

      // Launch cleanly from spawn launchpad through the air!
      bag.x = spawn.x;
      bag.y = spawn.y;
      bag.vx = vx;
      bag.vy = vy;
      bag.vAngle = (Math.random() - 0.5) * 0.3 + vx * 0.025;
      bag.isFlying = true;

      sound.playFlick(Math.min(flickSpeed / 18, 1.0));
    } else {
      // Weak release -> reset to launchpad
      bag.x = spawn.x;
      bag.y = spawn.y;
      bag.vx = 0;
      bag.vy = 0;
      bag.tagX = spawn.x - 10;
      bag.tagY = spawn.y - 35;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[460px] overflow-hidden select-none cursor-grab active:cursor-grabbing">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="w-full h-full block touch-none"
      />
    </div>
  );
};

// --- DRAWING HELPER FUNCTIONS ---

function drawEnvironmentBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: EnvironmentTheme,
  time: number = 0
) {
  ctx.save();

  if (theme === 'kitchen') {
    // 1. KITCHEN THEME
    // Base warm background gradient
    const wallGrad = ctx.createLinearGradient(0, 0, 0, height);
    wallGrad.addColorStop(0, '#fef3c7'); // Honey cream wall
    wallGrad.addColorStop(0.5, '#fde68a');
    wallGrad.addColorStop(1, '#f59e0b');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, width, height);

    // Subway Tile Backsplash on Wall
    const tileW = 36;
    const tileH = 18;
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.22)';
    ctx.lineWidth = 1;
    for (let y = 0; y < height * 0.55; y += tileH) {
      const offsetX = (Math.floor(y / tileH) % 2) * (tileW / 2);
      for (let x = -tileW; x < width + tileW; x += tileW) {
        ctx.strokeRect(x + offsetX, y, tileW, tileH);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.fillRect(x + offsetX + 1, y + 1, tileW - 2, 2);
      }
    }

    // Cozy Kitchen Window (Center-top)
    const winX = width * 0.22;
    const winY = 20;
    const winW = width * 0.56;
    const winH = height * 0.38;

    // Outdoor View Inside Window Frame
    ctx.save();
    ctx.beginPath();
    ctx.rect(winX, winY, winW, winH);
    ctx.clip();

    // Sky
    const skyGrad = ctx.createLinearGradient(0, winY, 0, winY + winH);
    skyGrad.addColorStop(0, '#38bdf8');
    skyGrad.addColorStop(1, '#bae6fd');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(winX, winY, winW, winH);

    // Sun & Rays
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(winX + winW * 0.8, winY + winH * 0.25, 24, 0, Math.PI * 2);
    ctx.fill();

    // Drifting Outdoor Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    const cloud1X = winX + ((time * 12) % (winW + 100)) - 50;
    ctx.beginPath();
    ctx.arc(cloud1X, winY + 30, 16, 0, Math.PI * 2);
    ctx.arc(cloud1X + 18, winY + 24, 20, 0, Math.PI * 2);
    ctx.arc(cloud1X + 36, winY + 30, 14, 0, Math.PI * 2);
    ctx.fill();

    // Rolling Green Hills
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.ellipse(winX + winW * 0.3, winY + winH + 10, winW * 0.45, winH * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.ellipse(winX + winW * 0.75, winY + winH + 10, winW * 0.5, winH * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // end clip

    // Wooden Window Frame
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 8;
    ctx.strokeRect(winX, winY, winW, winH);

    // Window Mullions (Crossbars)
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(winX + winW * 0.5, winY);
    ctx.lineTo(winX + winW * 0.5, winY + winH);
    ctx.moveTo(winX, winY + winH * 0.5);
    ctx.lineTo(winX + winW, winY + winH * 0.5);
    ctx.stroke();

    // Window Sill
    ctx.fillStyle = '#92400e';
    ctx.fillRect(winX - 12, winY + winH - 2, winW + 24, 10);

    // Red Gingham Curtains on Sides
    ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
    ctx.beginPath();
    ctx.ellipse(winX + 10, winY + winH * 0.5, 18, winH * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(winX + winW - 10, winY + winH * 0.5, 18, winH * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Floating Wooden Wall Shelf (Right Side)
    const shelfX = width * 0.78;
    const shelfY = height * 0.28;
    ctx.fillStyle = '#78350f';
    ctx.fillRect(shelfX, shelfY, width * 0.2, 8);
    // Shelf Spice Jars
    ctx.fillStyle = '#eab308';
    ctx.fillRect(shelfX + 8, shelfY - 20, 14, 20);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(shelfX + 26, shelfY - 16, 12, 16);

    // Wall Clock (Left Side)
    const clockX = width * 0.12;
    const clockY = height * 0.22;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(clockX, clockY, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Clock tick hand
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(clockX, clockY);
    ctx.lineTo(clockX + Math.cos(time * 2) * 14, clockY + Math.sin(time * 2) * 14);
    ctx.stroke();

  } else if (theme === 'office') {
    // 2. OFFICE THEME
    // Executive Slate Wall Gradient
    const wallGrad = ctx.createLinearGradient(0, 0, 0, height);
    wallGrad.addColorStop(0, '#334155');
    wallGrad.addColorStop(0.6, '#1e293b');
    wallGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, width, height);

    // Floor-to-Ceiling Panoramic Glass Window
    const winX = width * 0.15;
    const winY = 10;
    const winW = width * 0.70;
    const winH = height * 0.52;

    ctx.save();
    ctx.beginPath();
    ctx.rect(winX, winY, winW, winH);
    ctx.clip();

    // City Sky
    const skyGrad = ctx.createLinearGradient(0, winY, 0, winY + winH);
    skyGrad.addColorStop(0, '#0284c7');
    skyGrad.addColorStop(0.6, '#38bdf8');
    skyGrad.addColorStop(1, '#fdba74');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(winX, winY, winW, winH);

    // Distant City Skyline Silhouettes
    ctx.fillStyle = '#1e293b';
    const bldgWidths = [30, 45, 25, 50, 35, 60, 40, 30];
    let bx = winX;
    for (let i = 0; i < bldgWidths.length; i++) {
      const bw = bldgWidths[i];
      const bh = 50 + (i % 3) * 35;
      ctx.fillRect(bx, winY + winH - bh, bw, bh);

      // Building windows glowing
      ctx.fillStyle = '#fef08a';
      for (let wy = winY + winH - bh + 6; wy < winY + winH - 6; wy += 10) {
        for (let wx = bx + 4; wx < bx + bw - 4; wx += 8) {
          if ((wx + wy) % 3 !== 0) {
            ctx.fillRect(wx, wy, 4, 5);
          }
        }
      }
      ctx.fillStyle = '#1e293b';
      bx += bw + 4;
    }

    ctx.restore(); // end clip

    // Modern Dark Aluminum Window Frame
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 6;
    ctx.strokeRect(winX, winY, winW, winH);

    // Venetian Blinds at Top
    ctx.fillStyle = 'rgba(226, 232, 240, 0.4)';
    for (let bY = winY; bY < winY + winH * 0.45; bY += 8) {
      ctx.fillRect(winX, bY, winW, 3);
    }

    // Framed Certificate on Left Wall
    const certX = width * 0.03;
    const certY = height * 0.18;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.fillRect(certX, certY, 42, 54);
    ctx.strokeRect(certX, certY, 42, 54);
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(certX + 21, certY + 38, 6, 0, Math.PI * 2);
    ctx.fill();

    // Whiteboard / Memo Pin Board on Right Wall
    const boardX = width * 0.88;
    const boardY = height * 0.18;
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.fillRect(boardX, boardY, 60, 70);
    ctx.strokeRect(boardX, boardY, 60, 70);
    // Sticky Notes
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(boardX + 6, boardY + 10, 18, 18);
    ctx.fillStyle = '#a7f3d0';
    ctx.fillRect(boardX + 30, boardY + 16, 20, 20);

  } else if (theme === 'teahouse') {
    // 3. TEAHOUSE THEME
    // Warm Tatami / Cedar Wood Background
    const wallGrad = ctx.createLinearGradient(0, 0, 0, height);
    wallGrad.addColorStop(0, '#064e3b');
    wallGrad.addColorStop(0.7, '#047857');
    wallGrad.addColorStop(1, '#022c22');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, width, height);

    // Shoji Paper Lattice Screen Grid on Walls
    ctx.strokeStyle = 'rgba(6, 78, 59, 0.4)';
    ctx.lineWidth = 2;
    for (let x = 0; x < width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height * 0.55);
      ctx.stroke();
    }
    for (let y = 0; y < height * 0.55; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Circular "Enso" Satori Window in Center Background
    const circleX = width * 0.5;
    const circleY = height * 0.28;
    const circleR = Math.min(width * 0.24, height * 0.24);

    ctx.save();
    ctx.beginPath();
    ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
    ctx.clip();

    // View through Zen Window: Mist & Bamboo Forest
    const gardenGrad = ctx.createLinearGradient(0, circleY - circleR, 0, circleY + circleR);
    gardenGrad.addColorStop(0, '#d1fae5');
    gardenGrad.addColorStop(1, '#a7f3d0');
    ctx.fillStyle = gardenGrad;
    ctx.fillRect(circleX - circleR, circleY - circleR, circleR * 2, circleR * 2);

    // Bamboo Stalks
    ctx.fillStyle = '#059669';
    for (let bx = circleX - circleR + 20; bx < circleX + circleR; bx += 32) {
      ctx.fillRect(bx, circleY - circleR, 10, circleR * 2);
      ctx.fillStyle = '#047857';
      ctx.fillRect(bx - 2, circleY - 20, 14, 3);
      ctx.fillRect(bx - 2, circleY + 20, 14, 3);
      ctx.fillStyle = '#059669';
    }

    // Floating Falling Cherry Blossom Petals
    ctx.fillStyle = '#f472b6';
    for (let p = 0; p < 8; p++) {
      const px = circleX - circleR + ((time * 20 + p * 40) % (circleR * 2));
      const py = circleY - circleR + ((time * 15 + p * 30) % (circleR * 2));
      ctx.beginPath();
      ctx.ellipse(px, py, 4, 2, Math.sin(time + p), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore(); // end clip

    // Circular Dark Lacquered Wood Window Border
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
    ctx.stroke();

    // Cross Lattice in Zen Window
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(circleX - circleR, circleY);
    ctx.lineTo(circleX + circleR, circleY);
    ctx.moveTo(circleX, circleY - circleR);
    ctx.lineTo(circleX, circleY + circleR);
    ctx.stroke();

    // Hanging Calligraphy Scroll on Left
    const scrollX = width * 0.1;
    const scrollY = 20;
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(scrollX, scrollY, 36, 110);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3;
    ctx.strokeRect(scrollX, scrollY, 36, 110);
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.arc(scrollX + 18, scrollY + 40, 8, 0, Math.PI * 2);
    ctx.fill();

    // Swaying Red Paper Lantern on Right
    const lanX = width * 0.88 + Math.sin(time * 1.5) * 6;
    const lanY = 20;
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lanX, 0);
    ctx.lineTo(lanX, lanY);
    ctx.stroke();

    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.ellipse(lanX, lanY + 25, 18, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(lanX, lanY + 25, 6, 0, Math.PI * 2);
    ctx.fill();

  } else if (theme === 'porch') {
    // 4. PORCH THEME
    // Scenic Golden Sunset Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#0284c7');
    skyGrad.addColorStop(0.35, '#38bdf8');
    skyGrad.addColorStop(0.65, '#f97316');
    skyGrad.addColorStop(1, '#fef08a');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Glowing Setting Sun
    const sunX = width * 0.72;
    const sunY = height * 0.38;
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, 40);
    sunGrad.addColorStop(0, '#ffffff');
    sunGrad.addColorStop(0.3, '#fef08a');
    sunGrad.addColorStop(1, 'rgba(251, 146, 60, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 40, 0, Math.PI * 2);
    ctx.fill();

    // Distant Mountain Ranges
    ctx.fillStyle = '#3b0764';
    ctx.beginPath();
    ctx.moveTo(0, height * 0.48);
    ctx.lineTo(width * 0.25, height * 0.35);
    ctx.lineTo(width * 0.5, height * 0.48);
    ctx.lineTo(width * 0.75, height * 0.32);
    ctx.lineTo(width, height * 0.46);
    ctx.lineTo(width, height * 0.55);
    ctx.lineTo(0, height * 0.55);
    ctx.closePath();
    ctx.fill();

    // Closer Forest Silhouettes
    ctx.fillStyle = '#1e1b4b';
    for (let x = 0; x < width; x += 18) {
      const treeH = 20 + Math.sin(x * 0.05) * 12;
      ctx.beginPath();
      ctx.moveTo(x, height * 0.52);
      ctx.lineTo(x + 9, height * 0.52 - treeH);
      ctx.lineTo(x + 18, height * 0.52);
      ctx.closePath();
      ctx.fill();
    }

    // Porch Overhead Beam & Hanging String Lights
    ctx.fillStyle = '#78350f';
    ctx.fillRect(0, 0, width, 16);

    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.quadraticCurveTo(width * 0.5, 38, width, 10);
    ctx.stroke();

    // Glowing Fairy Light Bulbs
    for (let i = 1; i < 9; i++) {
      const lx = (width / 9) * i;
      const ly = 10 + Math.sin((i / 9) * Math.PI) * 28;

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(lx, ly, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(254, 240, 138, 0.25)';
      ctx.beginPath();
      ctx.arc(lx, ly, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hanging Macramé Planter with Cascading Ivy Vines
    const plantX = width * 0.12;
    const potY = 55;

    // 1. Wrought Iron Mount Hook at Ceiling
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(plantX - 12, 0);
    ctx.lineTo(plantX, 12);
    ctx.lineTo(plantX + 12, 0);
    ctx.stroke();

    // Metallic ring
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(plantX, 14, 4, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Macramé Cords
    ctx.strokeStyle = '#e7e5e4';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(plantX, 18);
    ctx.lineTo(plantX - 16, potY);
    ctx.moveTo(plantX, 18);
    ctx.lineTo(plantX, potY + 4);
    ctx.moveTo(plantX, 18);
    ctx.lineTo(plantX + 16, potY);
    ctx.stroke();

    // 3. Ceramic Planter Bowl
    ctx.fillStyle = '#f5f5f4';
    ctx.strokeStyle = '#d6d3d1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(plantX - 18, potY);
    ctx.lineTo(plantX + 18, potY);
    ctx.quadraticCurveTo(plantX + 15, potY + 24, plantX, potY + 24);
    ctx.quadraticCurveTo(plantX - 15, potY + 24, plantX - 18, potY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Pot Rim
    ctx.fillStyle = '#e7e5e4';
    ctx.fillRect(plantX - 19, potY - 2, 38, 4);

    // Macramé Tassel Hanging Below Pot
    ctx.strokeStyle = '#e7e5e4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(plantX, potY + 24);
    ctx.lineTo(plantX, potY + 38);
    ctx.stroke();
    ctx.fillStyle = '#f5f5f4';
    ctx.beginPath();
    ctx.arc(plantX, potY + 38, 3, 0, Math.PI * 2);
    ctx.fill();

    // 4. Lush Foliage Inside Pot
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(plantX - 8, potY - 4, 12, 0, Math.PI * 2);
    ctx.arc(plantX + 8, potY - 4, 12, 0, Math.PI * 2);
    ctx.arc(plantX, potY - 8, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(plantX - 10, potY - 2, 9, 0, Math.PI * 2);
    ctx.arc(plantX + 10, potY - 2, 9, 0, Math.PI * 2);
    ctx.arc(plantX, potY - 4, 10, 0, Math.PI * 2);
    ctx.fill();

    // 5. Cascading Trailing Ivy Vines & Heart-shaped Leaves
    const vinePaths = [
      { startX: plantX - 14, cpX: plantX - 26, endX: plantX - 18, endY: potY + 50 },
      { startX: plantX - 4, cpX: plantX - 10, endX: plantX - 6, endY: potY + 68 },
      { startX: plantX + 6, cpX: plantX + 12, endX: plantX + 8, endY: potY + 58 },
      { startX: plantX + 14, cpX: plantX + 24, endX: plantX + 18, endY: potY + 44 },
    ];

    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';

    vinePaths.forEach((v) => {
      ctx.beginPath();
      ctx.moveTo(v.startX, potY + 6);
      ctx.quadraticCurveTo(v.cpX, potY + 28, v.endX, v.endY);
      ctx.stroke();
    });

    // Leaves along the vines
    const leafPositions = [
      { x: plantX - 16, y: potY + 16, size: 5, rot: -0.4, color: '#4ade80' },
      { x: plantX - 22, y: potY + 30, size: 4.5, rot: -0.8, color: '#22c55e' },
      { x: plantX - 18, y: potY + 46, size: 3.5, rot: -0.5, color: '#86efac' },

      { x: plantX - 6, y: potY + 22, size: 5.5, rot: 0.3, color: '#22c55e' },
      { x: plantX - 10, y: potY + 40, size: 5, rot: -0.3, color: '#4ade80' },
      { x: plantX - 6, y: potY + 62, size: 3.5, rot: 0.1, color: '#86efac' },

      { x: plantX + 8, y: potY + 20, size: 5, rot: 0.4, color: '#4ade80' },
      { x: plantX + 12, y: potY + 38, size: 4.5, rot: 0.7, color: '#22c55e' },
      { x: plantX + 8, y: potY + 54, size: 3.5, rot: 0.3, color: '#86efac' },

      { x: plantX + 18, y: potY + 18, size: 4.5, rot: 0.6, color: '#22c55e' },
      { x: plantX + 22, y: potY + 32, size: 4, rot: 0.9, color: '#4ade80' },
    ];

    leafPositions.forEach((leaf) => {
      ctx.save();
      ctx.translate(leaf.x, leaf.y);
      ctx.rotate(leaf.rot);
      ctx.fillStyle = leaf.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, leaf.size, leaf.size * 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Little Fuchsia Blossoms
    const blossoms = [
      { x: plantX - 12, y: potY + 12 },
      { x: plantX + 4, y: potY + 16 },
      { x: plantX - 8, y: potY + 32 },
      { x: plantX + 10, y: potY + 28 },
    ];

    blossoms.forEach((b) => {
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 1, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  ctx.restore();
}

function drawTable(ctx: CanvasRenderingContext2D, width: number, height: number, theme: EnvironmentTheme, level: number = 1) {
  const horizonY = height * (level === 1 ? 0.54 : level === 2 ? 0.50 : level === 3 ? 0.46 : 0.42);

  let topColor = '#b45309';
  let sideColor = '#78350f';
  let plankColor = 'rgba(255,255,255,0.08)';

  if (theme === 'office') {
    topColor = '#475569';
    sideColor = '#1e293b';
    plankColor = 'rgba(255,255,255,0.12)';
  } else if (theme === 'teahouse') {
    topColor = '#854d0e';
    sideColor = '#533807';
  } else if (theme === 'porch') {
    topColor = '#d97706';
    sideColor = '#92400e';
  }

  ctx.save();

  // Perspective Tabletop Trapezoid
  const backLeftX = width * 0.12;
  const backRightX = width * 0.88;

  const tableGrad = ctx.createLinearGradient(0, horizonY, 0, height);
  tableGrad.addColorStop(0, topColor);
  tableGrad.addColorStop(0.6, sideColor);
  tableGrad.addColorStop(1, '#1c1917');

  ctx.fillStyle = tableGrad;
  ctx.beginPath();
  ctx.moveTo(backLeftX, horizonY);
  ctx.lineTo(backRightX, horizonY);
  ctx.lineTo(width + 40, height);
  ctx.lineTo(-40, height);
  ctx.closePath();
  ctx.fill();

  // Front Table Edge Trim Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(backLeftX, horizonY);
  ctx.lineTo(backRightX, horizonY);
  ctx.stroke();

  // Perspective Plank Lines converging to central vanishing point
  const vpX = width * 0.5;

  ctx.strokeStyle = plankColor;
  ctx.lineWidth = 2;

  for (let i = -4; i <= 4; i++) {
    const targetBottomX = vpX + i * (width * 0.14);
    ctx.beginPath();
    ctx.moveTo(vpX + i * 20, horizonY);
    ctx.lineTo(targetBottomX, height);
    ctx.stroke();
  }

  // Horizontal wood plank perspective lines
  for (let step = 1; step <= 5; step++) {
    const py = horizonY + Math.pow(step / 5, 1.6) * (height - horizonY);
    const leftX = backLeftX - (backLeftX + 40) * (step / 5);
    const rightX = backRightX + (width + 40 - backRightX) * (step / 5);

    ctx.beginPath();
    ctx.moveTo(leftX, py);
    ctx.lineTo(rightX, py);
    ctx.stroke();
  }

  // Coaster / Table Mat Place Under Center Mug Area
  const matY = horizonY + (height - horizonY) * 0.3;
  ctx.fillStyle = theme === 'teahouse' ? 'rgba(4, 120, 87, 0.4)' : theme === 'office' ? 'rgba(30, 41, 59, 0.5)' : 'rgba(254, 240, 138, 0.25)';
  ctx.beginPath();
  ctx.ellipse(vpX, matY, width * 0.22, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

// --- DYNAMIC LEVEL OBSTACLE HELPER FUNCTIONS ---

export interface CanvasObstacle {
  id: string;
  type: string;
  x: number;
  y: number;
  radius: number;
  label: string;
  rotation?: number;
  extraData?: any;
}

function getObstaclesForLevelAndTheme(
  level: number,
  theme: EnvironmentTheme,
  width: number,
  height: number,
  time: number
): CanvasObstacle[] {
  if (level < 2) return [];

  const obstacles: CanvasObstacle[] = [];
  const tableYFactor = level === 1 ? 0.62 : level === 2 ? 0.55 : level === 3 ? 0.49 : Math.max(0.42, 0.45 - (level - 4) * 0.02);
  const mugY = height * tableYFactor;

  if (theme === 'kitchen') {
    // Level 2+: Playful Cat Paw swiping in front of mug
    if (level >= 2) {
      const pawSpeed = 0.7 + (level - 2) * 0.3;
      // Drifts wider horizontally back and forward relative to mug
      const sweepRange = width * (0.15 + (level - 2) * 0.03);
      const pawX = width * 0.54 + Math.sin(time * 1.1 * pawSpeed) * sweepRange;
      const pawY = mugY + 20 + Math.cos(time * 1.1 * pawSpeed) * (18 + (level - 2) * 6);
      obstacles.push({
        id: 'cat_paw',
        type: 'cat_paw',
        x: pawX,
        y: pawY,
        radius: 26 + (level - 2) * 3,
        label: '🐱 CAT PAW DEFLECTION!',
        rotation: Math.sin(time * 1.1 * pawSpeed) * 0.3,
      });
    }
    // Level 3+: Popping Toaster sitting stationary on countertop
    if (level >= 3) {
      const toastSpeed = 0.7 + (level - 3) * 0.25;
      const toasterX = width * 0.32;
      const toasterY = mugY + 18;

      // Cycle timer for popping toast: 0 to 1 = flying arc in air, 1 to 1.7 = reloading inside toaster
      const period = Math.PI * 2;
      const cycle = (time * 1.3 * toastSpeed) % period;
      const flyDuration = period * 0.62; // ~62% of the cycle in the air

      const isFlying = cycle < flyDuration;
      const toastProgress = isFlying ? cycle / flyDuration : 0; // 0.0 -> 1.0 during flight

      // Parabolic Arc Math across countertop over mug
      const flightDistance = width * 0.38; // Distance across counter over the mug
      const toastX = toasterX + toastProgress * flightDistance;
      const arcHeight = 110 + (level - 3) * 20; // High peak over the mug
      const toastY = (toasterY - 14) - 4 * arcHeight * toastProgress * (1 - toastProgress);
      const toastRotation = toastProgress * Math.PI * 2.2; // Smooth 360 flip in mid-air

      // 1. Stationary Toaster Base
      obstacles.push({
        id: 'toaster',
        type: 'toaster',
        x: toasterX,
        y: toasterY,
        radius: 24,
        label: '🍞 TOASTER BOUNCE!',
        extraData: { isFlying, toastProgress },
      });

      // 2. Flying Toast Slice Obstacle (mid-air parabolic arc over mug)
      if (isFlying) {
        obstacles.push({
          id: 'flying_toast',
          type: 'flying_toast',
          x: toastX,
          y: toastY,
          radius: 19,
          label: '🍞 FLYING TOAST DEFLECTION!',
          rotation: toastRotation,
          extraData: { toastProgress },
        });
      }
    }
    // Level 4+: Ceiling Fan
    if (level >= 4) {
      obstacles.push({
        id: 'fan',
        type: 'fan',
        x: width * 0.5,
        y: height * 0.26,
        radius: 38 + (level - 4) * 4,
        label: '🌀 FAN WIND DEFLECTION!',
        rotation: time * (5 + (level - 4) * 2),
      });
    }
  } else if (theme === 'office') {
    // Level 2+: Floating Paper Airplane flying across foreground in front of mug
    if (level >= 2) {
      const planeSpeed = 0.75 + (level - 2) * 0.35;
      const planeX = width * 0.5 + Math.sin(time * 0.9 * planeSpeed) * (width * (0.12 + (level - 2) * 0.04));
      const planeY = mugY - 20 + Math.cos(time * 1.4 * planeSpeed) * (10 + (level - 2) * 6);
      obstacles.push({
        id: 'paper_plane',
        type: 'paper_plane',
        x: planeX,
        y: planeY,
        radius: 22 + (level - 2) * 3,
        label: '✈️ PAPER AIRPLANE BOUNCE!',
        rotation: Math.cos(time * 0.9 * planeSpeed) * 0.25,
      });
    }
    // Level 3+: Rolling Office Chair rolling back and forth in front of mug
    if (level >= 3) {
      const chairSpeed = 0.8 + (level - 3) * 0.35;
      const chairX = width * 0.5 + Math.cos(time * 0.7 * chairSpeed) * (width * (0.12 + (level - 3) * 0.04));
      obstacles.push({
        id: 'rolling_chair',
        type: 'rolling_chair',
        x: chairX,
        y: mugY + 30,
        radius: 30 + (level - 3) * 4,
        label: '🪑 OFFICE CHAIR REBOUND!',
      });
    }
  } else if (theme === 'teahouse') {
    // Level 2+: Swaying Paper Lantern hanging in front of mug
    if (level >= 2) {
      const lanternSpeed = 0.7 + (level - 2) * 0.35;
      const lanternX = width * 0.5 + Math.sin(time * 0.9 * lanternSpeed) * (20 + (level - 2) * 12);
      const lanternY = mugY - 24 + Math.abs(Math.cos(time * 0.9 * lanternSpeed)) * (8 + (level - 2) * 4);
      obstacles.push({
        id: 'lantern',
        type: 'lantern',
        x: lanternX,
        y: lanternY,
        radius: 26 + (level - 2) * 3,
        label: '🏮 LANTERN SWAY BOUNCE!',
        rotation: Math.sin(time * 0.9 * lanternSpeed) * 0.15,
      });
    }
    // Level 3+: Bonsai Branch extending in front of mug
    if (level >= 3) {
      const bonsaiSpeed = 0.8 + (level - 3) * 0.35;
      obstacles.push({
        id: 'bonsai',
        type: 'bonsai',
        x: width * 0.33,
        y: mugY + 24 + Math.sin(time * 0.8 * bonsaiSpeed) * (6 + (level - 3) * 4),
        radius: 28 + (level - 3) * 3,
        label: '🪴 BONSAI BRANCH DEFLECTION!',
      });
    }
  } else if (theme === 'porch') {
    // Level 2+: Gentle Fluttering Hummingbird directly in front of mug
    if (level >= 2) {
      // Gentle, graceful flight on Level 2 that speeds up progressively on higher levels
      const birdSpeed = 0.75 + (level - 2) * 0.4;
      const birdX = width * 0.5 + Math.sin(time * 1.1 * birdSpeed) * (width * (0.12 + (level - 2) * 0.04));
      const birdY = mugY - 18 + Math.sin(time * 2.2 * birdSpeed) * (8 + (level - 2) * 6);
      obstacles.push({
        id: 'hummingbird',
        type: 'hummingbird',
        x: birdX,
        y: birdY,
        radius: 20 + (level - 2) * 3,
        label: '🐦 HUMMINGBIRD FLUTTER BOUNCE!',
      });
    }
    // Level 3+: Hanging Fern Plant swaying wide in front of and away from mug
    if (level >= 3) {
      const fernSpeed = 0.7 + (level - 3) * 0.3;
      // Sway in a wider arc (amplitude ~0.15 of canvas width) so it moves far away from the mug, creating clear windows to land
      const swingAmp = width * (0.15 + (level - 3) * 0.02);
      const fernX = width * 0.62 + Math.sin(time * 0.9 * fernSpeed) * swingAmp;
      const fernY = mugY - 14 + Math.cos(time * 0.9 * fernSpeed * 2) * (10 + (level - 3) * 4);
      obstacles.push({
        id: 'hanging_plant',
        type: 'hanging_plant',
        x: fernX,
        y: fernY,
        radius: 28 + (level - 3) * 3,
        label: '🌿 FERN VINE DEFLECTION!',
      });
    }
  }

  return obstacles;
}

function drawObstacles(ctx: CanvasRenderingContext2D, obstacles: CanvasObstacle[]) {
  obstacles.forEach((obs) => {
    ctx.save();
    ctx.translate(obs.x, obs.y);
    if (obs.rotation) {
      ctx.rotate(obs.rotation);
    }

    if (obs.type === 'cat_paw') {
      // Fluffy cat arm extending with pink paw pads
      ctx.fillStyle = '#ea580c'; // Orange tabby fur
      ctx.beginPath();
      ctx.roundRect(-22, -18, 44, 75, 14);
      ctx.fill();

      // Fur stripes
      ctx.fillStyle = '#c2410c';
      ctx.fillRect(-18, -8, 36, 4);
      ctx.fillRect(-18, 8, 36, 4);

      // Main center paw pad
      ctx.beginPath();
      ctx.ellipse(0, -4, 13, 10, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#f472b6'; // Pink pad
      ctx.fill();

      // 4 Toe pads
      const toeOffsets = [-14, -5, 5, 14];
      toeOffsets.forEach((tx) => {
        ctx.beginPath();
        ctx.ellipse(tx, -20, 4.5, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (obs.type === 'toaster') {
      const isFlying = obs.extraData?.isFlying;

      // When reloading inside toaster, draw a little bread slice peeking out slot
      if (!isFlying) {
        ctx.fillStyle = '#d97706'; // Golden toast crust
        ctx.beginPath();
        ctx.roundRect(-13, -17, 26, 12, 4);
        ctx.fill();
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(-10, -15, 20, 7);
      }

      // Retro silver Toaster Body (Stays completely stationary)
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.roundRect(-24, -18, 48, 36, 8);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Chrome highlight strip
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(-22, -16, 44, 3);

      // Toaster slot
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-18, -14, 36, 4);

      // Front Dial & Power Light
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(10, 4, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Red LED Indicator (glows vibrant red when launching toast)
      ctx.fillStyle = isFlying ? '#ef4444' : '#64748b';
      ctx.beginPath();
      ctx.arc(-12, 4, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Side lever (pressed down when loading toast, pops up during launch)
      const leverY = isFlying ? -10 : 4;
      ctx.fillStyle = '#334155';
      ctx.fillRect(-28, leverY, 5, 4);
    } else if (obs.type === 'flying_toast') {
      // Golden Toast Slice flying along parabolic arc over mug!
      ctx.fillStyle = '#d97706'; // Golden crust
      ctx.beginPath();
      ctx.roundRect(-14, -12, 28, 24, 6);
      ctx.fill();
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner soft bread core
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.roundRect(-10, -8, 20, 16, 4);
      ctx.fill();

      // Yellow pat of butter
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.roundRect(-4, -3, 8, 6, 1);
      ctx.fill();

      // Warm glow around flying toast
      ctx.fillStyle = 'rgba(251, 191, 36, 0.25)';
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
    } else if (obs.type === 'fan') {
      // Spinning Fan
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.arc(0, 0, obs.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#38bdf8';
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.ellipse(0, 18, 8, 18, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Center cap
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
    } else if (obs.type === 'paper_plane') {
      // Paper Airplane
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(-18, -14);
      ctx.lineTo(-8, 0);
      ctx.lineTo(-18, 14);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Flight dash trail
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(-20, 0);
      ctx.lineTo(-45, 0);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (obs.type === 'rolling_chair') {
      // Executive Office Chair
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-22, -24, 44, 30, 8); // Backrest
      ctx.fill();

      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(-24, 6, 48, 12, 4); // Seat cushion
      ctx.fill();

      // Chair stem & base
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, 18);
      ctx.lineTo(0, 30);
      ctx.stroke();
    } else if (obs.type === 'lantern') {
      // Teahouse Crimson Paper Lantern
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.ellipse(0, 0, 22, 28, 0, 0, Math.PI * 2);
      ctx.fill();

      // Gold accents top/bottom
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-14, -28, 28, 6);
      ctx.fillRect(-14, 22, 28, 6);

      // Hanging tassel
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 28);
      ctx.lineTo(0, 48);
      ctx.stroke();
    } else if (obs.type === 'bonsai') {
      // Bonsai foliage cloud
      ctx.fillStyle = '#15803d'; // Lush green
      ctx.beginPath();
      ctx.arc(-10, -5, 18, 0, Math.PI * 2);
      ctx.arc(10, -8, 20, 0, Math.PI * 2);
      ctx.arc(0, -18, 16, 0, Math.PI * 2);
      ctx.fill();

      // Trunk
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-15, 15, -5, 25);
      ctx.stroke();
    } else if (obs.type === 'hummingbird') {
      // Hummingbird
      ctx.fillStyle = '#0d9488'; // Turquoise
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 10, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // Beak
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(14, -2);
      ctx.lineTo(28, -5);
      ctx.stroke();

      // Rapid wing flutter
      ctx.fillStyle = 'rgba(20, 184, 166, 0.5)';
      ctx.beginPath();
      ctx.ellipse(-2, -12, 6, 16, 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (obs.type === 'hanging_plant') {
      // Redesigned Botanical Hanging Planter with Cascading Ivy Vines

      // 1. Suspension Chains / Cords extending upward
      ctx.strokeStyle = '#d97706'; // Warm brass / macramé gold
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      // Three support cords gathered at top ring
      ctx.moveTo(-18, -10);
      ctx.lineTo(0, -45);
      ctx.moveTo(0, -10);
      ctx.lineTo(0, -45);
      ctx.moveTo(18, -10);
      ctx.lineTo(0, -45);
      // Main chain extending to ceiling
      ctx.moveTo(0, -45);
      ctx.lineTo(0, -120);
      ctx.stroke();

      // Hanging ring
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, -45, 5, 0, Math.PI * 2);
      ctx.stroke();

      // 2. Ceramic / Terracotta Planter Bowl
      // Shadow behind pot
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.ellipse(0, 10, 20, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Terracotta Bowl Body
      ctx.fillStyle = '#c2410c'; // Warm terracotta
      ctx.beginPath();
      ctx.moveTo(-20, -10);
      ctx.lineTo(20, -10);
      ctx.quadraticCurveTo(18, 16, 0, 18);
      ctx.quadraticCurveTo(-18, 16, -20, -10);
      ctx.closePath();
      ctx.fill();

      // White Glazed Decorative Band on Pot
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(-19, -4, 38, 5);

      // Pot Rim
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.ellipse(0, -10, 21, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#9a3412';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 3. Dense Top Foliage Dome
      ctx.fillStyle = '#15803d'; // Deep forest green background
      ctx.beginPath();
      ctx.arc(-10, -16, 12, 0, Math.PI * 2);
      ctx.arc(10, -16, 12, 0, Math.PI * 2);
      ctx.arc(0, -20, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#22c55e'; // Vibrant emerald leaves
      ctx.beginPath();
      ctx.arc(-12, -14, 9, 0, Math.PI * 2);
      ctx.arc(12, -14, 9, 0, Math.PI * 2);
      ctx.arc(0, -16, 11, 0, Math.PI * 2);
      ctx.arc(-5, -22, 8, 0, Math.PI * 2);
      ctx.arc(5, -22, 8, 0, Math.PI * 2);
      ctx.fill();

      // 4. Cascading Ivy Vines & Variegated Leaves
      const vines = [
        { startX: -16, cpX: -26, endX: -20, endY: 38 },
        { startX: -8, cpX: -14, endX: -10, endY: 52 },
        { startX: 0, cpX: 4, endX: 2, endY: 44 },
        { startX: 8, cpX: 16, endX: 12, endY: 56 },
        { startX: 16, cpX: 24, endX: 20, endY: 36 },
      ];

      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';

      vines.forEach((v) => {
        ctx.beginPath();
        ctx.moveTo(v.startX, -4);
        ctx.quadraticCurveTo(v.cpX, (v.endY - 4) * 0.5, v.endX, v.endY);
        ctx.stroke();
      });

      // Heart/Ivy Leaf Clusters along vines
      const ivyLeaves = [
        { x: -20, y: 12, size: 5, rot: -0.5, col: '#4ade80' },
        { x: -24, y: 26, size: 4.5, rot: -0.8, col: '#22c55e' },
        { x: -20, y: 38, size: 3.5, rot: -0.4, col: '#a3e635' },

        { x: -10, y: 16, size: 5.5, rot: 0.2, col: '#22c55e' },
        { x: -14, y: 32, size: 5, rot: -0.3, col: '#4ade80' },
        { x: -10, y: 50, size: 3.5, rot: 0.1, col: '#86efac' },

        { x: 2, y: 14, size: 5, rot: 0.4, col: '#a3e635' },
        { x: 4, y: 28, size: 4.5, rot: -0.2, col: '#22c55e' },
        { x: 2, y: 42, size: 3.5, rot: 0.3, col: '#4ade80' },

        { x: 12, y: 18, size: 5.5, rot: 0.5, col: '#4ade80' },
        { x: 16, y: 36, size: 4.5, rot: 0.8, col: '#22c55e' },
        { x: 12, y: 54, size: 3.5, rot: 0.2, col: '#a3e635' },

        { x: 22, y: 14, size: 4.5, rot: 0.6, col: '#22c55e' },
        { x: 20, y: 32, size: 4, rot: 0.9, col: '#4ade80' },
      ];

      ivyLeaves.forEach((leaf) => {
        ctx.save();
        ctx.translate(leaf.x, leaf.y);
        ctx.rotate(leaf.rot);
        ctx.fillStyle = leaf.col;
        ctx.beginPath();
        ctx.ellipse(0, 0, leaf.size, leaf.size * 1.6, 0, 0, Math.PI * 2);
        ctx.fill();
        // Inner vein
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, -leaf.size * 1.2);
        ctx.lineTo(0, leaf.size * 1.2);
        ctx.stroke();
        ctx.restore();
      });

      // 5. Delicate Little White Flowers
      const flowers = [
        { x: -16, y: 20 },
        { x: -8, y: 40 },
        { x: 8, y: 24 },
        { x: 14, y: 44 },
      ];

      flowers.forEach((fl) => {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(fl.x, fl.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(fl.x, fl.y, 1, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore();
  });
}

function drawFanAndWind(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  wind: WindState,
  fanAngle: number
) {
  // Draw Fan on Wall
  const isLeft = wind.direction >= 0;
  const fanX = isLeft ? 36 : width - 36;
  const fanY = height * 0.35;
  const fanRadius = 26;

  ctx.save();
  ctx.translate(fanX, fanY);

  // Fan Stand & Base
  ctx.fillStyle = '#475569';
  ctx.fillRect(-6, fanRadius, 12, 35);
  ctx.fillRect(-18, fanRadius + 30, 36, 10);

  // Fan Outer Cage
  ctx.beginPath();
  ctx.arc(0, 0, fanRadius + 4, 0, Math.PI * 2);
  ctx.fillStyle = '#334155';
  ctx.fill();
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Spinning Blades
  ctx.save();
  ctx.rotate(fanAngle * (wind.direction || 1));
  ctx.fillStyle = '#cbd5e1';
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.beginPath();
    ctx.ellipse(0, 10, 6, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Center Cap
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#e2e8f0';
  ctx.fill();

  ctx.restore();
}

function drawMug(
  ctx: CanvasRenderingContext2D,
  mug: { x: number; y: number; width: number; height: number },
  mugType: MugType,
  teaType: TeaType,
  steepCount: number
) {
  ctx.save();
  ctx.translate(mug.x, mug.y);

  const w = mug.width;
  const h = mug.height;

  // Mug Shadow on Perspective Table Surface
  ctx.beginPath();
  ctx.ellipse(0, h * 0.44, w * 0.65, 18, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fill();

  // Mug Outer Handle (positioned on right side)
  ctx.beginPath();
  ctx.arc(w * 0.52, 4, h * 0.28, -Math.PI * 0.4, Math.PI * 0.4);
  ctx.strokeStyle = mugType.color;
  ctx.lineWidth = 11;
  ctx.stroke();

  // Mug Body
  ctx.fillStyle = mugType.color;
  ctx.beginPath();
  ctx.moveTo(-w * 0.48, -h * 0.38);
  ctx.lineTo(-w * 0.42, h * 0.42);
  ctx.quadraticCurveTo(0, h * 0.52, w * 0.42, h * 0.42);
  ctx.lineTo(w * 0.48, -h * 0.38);
  ctx.closePath();
  ctx.fill();

  // Body Shading Gradient
  const bodyGrad = ctx.createLinearGradient(-w * 0.5, 0, w * 0.5, 0);
  bodyGrad.addColorStop(0, 'rgba(0,0,0,0.25)');
  bodyGrad.addColorStop(0.3, 'rgba(255,255,255,0.15)');
  bodyGrad.addColorStop(0.8, 'rgba(0,0,0,0.15)');
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // Mug Pattern overlays
  if (mugType.pattern === 'stripes') {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(-w * 0.3, -h * 0.2, 8, h * 0.5);
    ctx.fillRect(-w * 0.1, -h * 0.2, 8, h * 0.5);
    ctx.fillRect(w * 0.1, -h * 0.2, 8, h * 0.5);
    ctx.restore();
  } else if (mugType.pattern === 'gold') {
    ctx.save();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-w * 0.44, 0);
    ctx.lineTo(w * 0.44, 0);
    ctx.stroke();
    ctx.restore();
  }

  // Interior Mouth Cavity (Dark inside rim)
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.38, w * 0.48, 20, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(28, 25, 23, 0.9)';
  ctx.fill();

  // Hot Tea Liquid Surface inside Mouth
  const liquidColor = steepCount > 0 ? teaType.teaColor : 'rgba(217, 119, 6, 0.7)';
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.34, w * 0.44, 16, 0, 0, Math.PI * 2);
  ctx.fillStyle = liquidColor;
  ctx.fill();

  // Steam Ripple Ring
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.34, w * 0.32, 10, 0, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Mug Outer Top Rim Edge Facing Player
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.38, w * 0.48, 20, 0, 0, Math.PI * 2);
  ctx.strokeStyle = mugType.rimColor;
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.restore();
}

function drawTeaBag(
  ctx: CanvasRenderingContext2D,
  bag: TeaBagPhysics,
  teaType: TeaType,
  scrunchLevel: number = 0
) {
  ctx.save();
  const scrunchRatio = Math.min(1, Math.max(0, scrunchLevel / 100));

  // 1. Draw String connecting Tag -> Bag
  ctx.beginPath();
  ctx.moveTo(bag.tagX, bag.tagY);

  // Curve on string gets tighter as bag becomes a ball
  const midX = (bag.tagX + bag.x) / 2;
  const midY = (bag.tagY + bag.y) / 2 + (6 - scrunchRatio * 4);
  ctx.quadraticCurveTo(midX, midY, bag.x, bag.y - (12 - scrunchRatio * 4));

  ctx.strokeStyle = scrunchRatio > 0.7 ? '#fef08a' : '#f5f5f4';
  ctx.lineWidth = scrunchRatio > 0.3 ? 1.5 : 2;
  ctx.stroke();

  // 2. Draw Tag
  ctx.save();
  ctx.translate(bag.tagX, bag.tagY);
  ctx.fillStyle = teaType.bagColor;
  ctx.fillRect(-8, -10, 16, 20);
  ctx.strokeStyle = scrunchRatio > 0.7 ? '#fef08a' : '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(-8, -10, 16, 20);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(scrunchRatio > 0.5 ? 'AERO' : 'TEA', 0, 3);
  ctx.restore();

  // 3. Draw Tea Bag Main Pouch / Scrunched Ball
  ctx.translate(bag.x, bag.y);
  ctx.rotate(bag.angle);

  // Outer Glow / Aerodynamic aura if scrunched
  if (scrunchRatio > 0.7) {
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 8 + scrunchRatio * 10;

    // Glowing Aerodynamic Ring around sphere
    ctx.strokeStyle = `rgba(245, 158, 11, ${0.4 + scrunchRatio * 0.5})`;
    ctx.lineWidth = 1.5 + scrunchRatio;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14 + scrunchRatio * 5, 8 + scrunchRatio * 3, bag.angle, 0, Math.PI * 2);
    ctx.stroke();
  } else if (teaType.specialEffect === 'glow') {
    ctx.shadowColor = teaType.particleColor;
    ctx.shadowBlur = 12;
  }

  if (scrunchRatio === 0) {
    // Standard Loose Trapezoid Pouch
    ctx.fillStyle = '#fafaf9';
    ctx.strokeStyle = '#e7e5e4';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(-12, -14);
    ctx.lineTo(12, -14);
    ctx.lineTo(16, 16);
    ctx.lineTo(-16, 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = teaType.teaColor;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.arc(-4, 0, 6, 0, Math.PI * 2);
    ctx.arc(4, 4, 5, 0, Math.PI * 2);
    ctx.arc(0, 8, 4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Morphing Scrunched Ball (0% -> 100%)
    const ballRadius = 15 - scrunchRatio * 3; // 15px down to 12px

    // Color gradient interpolation from off-white to warm golden scrunched paper
    const paperColor = scrunchRatio > 0.6 ? '#fde68a' : '#f5f5f4';
    ctx.fillStyle = paperColor;
    ctx.strokeStyle = scrunchRatio > 0.6 ? '#d97706' : '#d6d3d1';
    ctx.lineWidth = 1.5 + scrunchRatio * 0.8;

    ctx.beginPath();
    ctx.arc(0, 0, ballRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Crinkle texture paper folds
    ctx.strokeStyle = scrunchRatio > 0.6 ? '#b45309' : '#78716c';
    ctx.lineWidth = 1 + scrunchRatio * 0.4;
    ctx.beginPath();
    ctx.moveTo(-ballRadius * 0.7, -ballRadius * 0.2);
    ctx.lineTo(ballRadius * 0.2, ballRadius * 0.5);
    ctx.moveTo(-ballRadius * 0.2, -ballRadius * 0.6);
    ctx.lineTo(ballRadius * 0.6, ballRadius * 0.2);
    ctx.stroke();

    // Tea leaf core inside folds
    ctx.fillStyle = teaType.teaColor;
    ctx.globalAlpha = 0.6 + scrunchRatio * 0.35;
    ctx.beginPath();
    ctx.arc(0, 0, 3 + scrunchRatio * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function computeFlickVector(
  dragStart: TrajectoryPoint | null,
  dragCurrent: TrajectoryPoint | null,
  history: { x: number; y: number; time: number }[],
  now: number = performance.now()
) {
  let dragVx = 0;
  let dragVy = 0;
  let hasDrag = false;

  if (dragStart && dragCurrent) {
    const totalDx = dragCurrent.x - dragStart.x;
    const totalDy = dragCurrent.y - dragStart.y;

    if (totalDy > 10) {
      // Slingshot pull down -> shoot UP in opposite direction
      dragVx = -totalDx * 0.14;
      dragVy = -totalDy * 0.16;
      hasDrag = true;
    } else if (totalDy < -10) {
      // Direct drag UP -> shoot UP in drag direction
      dragVx = totalDx * 0.14;
      dragVy = totalDy * 0.16;
      hasDrag = true;
    }
  }

  let swipeVx = 0;
  let swipeVy = 0;
  let hasSwipe = false;

  if (history.length >= 2) {
    const recent = history[history.length - 1];
    let startPoint = history[0];
    for (let i = history.length - 2; i >= 0; i--) {
      if (recent.time - history[i].time >= 15) {
        startPoint = history[i];
        break;
      }
    }

    const dt = Math.max(recent.time - startPoint.time, 10);
    const dx = recent.x - startPoint.x;
    const dy = recent.y - startPoint.y;

    if ((now === 0 || now - recent.time <= 150) && dy < -2) {
      const scale = 6.8;
      swipeVx = (dx / dt) * scale;
      swipeVy = (dy / dt) * scale;
      hasSwipe = true;
    }
  }

  let vx = 0;
  let vy = 0;

  if (hasDrag && hasSwipe) {
    if (dragStart && dragCurrent && (dragCurrent.y - dragStart.y) > 10) {
      // Slingshot pull down takes priority if actively pulled down
      vx = dragVx;
      vy = dragVy;
    } else {
      // Pick stronger energy vector for upward gestures
      const dragSpeed = Math.hypot(dragVx, dragVy);
      const swipeSpeed = Math.hypot(swipeVx, swipeVy);
      if (swipeSpeed >= dragSpeed) {
        vx = swipeVx;
        vy = swipeVy;
      } else {
        vx = dragVx;
        vy = dragVy;
      }
    }
  } else if (hasSwipe) {
    vx = swipeVx;
    vy = swipeVy;
  } else if (hasDrag) {
    vx = dragVx;
    vy = dragVy;
  }

  // Soft-cap / compress velocity scale to prevent quadratic peak-height explosions (h = v^2 / 2g)
  // Ensures gentle flicks reach the mug while fast flicks remain safely on-screen.
  const rawSpeed = Math.hypot(vx, vy);
  if (rawSpeed > 0) {
    // Compress speed using power curve (e.g. speed^0.75)
    const compressedSpeed = Math.min(19.5, Math.pow(rawSpeed, 0.78) * 1.8);
    const scale = compressedSpeed / rawSpeed;
    vx *= scale;
    vy *= scale;
  }

  return { vx, vy, speed: Math.hypot(vx, vy) };
}

function drawFlickVectorGuide(
  ctx: CanvasRenderingContext2D,
  dragStart: TrajectoryPoint | null,
  dragCurrent: TrajectoryPoint | null,
  wind: WindState,
  bag: TeaBagPhysics,
  history: { x: number; y: number; time: number }[],
  teaType?: TeaType,
  scrunchLevel: number = 0
) {
  const gravity = teaType?.gravity ?? 0.38;
  const baseWindSens = teaType?.windSensitivity ?? 1.0;
  const scrunchRatio = Math.min(1, Math.max(0, scrunchLevel / 100));
  const windSensitivity = baseWindSens * (1.0 - scrunchRatio * 0.75);

  const { vx, vy, speed } = computeFlickVector(dragStart, dragCurrent, history, 0);

  ctx.save();

  if (vy >= 0 || speed < 1.5) {
    // Subtle touch ring around bag indicating ready to flick
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.50)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(bag.x, bag.y, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Draw Dynamic Flick Impulse Arrow & Motion Trail
  const angle = Math.atan2(vy, vx);
  const arrowLength = Math.min(speed * 3.5, 80);

  ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
  ctx.fillStyle = 'rgba(245, 158, 11, 0.85)';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(bag.x, bag.y);
  ctx.lineTo(bag.x + Math.cos(angle) * arrowLength, bag.y + Math.sin(angle) * arrowLength);
  ctx.stroke();

  // Arrowhead tip
  const tipX = bag.x + Math.cos(angle) * arrowLength;
  const tipY = bag.y + Math.sin(angle) * arrowLength;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - 12 * Math.cos(angle - 0.4), tipY - 12 * Math.sin(angle - 0.4));
  ctx.lineTo(tipX - 12 * Math.cos(angle + 0.4), tipY - 12 * Math.sin(angle + 0.4));
  ctx.closePath();
  ctx.fill();

  // Simulated Trajectory Arc - Extends further and becomes pinpoint accurate with scrunchLevel!
  let simX = bag.x;
  let simY = bag.y;
  let simVx = vx;
  let simVy = vy;

  const totalSteps = 10 + Math.round(scrunchRatio * 22);
  const airDrag = 0.992 + (scrunchRatio * 0.005);

  for (let step = 0; step < totalSteps; step++) {
    simVy += gravity;
    simVx += wind.speed * wind.direction * 0.035 * windSensitivity;
    simVx *= airDrag;
    simVy *= airDrag;

    simX += simVx;
    simY += simVy;

    const alpha = Math.max(0.1, 0.95 - (step / totalSteps) * 0.7);
    ctx.fillStyle = scrunchRatio > 0.5 ? `rgba(251, 191, 36, ${alpha})` : `rgba(245, 158, 11, ${alpha})`;
    ctx.beginPath();
    ctx.arc(simX, simY, Math.max(4.5 - (step / totalSteps) * 2.5, 1.4), 0, Math.PI * 2);
    ctx.fill();

    if (step === totalSteps - 1 && scrunchRatio > 0.2) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(simX, simY, 7 + scrunchRatio * 5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(simX, simY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawFlickHint(ctx: CanvasRenderingContext2D, bagX: number, bagY: number) {
  const time = performance.now() * 0.003;
  const offsetY = Math.sin(time) * 4;

  ctx.save();
  ctx.translate(bagX + 28, bagY - 44 + offsetY);

  const w = 156;
  const h = 26;
  const r = 13;

  ctx.fillStyle = 'rgba(28, 25, 23, 0.88)';
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(-w / 2 + r, -h / 2);
  ctx.lineTo(w / 2 - r, -h / 2);
  ctx.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  ctx.lineTo(w / 2, h / 2 - r);
  ctx.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  ctx.lineTo(-w / 2 + r, h / 2);
  ctx.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  ctx.lineTo(-w / 2, -h / 2 + r);
  ctx.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fef3c7';
  ctx.font = 'bold 10.5px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FLICK OR PULL BACK 🎯', 0, 1);

  ctx.restore();
}
