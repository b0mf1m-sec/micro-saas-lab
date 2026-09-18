const express = require("express");
const path = require("path");
const crypto = require("crypto");

const helmet = require("helmet");

const {
  rateLimit
} = require("express-rate-limit");


const {
  analisarSite,
  gerarViewsComIA
} = require("./analisador");


const {
  ErroURLInsegura
} = require("./seguranca");


const app =
  express();


const PORT =
  3000;


const MAX_URLS_LOTE =
  50;


const CONCORRENCIA_LOTE =
  3;


const ANALYSIS_CACHE_TTL_MS =
  60 * 60 * 1000;


const MAX_ANALYSIS_CACHE_ENTRIES =
  300;


const cacheAnalises =
  new Map();


const BATCH_JOB_TTL_MS =
  60 * 60 * 1000;


const MAX_BATCH_JOBS =
  100;


const batchJobs =
  new Map();


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
      "25kb"
  })
);


// ======================================================
// RATE LIMITS
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


const loteLimiter =
  rateLimit({

    windowMs:
      15 * 60 * 1000,

    limit:
      5,

    standardHeaders:
      true,

    legacyHeaders:
      false,

    message: {
      erro:
        "Too many batch analyses were requested. Please try again later."
    }
  });


const outreachLimiter =
  rateLimit({

    windowMs:
      15 * 60 * 1000,

    limit:
      30,

    standardHeaders:
      true,

    legacyHeaders:
      false,

    message: {
      erro:
        "Too many AI generations were requested. Please try again later."
    }
  });


// ======================================================
// ANALYSIS CACHE
// ======================================================

function limparCacheAnalises() {
  const agora =
    Date.now();

  for (
    const [
      id,
      item
    ] of cacheAnalises
  ) {
    if (
      agora >
      item.expiraEm
    ) {
      cacheAnalises.delete(
        id
      );
    }
  }
}


function limitarCacheAnalises() {
  limparCacheAnalises();

  while (
    cacheAnalises.size >=
    MAX_ANALYSIS_CACHE_ENTRIES
  ) {
    const primeiroId =
      cacheAnalises
        .keys()
        .next()
        .value;

    if (
      !primeiroId
    ) {
      break;
    }

    cacheAnalises.delete(
      primeiroId
    );
  }
}


function salvarAnaliseNoCache(
  analise
) {
  limitarCacheAnalises();

  const analysisId =
    crypto.randomUUID();

  cacheAnalises.set(
    analysisId,
    {
      analise,

      expiraEm:
        Date.now() +
        ANALYSIS_CACHE_TTL_MS
    }
  );

  return analysisId;
}


function obterAnaliseDoCache(
  analysisId
) {
  limparCacheAnalises();

  const item =
    cacheAnalises.get(
      analysisId
    );

  if (
    !item
  ) {
    return null;
  }

  return item.analise;
}


function atualizarAnaliseNoCache(
  analysisId,
  analise
) {
  if (
    !cacheAnalises.has(
      analysisId
    )
  ) {
    return;
  }

  cacheAnalises.set(
    analysisId,
    {
      analise,

      expiraEm:
        Date.now() +
        ANALYSIS_CACHE_TTL_MS
    }
  );
}


// ======================================================
// BATCH HELPERS
// ======================================================

function normalizarListaUrls(
  urls
) {
  const vistas =
    new Set();

  const unicas =
    [];

  let duplicadasRemovidas =
    0;

  for (
    const valor of urls
  ) {
    const url =
      typeof valor === "string"
        ? valor.trim()
        : "";

    if (
      !url
    ) {
      continue;
    }

    const chave =
      url.toLowerCase();

    if (
      vistas.has(
        chave
      )
    ) {
      duplicadasRemovidas +=
        1;

      continue;
    }

    vistas.add(
      chave
    );

    unicas.push(
      url
    );
  }

  return {
    urls:
      unicas,

    duplicadasRemovidas
  };
}


async function mapComConcorrencia(
  itens,
  concorrencia,
  executar
) {
  let proximoIndice =
    0;

  async function worker() {
    while (
      true
    ) {
      const indice =
        proximoIndice;

      proximoIndice +=
        1;

      if (
        indice >=
        itens.length
      ) {
        return;
      }

      await executar(
        itens[indice],
        indice
      );
    }
  }

  const quantidadeWorkers =
    Math.min(
      concorrencia,
      itens.length
    );

  await Promise.all(
    Array.from(
      {
        length:
          quantidadeWorkers
      },
      () =>
        worker()
    )
  );
}


