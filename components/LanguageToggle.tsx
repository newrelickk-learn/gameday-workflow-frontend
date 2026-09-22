'use client';

import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import type { Locale } from '@/lib/i18n/messages';

/**
 * 日本語/英語の切り替え。選択はlocalStorageに保存され、次回以降も維持される。
 */
export default function LanguageToggle() {
  const { locale, setLocale, t } = useLocale();

  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={locale}
      aria-label={t.common.language}
      onChange={(_, next: Locale | null) => {
        if (next) {
          setLocale(next);
        }
      }}
    >
      <ToggleButton value="ja" aria-label={t.common.japanese} sx={{ px: 1.5 }}>
        <TranslateIcon fontSize="small" sx={{ mr: 0.5 }} />
        日本語
      </ToggleButton>
      <ToggleButton value="en" aria-label={t.common.english} sx={{ px: 1.5 }}>
        English
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
