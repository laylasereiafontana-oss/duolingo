/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client server-side with User-Agent set to "aistudio-build"
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Endpoint for Personalized Code and Block-logic feedback
app.post("/api/gemini/feedback", async (req, res) => {
  try {
    const { stageTitle, difficulty, instructions, studentCode, blockStructure, goal } = req.body;

    if (!studentCode) {
      res.status(400).json({ error: "Por favor, envie o código escrito para análise da IA." });
      return;
    }

    const systemPrompt = `Você é o "Bito", um robozinho camarada e especialista em guiar crianças, jovens e iniciantes a começarem a programar.
Sua missão é dar um feedback de 2 a 3 parágrafos curtos, amigáveis, lúdicos e didáticos em PORTUGUÊS BRASILEIRO.
- SEMPRE chame o aluno de forma empolgante!
- Use metáforas divertidas relacionadas ao fluxo elétrico, bytes, engrenagens e robótica.
- Aponte erros de sintaxe (como parênteses esquecidos, chaves abertas ou nomes incorretos) de forma leve.
- Mostre o que está ótimo no código dele e dê uma dica de ouro para melhorar o algoritmo.
- NUNCA dê a resposta mastigada diretamente. Incentive-o a raciocinar sobre o fluxo dos blocos e se as instruções estão na sequência correta.`;

    const userPrompt = `
Estágio Atual: "${stageTitle}" (Dificuldade: ${difficulty})
Instruções dadas ao aluno: "${instructions}"
Objetivo final esperado: "${goal}"

Código fornecido na tela do Aluno (montado via blocos logic):
\`\`\`javascript
${studentCode}
\`\`\`

Estrutura visual dos blocos de lógica que ele arrastou:
${JSON.stringify(blockStructure || {}, null, 2)}

Por favor Bito, analise o código e a lógica acima e dê um feedback detalhado, destacando se o aluno atingiu ou não o objetivo de forma correta e o que ele pode ajustar no algoritmo.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    const feedbackText = response.text || "Hum, Bito está pensando... Tente novamente em alguns segundos para que eu possa depurar seus circuitos!";
    res.json({ feedback: feedbackText });
  } catch (error) {
    console.error("Erro na rota do Gemini:", error);
    res.status(500).json({
      error: "Bito teve uma pane no circuito! Verifique as configurações de chave de API no painel do AI Studio.",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// Configure Vite or Serve Static Files
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting express development server with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving production static built assets...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server listening on host 0.0.0.0 (port ${PORT})`);
  });
}

setupViteOrStatic();
