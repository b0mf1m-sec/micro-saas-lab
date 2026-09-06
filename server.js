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
// SECURITY HEADERS
// ======================================================

app.use(
  helmet({

    contentSecurityPolicy: {

      directives: {

        defaultSrc: [
          "'self'"
        ],

        scriptSrc: [
          "'self'"
        ],

        styleSrc: [
          "'self'"
        ],

        connectSrc: [
          "'self'"
        ],

        imgSrc: [
          "'self'",
          "data:"
        ],

        fontSrc: [
          "'self'"
        ],

        objectSrc: [
          "'none'"
        ],

        baseUri: [
          "'self'"
        ],

        frameAncestors: [
          "'none'"
        ],

        formAction: [
          "'self'"
        ],

        /*
          Do NOT enable this while developing
          through http://localhost.

          Otherwise the browser may attempt to
          upgrade local HTTP resources to HTTPS.
        */

        upgradeInsecureRequests:
          null
      }
    }
  })
);


// Do not reveal Express.

app.disable(
  "x-powered-by"
);


// ======================================================
// BODY LIMIT
// ======================================================

app.use(
  express.json({
    limit:
      "10kb"
  })
);


// ======================================================
// RATE LIMIT
// ======================================================

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
        "Too many analyses were requested. Please try again later."
    }
  });


// ======================================================
// STATIC FRONTEND
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

      message:
        "Micro-SaaS API is running."
    });
  }
);


// ======================================================
// ANALYZE SITE
// ======================================================

app.post(
  "/analisar",

  analisarLimiter,

  async (req, res) => {

    try {

      let { url } =
        req.body;


      // =================================================
      // INPUT VALIDATION
      // =================================================

      if (
        !url ||
        typeof url !== "string"
      ) {

        return res
          .status(400)
          .json({

            erro:
              "A website URL is required."
          });
      }


      // =================================================
      // SSRF / URL VALIDATION
      // =================================================

      url =
        await validarUrlPublica(
          url
        );


      console.log(
        `\n📥 Analysis requested for: ${url}`
      );


      // =================================================
      // ANALYSIS
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
      // UNSAFE URL
      // =================================================

      if (
        erro instanceof
        ErroURLInsegura
      ) {

        console.log(
          `🛡️ URL blocked: ${erro.message}`
        );


        return res
          .status(400)
          .json({

            erro:
              "This URL cannot be analyzed."
          });
      }


      // =================================================
      // INTERNAL ERROR
      // =================================================

      console.error(
        "Internal error:",
        erro
      );


      return res
        .status(500)
        .json({

          erro:
            "An internal error occurred while analyzing the website."
        });
    }
  }
);


// ======================================================
// BODY / JSON ERROR HANDLER
// ======================================================

app.use(
  (
    erro,
    req,
    res,
    next
  ) => {


    // Payload larger than 10 KB

    if (
      erro.type ===
      "entity.too.large"
    ) {

      return res
        .status(413)
        .json({

          erro:
            "The request is too large."
        });
    }


    // Invalid JSON

    if (
      erro instanceof SyntaxError &&
      erro.status === 400 &&
      "body" in erro
    ) {

      return res
        .status(400)
        .json({

          erro:
            "Invalid JSON."
        });
    }


    console.error(
      "Unhandled error:",
      erro
    );


    return res
      .status(500)
      .json({

        erro:
          "Internal server error."
      });
  }
);


// ======================================================
// SERVER
// ======================================================

app.listen(
  PORT,

  () => {

    console.log(
      `\n🚀 Micro-SaaS running at http://localhost:${PORT}`
    );

    console.log(
      "🛡️ Security headers enabled"
    );

    console.log(
      "🛡️ Content Security Policy enabled"
    );

    console.log(
      "🛡️ Rate limit: 20 analyses / 15 min / IP"
    );
  }
);