'use client';

import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Box, Typography, Button, Paper } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { localizedArticle, type ManualArticle } from '@/lib/manual/articles';
import { useLocale, useT } from '@/lib/i18n/LocaleProvider';

interface ManualArticleViewProps {
  article: ManualArticle;
  markdown: string;
  /** 英語版の本文。未用意の記事ではnullで、その場合は日本語を表示する。 */
  markdownEn: string | null;
  children?: React.ReactNode;
}

/**
 * マニュアル記事の本文表示。日本語と英語の本文を両方受け取り、表示言語で選ぶ。
 * (言語の選択はクライアント側のlocalStorageにあるため、サーバー側では決められない)
 */
export default function ManualArticleView({
  article,
  markdown,
  markdownEn,
  children,
}: ManualArticleViewProps) {
  const t = useT();
  const { locale } = useLocale();
  const { title } = localizedArticle(article, locale);
  const body = locale === 'en' && markdownEn ? markdownEn : markdown;

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          {title}
        </Typography>
        <Link href="/dashboard/manual" style={{ textDecoration: 'none' }}>
          <Button component="span" startIcon={<ArrowBackIcon />}>
            {t.manual.backToList}
          </Button>
        </Link>
      </Box>

      <Paper sx={{ p: { xs: 3, md: 4 } }}>
        <Box
          sx={{
            '& h1': { display: 'none' },
            '& h2': { mt: 3, mb: 1.5, fontSize: '1.25rem', fontWeight: 'bold' },
            '& h3': { mt: 2.5, mb: 1, fontSize: '1.05rem', fontWeight: 'bold' },
            '& p': { mb: 1.5, lineHeight: 1.9 },
            '& ul, & ol': { pl: 3, mb: 2 },
            '& li': { mb: 0.5, lineHeight: 1.9 },
            '& table': { borderCollapse: 'collapse', width: '100%', mb: 2 },
            '& th, & td': { border: '1px solid', borderColor: 'divider', p: 1, textAlign: 'left' },
            '& code': { bgcolor: 'grey.100', px: 0.5, borderRadius: 0.5 },
            '& pre': { bgcolor: 'grey.100', p: 2, borderRadius: 1, overflowX: 'auto' },
            '& blockquote': {
              borderLeft: '4px solid',
              borderColor: 'divider',
              pl: 2,
              my: 2,
              color: 'text.secondary',
            },
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
        </Box>
        {children}
      </Paper>
    </>
  );
}
