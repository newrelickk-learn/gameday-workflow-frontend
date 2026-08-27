import { createYoga, createSchema } from 'graphql-yoga';
import { typeDefs } from '@/lib/graphql/schema';
import { resolvers } from '@/lib/graphql/resolvers';
import { newRelicErrorReportingPlugin } from '@/lib/graphql/newrelic-error-plugin';
import { NextRequest } from 'next/server';

const schema = createSchema({
  typeDefs,
  resolvers: resolvers as any,
});

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

export async function GET(request: NextRequest) {
  return handleRequest(request, { request });
}

export async function POST(request: NextRequest) {
  return handleRequest(request, { request });
}

