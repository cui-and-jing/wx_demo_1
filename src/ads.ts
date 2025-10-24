/** Placeholder ad wrappers. */

interface VideoAd {
  show(): Promise<void>;
  load?(): Promise<void>;
  onLoad?(handler: () => void): void;
  onError?(handler: (err: unknown) => void): void;
  onClose?(handler: (res: { isEnded: boolean }) => void): void;
}

interface InterstitialAd {
  show(): Promise<void>;
  load?(): Promise<void>;
  onLoad?(handler: () => void): void;
  onError?(handler: (err: unknown) => void): void;
}

export function createRewardedVideoAd(adUnitId: string): VideoAd {
  if (typeof wx !== 'undefined' && wx?.createRewardedVideoAd) {
    try {
      const ad = wx.createRewardedVideoAd({ adUnitId });
      return ad;
    } catch (err) {
      console.warn('createRewardedVideoAd failed, fallback to no-op', err);
    }
  }
  console.log('[ads] RewardedVideoAd not available, using no-op');
  return {
    async show() {
      console.log('[ads] simulated rewarded video show');
    },
    onClose(handler: (res: { isEnded: boolean }) => void) {
      handler({ isEnded: true });
    }
  } as VideoAd;
}

export function createInterstitialAd(adUnitId: string): InterstitialAd {
  if (typeof wx !== 'undefined' && wx?.createInterstitialAd) {
    try {
      const ad = wx.createInterstitialAd({ adUnitId });
      return ad;
    } catch (err) {
      console.warn('createInterstitialAd failed, fallback to no-op', err);
    }
  }
  console.log('[ads] InterstitialAd not available, using no-op');
  return {
    async show() {
      console.log('[ads] simulated interstitial show');
    }
  } as InterstitialAd;
}
