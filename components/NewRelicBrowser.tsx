'use client';

import { useEffect } from 'react';
import { getCurrentUser } from '@/lib/utils/auth';
import { setNewRelicUserId } from '@/lib/newrelic-browser';

export default function NewRelicBrowser() {
  useEffect(() => {
    const licenseKey = process.env.NEXT_PUBLIC_NEW_RELIC_BROWSER_LICENSE_KEY;
    const applicationID = process.env.NEXT_PUBLIC_NEW_RELIC_BROWSER_APP_ID;
    const accountID = process.env.NEXT_PUBLIC_NEW_RELIC_ACCOUNT_ID;
    const trustKey = process.env.NEXT_PUBLIC_NEW_RELIC_TRUST_KEY || accountID;
    const agentID = process.env.NEXT_PUBLIC_NEW_RELIC_AGENT_ID || applicationID;

    if (!licenseKey || !applicationID) {
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
            // 原因診断クイズの選択肢と、複数選択で選んだチップのラベルは「答え」そのもの。
            // セッションリプレイに残すと他チームに答えが見えてしまうためマスクする。
            // Autocompleteはこの診断クイズでしか使っていないので、他の画面には影響しない。
            mask_text_selector:
              '.MuiAutocomplete-popper, .MuiAutocomplete-listbox, .MuiAutocomplete-option, .MuiAutocomplete-tag, .MuiAutocomplete-tag .MuiChip-label',
            sampling_rate: 100.0,
            error_sampling_rate: 100.0,
            // 入力値(パスワード・申請内容など)はセッションリプレイに残さない。
            // 画面の一般的なテキストは調査に使うためマスクしない(上のセレクタに該当するものだけ伏せる)。
            mask_all_inputs: true,
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

      const currentUser = getCurrentUser();
      if (currentUser?.email) {
        setNewRelicUserId(currentUser.email);
      }
    });
  }, []);

  return null;
}
