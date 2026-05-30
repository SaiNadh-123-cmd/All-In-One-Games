import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { useNativeAdMob, useRewardedAd } from './hooks/useAdMob';
import TouchControls from './TouchControls';

/* ── Types ───────────────────────────────────────────────────── */
interface Game {
  id: string;
  name: string;
  description: string;
  genre: string;
  play_url: string;
  embed_type: string;
  thumbnail: string;
  instructions: string;
  controls: string;
  howToPlay: string;
  needsTouchControls?: boolean;
}

interface ScoreMap {
  [gameId: string]: number;
}

/* ── Constants ────────────────────────────────────────────────── */
const BANNER_AD_ID = 'ca-app-pub-5224273312267357/9652833196';
const REWARD_AD_ID = 'ca-app-pub-5224273312267357/2038067050';
const STORAGE_KEY = 'gamevault_best_scores';

function loadScores(): ScoreMap {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}

function saveScores(scores: ScoreMap) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(scores)); } catch { /* ignore */ }
}

function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/* ── Background Animation ────────────────────────────────────── */
const BackgroundAnimation = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shipRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: -200, y: -200 });
  const shipPosRef = useRef({ x: -200, y: -200 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    /* ── Star layers (parallax) ── */
    interface Star { x: number; y: number; r: number; a: number; da: number; speed: number; layer: number; }
    const stars: Star[] = [];
    for (let i = 0; i < 400; i++) {
      const layer = Math.random();
      const l = layer < 0.5 ? 0 : layer < 0.8 ? 1 : 2;
      stars.push({
        x: Math.random() * w, y: Math.random() * h,
        r: l === 0 ? Math.random() * 0.6 + 0.2 : l === 1 ? Math.random() * 1.2 + 0.4 : Math.random() * 2 + 0.6,
        a: Math.random() * Math.PI * 2,
        da: (Math.random() - 0.5) * 0.01,
        speed: l === 0 ? 0.05 : l === 1 ? 0.15 : 0.35,
        layer: l,
      });
    }

    /* ── Nebula clouds ── */
    interface Nebula { x: number; y: number; r: number; color: string; speedX: number; speedY: number; alpha: number; }
    const nebulae: Nebula[] = [
      { x: w * 0.2, y: h * 0.3, r: 200, color: '#3b82f6', speedX: 0.08, speedY: 0.04, alpha: 0.04 },
      { x: w * 0.7, y: h * 0.6, r: 250, color: '#8b5cf6', speedX: -0.06, speedY: 0.05, alpha: 0.035 },
      { x: w * 0.5, y: h * 0.2, r: 180, color: '#ec4899', speedX: 0.05, speedY: -0.03, alpha: 0.03 },
      { x: w * 0.8, y: h * 0.8, r: 220, color: '#06b6d4', speedX: -0.04, speedY: -0.06, alpha: 0.025 },
    ];

    /* ── Enemy ships ── */
    interface EnemyShip {
      x: number; y: number; vx: number; vy: number; w: number; h: number;
      angle: number; targetAngle: number; timer: number; color: string; health: number;
      fireTimer: number; fireRate: number; flash: number;
    }

    const shipColors = ['#ef4444', '#f59e0b', '#10b981', '#ec4899', '#06b6d4', '#f97316'];
    const enemyShips: EnemyShip[] = [];
    for (let i = 0; i < 5; i++) {
      const side = Math.floor(Math.random() * 4);
      let x: number, y: number;
      if (side === 0) { x = -80; y = Math.random() * h; }
      else if (side === 1) { x = w + 80; y = Math.random() * h; }
      else if (side === 2) { x = Math.random() * w; y = -60; }
      else { x = Math.random() * w; y = h + 60; }
      enemyShips.push({
        x, y,
        vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
        w: 18 + Math.random() * 14, h: 12 + Math.random() * 10,
        angle: Math.random() * Math.PI * 2,
        targetAngle: Math.random() * Math.PI * 2,
        timer: Math.random() * 200,
        color: shipColors[i % shipColors.length],
        health: 1,
        fireTimer: Math.random() * 100,
        fireRate: 60 + Math.random() * 100,
        flash: 0,
      });
    }

    /* ── Projectiles ── */
    interface Projectile {
      x: number; y: number; vx: number; vy: number;
      color: string; life: number; maxLife: number; r: number; fromPlayer: boolean;
    }
    const projectiles: Projectile[] = [];

    /* ── Explosions ── */
    interface Explosion {
      x: number; y: number; particles: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; r: number }[];
    }
    const explosions: Explosion[] = [];

    /* ── Shooting stars ── */
    interface ShootingStar { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; }
    let shootingStars: ShootingStar[] = [];
    let nextShootTimer = 0;

    /* ── Resize ── */
    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w; canvas.height = h;
    };
    window.addEventListener('resize', resize);

    /* ── Mouse ── */
    const onMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', onMouse);

    /* ── Draw ship shape ── */
    function drawShip(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size: number, color: string, flash: number) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      const s = size;
      const bodyColor = flash > 0 ? '#fff' : color;

      ctx.shadowColor = flash > 0 ? '#fff' : color;
      ctx.shadowBlur = flash > 0 ? 20 : 8;

      ctx.beginPath();
      ctx.moveTo(s * 1, 0);
      ctx.lineTo(s * -0.6, s * -0.5);
      ctx.lineTo(s * -0.3, 0);
      ctx.lineTo(s * -0.6, s * 0.5);
      ctx.closePath();
      ctx.fillStyle = bodyColor;
      ctx.fill();

      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.moveTo(s * 0.6, 0);
      ctx.lineTo(s * -0.2, s * -0.35);
      ctx.lineTo(s * -0.1, 0);
      ctx.lineTo(s * -0.2, s * 0.35);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(s * 0.15, 0, s * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = flash > 0 ? '#fff' : 'rgba(200,230,255,0.9)';
      ctx.fill();

      ctx.shadowColor = '#ff6b35';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(s * -0.6, s * -0.1);
      ctx.lineTo(s * -1.2, s * -0.2);
      ctx.lineTo(s * -1.2, s * 0.2);
      ctx.lineTo(s * -0.6, s * 0.1);
      ctx.closePath();
      ctx.fillStyle = flash > 0 ? '#ffaa44' : '#ff6b35';
      ctx.globalAlpha = 0.3 + Math.random() * 0.4;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      ctx.restore();
    }

    /* ── Create explosion ── */
    function createExplosion(x: number, y: number, color: string, count: number) {
      const particles: Explosion['particles'][0][] = [];
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 4;
        const colors = [color, '#ff6b35', '#ffd700', '#fff', '#ff4444'];
        particles.push({
          x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          life: 1, maxLife: 20 + Math.random() * 30,
          color: colors[Math.floor(Math.random() * colors.length)],
          r: 1.5 + Math.random() * 3,
        });
      }
      explosions.push({ x, y, particles });
    }

    /* ── Main draw loop ── */
    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      /* ── Nebula ── */
      for (const n of nebulae) {
        n.x += n.speedX; n.y += n.speedY;
        if (n.x < -n.r) n.x = w + n.r; if (n.x > w + n.r) n.x = -n.r;
        if (n.y < -n.r) n.y = h + n.r; if (n.y > h + n.r) n.y = -n.r;
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
        grad.addColorStop(0, n.color + Math.round(n.alpha * 255).toString(16).padStart(2, '0'));
        grad.addColorStop(0.5, n.color + Math.round(n.alpha * 0.5 * 255).toString(16).padStart(2, '0'));
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
      }

      /* ── Stars ── */
      for (const s of stars) {
        s.a += s.da; s.y += s.speed;
        if (s.y > h + 5) { s.y = -5; s.x = Math.random() * w; }
        const twinkle = 0.3 + Math.abs(Math.sin(s.a)) * 0.7;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${twinkle})`;
        ctx.fill();
      }

      /* ── Enemy AI ── */
      const playerX = shipPosRef.current.x;
      const playerY = shipPosRef.current.y;

      for (const ship of enemyShips) {
        ship.timer--;
        ship.fireTimer--;
        if (ship.flash > 0) ship.flash--;

        if (ship.timer <= 0) {
          ship.targetAngle = Math.random() * Math.PI * 2;
          ship.vx = Math.cos(ship.targetAngle) * (0.2 + Math.random() * 0.4);
          ship.vy = Math.sin(ship.targetAngle) * (0.2 + Math.random() * 0.4);
          ship.timer = 100 + Math.random() * 200;
        }

        ship.angle += (ship.targetAngle - ship.angle) * 0.02;
        ship.x += ship.vx; ship.y += ship.vy;

        if (ship.x < -100) { ship.x = -100; ship.vx *= -1; ship.targetAngle = Math.atan2(ship.vy, -ship.vx); }
        if (ship.x > w + 100) { ship.x = w + 100; ship.vx *= -1; ship.targetAngle = Math.atan2(ship.vy, -ship.vx); }
        if (ship.y < -80) { ship.y = -80; ship.vy *= -1; ship.targetAngle = Math.atan2(-ship.vy, ship.vx); }
        if (ship.y > h + 80) { ship.y = h + 80; ship.vy *= -1; ship.targetAngle = Math.atan2(-ship.vy, ship.vx); }

        /* Shoot at player */
        if (ship.fireTimer <= 0 && playerX > 0 && playerY > 0) {
          const dx = playerX - ship.x;
          const dy = playerY - ship.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 600) {
            const speed = 2.5 + Math.random() * 0.5;
            const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.15;
            projectiles.push({
              x: ship.x, y: ship.y,
              vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
              color: ship.color, life: 1, maxLife: 80,
              r: 2.5, fromPlayer: false,
            });
          }
          ship.fireTimer = ship.fireRate * (0.5 + Math.random() * 0.5);
        }

        drawShip(ctx, ship.x, ship.y, ship.angle + Math.PI / 2, ship.w / 10, ship.color, ship.flash);
      }

      /* ── Player ship shoots back ── */
      const ms = mouseRef.current;
      if (ms.x > 0 && ms.y > 0 && Math.random() < 0.02) {
        const target = enemyShips.reduce((closest, s) => {
          const dx = s.x - playerX; const dy = s.y - playerY;
          const dist = dx * dx + dy * dy;
          return dist < closest.dist ? { ship: s, dist } : closest;
        }, { ship: null as EnemyShip | null, dist: Infinity });
        if (target.ship && target.dist < 500 * 500) {
          const dx = target.ship.x - playerX;
          const dy = target.ship.y - playerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const speed = 4;
          projectiles.push({
            x: playerX, y: playerY,
            vx: (dx / dist) * speed, vy: (dy / dist) * speed,
            color: '#60a5fa', life: 1, maxLife: 60,
            r: 2, fromPlayer: true,
          });
        }
      }

      /* ── Projectiles ── */
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.x += p.vx; p.y += p.vy; p.life -= 1 / p.maxLife;
        if (p.life <= 0 || p.x < -50 || p.x > w + 50 || p.y < -50 || p.y > h + 50) {
          projectiles.splice(i, 1);
          continue;
        }
        ctx.shadowColor = p.fromPlayer ? '#60a5fa' : p.color;
        ctx.shadowBlur = 15;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.fromPlayer ? '#60a5fa' : p.color;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();

        /* hit detection */
        let removed = false;
        if (!p.fromPlayer) {
          const dx = p.x - playerX; const dy = p.y - playerY;
          if (Math.sqrt(dx * dx + dy * dy) < 20) {
            createExplosion(p.x, p.y, '#60a5fa', 15);
            projectiles.splice(i, 1);
            removed = true;
          }
        } else {
          for (const ship of enemyShips) {
            const dx = p.x - ship.x; const dy = p.y - ship.y;
            if (Math.sqrt(dx * dx + dy * dy) < ship.w / 2) {
              ship.flash = 8;
              createExplosion(p.x, p.y, ship.color, 12);
              projectiles.splice(i, 1);
              removed = true;
              break;
            }
          }
        }
      }

      /* ── Explosions ── */
      for (let i = explosions.length - 1; i >= 0; i--) {
        const exp = explosions[i];
        let alive = false;
        for (const pt of exp.particles) {
          pt.x += pt.vx; pt.y += pt.vy;
          pt.vx *= 0.98; pt.vy *= 0.98;
          pt.life -= 1 / pt.maxLife;
          if (pt.life > 0) {
            alive = true;
            ctx.globalAlpha = pt.life;
            ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r * pt.life, 0, Math.PI * 2);
            ctx.fillStyle = pt.color;
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
        if (!alive) explosions.splice(i, 1);
      }

      /* ── Shooting stars ── */
      nextShootTimer--;
      if (nextShootTimer <= 0 && shootingStars.length < 2) {
        const sx = Math.random() * w * 0.6 + w * 0.2;
        const sy = Math.random() * h * 0.2;
        const angle = Math.PI * 0.2 + Math.random() * Math.PI * 0.1;
        const spd = 6 + Math.random() * 8;
        shootingStars.push({
          x: sx, y: sy, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
          life: 1, maxLife: 30 + Math.random() * 30,
        });
        nextShootTimer = 100 + Math.random() * 300;
      }
      shootingStars = shootingStars.filter(s => {
        s.x += s.vx; s.y += s.vy; s.life -= 1 / s.maxLife;
        if (s.life <= 0 || s.x > w + 20 || s.y > h + 20) return false;
        const tail = 30;
        const grad = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * tail, s.y - s.vy * tail);
        grad.addColorStop(0, `rgba(255,255,255,${s.life})`);
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath(); ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * tail, s.y - s.vy * tail);
        ctx.strokeStyle = grad; ctx.lineWidth = 2; ctx.stroke();
        return true;
      });

      animId = requestAnimationFrame(draw);
    };
    animId = requestAnimationFrame(draw);

    /* ── Player ship DOM animation ── */
    const ship = shipRef.current;
    let shipAnimId: number;
    const moveShip = () => {
      if (!ship) return;
      const m = mouseRef.current; const p = shipPosRef.current;
      p.x += (m.x - p.x) * 0.08; p.y += (m.y - p.y) * 0.08;
      const dx = m.x - p.x; const dy = m.y - p.y;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      ship.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${angle}deg)`;
      shipAnimId = requestAnimationFrame(moveShip);
    };
    shipAnimId = requestAnimationFrame(moveShip);

    return () => {
      cancelAnimationFrame(animId); cancelAnimationFrame(shipAnimId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} style={{
        position: 'fixed', inset: 0, zIndex: 0,
        width: '100%', height: '100%', pointerEvents: 'none',
      }} />
      <div ref={shipRef} style={{
        position: 'fixed', zIndex: 1, pointerEvents: 'none',
        top: -20, left: -20, width: 40, height: 40,
      }}>
        <svg viewBox="0 0 40 40" width="40" height="40">
          <defs>
            <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" /><stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
          <polygon points="20,2 30,32 20,26 10,32" fill="url(#bodyGrad)" opacity="0.95" />
          <polygon points="20,8 26,28 20,24 14,28" fill="#93c5fd" opacity="0.7" />
          <polygon points="20,4 23,14 20,12 17,14" fill="#bfdbfe" opacity="0.5" />
          <ellipse cx="20" cy="20" rx="3" ry="5" fill="#fff" opacity="0.9" />
          <circle cx="20" cy="18" r="1.5" fill="#0f172a" />
          <polygon points="12,30 20,26 28,30 24,34 20,30 16,34" fill="#1e40af" opacity="0.8" />
        </svg>
      </div>
    </>
  );
};

