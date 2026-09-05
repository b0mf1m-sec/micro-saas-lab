require("dotenv").config();

const cheerio = require("cheerio");
const { GoogleGenAI } = require("@google/genai");

const pagespeedApiKey = process.env.PAGESPEED_API_KEY;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});


// ======================================================
// UTILITÁRIO
// ======================================================

function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


// ======================================================
// PAGESPEED
// ======================================================

async function analisarPageSpeed(url) {

  const resultado = {
    score: null,

    lcp: null,
    lcpMs: null,

    cls: null,
    clsValor: null,

    fcp: null,
    fcpMs: null,

    speedIndex: null,
    speedIndexMs: null,

    erro: null
  };

  const apiEndpoint =
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${pagespeedApiKey}`;

  const maxTentativas = 2;

  for (
    let tentativa = 1;
    tentativa <= maxTentativas;
    tentativa++
  ) {

    try {

      const resposta = await fetch(apiEndpoint);

      // Tenta novamente caso o servidor do Google falhe
      if (resposta.status >= 500) {

        if (tentativa < maxTentativas) {

          console.log(
            "⚠️ PageSpeed falhou. Tentando novamente em 2 segundos..."
          );

          await esperar(2000);

          continue;
        }

        resultado.erro = `HTTP ${resposta.status}`;

        return resultado;
      }


      if (!resposta.ok) {

        resultado.erro =
          `HTTP ${resposta.status}`;

        return resultado;
      }


      const textoResposta =
        await resposta.text();


      let dados;

      try {

        dados =
          JSON.parse(textoResposta);

      } catch {

        resultado.erro =
          "O PageSpeed retornou uma resposta inválida.";

        return resultado;
      }


      if (dados.error) {

        resultado.erro =
          dados.error.message;

        return resultado;
      }


      const audits =
        dados.lighthouseResult?.audits;


      const performanceScore =
        dados
          .lighthouseResult
          ?.categories
          ?.performance
          ?.score;


      if (
        !audits ||
        performanceScore === undefined
      ) {

        resultado.erro =
          "Dados do Lighthouse incompletos.";

        return resultado;
      }


      resultado.score =
        Math.round(
          performanceScore * 100
        );


      resultado.lcp =
        audits[
          "largest-contentful-paint"
        ]?.displayValue ?? null;


      resultado.lcpMs =
        audits[
          "largest-contentful-paint"
        ]?.numericValue ?? null;


      resultado.cls =
        audits[
          "cumulative-layout-shift"
        ]?.displayValue ?? null;


      resultado.clsValor =
        audits[
          "cumulative-layout-shift"
        ]?.numericValue ?? null;


      resultado.fcp =
        audits[
          "first-contentful-paint"
        ]?.displayValue ?? null;


      resultado.fcpMs =
        audits[
          "first-contentful-paint"
        ]?.numericValue ?? null;


      resultado.speedIndex =
        audits[
          "speed-index"
        ]?.displayValue ?? null;


      resultado.speedIndexMs =
        audits[
          "speed-index"
        ]?.numericValue ?? null;


      return resultado;

    } catch (erro) {

      if (tentativa < maxTentativas) {

        console.log(
          "⚠️ Erro ao consultar PageSpeed. Tentando novamente..."
        );

        await esperar(2000);

        continue;
      }


      resultado.erro =
        erro.message;

      return resultado;
    }
  }


  return resultado;
}


// ======================================================
// HTML
// ======================================================

async function analisarHTML(url) {

  const resultado = {
    title: null,
    metaDescription: null,
    h1Count: null,
    h1Textos: [],
    erro: null
  };


  const maxTentativas = 2;


  for (
    let tentativa = 1;
    tentativa <= maxTentativas;
    tentativa++
  ) {

    try {

      const resposta =
        await fetch(url, {

          headers: {

            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",

            "Accept":
              "text/html,application/xhtml+xml"
          }

        });


      if (
        resposta.status === 429 ||
        resposta.status >= 500
      ) {

        if (tentativa < maxTentativas) {

          console.log(
            `⚠️ HTML respondeu HTTP ${resposta.status}. Tentando novamente...`
          );

          await esperar(2000);

          continue;
        }
      }


      if (!resposta.ok) {

        resultado.erro =
          `HTTP ${resposta.status}`;

        return resultado;
      }


      const html =
        await resposta.text();


      const $ =
        cheerio.load(html);


      resultado.title =
        $("title")
          .first()
          .text()
          .trim()
        ||
        "Não encontrado";


      resultado.metaDescription =
        $('meta[name="description"]')
          .attr("content")
          ?.trim()
        ||
        "Não encontrada";


      resultado.h1Count =
        $("h1").length;


      $("h1").each(
        (index, elemento) => {

          const texto =
            $(elemento)
              .text()
              .trim();


          if (texto) {

            resultado
              .h1Textos
              .push(texto);
          }
        }
      );


      return resultado;

    } catch (erro) {

      if (tentativa < maxTentativas) {

        console.log(
          "⚠️ Erro ao ler HTML. Tentando novamente..."
        );

        await esperar(2000);

        continue;
      }


      resultado.erro =
        erro.message;


      return resultado;
    }
  }


  return resultado;
}


// ======================================================
// FINDINGS
// ======================================================

function gerarFindings(
  performance,
  seo
) {

  const findings = [];


  // ----------------------
  // SEO
  // ----------------------

  if (!seo.erro) {

    if (
      !seo.title ||
      seo.title === "Não encontrado"
    ) {

      findings.push({

        codigo:
          "TITLE_AUSENTE",

        categoria:
          "seo",

        severidade:
          "alta",

        evidencia:
          "Nenhum elemento title foi encontrado no HTML da página."
      });
    }


    if (
      !seo.metaDescription ||
      seo.metaDescription ===
        "Não encontrada"
    ) {

      findings.push({

        codigo:
          "META_DESCRIPTION_AUSENTE",

        categoria:
          "seo",

        severidade:
          "media",

        evidencia:
          "Nenhuma meta description foi encontrada no HTML da página."
      });
    }


    if (
      seo.h1Count === 0
    ) {

      findings.push({

        codigo:
          "H1_AUSENTE",

        categoria:
          "seo",

        severidade:
          "media",

        evidencia:
          "Nenhum elemento H1 foi encontrado no HTML da página."
      });
    }
  }


  // ----------------------
  // PERFORMANCE
  // ----------------------

  if (!performance.erro) {

    if (
      performance.lcpMs !== null &&
      performance.lcpMs > 2500
    ) {

      findings.push({

        codigo:
          "LCP_ALTO",

        categoria:
          "performance",

        severidade:
          "alta",

        evidencia:
          `O Largest Contentful Paint medido foi de ${performance.lcp}.`
      });
    }


    if (
      performance.clsValor !== null &&
      performance.clsValor > 0.1
    ) {

      findings.push({

        codigo:
          "CLS_ALTO",

        categoria:
          "performance",

        severidade:
          "alta",

        evidencia:
          `O Cumulative Layout Shift medido foi de ${performance.clsValor}.`
      });
    }
  }


  return findings;
}


// ======================================================
// IA
// AGENCY VIEW + PROSPECT VIEW
// ======================================================

async function gerarViewsComIA(
  url,
  findings
) {

  // Nenhum problema comprovado:
  // não gastamos chamada de IA.

  if (
    !findings ||
    findings.length === 0
  ) {

    return {

      agencyView: null,

      prospectView: null,

      status:
        "sem_findings",

      erro:
        null
    };
  }


  const prompt = `
You are assisting a Local SEO agency.

You will receive ONLY verified technical findings collected by software.

Your job is to create TWO outputs:

1. AGENCY VIEW
2. PROSPECT VIEW


========================
GLOBAL SAFETY RULES
========================

The verified findings below are your ONLY source of factual information.

NEVER invent, assume, infer, or add technical problems that are not explicitly included.

NEVER invent:

- visitor behavior
- bounce rate
- conversions
- revenue impact
- lost customers
- rankings
- Google penalties
- traffic impact
- financial impact
- mobile-specific impact

unless that exact information exists in the verified findings.

NEVER invent information about the SEO agency.

Do NOT say:

"We specialize in..."
"Our team..."
"We have helped..."
"Our clients..."

unless such information was provided.

Technical measurements must remain exactly as supplied.

If a claim is not justified by the verified findings, DO NOT make that claim.


========================
AGENCY VIEW
========================

Write a concise technical explanation intended for the SEO professional.

For every finding explain:

- what was detected;
- the exact evidence;
- what the metric or element represents;
- why it may be worth reviewing;
- suggested priority based ONLY on the provided severity.

Do not invent additional diagnostics.

Keep the Agency View concise and professional.


========================
PROSPECT VIEW
========================

Write a short outreach message for the business owner.

Rules:

- Write in English.
- Maximum approximately 110 words.
- Sound human and consultative.
- Avoid heavy technical jargon.
- Briefly explain technical terminology when necessary.
- Do not use fear or aggressive sales language.
- Do not state that visitors are leaving or customers are being lost.
- Do not claim ranking or revenue impact.
- Use cautious language such as:
  "may"
  "can"
  "could"
  "potentially"

For performance issues, you may say that a result may make a page feel slower.

End with a soft CTA offering to show what should be prioritized and why.


========================
OUTPUT FORMAT
========================

Return ONLY valid JSON.

Exactly this structure:

{
  "agencyView": "text here",
  "prospectView": "text here"
}

Do not use Markdown code fences.

Do not add text before or after the JSON.


========================
TARGET WEBSITE
========================

${url}


========================
VERIFIED FINDINGS
========================

${JSON.stringify(
  findings,
  null,
  2
)}
`;


  try {

    const resposta =
      await ai.interactions.create({

        model:
          "gemini-3.6-flash",

        input:
          prompt
      });


    const textoBruto =
      resposta.output_text.trim();


    let dadosIA;


    try {

      dadosIA =
        JSON.parse(textoBruto);

    } catch {

      return {

        agencyView:
          null,

        prospectView:
          null,

        status:
          "erro_json",

        erro:
          "A Gemini respondeu, mas não retornou JSON válido.",

        respostaBruta:
          textoBruto
      };
    }


    return {

      agencyView:
        dadosIA.agencyView ?? null,

      prospectView:
        dadosIA.prospectView ?? null,

      status:
        "gerado",

      erro:
        null
    };

  } catch (erro) {

    return {

      agencyView:
        null,

      prospectView:
        null,

      status:
        "erro",

      erro:
        erro.message
    };
  }
}


// ======================================================
// FUNÇÃO PRINCIPAL
// ======================================================

async function analisarSites() {

  const sites = [

    "https://washdent.com",

    "https://dcwashingtonplumber.com",

    "https://www.ngachelectric.com"

  ];


  for (
    let i = 0;
    i < sites.length;
    i++
  ) {

    const url =
      sites[i];


    console.log(
      "\n\n========================================"
    );

    console.log(
      `Analisando site ${i + 1}: ${url}`
    );

    console.log(
      "========================================"
    );


    // ----------------------
    // PageSpeed
    // ----------------------

    console.log(
      "\nConsultando PageSpeed..."
    );


    const performance =
      await analisarPageSpeed(url);


    // ----------------------
    // HTML
    // ----------------------

    console.log(
      "Lendo HTML do site..."
    );


    const seo =
      await analisarHTML(url);


    // ----------------------
    // Findings
    // ----------------------

    console.log(
      "Gerando findings..."
    );


    const findings =
      gerarFindings(
        performance,
        seo
      );


    // ----------------------
    // IA
    // ----------------------

    let views;


    if (
      findings.length > 0
    ) {

      console.log(
        "🤖 Gerando Agency View e Prospect View..."
      );


      views =
        await gerarViewsComIA(
          url,
          findings
        );

    } else {

      console.log(
        "ℹ️ Nenhum finding verificável. Gemini não será chamada."
      );


      views = {

        agencyView:
          null,

        prospectView:
          null,

        status:
          "sem_findings",

        erro:
          null
      };
    }


    // ----------------------
    // Resultado final
    // ----------------------

    const resultado = {

      url,

      analisadoEm:
        new Date().toISOString(),

      performance,

      seo,

      findings,

      agencyView:
        views.agencyView,

      prospectView:
        views.prospectView,

      iaStatus:
        views.status
    };


    // ----------------------
    // Resultado técnico
    // ----------------------

    console.log(
      "\n✅ RESULTADO TÉCNICO"
    );


    console.dir(
      {
        url:
          resultado.url,

        performance:
          resultado.performance,

        seo:
          resultado.seo,

        findings:
          resultado.findings
      },

      {
        depth:
          null
      }
    );


    // ----------------------
    // Agency View
    // ----------------------

    if (
      resultado.agencyView
    ) {

      console.log(
        "\n========================================"
      );

      console.log(
        "🏢 AGENCY VIEW"
      );

      console.log(
        "========================================\n"
      );


      console.log(
        resultado.agencyView
      );
    }


    // ----------------------
    // Prospect View
    // ----------------------

    if (
      resultado.prospectView
    ) {

      console.log(
        "\n========================================"
      );

      console.log(
        "🤖 PROSPECT VIEW"
      );

      console.log(
        "========================================\n"
      );


      console.log(
        resultado.prospectView
      );
    }


    // ----------------------
    // Erro da IA
    // ----------------------

    if (
      views.erro
    ) {

      console.log(
        "\n🚨 ERRO NA IA:"
      );


      console.log(
        views.erro
      );


      if (
        views.respostaBruta
      ) {

        console.log(
          "\nResposta original:"
        );


        console.log(
          views.respostaBruta
        );
      }
    }
  }
}


// ======================================================
// EXECUTA
// ======================================================

analisarSites();