import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameMode, EnvironmentTheme, TeaType, MugType, WindState, Particle, TrajectoryPoint, ShotResult } from '../types';
import { sound } from '../utils/audio';

interface GameCanvasProps {
  gameMode: GameMode;
  theme: EnvironmentTheme;
  selectedTea: TeaType;
  selectedMug: MugType;
  wind: WindState;
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

  // Handle Mug Placement directly in front of the viewer on the perspective tabletop
  const setupMugPosition = useCallback((width: number, height: number) => {
    const mugWidth = 76 * selectedMug.widthRatio;
    const mugHeight = 92;
    let targetX = width * 0.5;

    if (gameMode === 'precision') {
      // Vary mug position randomly directly in front of us
      targetX = width * (0.38 + Math.random() * 0.24);
    }

    mugTargetXRef.current = targetX;
    mugPosRef.current = {
      x: targetX,
      y: height * 0.62,
      width: mugWidth,
      height: mugHeight,
    };
  }, [selectedMug.widthRatio, gameMode]);

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
      fanAngleRef.current += (wind.speed + 1) * 0.15;

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
        // Gravity
        bag.vy += 0.38;

        // Wind force
        bag.vx += wind.speed * wind.direction * 0.035;

        // Air drag
        bag.vx *= 0.992;
        bag.vy *= 0.992;

        // Move main bag pouch
        bag.x += bag.vx;
        bag.y += bag.vy;

        // Rotation
        bag.angle += bag.vAngle;

        // String and Tag follow physics
        const dx = bag.tagX - bag.x;
        const dy = bag.tagY - bag.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        bag.tagVy += 0.4; // gravity on tag
        bag.tagVx += wind.speed * wind.direction * 0.04;
        bag.tagX += bag.tagVx;
        bag.tagY += bag.tagVy;

        // Constrain tag to string length
        if (dist > bag.stringLength) {
          const factor = bag.stringLength / dist;
          bag.tagX = bag.x + dx * factor;
          bag.tagY = bag.y + dy * factor;
          bag.tagVx *= 0.8;
          bag.tagVy *= 0.8;
        }

        // COLLISION CHECKING WITH MUG
        const mug = mugPosRef.current;
        const mugTopY = mug.y - mug.height * 0.42;
        const rimLeft = mug.x - mug.width * 0.48;
        const rimRight = mug.x + mug.width * 0.48;
        const tableY = height * 0.72;

        // 1. Check if entering mug mouth
        if (bag.y >= mugTopY && bag.y <= mugTopY + 34) {
          const distFromCenter = Math.abs(bag.x - mug.x);
          const maxLandingDist = mug.width * 0.46;

          if (distFromCenter <= maxLandingDist && bag.vy > -1) {
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

        // 2. Rim Shot bounce
        const isNearRimY = Math.abs(bag.y - mugTopY) < 14;
        const hitsLeftRim = Math.abs(bag.x - rimLeft) < 12 && isNearRimY;
        const hitsRightRim = Math.abs(bag.x - rimRight) < 12 && isNearRimY;

        if ((hitsLeftRim || hitsRightRim) && !bag.isSettled) {
          sound.playRimClink();
          bag.vx *= -0.6;
          bag.vy = -Math.abs(bag.vy) * 0.5 - 1.5;
          bag.vAngle = (Math.random() - 0.5) * 0.4;

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

        // 3. Table / Missed ground bounce (Only trigger if falling downwards vy > 0 or offscreen)
        if ((bag.vy > 0 && bag.y >= tableY) || bag.x < -50 || bag.x > width + 50) {
          bag.isSettled = true;
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
      drawEnvironmentBackground(ctx, width, height, theme);

      // Draw Wind FX & Fan
      drawFanAndWind(ctx, width, height, wind, fanAngleRef.current);

      // Draw Table Surface
      drawTable(ctx, width, height, theme);

      // Draw Mug
      drawMug(ctx, mugPosRef.current, selectedMug, selectedTea, landedTeaBagsCountRef.current);

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

      // Draw Wind/Splash particles
      particlesRef.current.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Aim Trajectory Guide if flicking / dragging
      if (isDraggingRef.current && dragStartRef.current && dragCurrentRef.current) {
        drawTrajectoryGuide(ctx, dragStartRef.current, dragCurrentRef.current, wind, teaBagRef.current, touchHistoryRef.current);
      }

      // Draw Flick Hint text badge when ready to throw
      if (!teaBagRef.current.isFlying && isPlaying && !isDraggingRef.current) {
        drawFlickHint(ctx, teaBagRef.current.x, teaBagRef.current.y);
      }

      // Draw Tea Bag
      drawTeaBag(ctx, teaBagRef.current, selectedTea);

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
    isPlaying,
    onShotComplete,
    onWindChangeNeeded,
    resetTeaBag,
    setupMugPosition,
  ]);

  // Handle Drag / Flick Start
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPlaying || teaBagRef.current.isFlying) return;
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
    const dist = Math.hypot(x - bag.x, y - bag.y);

    // Allow flicking anywhere near the tea bag or lower screen launch zone
    if (dist < 220 || y > rect.height * 0.35) {
      isDraggingRef.current = true;
      dragStartRef.current = { x, y };
      dragCurrentRef.current = { x, y };
      const now = performance.now();
      touchHistoryRef.current = [{ x, y, time: now }];
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

    const now = performance.now();
    const history = touchHistoryRef.current;
    history.push({ x, y, time: now });

    // Prune history older than 180ms
    while (history.length > 0 && now - history[0].time > 180) {
      history.shift();
    }
  };

  // Handle Flick Launch (Release)
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || !dragStartRef.current || !dragCurrentRef.current) {
      isDraggingRef.current = false;
      return;
    }

