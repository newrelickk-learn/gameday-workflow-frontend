'use client';

import { useEffect } from 'react';
import { getCurrentUser } from '@/lib/utils/auth';
import { setNewRelicUserId } from '@/lib/newrelic-browser';

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
          browser_consent_mode: { enabled: false },
          privacy: { cookies_enabled: true },
          session_replay: {
            enabled: true,
            block_selector: '',
            mask_text_selector: '',
            sampling_rate: 100.0,
            error_sampling_rate: 100.0,
            mask_all_inputs: false,
            collect_fonts: true,
            inline_images: false,
            inline_stylesheet: true,
            fix_stylesheets: true,
            preload: false,
            mask_input_options: {},
          },
          distributed_tracing: { enabled: true },
          performance: { capture_measures: true },
          ajax: { deny_list: ['bam.jp.nr-data.net'], capture_payloads: 'none' as const },
          api: { register: { enabled: true, duplicate_data_to_container: false } },
        },
        info: {
          beacon: 'bam.jp.nr-data.net',
          errorBeacon: 'bam.jp.nr-data.net',
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

      // ログイン済みユーザーのemailをenduser.idとして紐づける（ログインはフルページ
      // ロードなので、遷移後のこの初期化タイミングでlocalStorageから読めば十分）
      const currentUser = getCurrentUser();
      if (currentUser?.email) {
        setNewRelicUserId(currentUser.email);
      }
    });
  }, []);

  return null;
}
