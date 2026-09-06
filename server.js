const express = require("express");
const path = require("path");

const helmet = require("helmet");

const {
  rateLimit
} = require("express-rate-limit");


const {
  analisarSite
} = require("./analisador");


const {
  validarUrlPublica,
  ErroURLInsegura
} = require("./seguranca");


const app =
  express();


const PORT =
  3000;


// ======================================================
// SEGURANÇA - HEADERS HTTP
// ======================================================

/*
  Helmet adiciona diversos headers de segurança.

  Por enquanto deixamos Content Security Policy
  desativada porque nosso index.html ainda possui
  JavaScript e CSS inline.

  Posteriormente moveremos JS e CSS para arquivos
  separados e ativaremos CSP de forma restritiva.
*/

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);


// Não revela que estamos usando Express.

app.disable(
  "x-powered-by"
);


// ======================================================
// LIMITE DO BODY
// ======================================================

/*
  Nosso endpoint só precisa receber algo pequeno:

  {
    "url": "example.com"
  }

  Então não existe motivo para aceitar
  payloads enormes.
*/

app.use(
  express.json({
    limit: "10kb"
  })
);


// ======================================================
// RATE LIMIT
// ======================================================

/*
  Limita abuso do endpoint de análise.

  Cada IP pode fazer até:

  20 requisições a cada 15 minutos.

  Isso ajuda contra:
  - spam;
  - abuso das APIs;
  - consumo excessivo da Gemini;
  - consumo excessivo do PageSpeed;
  - DoS básico.
*/

const analisarLimiter =
  rateLimit({

    windowMs:
      15 * 60 * 1000,

    limit:
      20,

    standardHeaders:
      true,

    legacyHeaders:
      false,

    message: {

      erro:
        "Muitas análises foram solicitadas. Tente novamente mais tarde."
    }
  });


// ======================================================
// INTERFACE WEB
// ======================================================

app.use(
  express.static(
    path.join(
      __dirname,
      "public"
    )
  )
);


// ======================================================
// HEALTH CHECK
// ======================================================

app.get(
  "/api/health",

  (req, res) => {

    res.json({

      status:
        "ok",

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

  analisarLimiter,

  async (req, res) => {

    try {

      let { url } =
        req.body;


      // =================================================
      // INPUT
      // =================================================

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


      // =================================================
      // VALIDAÇÃO / SSRF
      // =================================================

      url =
        await validarUrlPublica(
          url
        );


      console.log(
        `\n📥 Recebida análise para: ${url}`
      );


      // =================================================
      // ANÁLISE
      // =================================================

      const resultado =
        await analisarSite(
          url
        );


      return res.json(
        resultado
      );

    } catch (erro) {


      // =================================================
      // URL BLOQUEADA
      // =================================================

      if (
        erro instanceof
        ErroURLInsegura
      ) {

        console.log(
          `🛡️ URL bloqueada: ${erro.message}`
        );


        return res
          .status(400)
          .json({

            erro:
              erro.message
          });
      }


      // =================================================
      // ERRO INTERNO
      // =================================================

      console.error(
        "Erro interno:",
        erro
      );


      /*
        Não enviamos para o usuário:

        erro.message
        erro.stack
        caminhos internos
        nomes de arquivos
        API keys
        informações do servidor
      */

      return res
        .status(500)
        .json({

          erro:
            "Erro interno ao analisar o site."
        });
    }
  }
);


// ======================================================
// ERRO DE JSON / BODY
// ======================================================

app.use(
  (erro, req, res, next) => {

    // Payload maior que 10 KB.

    if (
      erro.type ===
      "entity.too.large"
    ) {

      return res
        .status(413)
        .json({

          erro:
            "A requisição é muito grande."
        });
    }


    // JSON quebrado/malformado.

    if (
      erro instanceof SyntaxError &&
      erro.status === 400 &&
      "body" in erro
    ) {

      return res
        .status(400)
        .json({

          erro:
            "JSON inválido."
        });
    }


    console.error(
      "Erro não tratado:",
      erro
    );


    return res
      .status(500)
      .json({

        erro:
          "Erro interno do servidor."
      });
  }
);


// ======================================================
// SERVIDOR
// ======================================================

app.listen(
  PORT,

  () => {

    console.log(
      `\n🚀 Micro-SaaS rodando em http://localhost:${PORT}`
    );

    console.log(
      "🛡️ Security headers ativos"
    );

    console.log(
      "🛡️ Rate limit: 20 análises / 15 min / IP"
    );
  }
);