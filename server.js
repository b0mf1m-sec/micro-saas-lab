const express = require("express");
const path = require("path");

const {
  analisarSite
} = require("./analisador");


const app =
  express();


const PORT =
  3000;


// Permite receber JSON

app.use(
  express.json()
);


// Serve os arquivos da interface

app.use(
  express.static(
    path.join(
      __dirname,
      "public"
    )
  )
);


// Health check da API

app.get(
  "/api/health",

  (req, res) => {

    res.json({
      status: "ok",
      mensagem:
        "Micro-SaaS API funcionando"
    });
  }
);


// ======================================================
// ANALISAR SITE
// ======================================================

app.post(
  "/analisar",

  async (req, res) => {

    try {

      let { url } =
        req.body;


      if (
        !url ||
        typeof url !== "string"
      ) {

        return res
          .status(400)
          .json({
            erro:
              "A URL é obrigatória."
          });
      }


      url =
        url.trim();


      if (
        !url.startsWith("http://") &&
        !url.startsWith("https://")
      ) {

        url =
          `https://${url}`;
      }


      console.log(
        `\n📥 Recebida análise para: ${url}`
      );


      const resultado =
        await analisarSite(url);


      return res.json(
        resultado
      );

    } catch (erro) {

      console.error(
        "Erro na API:",
        erro
      );


      return res
        .status(500)
        .json({

          erro:
            "Erro interno ao analisar o site.",

          detalhe:
            erro.message
        });
    }
  }
);


// ======================================================
// INICIA SERVIDOR
// ======================================================

app.listen(
  PORT,

  () => {

    console.log(
      `\n🚀 Micro-SaaS rodando em http://localhost:${PORT}`
    );

  }
);