function criarResumoProspect(
  inputUrl,
  analysisId,
  analise,
  batchIndex = null
) {
  const opportunity =
    analise.opportunity ||
    {
      tier:
        "none",

      priorityScore:
        0,

      findingsCount:
        Array.isArray(
          analise.findings
        )
          ? analise.findings.length
          : 0,

      counts: {
        high:
          0,

        medium:
          0,

        low:
          0
      },

      topFinding:
        null
    };

  return {
    batchIndex,

    analysisId,

    inputUrl,

    url:
      analise.url,

    status:
      "completed",

    tier:
      opportunity.tier,

    priorityScore:
      opportunity.priorityScore,

    findingsCount:
      opportunity.findingsCount,

    counts:
      opportunity.counts,

    topFinding:
      opportunity.topFinding,

    businessName:
      analise.localSeo
        ?.businessName
      ??
      null,

    analysis:
      null,

    erro:
      null
  };
}


function criarResumoErro(
  inputUrl,
  erro,
  batchIndex = null
) {
  const urlInsegura =
    erro instanceof
    ErroURLInsegura;

  return {
    batchIndex,

    analysisId:
      null,

    inputUrl,

    url:
      null,

    status:
      "error",

    tier:
      null,

    priorityScore:
      0,

    findingsCount:
      0,

    counts: {
      high:
        0,

      medium:
        0,

      low:
        0
    },

    topFinding:
      null,

    businessName:
      null,

    analysis:
      null,

    erro:
      urlInsegura
        ? "This URL cannot be analyzed."
        : "The website could not be analyzed."
  };
}


function criarProspectPendente(
  inputUrl,
  batchIndex
) {
  return {
    batchIndex,

    analysisId:
      null,

    inputUrl,

    url:
      null,

    status:
      "queued",

    tier:
      null,

    priorityScore:
      0,

    findingsCount:
      0,

    counts: {
      high:
        0,

      medium:
        0,

      low:
        0
    },

    topFinding:
      null,

    businessName:
      null,

    analysis:
      null,

    erro:
      null
  };
}


function limparBatchJobs() {
  const agora =
    Date.now();

  for (
    const [
      batchId,
      job
    ] of batchJobs
  ) {
    if (
      agora - job.updatedAtMs >
      BATCH_JOB_TTL_MS
    ) {
      batchJobs.delete(
        batchId
      );
    }
  }
}


function limitarBatchJobs() {
  limparBatchJobs();

  while (
    batchJobs.size >=
    MAX_BATCH_JOBS
  ) {
    const finalizado =
      Array.from(
        batchJobs.entries()
      )
        .find(
          ([, job]) =>
            job.status !==
              "processing"
        );

    const batchId =
      finalizado?.[0]
      ??
      batchJobs
        .keys()
        .next()
        .value;

    if (
      !batchId
    ) {
      break;
    }

    batchJobs.delete(
      batchId
    );
  }
}


function criarBatchJob(
  lista,
  requestedCount
) {
  limitarBatchJobs();

  const batchId =
    crypto.randomUUID();

  const agora =
    new Date();

  const job = {
    batchId,

    status:
      "processing",

    createdAt:
      agora.toISOString(),

    updatedAt:
      agora.toISOString(),

    updatedAtMs:
      agora.getTime(),

    completedAt:
      null,

    requestedCount,

    uniqueCount:
      lista.urls.length,

    duplicatesRemoved:
      lista.duplicadasRemovidas,

    aiCalls:
      0,

    summary: {
      high:
        0,

      medium:
        0,

      low:
        0,

      none:
        0,

      errors:
        0
    },

    prospects:
      lista.urls.map(
        (inputUrl, batchIndex) =>
          criarProspectPendente(
            inputUrl,
            batchIndex
          )
      )
  };

  batchJobs.set(
    batchId,
    job
  );

  return job;
}


function tocarBatchJob(
  job
) {
  const agora =
    new Date();

  job.updatedAt =
    agora.toISOString();

  job.updatedAtMs =
    agora.getTime();
}


function obterBatchJob(
  batchId
) {
  limparBatchJobs();

  return batchJobs.get(
    batchId
  ) || null;
}


