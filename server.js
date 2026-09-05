const express = require("express");
const { analisarSite } = require("./analisador");

const app = express();

app.use(express.json());

const PORT = 3000;


// Rota simples para testar se o servidor está vivo
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    mensagem: "Micro-SaaS API funcionando"
  });
});


// Rota principal de análise
app.post("/analisar", async (req, res) => {

  try {

    let { url } = req.body;

    if (!url) {
      return res.status(400).json({
        erro: "A URL é obrigatória."
      });
    }

    url = url.trim();

    if (
      !url.startsWith("http://") &&
      !url.startsWith("https://")
    ) {
      url = `https://${url}`;
    }

    console.log(`\nRecebida análise para: ${url}`);

    const resultado = await analisarSite(url);

    return res.json(resultado);

  } catch (erro) {

    console.error("Erro na API:", erro);

    return res.status(500).json({
      erro: "Erro interno ao analisar o site.",
      detalhe: erro.message
    });
  }
});


// Inicia o servidor
app.listen(PORT, () => {
  console.log(`\n🚀 API rodando em http://localhost:${PORT}`);
});