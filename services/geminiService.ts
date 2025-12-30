
// Gemini service removed
export const geminiService = {
  async getStyleRecommendation(description: string): Promise<{ suggestion: string; confidence: number }> {
    return { suggestion: "Serviço de IA desativado.", confidence: 0 };
  }
};