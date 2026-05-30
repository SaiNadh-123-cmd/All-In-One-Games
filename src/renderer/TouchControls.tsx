import React, { useEffect, useRef, useCallback } from 'react';

interface TouchControlsProps {
  visible: boolean;
  onGameFrame?: (iframe: HTMLIFrameElement | null) => void;
}

const TouchControls: React.FC<TouchControlsProps> = ({ visible, onGameFrame }) => {
  const pressedKeys = useRef<Set<string>>(new Set());

  const getDoc = useCallback(() => {
    const iframe = document.querySelector<HTMLIFrameElement>('iframe[title]');
    return iframe?.contentDocument || iframe?.contentWindow?.document || null;
  }, []);

  const dispatchKey = useCallback((key: string, type: 'keydown' | 'keyup') => {
    const doc = getDoc();
    if (!doc) return;
    const keyCode = key === ' ' ? 32 : key === 'ArrowLeft' ? 37 : key === 'ArrowUp' ? 38 : key === 'ArrowRight' ? 39 : key === 'ArrowDown' ? 40 : 0;
    const ev = new KeyboardEvent(type, {
      key, code: key === ' ' ? 'Space' : key,
      keyCode, which: keyCode,
      bubbles: true, cancelable: true,
    });
    doc.dispatchEvent(ev);
  }, [getDoc]);

  useEffect(() => {
    if (!visible) { pressedKeys.current.clear(); return; }

    const handleStart = (e: Event, key: string) => {
      e.preventDefault();
      if (pressedKeys.current.has(key)) return;
      pressedKeys.current.add(key);
      dispatchKey(key, 'keydown');
    };

    const handleEnd = (key: string) => {
      if (!pressedKeys.current.has(key)) return;
      pressedKeys.current.delete(key);
      dispatchKey(key, 'keyup');
    };

    const btns = document.querySelectorAll<HTMLButtonElement>('.tc-btn');
    const handlers: Array<{ el: HTMLButtonElement; key: string; onStart: (e: Event) => void; onEnd: () => void }> = [];

    btns.forEach(btn => {
      const key = btn.dataset.key;
      if (!key) return;
      const onStart = (e: Event) => handleStart(e, key);
      const onEnd = () => handleEnd(key);
      btn.addEventListener('mousedown', onStart);
      btn.addEventListener('mouseup', onEnd);
      btn.addEventListener('mouseleave', onEnd);
      btn.addEventListener('touchstart', onStart, { passive: false });
      btn.addEventListener('touchend', onEnd);
      btn.addEventListener('touchcancel', onEnd);
      handlers.push({ el: btn, key, onStart, onEnd });
    });

    return () => {
      handlers.forEach(({ el, onStart, onEnd }) => {
        el.removeEventListener('mousedown', onStart);
        el.removeEventListener('mouseup', onEnd);
        el.removeEventListener('mouseleave', onEnd);
        el.removeEventListener('touchstart', onStart as any);
        el.removeEventListener('touchend', onEnd);
        el.removeEventListener('touchcancel', onEnd);
      });
      pressedKeys.current.clear();
    };
  }, [visible, dispatchKey]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 50,
      display: 'flex', justifyContent: 'space-between', padding: '8px 16px 16px',
      pointerEvents: 'none',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, pointerEvents: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button className="tc-btn" data-key="ArrowUp" style={{
            width: 56, height: 56, borderRadius: 14,
            border: '1px solid rgba(148,163,184,0.3)',
            background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(8px)',
            color: '#94a3b8', fontSize: 22, cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}>▲</button>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="tc-btn" data-key="ArrowLeft" style={{
            width: 56, height: 56, borderRadius: 14,
            border: '1px solid rgba(148,163,184,0.3)',
            background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(8px)',
            color: '#94a3b8', fontSize: 22, cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}>◀</button>
          <button className="tc-btn" data-key="ArrowDown" style={{
            width: 56, height: 56, borderRadius: 14,
            border: '1px solid rgba(148,163,184,0.3)',
            background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(8px)',
            color: '#94a3b8', fontSize: 22, cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}>▼</button>
          <button className="tc-btn" data-key="ArrowRight" style={{
            width: 56, height: 56, borderRadius: 14,
            border: '1px solid rgba(148,163,184,0.3)',
            background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(8px)',
            color: '#94a3b8', fontSize: 22, cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}>▶</button>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, pointerEvents: 'auto', justifyContent: 'flex-end' }}>
        <button className="tc-btn" data-key=" " style={{
          width: 64, height: 64, borderRadius: '50%',
          border: '1px solid rgba(239,68,68,0.4)',
          background: 'rgba(239,68,68,0.2)', backdropFilter: 'blur(8px)',
          color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}>ACTION</button>
      </div>
    </div>
  );
};

export default TouchControls;