function criarSnapshotBatch(
  job
) {
  let completed =
    0;

  let analyzing =
    0;

  let queued =
    0;

  for (
    const prospect of job.prospects
  ) {
    if (
      prospect.status === "completed" ||
      prospect.status === "error"
    ) {
      completed +=
        1;

    } else if (
      prospect.status === "analyzing"
    ) {
      analyzing +=
        1;

    } else {
      queued +=
        1;
    }
  }

  const total =
    job.uniqueCount;

  const remaining =
    Math.max(
      0,
      total - completed
    );

  const percent =
    total > 0
      ? Math.round(
          completed /
          total *
          100
        )
      : 100;

  return {
    batchId:
      job.batchId,

    status:
      job.status,

    createdAt:
      job.createdAt,

    updatedAt:
      job.updatedAt,

    analyzedAt:
      job.completedAt,

    requestedCount:
      job.requestedCount,

    uniqueCount:
      job.uniqueCount,

    duplicatesRemoved:
      job.duplicatesRemoved,

    maxBatchSize:
      MAX_URLS_LOTE,

    aiCalls:
      job.aiCalls,

    progress: {
      total,

      completed,

      remaining,

      analyzing,

      queued,

      percent
    },

    summary: {
      ...job.summary
    },

    prospects:
      job.prospects.map(
        prospect => ({
          ...prospect,

          analysis:
            null
        })
      )
  };
}


async function processarBatchJob(
  batchId
) {
  const job =
    obterBatchJob(
      batchId
    );

  if (
    !job ||
    job.status !== "processing"
  ) {
    return;
  }

  try {
    await mapComConcorrencia(
      job.prospects,
      CONCORRENCIA_LOTE,
      async (
        prospectInicial,
        indice
      ) => {

        const jobAtual =
          obterBatchJob(
            batchId
          );

        if (
          !jobAtual
        ) {
          return;
        }

        const inputUrl =
          prospectInicial.inputUrl;

        jobAtual.prospects[indice] = {
          ...jobAtual.prospects[indice],

          status:
            "analyzing"
        };

        tocarBatchJob(
          jobAtual
        );

        console.log(
          `📍 Batch ${indice + 1}/${jobAtual.uniqueCount}: ${inputUrl}`
        );

        try {
          const analise =
            await analisarSite(
              inputUrl,
              {
                gerarIA:
                  false,

                logDetalhado:
                  false
              }
            );

          const analysisId =
            salvarAnaliseNoCache(
              analise
            );

          const resumo =
            criarResumoProspect(
              inputUrl,
              analysisId,
              analise,
              indice
            );

          jobAtual.prospects[indice] =
            resumo;

          if (
            resumo.tier in
            jobAtual.summary
          ) {
            jobAtual.summary[
              resumo.tier
            ] += 1;
          }

        } catch (erro) {
          console.log(
            `⚠️ Batch analysis failed for ${inputUrl}: ${erro.message}`
          );

          jobAtual.prospects[indice] =
            criarResumoErro(
              inputUrl,
              erro,
              indice
            );

          jobAtual.summary.errors +=
            1;
        }

        tocarBatchJob(
          jobAtual
        );
      }
    );

    const jobFinal =
      obterBatchJob(
        batchId
      );

    if (
      !jobFinal
    ) {
      return;
    }

    jobFinal.status =
      "completed";

    jobFinal.completedAt =
      new Date()
        .toISOString();

    tocarBatchJob(
      jobFinal
    );

    console.log(
      `✅ Batch completed: ${jobFinal.uniqueCount} prospects`
    );

  } catch (erro) {
    const jobFinal =
      obterBatchJob(
        batchId
      );

    if (
      jobFinal
    ) {
      jobFinal.status =
        "failed";

      tocarBatchJob(
        jobFinal
      );
    }

    console.error(
      "Batch processing error:",
      erro
    );
  }
}


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
// ANALYZE ONE SITE
// ======================================================

