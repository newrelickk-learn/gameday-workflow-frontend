/**
 * APIクライアント
 * 常にGraphQLクライアントを使用する
 * スタブモードの場合は、GraphQLクライアント内部でスタブデータを返す
 * すべての通信はNext.jsのGraphQLエンドポイント（/api/graphql）を通して行う
 */

import { graphqlClient } from './graphql-client';

// 常にGraphQLクライアントを使用
// スタブモードかどうかは、GraphQLクライアント内部で判断される
// フロントエンドからはスタブかどうかわからない状態を保つ
export const apiClient = graphqlClient;