    const canvas = canvasRef.current;
    if (canvas && e.pointerId !== undefined) {
      try {
        if (canvas.hasPointerCapture(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId);
        }
      } catch (err) {}
    }

    const dragStart = dragStartRef.current;
    const dragCurrent = dragCurrentRef.current;

    isDraggingRef.current = false;

    const history = touchHistoryRef.current;
    const totalDx = dragCurrent.x - dragStart.x;
    const totalDy = dragCurrent.y - dragStart.y;
    const totalDist = Math.hypot(totalDx, totalDy);

    let vx = 0;
    let vy = 0;

    // Calculate velocity from touch history
    if (history.length >= 2) {
      const recent = history[history.length - 1];
      let startPoint = history[0];
      for (let i = history.length - 2; i >= 0; i--) {
        if (recent.time - history[i].time >= 25) {
          startPoint = history[i];
          break;
        }
      }

      const dt = Math.max(recent.time - startPoint.time, 10);
      const dx = recent.x - startPoint.x;
      const dy = recent.y - startPoint.y;

      const scale = 6.5;
      vx = (dx / dt) * scale;
      vy = (dy / dt) * scale;
    }

    // Slingshot / Drag fallbacks
    if (totalDy > 15 && Math.hypot(vx, vy) < 3.5) {
      vx = -totalDx * 0.16;
      vy = -totalDy * 0.18;
    } else if (Math.hypot(vx, vy) < 1.8 && totalDist > 8) {
      vx = totalDx * 0.16;
      vy = totalDy * 0.16;
    }

    if (totalDy < -8 && vy > -3) {
      vy = -Math.max(Math.abs(vy), Math.abs(totalDy) * 0.18);
    }

    const currentSpeed = Math.hypot(vx, vy);

    if (currentSpeed > 0.8 || totalDist > 8) {
      const maxSpeed = 28;
      if (currentSpeed > maxSpeed) {
        vx = (vx / currentSpeed) * maxSpeed;
        vy = (vy / currentSpeed) * maxSpeed;
      }

      // Launch Tea Bag!
      const bag = teaBagRef.current;
      bag.vx = vx;
      bag.vy = vy;
      bag.vAngle = (Math.random() - 0.5) * 0.3 + vx * 0.02;
      bag.isFlying = true;

      sound.playFlick(Math.min(currentSpeed / 18, 1.0));
    }

