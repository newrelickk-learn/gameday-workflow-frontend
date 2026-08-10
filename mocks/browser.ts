import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// ブラウザ環境用のMSWセットアップ
export const worker = setupWorker(...handlers);

