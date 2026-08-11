/**
 * Next.jsのinstrumentation hook。
 * アプリの他の部分より前に読み込まれ、New RelicのNode.jsエージェントを起動する。
 * https://docs.newrelic.com/docs/apm/agents/nodejs-agent/extend-your-instrumentation/nextjs-instrumentation/
 */

async function loadNewRelicAgent() {
  const { default: newrelic } = await import('newrelic');
  const agent = (newrelic as unknown as { agent?: NodeJS.EventEmitter & { collector?: { isConnected?: () => boolean } } }).agent;
  if (!agent || agent.collector?.isConnected?.()) {
    return;
  }
  await new Promise<void>((resolve) => {
    const done = () => {
      clearTimeout(timer);
      agent.removeListener('started', done);
      agent.removeListener('errored', done);
      resolve();
    };
    const timer = setTimeout(done, 8000);
    agent.once('started', done);
    agent.once('errored', done);
  });
}

export async function register() {
  // エージェントはNode.jsランタイムのみ計装する（Edgeランタイムは対象外）
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }
  await loadNewRelicAgent();
}
