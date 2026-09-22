import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import { Container } from '@mui/material';
import { getManualArticle, manualArticles } from '@/lib/manual/articles';
import ManualArticleView from '@/components/ManualArticleView';

interface ManualArticlePageProps {
  params: Promise<{
    slug: string;
  }>;
}

const MANUAL_CONTENT_DIR = path.join(process.cwd(), 'content', 'manual');

function readManualMarkdown(slug: string, locale?: 'en'): string | null {
  const dir = locale === 'en' ? path.join(MANUAL_CONTENT_DIR, 'en') : MANUAL_CONTENT_DIR;
  const filePath = path.join(dir, `${slug}.md`);

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
  // 英語版が未用意の記事では日本語のまま表示する。
  const markdownEn = readManualMarkdown(slug, 'en');

  if (!article || markdown === null) {
    notFound();
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <ManualArticleView article={article} markdown={markdown} markdownEn={markdownEn} />
    </Container>
  );
}
