'use client';

import { useEffect } from 'react';

/**
 * New Relic Browser agent（RUM、Core Web Vitals計測）の初期化。
 * ライセンスキー・Application IDはNew Relic UIでBrowser Applicationを
 * 作成した際に発行される値を環境変数として設定する。
 */
export default function NewRelicBrowser() {
  useEffect(() => {
    const licenseKey = process.env.NEXT_PUBLIC_NEW_RELIC_BROWSER_LICENSE_KEY;
    const applicationID = process.env.NEXT_PUBLIC_NEW_RELIC_BROWSER_APP_ID;
    const accountID = process.env.NEXT_PUBLIC_NEW_RELIC_ACCOUNT_ID;
    const trustKey = process.env.NEXT_PUBLIC_NEW_RELIC_TRUST_KEY || accountID;
    const agentID = process.env.NEXT_PUBLIC_NEW_RELIC_AGENT_ID || applicationID;

    if (!licenseKey || !applicationID) {
      // Browser Applicationがまだ作成されていない場合は初期化しない
      return;
    }

    import('@newrelic/browser-agent/loaders/browser-agent').then(({ BrowserAgent }) => {
      const options = {
        init: {
          distributed_tracing: { enabled: true },
          privacy: { cookies_enabled: true },
          ajax: { deny_list: ['bam.nr-data.net'] },
        },
        info: {
          beacon: 'bam.nr-data.net',
          errorBeacon: 'bam.nr-data.net',
          licenseKey,
          applicationID,
          sa: 1,
        },
        loader_config: {
          accountID,
          trustKey,
          agentID,
          licenseKey,
          applicationID,
        },
      };
      new BrowserAgent(options);
    });
  }, []);

  return null;
}
