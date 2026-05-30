import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { useNativeAdMob } from './hooks/useAdMob';

/* ── Types ───────────────────────────────────────────────────── */
interface Game {
  id: string;
  name: string;
  description: string;
  genre: string;
  play_url: string;
  embed_type: string;
  thumbnail: string;
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

    interface Star {
      x: number; y: number; r: number; a: number; da: number; speed: number;
    }
    const stars: Star[] = [];
    for (let i = 0; i < 250; i++) {
      stars.push({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 1.8 + 0.3,
        a: Math.random(), da: (Math.random() - 0.5) * 0.02,
        speed: Math.random() * 0.15 + 0.02,
      });
    }

    interface ShootingStar {
      x: number; y: number; vx: number; vy: number; life: number; maxLife: number;
    }
    let shootingStars: ShootingStar[] = [];
    let nextShootTimer = 0;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    window.addEventListener('resize', resize);

    const onMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', onMouse);

    let animId: number;
    const draw = (time: number) => {
      ctx.clearRect(0, 0, w, h);

      // ---- stars ----
      for (const s of stars) {
        s.a += s.da;
        s.y += s.speed;
        if (s.y > h + 5) { s.y = -5; s.x = Math.random() * w; }
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,220,255,${0.2 + Math.abs(Math.sin(s.a)) * 0.6})`;
        ctx.fill();
      }

      // ---- shooting stars ----
      nextShootTimer--;
      if (nextShootTimer <= 0 && shootingStars.length < 3) {
        const sx = Math.random() * w * 0.8 + w * 0.1;
        const sy = Math.random() * h * 0.3;
        const angle = Math.PI * 0.15 + Math.random() * Math.PI * 0.15;
        const spd = 4 + Math.random() * 6;
        shootingStars.push({
          x: sx, y: sy, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
          life: 1, maxLife: 40 + Math.random() * 40,
        });
        nextShootTimer = 80 + Math.random() * 200;
      }
      shootingStars = shootingStars.filter(s => {
        s.x += s.vx; s.y += s.vy;
        s.life -= 1 / s.maxLife;
        if (s.life <= 0 || s.x > w + 20 || s.y > h + 20) return false;
        const tail = 20;
        const grad = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * tail, s.y - s.vy * tail);
        grad.addColorStop(0, `rgba(200,220,255,${s.life})`);
        grad.addColorStop(1, `rgba(200,220,255,0)`);
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * tail, s.y - s.vy * tail);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        return true;
      });

      animId = requestAnimationFrame(draw);
    };
    animId = requestAnimationFrame(draw);

    // ---- spaceship follow cursor ----
    const ship = shipRef.current;
    let shipAnimId: number;
    const moveShip = () => {
      if (!ship) return;
      const m = mouseRef.current;
      const p = shipPosRef.current;
      p.x += (m.x - p.x) * 0.08;
      p.y += (m.y - p.y) * 0.08;
      const dx = m.x - p.x;
      const dy = m.y - p.y;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      ship.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${angle}deg)`;
      shipAnimId = requestAnimationFrame(moveShip);
    };
    shipAnimId = requestAnimationFrame(moveShip);