/* ── Genre Colors ────────────────────────────────────────────── */
const genreColors: Record<string, { bg: string; text: string; glow: string }> = {
  Arcade:      { bg: 'rgba(234,179,8,0.15)',  text: '#eab308',  glow: 'rgba(234,179,8,0.3)' },
  Puzzle:      { bg: 'rgba(168,85,247,0.15)',  text: '#a855f7',  glow: 'rgba(168,85,247,0.3)' },
  Shooting:    { bg: 'rgba(239,68,68,0.15)',   text: '#ef4444',  glow: 'rgba(239,68,68,0.3)' },
  Racing:      { bg: 'rgba(34,197,94,0.15)',   text: '#22c55e',  glow: 'rgba(34,197,94,0.3)' },
  Simulation:  { bg: 'rgba(59,130,246,0.15)',  text: '#3b82f6',  glow: 'rgba(59,130,246,0.3)' },
  FPS:         { bg: 'rgba(239,68,68,0.15)',   text: '#ef4444',  glow: 'rgba(239,68,68,0.3)' },
};
const allGenres = ['Arcade', 'Puzzle', 'Shooting', 'Racing', 'Simulation', 'FPS'];

/* ── Ad Component ────────────────────────────────────────────── */
const AdUnit = ({ style = {} }: { style?: React.CSSProperties }) => {
  const id = useRef(`ad-${Date.now()}-${Math.random()}`);
  const isNative = Capacitor.isNativePlatform();
  const { showBanner, removeBanner } = useNativeAdMob(BANNER_AD_ID, isNative);

  useEffect(() => {
    if (isNative) {
      showBanner();
      return () => { removeBanner(); };
    } else {
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      } catch { /* ignore */ }
    }
  }, [isNative, showBanner, removeBanner]);

  if (isNative) return null;

  return (
    <div id={id.current} style={{ width: '100%', ...style }}>
      <ins className="adsbygoogle" style={{ display: 'block', width: '100%' }}
        data-ad-client="ca-pub-5224273312267357"
        data-ad-slot="9181079962"
        data-ad-format="auto"
        data-full-width-responsive="true" />
    </div>
  );
};

