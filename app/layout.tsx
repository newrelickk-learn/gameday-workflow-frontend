import type { Metadata } from 'next';
import ThemeRegistry from '@/lib/theme/ThemeRegistry';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { ChatWidget } from '@/components/ui/ChatWidget';
import NewRelicBrowser from '@/components/NewRelicBrowser';
import './globals.css';

export const metadata: Metadata = {
  title: 'GameDay Workflow',
  description: 'GameDay Workflow Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">{/* 言語切替時にLocaleProviderがlangを更新する */}
      <body>
        <NewRelicBrowser />
        <LocaleProvider>
          <ThemeRegistry>
            {children}
            <ChatWidget />
          </ThemeRegistry>
        </LocaleProvider>
      </body>
    </html>
  );
}

