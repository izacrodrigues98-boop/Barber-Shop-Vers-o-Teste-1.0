
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  async getStyleRecommendation(description: string): Promise<{ suggestion: string; confidence: number }> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analise a seguinte descrição de estilo/cabelo do cliente: "${description}". Sugira qual serviço de barbearia é o mais adequado (ex: Corte Social, Degradê, Barba, etc) e dê uma breve dica de estilo.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestion: {
                type: Type.STRING,
                description: "A recomendação de estilo e serviço.",
              },
              confidence: {
                type: Type.NUMBER,
                description: "Nível de confiança da sugestão de 0 a 1.",
              }
            },
            required: ["suggestion", "confidence"]
          }
        }
      });
      
      const result = JSON.parse(response.text || '{"suggestion": "Não foi possível analisar no momento.", "confidence": 0}');
      return result;
    } catch (error) {
      console.error("Gemini Error:", error);
      return { suggestion: "Nossos profissionais podem te ajudar na hora!", confidence: 0 };
    }
  }
};
