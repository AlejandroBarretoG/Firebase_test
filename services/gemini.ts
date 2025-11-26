import { GoogleGenAI } from "@google/genai";

// 1x1 Red Pixel Base64 for Vision Test
const SAMPLE_IMAGE_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export interface TestResult {
  success: boolean;
  message: string;
  data?: any;
}

export const runGeminiTests = {
  /**
   * 1. Auth & Connection Test
   * Verifies if the client can be instantiated and checks connectivity by listing models or simple ping.
   */
  connect: async (apiKey: string): Promise<TestResult> => {
    try {
      if (!apiKey) throw new Error("API Key is required");
      
      const ai = new GoogleGenAI({ apiKey });
      // We perform a very cheap call to verify the key, e.g. count tokens on an empty string or simple model check
      // Ideally we would list models, but that is deprecated/removed in new SDK versions for frontend.
      // We will try a minimal generateContent as the "ping".
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'ping',
      });
      
      if (response && response.text) {
        return { success: true, message: "Conexión exitosa con Gemini API.", data: { reply: response.text } };
      } else {
        throw new Error("Respuesta vacía del servidor.");
      }
    } catch (error: any) {
      return { success: false, message: error.message || "Error de conexión" };
    }
  },

  /**
   * 2. Text Generation Test
   * Tests standard text generation capabilities.
   */
  generateText: async (apiKey: string): Promise<TestResult> => {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = "Responde con una sola palabra: 'Funciona'";
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const text = response.text;
      return { success: true, message: "Generación de texto correcta.", data: { prompt, output: text } };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  /**
   * 3. Streaming Test
   * Tests the streaming capability of the API.
   */
  streamText: async (apiKey: string): Promise<TestResult> => {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = "Escribe los números del 1 al 5 separados por comas.";
      
      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      let fullText = "";
      let chunkCount = 0;
      
      for await (const chunk of responseStream) {
        fullText += chunk.text;
        chunkCount++;
      }

      return { 
        success: true, 
        message: `Streaming completado en ${chunkCount} fragmentos.`, 
        data: { fullText, chunkCount } 
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  /**
   * 4. Token Count Test
   * Verifies the token counting endpoint.
   */
  countTokens: async (apiKey: string): Promise<TestResult> => {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = "Why is the sky blue?";
      
      const response = await ai.models.countTokens({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return { 
        success: true, 
        message: "Conteo de tokens exitoso.", 
        data: { prompt, totalTokens: response.totalTokens } 
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  /**
   * 5. Vision (Multimodal) Test
   * Tests sending an image along with text.
   */
  vision: async (apiKey: string): Promise<TestResult> => {
    try {
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/png', data: SAMPLE_IMAGE_BASE64 } },
            { text: "Describe esta imagen en 5 palabras o menos. (Es un pixel rojo)" }
          ]
        }
      });

      return { 
        success: true, 
        message: "Análisis de visión completado.", 
        data: { output: response.text } 
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
};
