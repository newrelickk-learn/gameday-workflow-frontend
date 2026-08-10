import { http, HttpResponse } from 'msw';

export const handlers = [
  // 認証エンドポイント
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    return HttpResponse.json({
      token: 'mock-jwt-token',
      user: {
        id: '1',
        name: 'テストユーザー',
        email: body.email,
        role: 'engineer',
      },
    });
  }),

  http.get('/api/users/:id', () => {
    return HttpResponse.json({
      id: '1',
      name: 'テストユーザー',
      email: 'test@example.com',
      role: 'engineer',
    });
  }),

  // 申請エンドポイント
  http.get('/api/applications', () => {
    return HttpResponse.json([
      {
        id: '1',
        type: 'vacation',
        title: '有給休暇申請',
        description: '2024年3月15日から3月17日まで',
        status: 'pending',
        applicantId: '1',
        createdAt: '2024-03-01T00:00:00Z',
        updatedAt: '2024-03-01T00:00:00Z',
      },
    ]);
  }),

  http.get('/api/applications/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      type: 'vacation',
      title: '有給休暇申請',
      description: '2024年3月15日から3月17日まで',
      status: 'pending',
      applicantId: '1',
      createdAt: '2024-03-01T00:00:00Z',
      updatedAt: '2024-03-01T00:00:00Z',
    });
  }),

  http.post('/api/applications', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      id: String(Date.now()),
      ...body,
      status: 'pending',
      applicantId: '1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }),

  // 承認エンドポイント
  http.get('/api/approvals', () => {
    return HttpResponse.json([
      {
        id: '1',
        applicationId: '1',
        approverId: '2',
        status: 'pending',
        createdAt: '2024-03-01T00:00:00Z',
      },
    ]);
  }),

  http.get('/api/approvals/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      applicationId: '1',
      approverId: '2',
      status: 'pending',
      createdAt: '2024-03-01T00:00:00Z',
    });
  }),

  http.patch('/api/approvals/:id', async ({ request, params }) => {
    const body = await request.json() as { status?: string; comment?: string };
    return HttpResponse.json({
      id: params.id,
      applicationId: '1',
      approverId: '2',
      status: body.status,
      comment: body.comment,
      createdAt: '2024-03-01T00:00:00Z',
    });
  }),

  // AIエンドポイント
  http.post('/api/ai/suggest', async ({ request }) => {
    const body = await request.json() as { prompt: string };
    return HttpResponse.json({
      suggestion: `以下の内容で申請を作成することをお勧めします:\n${body.prompt}`,
    });
  }),

  http.get('/api/ai/analyze/:id', () => {
    return HttpResponse.json({
      risk: 'low',
      summary: 'この申請は標準的な内容で、承認可能です。',
    });
  }),
];

