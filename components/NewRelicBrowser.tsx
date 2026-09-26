'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { getCurrentUser } from '@/lib/utils/auth';
import { setNewRelicUserId } from '@/lib/newrelic-browser';

/**
 * スコアボード/進捗ボードは大画面にそのまま映すページ。Session Replayが有効だと、
 * 録画された画面から参加者に他チームの進捗やスコアが見えてしまう(#3)ため、
 * このBrowser Agentを読み込ませない。
 *
 * これらは大画面で直接URLを開いて表示する運用なので、初回マウント時のパスだけを見れば足りる。
 * ダッシュボード等からSPA遷移でこれらのページに来た場合は既にエージェントが起動済みで
 * 途中で止めることはできないが、その経路は本来の使い方ではない。
 */
const DISABLED_PATH_PREFIXES = ['/score', '/team-progress'];

export default function NewRelicBrowser() {
  const pathname = usePathname();
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (hasInitializedRef.current) {
      return;
    }
    if (DISABLED_PATH_PREFIXES.some((prefix) => pathname?.startsWith(prefix))) {
      return;
    }
    hasInitializedRef.current = true;

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
  }, [pathname]);

  return null;
}
