FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY public ./public

RUN mkdir .next && chown nextjs:nodejs .next

COPY --chown=nextjs:nodejs .next/standalone ./
COPY --chown=nextjs:nodejs .next/static ./.next/static

# Next.jsのoutput file tracingは、newrelicパッケージが動的require（require-in-the-middle等）
# で参照する一部の推移的依存（message-broker-description.js, meriyah等）を静的解析で
# 検出できず取り込み漏れする。1ファイルずつ追いかけるといたちごっこになるため、
# node_modules全体をビルド時の完全な状態で上書きし、取り込み漏れそのものをなくす
COPY --chown=nextjs:nodejs node_modules ./node_modules

# newrelicエージェントはnewrelic.jsをrequire/importではなく
# process.cwd()からのファイル読み込みで探すため、Next.jsのトレースでは
# 拾われない。明示的にコピーしないとデフォルト設定にフォールバックする
COPY --chown=nextjs:nodejs newrelic.js ./newrelic.js

USER nextjs

EXPOSE 3000

ARG COMMIT_SHA="sha"
ARG RELEASE_TAG="dev"
ENV NEW_RELIC_METADATA_COMMIT=$COMMIT_SHA
ENV NEW_RELIC_METADATA_RELEASE_TAG=$RELEASE_TAG

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
