require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

async function testarGemini() {
  try {
    const resposta = await ai.interactions.create({
      model: "gemini-3.6-flash",
      input: "Responda apenas: Gemini funcionando."
    });

    console.log(resposta.output_text);

  } catch (erro) {
    console.log("Erro ao chamar Gemini:");
    console.log(erro.message);
  }
}

testarGemini();