/* ── Instructions Modal ──────────────────────────────────────── */
const InstructionsModal = ({ game, onStart, onBack }: { game: Game; onStart: () => void; onBack: () => void }) => {
  const gc = genreColors[game.genre] || { bg: 'rgba(100,116,139,0.15)', text: '#94a3b8' };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 150,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        maxWidth: 520, width: '100%',
        background: 'linear-gradient(145deg, #1e293b, #0f172a)',
        borderRadius: 20, border: '1px solid rgba(71,85,105,0.4)',
        padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: gc.bg, border: `1px solid ${gc.text}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
          }}>{game.name.charAt(0)}</div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#f1f5f9' }}>{game.name}</h2>
            <span style={{ color: gc.text, fontSize: 12, fontWeight: 600, background: gc.bg, padding: '2px 10px', borderRadius: 10 }}>{game.genre}</span>
          </div>
        </div>

        <div style={{ background: 'rgba(30,41,59,0.5)', borderRadius: 12, padding: 16 }}>
          <p style={{ margin: 0, color: '#cbd5e1', fontSize: 14, lineHeight: 1.6 }}>{game.howToPlay || game.instructions}</p>
        </div>

        <div style={{ background: 'rgba(59,130,246,0.08)', borderRadius: 12, padding: '12px 16px', border: '1px solid rgba(59,130,246,0.2)' }}>
          <span style={{ color: '#60a5fa', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Controls</span>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 13 }}>{game.controls}</p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onBack} style={{
            flex: 1, padding: '14px 0',
            background: 'rgba(71,85,105,0.3)', color: '#94a3b8',
            border: '1px solid rgba(71,85,105,0.4)', borderRadius: 12,
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>Back</button>
          <button onClick={onStart} style={{
            flex: 2, padding: '14px 0',
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            color: '#fff', border: 'none', borderRadius: 12,
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(59,130,246,0.3)',
          }}>Play Now</button>
        </div>
      </div>
    </div>
  );
};

/* ── Score Display ───────────────────────────────────────────── */
const ScoreBadge = ({ score }: { score: number }) => {
  if (score <= 0) return null;
  return (
    <span style={{
      position: 'absolute', bottom: 8, right: 8, zIndex: 2,
      background: 'rgba(234,179,8,0.15)', color: '#eab308',
      fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 8,
      border: '1px solid rgba(234,179,8,0.3)',
    }}>Best: {score}</span>
  );
};

/* ── Continue / Reward Modal ─────────────────────────────────── */
const ContinueModal = ({ game, onWatchAd, onClose, canWatch }: { game: Game; onWatchAd: () => void; onClose: () => void; canWatch: boolean }) => {
  const gc = genreColors[game.genre] || { bg: 'rgba(100,116,139,0.15)', text: '#94a3b8' };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 28, padding: 24,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>😢</div>
        <h2 style={{ color: '#f1f5f9', fontSize: 26, fontWeight: 800, margin: 0 }}>
          Game Over!
        </h2>
        <span style={{
          display: 'inline-block', marginTop: 8,
          color: gc.text, fontSize: 18, fontWeight: 700,
          background: gc.bg, padding: '4px 20px', borderRadius: 20,
        }}>{game.name}</span>
      </div>

      <div style={{
        width: '100%', maxWidth: 500, minHeight: 160,
        background: 'rgba(30,41,59,0.5)', borderRadius: 16,
        border: '1px solid rgba(71,85,105,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
        gap: 12, padding: 20,
      }}>
        {canWatch ? (
          <>
            <p style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', margin: 0 }}>
              Want to continue playing? Watch a short ad to respawn!
            </p>
            <button onClick={onWatchAd} style={{
              padding: '14px 36px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#fff', border: 'none', borderRadius: 12,
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(245,158,11,0.3)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>🎬</span> Watch Ad to Continue
            </button>
          </>
        ) : (
          <p style={{ color: '#64748b', fontSize: 13, textAlign: 'center', margin: 0 }}>
            Come back later to continue with an ad.
          </p>
        )}
      </div>

      <button onClick={onClose} style={{
        padding: '14px 40px',
        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
        color: '#fff', border: 'none', borderRadius: 12,
        fontSize: 16, fontWeight: 700, cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(59,130,246,0.3)',
      }}>
        Back to Library
      </button>
    </div>
  );
};

/* ── Game Card ───────────────────────────────────────────────── */
const GameCard = ({ game, onPlay, bestScore }: { game: Game; onPlay: () => void; bestScore: number }) => {
  const gc = genreColors[game.genre] || { bg: 'rgba(100,116,139,0.15)', text: '#94a3b8' };

  return (
    <div className="game-card" style={{
      background: 'linear-gradient(145deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9))',
      backdropFilter: 'blur(8px)',
      borderRadius: 16, overflow: 'hidden',
      border: '1px solid rgba(71,85,105,0.3)',
      display: 'flex', flexDirection: 'column',
      transition: 'transform 0.3s, box-shadow 0.3s, border-color 0.3s',
      cursor: 'pointer', position: 'relative',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.transform = 'translateY(-6px)';
      e.currentTarget.style.boxShadow = `0 12px 40px ${gc.glow}`;
      e.currentTarget.style.borderColor = gc.text;
    }}
    onMouseLeave={e => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
      e.currentTarget.style.borderColor = 'rgba(71,85,105,0.3)';
    }}
    >
      <div style={{
        height: 150, background: '#0f172a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, transparent 50%, rgba(15,23,42,0.9) 100%)',
          zIndex: 1,
        }} />
        <img src={game.thumbnail} alt={game.name} loading="lazy"
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', opacity: 0.85 }}
          onError={e => {
            (e.target as HTMLImageElement).src =
              'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMjAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMWUyOTNiIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZpbGw9IiM2NDc0OGIiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+R2FtZTwvdGV4dD48L3N2Zz4=';
          }}
        />
        <span style={{
          position: 'absolute', top: 10, right: 10, zIndex: 2,
          background: gc.bg, color: gc.text,
          fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
          border: `1px solid ${gc.text}33`, backdropFilter: 'blur(4px)',
        }}>{game.genre}</span>
        <ScoreBadge score={bestScore} />
      </div>
      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', flex: 1, gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.3 }}>{game.name}</h3>
        <p style={{
          margin: 0, fontSize: 12, color: '#94a3b8', lineHeight: 1.5, flex: 1,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{game.description}</p>
        <button onClick={onPlay} style={{
          marginTop: 4, padding: '10px 0', width: '100%',
          background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
          color: '#fff', border: 'none', borderRadius: 10,
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
          transition: 'all 0.3s', letterSpacing: 0.5,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'linear-gradient(135deg, #60a5fa, #818cf8)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(59,130,246,0.4)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6, #6366f1)';
          e.currentTarget.style.boxShadow = 'none';
        }}>
          Play Now
        </button>
      </div>
    </div>
  );
};

/* ── Loading Skeleton ─────────────────────────────────────────── */
const Skeleton = () => (
  <div className="skeleton" style={{
    background: 'linear-gradient(145deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9))',
    borderRadius: 16, overflow: 'hidden',
    border: '1px solid rgba(71,85,105,0.3)',
  }}>
    <div style={{ height: 150, background: 'rgba(30,41,59,0.5)' }} />
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ height: 14, width: '60%', background: 'rgba(30,41,59,0.5)', borderRadius: 4 }} />
      <div style={{ height: 10, width: '90%', background: 'rgba(30,41,59,0.5)', borderRadius: 4 }} />
      <div style={{ height: 10, width: '70%', background: 'rgba(30,41,59,0.5)', borderRadius: 4 }} />
      <div style={{ height: 36, width: '100%', background: 'rgba(30,41,59,0.5)', borderRadius: 10, marginTop: 4 }} />
    </div>
  </div>
);

/* ── Empty State ─────────────────────────────────────────────── */
const EmptyState = ({ query }: { query: string }) => (
  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', position: 'relative', zIndex: 2 }}>
    <div style={{ fontSize: 48, marginBottom: 16 }}>🎮</div>
    <h3 style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>No games found</h3>
    <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
      {query ? `No games matching "${query}"` : 'Try a different genre filter'}
    </p>
  </div>
);

/* ── Main App ────────────────────────────────────────────────── */
const App = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  const [pendingGame, setPendingGame] = useState<Game | null>(null);
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [showContinue, setShowContinue] = useState<Game | null>(null);
  const [scores, setScores] = useState<ScoreMap>({});
  const [iframeError, setIframeError] = useState(false);
  const [canWatchReward, setCanWatchReward] = useState(false);

  const [lastScore, setLastScore] = useState(0);
  const rewardAd = useRewardedAd(REWARD_AD_ID, Capacitor.isNativePlatform());

  useEffect(() => {
    setScores(loadScores());
    fetch('/games-database.json')
      .then(r => r.json())
      .then(data => { setGames(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return games.filter(g => {
      const matchSearch = !search || g.name.toLowerCase().includes(search.toLowerCase()) || g.description.toLowerCase().includes(search.toLowerCase());
      const matchGenre = !selectedGenre || g.genre === selectedGenre;
      return matchSearch && matchGenre;
    });
  }, [games, search, selectedGenre]);

  const handlePlay = (game: Game) => {
    setPendingGame(game);
    setIframeError(false);
  };

  const handleStartGame = () => {
    if (pendingGame) {
      setActiveGame(pendingGame);
      setPendingGame(null);
      setCanWatchReward(true);
    }
  };

  const handleExitGame = () => {
    if (activeGame) {
      const g = activeGame;
      setActiveGame(null);
      setShowContinue(g);
      if (Capacitor.isNativePlatform()) {
        rewardAd.prepareReward();
      }
    }
  };

  const handleWatchAd = async () => {
    if (!showContinue) return;
    if (Capacitor.isNativePlatform()) {
      const watched = await rewardAd.showRewarded();
      if (watched) {
        setActiveGame(showContinue);
        setShowContinue(null);
      }
    } else {
      setActiveGame(showContinue);
      setShowContinue(null);
    }
  };

  const handleCloseContinue = () => {
    setShowContinue(null);
    setCanWatchReward(true);
  };

  const handleSetScore = (gameId: string, score: number) => {
    const updated = { ...scores };
    if (!updated[gameId] || score > updated[gameId]) {
      updated[gameId] = score;
      setScores(updated);
      saveScores(updated);
    }
    setLastScore(score);
  };

  const handleIframeError = () => {
    setIframeError(true);
  };

  const openInBrowser = (url: string) => {
    window.open(url, '_blank');
  };

  const adPositions = useMemo(() => {
    const positions: number[] = [];
    for (let i = 6; i < filtered.length; i += 6) {
      if (i < filtered.length) positions.push(i);
    }
    return positions;
  }, [filtered.length]);

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: '#0a0f1a', color: '#f1f5f9', fontFamily: 'Inter, system-ui, -apple-system, sans-serif', position: 'relative' }}>

      <BackgroundAnimation />

      <header style={{
        position: 'relative', zIndex: 2,
        background: 'linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(30,41,59,0.7) 50%, rgba(15,23,42,0.85) 100%)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(71,85,105,0.2)',
        padding: '32px 24px 24px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 800, color: '#fff',
              boxShadow: '0 4px 20px rgba(59,130,246,0.3)',
            }}>G</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, background: 'linear-gradient(135deg, #f1f5f9, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                GameVault
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                {isMobileDevice() ? 'Tap any game, read instructions, then play!' : 'Play free browser games instantly'}
              </p>
            </div>
          </div>
          <div style={{ position: 'relative', maxWidth: 500, marginBottom: 16 }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: 16, pointerEvents: 'none' }}>🔍</span>
            <input type="text" placeholder="Search games..." value={search} onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '12px 16px 12px 44px',
                background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(71,85,105,0.3)',
                borderRadius: 12, color: '#f1f5f9', fontSize: 14, outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 20px rgba(59,130,246,0.15)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(71,85,105,0.3)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setSelectedGenre(null)} style={{
              padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: '1px solid rgba(71,85,105,0.4)',
              background: !selectedGenre ? '#3b82f6' : 'transparent',
              color: !selectedGenre ? '#fff' : '#94a3b8',
              cursor: 'pointer', transition: 'all 0.2s',
            }}>All</button>
            {allGenres.map(g => {
              const gc = genreColors[g] || { text: '#94a3b8' };
              return (
                <button key={g} onClick={() => setSelectedGenre(selectedGenre === g ? null : g)} style={{
                  padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  border: `1px solid ${selectedGenre === g ? gc.text : 'rgba(71,85,105,0.4)'}`,
                  background: selectedGenre === g ? `${gc.text}22` : 'transparent',
                  color: selectedGenre === g ? gc.text : '#94a3b8',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}>{g}</button>
              );
            })}
          </div>
        </div>
      </header>

      <div style={{ position: 'relative', zIndex: 2, padding: '8px 24px', borderBottom: '1px solid rgba(71,85,105,0.15)', background: 'rgba(10,15,26,0.5)', backdropFilter: 'blur(8px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 728, minHeight: 60, background: 'rgba(30,41,59,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 11 }}>
            <AdUnit />
          </div>
        </div>
      </div>

      <main style={{ position: 'relative', zIndex: 2, maxWidth: 1200, margin: '0 auto', padding: '28px 24px 60px' }}>
        {!loading && (
          <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b' }}>
            {filtered.length} {filtered.length === 1 ? 'game' : 'games'} found
            {selectedGenre && <span> in <span style={{ color: (genreColors[selectedGenre] || {}).text || '#94a3b8' }}>{selectedGenre}</span></span>}
          </p>
        )}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 20,
        }}>
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} />)
            : filtered.length === 0
              ? <EmptyState query={search} />
              : filtered.map((game, i) => (
                  <React.Fragment key={game.id}>
                    <GameCard game={game} onPlay={() => handlePlay(game)} bestScore={scores[game.id] || 0} />
                    {adPositions.includes(i + 1) && (
                      <div style={{ gridColumn: '1 / -1', minHeight: 60, background: 'rgba(30,41,59,0.15)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '100%', maxWidth: 728 }}>
                          <AdUnit />
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                ))
          }
        </div>
      </main>

      <footer style={{
        position: 'relative', zIndex: 2,
        borderTop: '1px solid rgba(71,85,105,0.15)',
        padding: '20px 24px',
        background: 'rgba(10,15,26,0.5)',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#475569' }}>GameVault</span>
            <span style={{ color: '#334155', fontSize: 12 }}>•</span>
            <span style={{ color: '#475569', fontSize: 12 }}>Free browser games</span>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {Object.keys(scores).length > 0 && (
              <span style={{ color: '#475569', fontSize: 12 }}>
                {Object.keys(scores).length} game{Object.keys(scores).length !== 1 && 's'} played
              </span>
            )}
            <span style={{ color: '#334155', fontSize: 12 }}>2026</span>
          </div>
        </div>
      </footer>

      {pendingGame && !activeGame && (
        <InstructionsModal
          game={pendingGame}
          onStart={handleStartGame}
          onBack={() => setPendingGame(null)}
        />
      )}

      {activeGame && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100, background: '#000',
          display: 'flex', flexDirection: 'column',
          animation: 'fadeIn 0.2s ease',
        }}>
          <div style={{
            height: isMobileDevice() ? 48 : 56,
            background: '#0f172a', borderBottom: '1px solid rgba(71,85,105,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 12px 0 16px', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
              <button onClick={handleExitGame} style={{
                background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8,
                padding: isMobileDevice() ? '6px 12px' : '8px 16px',
                fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#ef4444'; }}
              >Exit</button>
              <span style={{
                fontWeight: 600, fontSize: isMobileDevice() ? 12 : 14,
                color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {activeGame.name}
              </span>
            </div>
            {iframeError && (
              <button onClick={() => openInBrowser(activeGame.play_url)} style={{
                background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
                border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8,
                padding: '6px 12px', fontWeight: 700, fontSize: 12, cursor: 'pointer',
              }}>Open in Browser</button>
            )}
          </div>
          <div style={{ flex: 1, position: 'relative', background: '#000', overflow: 'hidden' }}>
            {iframeError ? (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 16, padding: 24, textAlign: 'center',
              }}>
                <div style={{ fontSize: 48 }}>⚠️</div>
                <h3 style={{ color: '#f1f5f9', margin: 0, fontSize: 18 }}>Game could not load</h3>
                <p style={{ color: '#94a3b8', fontSize: 13, margin: 0, maxWidth: 400 }}>
                  This game may not support embedding. Try opening it directly in your browser.
                </p>
                <button onClick={() => openInBrowser(activeGame.play_url)} style={{
                  padding: '12px 28px',
                  background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                  color: '#fff', border: 'none', borderRadius: 10,
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}>Open in Browser</button>
              </div>
            ) : (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <iframe
                  key={activeGame.id + '-' + Date.now()}
                  src={activeGame.play_url}
                  title={activeGame.name}
                  style={{
                    width: '100%', height: '100%', border: 'none',
                    maxWidth: isMobileDevice() ? '100%' : 960,
                    maxHeight: '100%',
                  }}
                  allow="fullscreen; autoplay; keyboard"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-popups"
                  onError={handleIframeError}
                />
                <TouchControls visible={!!activeGame.needsTouchControls} />
              </div>
            )}
          </div>
        </div>
      )}

      {showContinue && (
        <ContinueModal
          game={showContinue}
          onWatchAd={handleWatchAd}
          onClose={handleCloseContinue}
          canWatch={canWatchReward}
        />
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }
        .game-card:hover { z-index: 3; }
        .skeleton { animation: pulse 1.8s ease-in-out infinite; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0a0f1a; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #475569; }
        @media (max-width: 480px) {
          .game-card { border-radius: 12px; }
        }
      `}</style>
    </div>
  );
};

export default App;