    dragStartRef.current = null;
    dragCurrentRef.current = null;
    touchHistoryRef.current = [];
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
  theme: EnvironmentTheme
) {
  let grad = ctx.createLinearGradient(0, 0, 0, height);

  switch (theme) {
    case 'kitchen':
      grad.addColorStop(0, '#fef3c7'); // Warm honey cream
      grad.addColorStop(0.7, '#fde68a');
      grad.addColorStop(1, '#f59e0b');
      break;
    case 'office':
      grad.addColorStop(0, '#f1f5f9'); // Modern slate
      grad.addColorStop(0.7, '#e2e8f0');
      grad.addColorStop(1, '#cbd5e1');
      break;
    case 'teahouse':
      grad.addColorStop(0, '#ecfdf5'); // Mint matcha green teahouse
      grad.addColorStop(0.7, '#d1fae5');
      grad.addColorStop(1, '#a7f3d0');
      break;
    case 'porch':
      grad.addColorStop(0, '#bae6fd'); // Porch blue sky
      grad.addColorStop(0.7, '#e0f2fe');
      grad.addColorStop(1, '#fef08a');
      break;
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Subtle wall wallpaper pattern or window
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height * 0.75);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTable(ctx: CanvasRenderingContext2D, width: number, height: number, theme: EnvironmentTheme) {
  const horizonY = height * 0.54;

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
  const vpY = horizonY - 60;

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

  ctx.restore();
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

function drawTeaBag(ctx: CanvasRenderingContext2D, bag: TeaBagPhysics, teaType: TeaType) {
  ctx.save();

  // 1. Draw String connecting Tag -> Bag
  ctx.beginPath();
  ctx.moveTo(bag.tagX, bag.tagY);

  // Gentle curve on string
  const midX = (bag.tagX + bag.x) / 2;
  const midY = (bag.tagY + bag.y) / 2 + 6;
  ctx.quadraticCurveTo(midX, midY, bag.x, bag.y - 12);

  ctx.strokeStyle = '#f5f5f4';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 2. Draw Tag
  ctx.save();
  ctx.translate(bag.tagX, bag.tagY);
  ctx.fillStyle = teaType.bagColor;
  ctx.fillRect(-8, -10, 16, 20);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(-8, -10, 16, 20);

  // Tiny tea icon/symbol on tag
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('TEA', 0, 3);
  ctx.restore();

  // 3. Draw Tea Bag Main Filter Pouch
  ctx.translate(bag.x, bag.y);
  ctx.rotate(bag.angle);

  // Outer Glow if special
  if (teaType.specialEffect === 'glow') {
    ctx.shadowColor = teaType.particleColor;
    ctx.shadowBlur = 12;
  }

  // Trapezoid Tea Bag Pouch
  ctx.fillStyle = '#fafaf9'; // Off-white porous tea bag paper
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

  // Tea Leaves texture visible inside translucent filter pouch
  ctx.fillStyle = teaType.teaColor;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.arc(-4, 0, 6, 0, Math.PI * 2);
  ctx.arc(4, 4, 5, 0, Math.PI * 2);
  ctx.arc(0, 8, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawTrajectoryGuide(
  ctx: CanvasRenderingContext2D,
  dragStart: TrajectoryPoint,
  dragCurrent: TrajectoryPoint,
  wind: WindState,
  bag: TeaBagPhysics,
  history: { x: number; y: number; time: number }[]
) {
  const totalDx = dragCurrent.x - dragStart.x;
  const totalDy = dragCurrent.y - dragStart.y;
  const totalDist = Math.hypot(totalDx, totalDy);

  let vx = 0;
  let vy = 0;

  if (history.length >= 2) {
    const recent = history[history.length - 1];
    let startPoint = history[0];
    for (let i = history.length - 2; i >= 0; i--) {
      if (recent.time - history[i].time >= 30) {
        startPoint = history[i];
        break;
      }
    }
    const dt = Math.max(recent.time - startPoint.time, 12);
    const dx = recent.x - startPoint.x;
    const dy = recent.y - startPoint.y;
    const scale = 6.2;
    vx = (dx / dt) * scale;
    vy = (dy / dt) * scale;
  }

  // Slingshot / Drag fallbacks
  if (totalDy > 15 && Math.hypot(vx, vy) < 3.5) {
    vx = -totalDx * 0.16;
    vy = -totalDy * 0.18;
  } else if (Math.hypot(vx, vy) < 1.8 && totalDist > 8) {
    vx = totalDx * 0.16;
    vy = totalDy * 0.16;
  }

  if (totalDy < -8 && vy > -3) {
    vy = -Math.max(Math.abs(vy), Math.abs(totalDy) * 0.16);
  }

  const speed = Math.hypot(vx, vy);
  if (speed < 0.8 && totalDist < 8) return;

  let simX = bag.x;
  let simY = bag.y;

  ctx.save();
  ctx.lineWidth = 3;

  for (let step = 0; step < 32; step++) {
    vy += 0.38;
    vx += wind.speed * wind.direction * 0.035;
    vx *= 0.992;
    vy *= 0.992;

    simX += vx;
    simY += vy;

    ctx.fillStyle = `rgba(245, 158, 11, ${1 - step / 32})`;
    ctx.beginPath();
    ctx.arc(simX, simY, Math.max(5 - step * 0.12, 1.5), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawFlickHint(ctx: CanvasRenderingContext2D, bagX: number, bagY: number) {
  const time = performance.now() * 0.003;
  const offsetY = Math.sin(time) * 4;

  ctx.save();
  ctx.translate(bagX + 28, bagY - 44 + offsetY);

  const w = 118;
  const h = 26;
  const r = 13;

  ctx.fillStyle = 'rgba(28, 25, 23, 0.85)';
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
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FLICK TO THROW ↗', 0, 1);

  ctx.restore();
}
