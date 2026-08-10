import Link from 'next/link';
import {
  Container,
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardActionArea,
  CardContent,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { manualArticles } from '@/lib/manual/articles';

export const metadata = {
  title: 'マニュアル | GameDay Workflow',
};

export default function ManualIndexPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          マニュアル
        </Typography>
        <Link href="/dashboard" style={{ textDecoration: 'none' }}>
          <Button component="span" startIcon={<ArrowBackIcon />}>
            ダッシュボード
          </Button>
        </Link>
      </Box>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        各種申請の書き方や承認フローについて説明しています。申請する前に該当する記事を確認してください。
      </Typography>

      <Grid container spacing={3}>
        {manualArticles.map((article) => (
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
                        {article.title}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {article.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Link>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
