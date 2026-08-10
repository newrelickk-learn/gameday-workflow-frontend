import type { Metadata } from 'next';
import ThemeRegistry from '@/lib/theme/ThemeRegistry';
import { ChatWidget } from '@/components/ui/ChatWidget';
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
    <html lang="ja">
      <body>
        <ThemeRegistry>
          {children}
          <ChatWidget />
        </ThemeRegistry>
      </body>
    </html>
  );
}

