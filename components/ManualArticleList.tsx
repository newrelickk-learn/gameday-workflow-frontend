'use client';

import Link from 'next/link';
import { Box, Typography, Button, Grid, Card, CardActionArea, CardContent } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { manualArticles, localizedArticle } from '@/lib/manual/articles';
import { useLocale, useT } from '@/lib/i18n/LocaleProvider';

/**
 * マニュアル一覧。表示言語の切り替えはクライアント側(localStorage)で持っているため、
 * サーバーコンポーネントから切り出している。
 */
export default function ManualArticleList() {
  const t = useT();
  const { locale } = useLocale();

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          {t.manual.title}
        </Typography>
        <Link href="/dashboard" style={{ textDecoration: 'none' }}>
          <Button component="span" startIcon={<ArrowBackIcon />}>
            {t.lists.toDashboard}
          </Button>
        </Link>
      </Box>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        {t.manual.intro}
      </Typography>

      <Grid container spacing={3}>
        {manualArticles.map((article) => {
          const { title, description } = localizedArticle(article, locale);
          return (
            <Grid item xs={12} sm={6} key={article.slug}>
              <Card variant="outlined">
                <Link
                  href={`/dashboard/manual/${article.slug}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <CardActionArea component="div">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <MenuBookIcon color="primary" fontSize="small" />
                        <Typography variant="h6" component="h2" fontWeight="bold">
                          {title}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {description}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Link>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </>
  );
}
