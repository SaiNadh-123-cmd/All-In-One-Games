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

export function useRewardedAd(rewardAdId: string, enabled: boolean = true) {
  const initialized = useRef(false);
  const rewardedReady = useRef(false);

  const init = useCallback(async () => {
    if (initialized.current || !enabled) return;
    const admob = await getAdMob();
    if (!admob) return;
    try {
      await admob.initialize();
      initialized.current = true;
    } catch { /* ignore */ }
  }, [enabled]);

  const prepareReward = useCallback(async () => {
    const admob = await getAdMob();
    if (!admob || rewardedReady.current) return null;
    try {
      await admob.prepareRewardVideoAd({ adId: rewardAdId });
      rewardedReady.current = true;
      return admob;
    } catch {
      return null;
    }
  }, [rewardAdId]);

  const showRewarded = useCallback(async (): Promise<boolean> => {
    const admob = await getAdMob();
    if (!admob) return false;
    try {
      if (!rewardedReady.current) {
        await prepareReward();
      }
      await admob.showRewardVideoAd();
      rewardedReady.current = false;
      return true;
    } catch {
      rewardedReady.current = false;
      return false;
    }
  }, [prepareReward]);

  useEffect(() => {
    if (!enabled) return;
    init();
  }, [init, enabled]);

  return { prepareReward, showRewarded, isNative: Capacitor.isNativePlatform() };
}
