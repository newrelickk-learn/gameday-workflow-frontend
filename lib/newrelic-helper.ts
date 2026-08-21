/**
 * newrelic.d.ts は `declare module 'newrelic'` のみで型情報を持たないため、
 * addCustomAttribute呼び出し部分だけ型キャストでラップする。
 * next.config.js の serverExternalPackages 設定により、newrelicはNode.js
 * ランタイムでのみ動的importが解決される。
 */
interface NewRelicApi {
  addCustomAttribute(name: string, value: string | number | boolean): void;
  noticeError(error: Error, customAttributes?: Record<string, string | number | boolean>): void;
}

export async function addCustomAttribute(name: string, value: string | number | boolean): Promise<void> {
  try {
    const { default: newrelic } = await import('newrelic');
    (newrelic as unknown as NewRelicApi).addCustomAttribute(name, value);
  } catch (error) {
    console.error('[NewRelic] Failed to add custom attribute:', name, error);
  }
}

/**
 * GraphQLのエラーはHTTP 200で返されるため、New Relicは自動的にはエラーとして
 * 検知しない。noticeErrorで明示的に通知する。
 */
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

/**
 * 複数のカスタムアトリビュートをまとめて追加する。
 * 個々の addCustomAttribute 呼び出しは内部で例外を握り込むため、
 * 一部の属性登録に失敗しても他の属性登録・本処理には影響しない。
 */
export async function addCustomAttributes(attrs: Record<string, string | number | boolean>): Promise<void> {
  await Promise.all(Object.entries(attrs).map(([name, value]) => addCustomAttribute(name, value)));
}
