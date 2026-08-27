interface NewRelicBrowserApi {
  setUserId(value: string | null, resetSession?: boolean): void;
}

function getNewRelicBrowserApi(): NewRelicBrowserApi | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return (window as unknown as { newrelic?: NewRelicBrowserApi }).newrelic;
}

export function setNewRelicUserId(value: string | null, resetSession = false): void {
  try {
    getNewRelicBrowserApi()?.setUserId(value, resetSession);
  } catch (error) {
    console.error('[NewRelic Browser] Failed to set user id:', error);
  }
}
