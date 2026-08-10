import { Container, Box, Typography } from '@mui/material';

export default function Home() {
  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 8,
        }}
      >
        <Typography variant="h2" component="h1" gutterBottom fontWeight="bold">
          GameDay Workflow
        </Typography>
        <Typography variant="h6" color="text.secondary">
          ワークフロー管理システムへようこそ
        </Typography>
      </Box>
    </Container>
  );
}
