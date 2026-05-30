import React, { useEffect, useRef, useCallback } from 'react';

interface TouchControlsProps {
  visible: boolean;
  onGameFrame?: (iframe: HTMLIFrameElement | null) => void;
}

const TouchControls: React.FC<TouchControlsProps> = ({ visible, onGameFrame }) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const getIframe = useCallback(() => {
    if (iframeRef.current) return iframeRef.current;
    const iframe = document.querySelector<HTMLIFrameElement>('iframe[title]');
    if (iframe) iframeRef.current = iframe;
    return iframe;
  }, []);

  useEffect(() => {
    if (visible) {
      iframeRef.current = document.querySelector<HTMLIFrameElement>('iframe[title]');
      onGameFrame?.(iframeRef.current);
    } else {
      iframeRef.current = null;
    }
  }, [visible, onGameFrame]);

  useEffect(() => {
    if (!visible) return;

    const dispatchKey = (key: string) => {
      const iframe = getIframe();
      if (!iframe) return;
      iframe.contentWindow?.dispatchEvent(new KeyboardEvent('keydown', {
        key, bubbles: true, cancelable: true,
        ...(key === ' ' ? { keyCode: 32, which: 32 } : {}),
        ...(key === 'ArrowLeft' ? { keyCode: 37, which: 37 } : {}),
        ...(key === 'ArrowUp' ? { keyCode: 38, which: 38 } : {}),
        ...(key === 'ArrowRight' ? { keyCode: 39, which: 39 } : {}),
        ...(key === 'ArrowDown' ? { keyCode: 40, which: 40 } : {}),
      }));
      setTimeout(() => {
        iframe.contentWindow?.dispatchEvent(new KeyboardEvent('keyup', {
          key, bubbles: true, cancelable: true,
        }));
      }, 100);
    };

    const handleKey = (e: MouseEvent, key: string) => {
      e.preventDefault();
      e.stopPropagation();
      dispatchKey(key);
    };

    const btns = document.querySelectorAll<HTMLButtonElement>('.tc-btn');
    const handlers: Array<{ el: HTMLButtonElement; handler: (e: MouseEvent) => void }> = [];

    btns.forEach(btn => {
      const key = btn.dataset.key;
      if (!key) return;
      const handler = (e: MouseEvent) => handleKey(e, key);
      btn.addEventListener('mousedown', handler);
      btn.addEventListener('touchstart', handler as any, { passive: false });
      handlers.push({ el: btn, handler });
    });

    return () => {
      handlers.forEach(({ el, handler }) => {
        el.removeEventListener('mousedown', handler);
        el.removeEventListener('touchstart', handler as any);
      });
    };
  }, [visible, getIframe]);

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
