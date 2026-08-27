export const stubAiService = {
  async generateApplicationSuggestion(prompt: string): Promise<string> {
    return `以下の内容で申請を作成することをお勧めします:\n${prompt}`;
  },

  async analyzeApplication(applicationId: string): Promise<{
    risk: 'low' | 'medium' | 'high';
    summary: string;
  }> {
    return {
      risk: 'low',
      summary: 'この申請は標準的な内容で、承認可能です。',
    };
  },

  async askChat(question: string): Promise<string> {
    return `ご質問「${question}」について、お答えします。\n\nこのシステムでは、申請の作成、承認、管理などの機能を利用できます。具体的なご質問がございましたら、お気軽にお尋ねください。`;
  },
};

