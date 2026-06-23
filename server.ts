import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON middleware
  app.use(express.json());

  // Wait to initialize the SDK until it's needed
  let aiClient: GoogleGenAI | null = null;
  function getAi() {
    if (!aiClient) {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY environment variable is required');
      }
      aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return aiClient;
  }

  // API route to summarize attendance logs
  app.post("/api/summarize-attendance", async (req, res) => {
    try {
      const logs = req.body.logs;
      if (!logs || !Array.isArray(logs)) {
        res.status(400).json({ error: "Invalid logs array provided." });
        return;
      }

      const ai = getAi();
      const prompt = `Here are the attendance logs for the week:\n${JSON.stringify(logs, null, 2)}`;
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are a school administrator assistant. Review these attendance logs. Provide a brief, bulleted summary of the week. Highlight any teachers who were late more than once and summarize their reasons. Note any perfect attendance.",
        }
      });

      res.json({ summary: response.text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate summary" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Express v4 handles this nicely like so:
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
