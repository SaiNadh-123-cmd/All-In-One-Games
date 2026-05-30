import { useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

let AdMobPlugin: any = null;
let bannerReady = false;

async function getAdMob() {
  if (!Capacitor.isNativePlatform()) return null;
  if (AdMobPlugin) return AdMobPlugin;
  try {
    const mod = await import('@capacitor-community/admob');
    AdMobPlugin = mod.AdMob;
    return AdMobPlugin;
  } catch {
    return null;
  }
}

export function useNativeAdMob(bannerAdId: string, enabled: boolean = true) {
  const initialized = useRef(false);

  const init = useCallback(async () => {
    if (initialized.current || !enabled) return;
    const admob = await getAdMob();
    if (!admob) return;
    try {
      await admob.initialize();
      initialized.current = true;
    } catch { /* ignore */ }
  }, [enabled]);

  const showBanner = useCallback(async () => {
    const admob = await getAdMob();
    if (!admob || bannerReady) return;
    try {
      await admob.showBanner({
        adId: bannerAdId,
        adSize: 'ADAPTIVE_BANNER',
        position: 'BOTTOM_CENTER',
        margin: 0,
      });
      bannerReady = true;
    } catch { /* ignore */ }
  }, [bannerAdId]);

  const hideBanner = useCallback(async () => {
    const admob = await getAdMob();
    if (!admob) return;
    try { await admob.hideBanner(); } catch { /* ignore */ }
  }, []);

  const removeBanner = useCallback(async () => {
    const admob = await getAdMob();
    if (!admob) return;
    try {
      await admob.removeBanner();
      bannerReady = false;
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    init();
  }, [init, enabled]);

  return { showBanner, hideBanner, removeBanner, isNative: Capacitor.isNativePlatform() };
}
