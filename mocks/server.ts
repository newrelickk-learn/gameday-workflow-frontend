import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Node.js環境（テスト用）のMSWセットアップ
export const server = setupServer(...handlers);