    return () => {
      cancelAnimationFrame(animId);
      cancelAnimationFrame(shipAnimId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} style={{
        position: 'fixed', inset: 0, zIndex: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
      }} />
      <div ref={shipRef} style={{
        position: 'fixed', zIndex: 1, pointerEvents: 'none',
        top: -20, left: -20,
        width: 40, height: 40,
        transition: 'none',
      }}>
        <svg viewBox="0 0 40 40" width="40" height="40">
          <defs>
            <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#3b82f6" />
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

/* ── Ad Component ────────────────────────────────────────────── */
const BANNER_AD_ID = 'ca-app-pub-5224273312267357/9652833196';

let adCount = 0;
const AdUnit = ({ style = {} }: { style?: React.CSSProperties }) => {
  const id = useRef(`ad-${++adCount}`);
  const isNative = Capacitor.isNativePlatform();

  const { showBanner, removeBanner, isNative: _isNative } = useNativeAdMob(BANNER_AD_ID, isNative);

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

  if (isNative) {
    return null;
  }

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

/* ── Genre Colors ────────────────────────────────────────────── */
const genreColors: Record<string, { bg: string; text: string; glow: string }> = {
  Arcade:      { bg: 'rgba(234,179,8,0.15)',  text: '#eab308',  glow: 'rgba(234,179,8,0.3)' },
  Puzzle:      { bg: 'rgba(168,85,247,0.15)',  text: '#a855f7',  glow: 'rgba(168,85,247,0.3)' },
  Shooting:    { bg: 'rgba(239,68,68,0.15)',   text: '#ef4444',  glow: 'rgba(239,68,68,0.3)' },
  Racing:      { bg: 'rgba(34,197,94,0.15)',   text: '#22c55e',  glow: 'rgba(34,197,94,0.3)' },
  Simulation:  { bg: 'rgba(59,130,246,0.15)',  text: '#3b82f6',  glow: 'rgba(59,130,246,0.3)' },
};
const allGenres = ['Arcade', 'Puzzle', 'Shooting', 'Racing', 'Simulation'];

/* ── Post-Game Screen ────────────────────────────────────────── */
const PostGameScreen = ({ game, onClose }: { game: Game; onClose: () => void }) => {
  const [countdown, setCountdown] = useState(5);
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const gc = genreColors[game.genre] || { bg: 'rgba(100,116,139,0.15)', text: '#94a3b8', glow: 'rgba(100,116,139,0.3)' };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 32, padding: 24,
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ color: '#f1f5f9', fontSize: 28, fontWeight: 800, margin: 0 }}>
          Thanks for playing!
        </h2>
        <span style={{
          display: 'inline-block', marginTop: 8,
          color: gc.text, fontSize: 20, fontWeight: 700,
          background: gc.bg, padding: '4px 20px', borderRadius: 20,
        }}>{game.name}</span>
      </div>
      <div style={{
        width: '100%', maxWidth: 500, minHeight: 200,
        background: 'rgba(30,41,59,0.5)', borderRadius: 16,
        border: '1px solid rgba(71,85,105,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <AdUnit />
      </div>
      <button onClick={onClose} disabled={countdown > 0} style={{
        padding: '14px 40px',
        background: countdown > 0
          ? 'linear-gradient(135deg, #334155, #475569)'
          : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
        color: '#fff', border: 'none', borderRadius: 12,
        fontSize: 16, fontWeight: 700,
        cursor: countdown > 0 ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s',
        opacity: countdown > 0 ? 0.6 : 1,
        boxShadow: countdown > 0 ? 'none' : '0 4px 20px rgba(59,130,246,0.3)',
      }}>
        {countdown > 0 ? `Back to Library (${countdown})` : 'Back to Library'}
      </button>
    </div>
  );
};

/* ── Game Card ───────────────────────────────────────────────── */
const GameCard = ({ game, onPlay }: { game: Game; onPlay: () => void }) => {
  const gc = genreColors[game.genre] || { bg: 'rgba(100,116,139,0.15)', text: '#94a3b8', glow: 'rgba(100,116,139,0.3)' };

  return (
    <div className="game-card" style={{
      background: 'linear-gradient(145deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9))',
      backdropFilter: 'blur(8px)',
      borderRadius: 16, overflow: 'hidden',
      border: '1px solid rgba(71,85,105,0.3)',
      display: 'flex', flexDirection: 'column',
      transition: 'transform 0.3s, box-shadow 0.3s, border-color 0.3s',
      cursor: 'pointer',
      position: 'relative',
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
      <div style={{ height: 150, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(180deg, transparent 50%, rgba(15,23,42,0.9) 100%)`,
          zIndex: 1,
        }} />
        <img src={game.thumbnail} alt={game.name}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', opacity: 0.85, transition: 'opacity 0.3s, transform 0.3s' }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.05)'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'scale(1)'; }}
          onError={e => {
            (e.target as HTMLImageElement).src =
              'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMjAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMWUyOTNiIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZpbGw9IiM2NDc0OGIiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';
          }}
        />
        <span style={{
          position: 'absolute', top: 10, right: 10, zIndex: 2,
          background: gc.bg, color: gc.text,
          fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
          border: `1px solid ${gc.text}33`,
          backdropFilter: 'blur(4px)',
        }}>{game.genre}</span>
      </div>
      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', flex: 1, gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.3 }}>{game.name}</h3>
        <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', lineHeight: 1.5, flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{game.description}</p>
        <button onClick={onPlay} style={{
          marginTop: 4, padding: '10px 0', width: '100%',
          background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
          color: '#fff', border: 'none', borderRadius: 10,
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
          transition: 'all 0.3s',
          letterSpacing: 0.5,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'linear-gradient(135deg, #60a5fa, #818cf8)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(59,130,246,0.4)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6, #6366f1)';
          e.currentTarget.style.boxShadow = 'none';
        }}>
          ▶ Play Now
        </button>
      </div>
    </div>
  );
};

/* ── Loading Skeleton ─────────────────────────────────────────── */
const Skeleton = () => (
  <div className="skeleton" style={{
    background: 'linear-gradient(145deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9))',
    backdropFilter: 'blur(8px)',
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
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [postGame, setPostGame] = useState<Game | null>(null);
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  useEffect(() => {
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

  const handleExitGame = () => {
    if (activeGame) setPostGame(activeGame);
    setActiveGame(null);
  };

  const handleClosePostGame = () => setPostGame(null);

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

      {/* ── Header ── */}
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
                Play free browser games instantly
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

      {/* ── Ad ── */}
      <div style={{ position: 'relative', zIndex: 2, padding: '8px 24px', borderBottom: '1px solid rgba(71,85,105,0.15)', background: 'rgba(10,15,26,0.5)', backdropFilter: 'blur(8px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 728, minHeight: 60, background: 'rgba(30,41,59,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 11 }}>
            <AdUnit />
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
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
                    <GameCard game={game} onPlay={() => setActiveGame(game)} />
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

      {/* ── Footer ── */}
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
            <span style={{ color: '#334155', fontSize: 12 }}>© 2026</span>
          </div>
        </div>
      </footer>

      {/* ── Game Player Modal ── */}
      {activeGame && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100, background: '#000',
          display: 'flex', flexDirection: 'column',
          animation: 'fadeIn 0.2s ease',
        }}>
          <div style={{
            height: 56, background: '#0f172a', borderBottom: '1px solid rgba(71,85,105,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 16px', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={handleExitGame} style={{
                background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8,
                padding: '8px 16px', fontWeight: 700, fontSize: 13,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#ef4444'; }}
              >✕ Exit</button>
              <span style={{ fontWeight: 600, fontSize: 14, color: '#94a3b8' }}>
                Playing: <span style={{ color: '#f1f5f9' }}>{activeGame.name}</span>
              </span>
            </div>
          </div>
          <div style={{ flex: 1, position: 'relative', background: '#000' }}>
            <iframe src={activeGame.play_url} title={activeGame.name}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
              allow="fullscreen; autoplay; keyboard"
              sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-popups"
            />
          </div>
        </div>
      )}

      {postGame && <PostGameScreen game={postGame} onClose={handleClosePostGame} />}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .game-card:hover { z-index: 3; }
        .skeleton { animation: pulse 1.8s ease-in-out infinite; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #0a0f1a; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>
    </div>
  );
};

export default App;
