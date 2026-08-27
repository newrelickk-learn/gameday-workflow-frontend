
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
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }
  await loadNewRelicAgent();
}
