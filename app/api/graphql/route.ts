import { createYoga, createSchema } from 'graphql-yoga';
import { typeDefs } from '@/lib/graphql/schema';
import { resolvers } from '@/lib/graphql/resolvers';
import { newRelicErrorReportingPlugin } from '@/lib/graphql/newrelic-error-plugin';
import { NextRequest } from 'next/server';

// GraphQLスキーマを明示的に構築
const schema = createSchema({
  typeDefs,
  resolvers: resolvers as any, // 型の互換性のため一時的にanyを使用
});

// GraphQL Yogaサーバーを作成
const { handleRequest } = createYoga({
  schema,
  graphqlEndpoint: '/api/graphql',
  fetchAPI: {
    Request: Request,
    Response: Response,
  },
  plugins: [newRelicErrorReportingPlugin],
  context: (req: { request: Request }) => ({
    request: req.request,
  }),
});

// Next.js App RouterのRoute Handlerとしてエクスポート
export async function GET(request: NextRequest) {
  return handleRequest(request, { request });
}

export async function POST(request: NextRequest) {
  return handleRequest(request, { request });
}

