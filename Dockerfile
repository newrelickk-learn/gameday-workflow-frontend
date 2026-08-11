FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY public ./public

RUN mkdir .next && chown nextjs:nodejs .next

COPY --chown=nextjs:nodejs .next/standalone ./
COPY --chown=nextjs:nodejs .next/static ./.next/static

# Next.jsのoutput file tracingは、newrelicパッケージの一部ファイル
# （message-broker-description.js, reservoir.js等、動的requireで参照される
# ファイル）を静的解析で見つけられず取り込み漏れするため、パッケージ全体を
# 上書きコピーして補う
COPY --chown=nextjs:nodejs node_modules/newrelic ./node_modules/newrelic

USER nextjs

EXPOSE 3000

ARG COMMIT_SHA="sha"
ARG RELEASE_TAG="dev"
ENV NEW_RELIC_METADATA_COMMIT=$COMMIT_SHA
ENV NEW_RELIC_METADATA_RELEASE_TAG=$RELEASE_TAG

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
