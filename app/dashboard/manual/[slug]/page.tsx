import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Container, Box, Typography, Button, Paper } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getManualArticle, manualArticles } from '@/lib/manual/articles';

interface ManualArticlePageProps {
  params: Promise<{
    slug: string;
  }>;
}

const MANUAL_CONTENT_DIR = path.join(process.cwd(), 'content', 'manual');

function readManualMarkdown(slug: string): string | null {
  const filePath = path.join(MANUAL_CONTENT_DIR, `${slug}.md`);

  if (!filePath.startsWith(MANUAL_CONTENT_DIR + path.sep)) {
    return null;
  }

  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

export function generateStaticParams() {
  return manualArticles.map((article) => ({ slug: article.slug }));
}

export default async function ManualArticlePage({ params }: ManualArticlePageProps) {
  const { slug } = await params;
  const article = getManualArticle(slug);
  const markdown = readManualMarkdown(slug);

  if (!article || markdown === null) {
    notFound();
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          {article.title}
        </Typography>
        <Link href="/dashboard/manual" style={{ textDecoration: 'none' }}>
          <Button component="span" startIcon={<ArrowBackIcon />}>
            マニュアル一覧
          </Button>
        </Link>
      </Box>

      <Paper
        sx={{
          p: 4,
          '& h1': { fontSize: '1.75rem', fontWeight: 'bold', mt: 3, mb: 2 },
          '& h2': { fontSize: '1.4rem', fontWeight: 'bold', mt: 3, mb: 1.5 },
          '& h3': { fontSize: '1.15rem', fontWeight: 'bold', mt: 2.5, mb: 1 },
          '& p': { mb: 1.5, lineHeight: 1.8 },
          '& ul, & ol': { mb: 1.5, pl: 3 },
          '& li': { mb: 0.5, lineHeight: 1.8 },
          '& table': {
            width: '100%',
            borderCollapse: 'collapse',
            mb: 2,
          },
          '& th, & td': {
            border: '1px solid',
            borderColor: 'divider',
            p: 1,
            textAlign: 'left',
          },
          '& th': {
            backgroundColor: 'action.hover',
            fontWeight: 'bold',
          },
          '& code': {
            backgroundColor: 'action.hover',
            borderRadius: 0.5,
            px: 0.5,
            fontFamily: 'monospace',
          },
          '& pre': {
            backgroundColor: 'action.hover',
            borderRadius: 1,
            p: 2,
            overflowX: 'auto',
          },
          '& pre code': {
            backgroundColor: 'transparent',
            px: 0,
          },
        }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </Paper>
    </Container>
  );
}
