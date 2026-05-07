import { generateChatAnswer } from "../models/chatModel.js";

export async function chatController(req, res) {
  try {
    const message = String(req.body?.message || "").trim();

    if (!message) {
      return res.status(400).json({ answer: "Digite sua duvida ou sintoma para eu ajudar." });
    }

    const answer = await generateChatAnswer(message);
    return res.json({ answer });
  } catch (error) {
    return res.status(500).json({
      answer: "A IA local nao respondeu. Verifique se o Ollama/Llama esta aberto na porta 11434."
    });
  }
}
