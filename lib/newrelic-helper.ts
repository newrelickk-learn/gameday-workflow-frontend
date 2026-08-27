interface NewRelicApi {
  addCustomAttribute(name: string, value: string | number | boolean): void;
  noticeError(error: Error, customAttributes?: Record<string, string | number | boolean>): void;
  setTransactionName(name: string): void;
}

export async function addCustomAttribute(name: string, value: string | number | boolean): Promise<void> {
  try {
    const { default: newrelic } = await import('newrelic');
    (newrelic as unknown as NewRelicApi).addCustomAttribute(name, value);
  } catch (error) {
    console.error('[NewRelic] Failed to add custom attribute:', name, error);
  }
}

export async function noticeError(
  error: Error,
  customAttributes?: Record<string, string | number | boolean>
): Promise<void> {
  try {
    const { default: newrelic } = await import('newrelic');
    (newrelic as unknown as NewRelicApi).noticeError(error, customAttributes);
  } catch (err) {
    console.error('[NewRelic] Failed to notice error:', error.message, err);
  }
}

export async function setTransactionName(name: string): Promise<void> {
  try {
    const { default: newrelic } = await import('newrelic');
    (newrelic as unknown as NewRelicApi).setTransactionName(name);
  } catch (error) {
    console.error('[NewRelic] Failed to set transaction name:', name, error);
  }
}

export async function addCustomAttributes(attrs: Record<string, string | number | boolean>): Promise<void> {
  await Promise.all(Object.entries(attrs).map(([name, value]) => addCustomAttribute(name, value)));
}
