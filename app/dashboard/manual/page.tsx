import { Container } from '@mui/material';
import ManualArticleList from '@/components/ManualArticleList';

export const metadata = {
  title: 'Manual | GameDay Workflow',
};

export default function ManualIndexPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <ManualArticleList />
    </Container>
  );
}