app.post(
  "/analisar",

  analisarLimiter,

  async (req, res) => {

    try {
      const { url } =
        req.body;

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

      console.log(
        `\n📥 Technical analysis requested for: ${url}`
      );

      const resultado =
        await analisarSite(
          url,
          {
            gerarIA:
              false
          }
        );

      const analysisId =
        salvarAnaliseNoCache(
          resultado
        );

      return res.json({
        ...resultado,
        analysisId
      });

    } catch (erro) {

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

      console.error(
        "Internal analysis error:",
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
// GET ONE CACHED ANALYSIS
// ======================================================

app.get(
  "/analise/:analysisId",

  (req, res) => {

    const { analysisId } =
      req.params;

    const analise =
      obterAnaliseDoCache(
        analysisId
      );

    if (
      !analise
    ) {
      return res
        .status(410)
        .json({
          erro:
            "This analysis expired. Please analyze the website again."
        });
    }

    return res.json({
      ...analise,

      analysisId
    });
  }
);


// ======================================================
// START PROGRESSIVE BATCH
// ======================================================

app.post(
  "/analisar-lote",

  loteLimiter,

  (req, res) => {

    const { urls } =
      req.body;

    if (
      !Array.isArray(
        urls
      )
    ) {
      return res
        .status(400)
        .json({
          erro:
            "An array of website URLs is required."
        });
    }

    if (
      urls.length === 0
    ) {
      return res
        .status(400)
        .json({
          erro:
            "At least one website URL is required."
        });
    }

    if (
      urls.length >
      MAX_URLS_LOTE
    ) {
      return res
        .status(400)
        .json({
          erro:
            `A maximum of ${MAX_URLS_LOTE} URLs can be analyzed per batch.`
        });
    }

    if (
      urls.some(
        url =>
          typeof url !== "string"
      )
    ) {
      return res
        .status(400)
        .json({
          erro:
            "Every batch item must be a URL string."
        });
    }

    const lista =
      normalizarListaUrls(
        urls
      );

    if (
      lista.urls.length === 0
    ) {
      return res
        .status(400)
        .json({
          erro:
            "No valid URL strings were provided."
        });
    }

    const job =
      criarBatchJob(
        lista,
        urls.length
      );

    console.log(
      `\n📦 Progressive batch created: ${job.batchId} · ${job.uniqueCount} unique URLs`
    );

    const snapshot =
      criarSnapshotBatch(
        job
      );

    res
      .status(202)
      .json(
        snapshot
      );

    setImmediate(
      () => {

        processarBatchJob(
          job.batchId
        )
          .catch(
            erro => {

              console.error(
                "Unhandled progressive batch error:",
                erro
              );
            }
          );
      }
    );
  }
);


// ======================================================
// BATCH STATUS
// ======================================================

app.get(
  "/analisar-lote/:batchId",

  (req, res) => {

    const job =
      obterBatchJob(
        req.params.batchId
      );

    if (
      !job
    ) {
      return res
        .status(410)
        .json({
          erro:
            "This batch expired or is no longer available."
        });
    }

    return res.json(
      criarSnapshotBatch(
        job
      )
    );
  }
);


// ======================================================
// GENERATE AI OUTREACH ON DEMAND
// ======================================================

app.post(
  "/gerar-outreach",

  outreachLimiter,

  async (req, res) => {

    try {
      const { analysisId } =
        req.body;

      if (
        !analysisId ||
        typeof analysisId !== "string"
      ) {
        return res
          .status(400)
          .json({
            erro:
              "A valid analysisId is required."
          });
      }

      const analise =
        obterAnaliseDoCache(
          analysisId
        );

      if (
        !analise
      ) {
        return res
          .status(410)
          .json({
            erro:
              "This analysis expired. Please analyze the website again."
          });
      }

      if (
        !Array.isArray(
          analise.findings
        ) ||
        analise.findings.length === 0
      ) {
        return res.json({
          analysisId,

          url:
            analise.url,

          agencyView:
            null,

          prospectView:
            null,

          iaStatus:
            "no_findings"
        });
      }

      console.log(
        `\n🤖 AI generation requested for: ${analise.url}`
      );

      const views =
        await gerarViewsComIA(
          analise.url,
          analise.findings
        );

      const analiseAtualizada = {
        ...analise,

        agencyView:
          views.agencyView,

        prospectView:
          views.prospectView,

        iaStatus:
          views.status
      };

      atualizarAnaliseNoCache(
        analysisId,
        analiseAtualizada
      );

      return res.json({
        analysisId,

        url:
          analise.url,

        agencyView:
          views.agencyView,

        prospectView:
          views.prospectView,

        iaStatus:
          views.status,

        erro:
          views.erro
          ??
          null
      });

    } catch (erro) {

      console.error(
        "AI generation error:",
        erro
      );

      return res
        .status(500)
        .json({
          erro:
            "An internal error occurred while generating outreach."
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
      "🛡️ Single analysis limit: 20 / 15 min / IP"
    );

    console.log(
      "📦 Batch limit: 5 batches / 15 min / IP"
    );

    console.log(
      `📦 Progressive batch: up to ${MAX_URLS_LOTE} URLs, concurrency ${CONCORRENCIA_LOTE}`
    );

    console.log(
      "🤖 AI is generated only on explicit outreach requests"
    );
  }
);