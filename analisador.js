require("dotenv").config();

const cheerio = require("cheerio");
const { GoogleGenAI } = require("@google/genai");
const readline = require("readline");

const {
  fetchSeguro,
  validarUrlPublica,
  ErroURLInsegura
} = require("./seguranca");

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

      const resposta =
        await fetch(apiEndpoint);


      // Retry se o servidor do Google falhar

      if (resposta.status >= 500) {

        if (tentativa < maxTentativas) {

          console.log(
            "⚠️ PageSpeed falhou. Tentando novamente em 2 segundos..."
          );

          await esperar(2000);

          continue;
        }


        resultado.erro =
          `HTTP ${resposta.status}`;

        return resultado;
      }


      if (!resposta.ok) {

        resultado.erro =
          `HTTP ${resposta.status}`;

        return resultado;
      }


      // Recebe primeiro como texto.
      // Isso evita quebrar caso o Google
      // devolva algo que não seja JSON.

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


      // =================================================
      // SCORE
      // =================================================

      resultado.score =
        Math.round(
          performanceScore * 100
        );


      // =================================================
      // LCP
      // =================================================

      resultado.lcp =
        audits[
          "largest-contentful-paint"
        ]?.displayValue ?? null;


      resultado.lcpMs =
        audits[
          "largest-contentful-paint"
        ]?.numericValue ?? null;


      // =================================================
      // CLS
      // =================================================

      resultado.cls =
        audits[
          "cumulative-layout-shift"
        ]?.displayValue ?? null;


      resultado.clsValor =
        audits[
          "cumulative-layout-shift"
        ]?.numericValue ?? null;


      // =================================================
      // FCP
      // =================================================

      resultado.fcp =
        audits[
          "first-contentful-paint"
        ]?.displayValue ?? null;


      resultado.fcpMs =
        audits[
          "first-contentful-paint"
        ]?.numericValue ?? null;


      // =================================================
      // SPEED INDEX
      // =================================================

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

      // =================================================
      // SEGURANÇA
      //
      // Agora usamos fetchSeguro em vez de fetch.
      // Ele valida IPs, redirects e destinos internos.
      // =================================================

      const resposta =
        await fetchSeguro(url, {

          headers: {

            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",

            "Accept":
              "text/html,application/xhtml+xml"
          }

        });


      // Retry para erros temporários

      if (
        resposta.status === 429 ||
        resposta.status >= 500
      ) {

        if (tentativa < maxTentativas) {

          console.log(
            `⚠️ HTML respondeu HTTP ${resposta.status}. Tentando novamente em 2 segundos...`
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


      // =================================================
      // TITLE
      // =================================================

      resultado.title =
        $("title")
          .first()
          .text()
          .trim()
        ||
        "Não encontrado";


      // =================================================
      // META DESCRIPTION
      // =================================================

      resultado.metaDescription =
        $('meta[name="description"]')
          .attr("content")
          ?.trim()
        ||
        "Não encontrada";


      // =================================================
      // H1
      // =================================================

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

      // =================================================
      // SEGURANÇA
      //
      // Um bloqueio de SSRF não é um erro temporário.
      // Portanto NÃO fazemos retry.
      // =================================================

      if (
        erro instanceof ErroURLInsegura
      ) {

        throw erro;
      }


      if (tentativa < maxTentativas) {

        console.log(
          "⚠️ Erro ao ler HTML. Tentando novamente em 2 segundos..."
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
// FINDINGS VERIFICÁVEIS
// ======================================================

function gerarFindings(
  performance,
  seo
) {

  const findings = [];


  // ====================================================
  // SEO
  // ====================================================

  if (!seo.erro) {


    // TITLE AUSENTE

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


    // META DESCRIPTION AUSENTE

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


    // H1 AUSENTE

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


  // ====================================================
  // PERFORMANCE
  // ====================================================

  if (!performance.erro) {


    // LCP ACIMA DO NOSSO LIMITE

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


    // CLS ACIMA DO NOSSO LIMITE

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
// GEMINI
// AGENCY VIEW + PROSPECT VIEW
// ======================================================

async function gerarViewsComIA(
  url,
  findings
) {

  // Sem findings = sem chamada de IA.

  if (
    !findings ||
    findings.length === 0
  ) {

    return {

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


  const prompt = `
You are assisting a Local SEO agency with prospecting.

You will receive ONLY verified technical findings collected by software.

Your job is to create TWO outputs:

1. AGENCY VIEW
2. PROSPECT VIEW


==================================================
GLOBAL FACTUAL RULES
==================================================

The VERIFIED FINDINGS below are your ONLY source of factual information.

NEVER invent, assume, infer, or add technical problems.

NEVER invent or claim:

- visitor behavior
- bounce rate
- lost customers
- conversions
- revenue impact
- traffic loss
- ranking loss
- Google penalties
- financial loss
- mobile-specific problems

unless that exact information is explicitly included in the verified findings.

NEVER invent credentials about the agency.

Do NOT say:

"We specialize in..."
"We've helped..."
"Our team..."
"Our clients..."

unless that information was explicitly provided.

Technical measurements must remain exactly as supplied.

If a factual claim cannot be supported by the verified findings,
DO NOT make that claim.


==================================================
AGENCY VIEW
==================================================

Write a concise technical explanation intended for an SEO professional.

For every finding explain:

- what was detected;
- the exact evidence;
- what the metric or element represents;
- why it deserves review;
- suggested priority based ONLY on the provided severity.

Prefer objective language.

For example:

"The measurement exceeds the threshold used by this analyzer."

Do NOT claim that the threshold is universal,
industry-standard,
or used by all performance tools.

Do NOT invent additional diagnostics.

Do NOT infer visitor behavior.

Keep the Agency View concise and professional.


==================================================
PROSPECT VIEW
==================================================

Write a short B2B outreach message to the business owner.

MARKETING INTENSITY:
3 out of 5.

The message should be persuasive enough to create curiosity,
but never exaggerate or invent business impact.


==================================================
FACTUAL RESTRICTIONS
==================================================

- Never say "fully load" when describing LCP.

- When describing LCP, prefer:

  "the main visible content took X seconds to appear in the test."

- Never imply that multiple issues or opportunities exist when only one verified finding was provided.

- If there is exactly one finding, refer to it in the singular.

- If there are multiple findings, you may mention that more than one area was found.

- Never say a threshold is an industry-standard or universal benchmark unless that information was explicitly provided.

- Do NOT mention "the threshold used by this analyzer" in the Prospect View.

Threshold language belongs only in the Agency View.

- Never claim or imply:

  visitor behavior,
  bounce rate,
  lost customers,
  lost revenue,
  lower conversions,
  ranking loss,
  Google penalties,
  traffic loss,
  or mobile-specific impact,

unless that exact information was explicitly provided in the verified findings.

- Never invent agency credentials or experience.

Do NOT say:

"We specialize in..."
"We've helped..."
"Our team..."
"Our clients..."

unless that information was explicitly provided.


==================================================
PROSPECT VIEW STRUCTURE
==================================================

Use this general flow:


1. PERSONALIZED HOOK

Make it clear that the sender actually reviewed the website.

Good style examples:

"I took a quick look at your website and noticed one thing worth reviewing."

"I ran a quick check on your site and one specific area stood out."

Avoid generic introductions.


2. SPECIFIC EVIDENCE

Mention the strongest VERIFIED finding.

Use the exact measurement provided.

If there is only one finding,
focus only on that finding.

If there are multiple findings,
prioritize the 1 or 2 strongest findings.

Do not overwhelm the prospect with technical details.


3. SIMPLE EXPLANATION

Translate the technical finding into normal business language.

For LCP:

Explain that it measures how long the main visible content takes to appear.

You may say:

"This result may make the page feel slower to some visitors."

Do NOT say that the entire page took that amount of time to load.

For structural SEO findings:

Explain the role of the element conservatively.

Never claim guaranteed improvements in:

- rankings
- traffic
- conversions
- revenue


4. CURIOSITY / VALUE GAP

Create a reason for the prospect to reply
without fear or exaggeration.

If there is exactly one finding,
keep the wording singular.

Allowed examples:

"This is something I would look at first."

"I can show you what I would prioritize first and why."

"I can send over a quick breakdown of what I would review first."

If there are multiple VERIFIED findings,
you may say:

"There are a couple of areas I would look at first."

Do NOT claim that additional issues exist
unless they are present in the VERIFIED FINDINGS.


5. SOFT CTA

Finish with a low-friction question.

Prefer:

"Want me to send over the quick breakdown?"

"Would it be useful if I showed you what I'd prioritize first?"

"Happy to send over a quick breakdown if you're interested."

Do NOT automatically ask for:

- a meeting
- a call
- calendar availability


==================================================
WRITING STYLE
==================================================

- Write in English.

- Approximately 70 to 110 words.

- Natural and human.

- Short paragraphs.

- Consultative.

- Confident but not aggressive.

- Avoid sounding like an automated audit.

- Avoid heavy technical jargon.

- Avoid robotic wording.

Avoid phrases such as:

"this load timing"

"standard benchmark threshold"

"technical deficiency"


Prefer natural wording such as:

"how quickly the main content appears"

"page loading performance"

"one thing worth reviewing"


- No fake urgency.

- No fear-based selling.

- No long introduction.

- Do not mention AI.

- Do not use "Dear Sir/Madam".

- Do not invent the business owner's name.


==================================================
GOAL
==================================================

The message should make the prospect think:

"They actually looked at my website,
found something specific,
and I am curious to see what they would recommend."

The message must remain completely grounded
in the VERIFIED FINDINGS.


==================================================
OUTPUT FORMAT
==================================================

Return ONLY valid JSON.

Exactly this structure:

{
  "agencyView": "text here",
  "prospectView": "text here"
}

Do NOT use Markdown code fences.

Do NOT add anything before or after the JSON.


==================================================
TARGET WEBSITE
==================================================

${url}


==================================================
VERIFIED FINDINGS
==================================================

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
// ANALISA UM SITE
// ======================================================

async function analisarSite(url) {

  // ====================================================
  // SEGURANÇA
  //
  // Defesa em profundidade.
  //
  // Mesmo que analisarSite seja chamado sem passar
  // pelo server.js, a URL ainda será validada.
  // ====================================================

  url =
    await validarUrlPublica(url);


  console.log(
    "\n========================================"
  );

  console.log(
    `🔎 Analisando: ${url}`
  );

  console.log(
    "========================================"
  );


  // ====================================================
  // PAGESPEED
  // ====================================================

  console.log(
    "\nConsultando PageSpeed..."
  );


  const performance =
    await analisarPageSpeed(url);


  // ====================================================
  // HTML
  // ====================================================

  console.log(
    "Lendo HTML do site..."
  );


  const seo =
    await analisarHTML(url);


  // ====================================================
  // FINDINGS
  // ====================================================

  console.log(
    "Gerando findings..."
  );


  const findings =
    gerarFindings(
      performance,
      seo
    );


  // ====================================================
  // IA
  // ====================================================

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


  // ====================================================
  // RESULTADO FINAL
  // ====================================================

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


  // ====================================================
  // TERMINAL - RESULTADO TÉCNICO
  // ====================================================

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


  // ====================================================
  // TERMINAL - AGENCY VIEW
  // ====================================================

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


  // ====================================================
  // TERMINAL - PROSPECT VIEW
  // ====================================================

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


  // ====================================================
  // ERROS DA IA
  // ====================================================

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
        "\nResposta bruta da Gemini:"
      );


      console.log(
        views.respostaBruta
      );
    }
  }


  return resultado;
}


// ======================================================
// TERMINAL
// ======================================================

// Essa parte só roda quando você executar:
//
// node analisador.js
//
// Quando server.js importa o analisador,
// ela não será executada.

if (
  require.main === module
) {

  const rl =
    readline.createInterface({

      input:
        process.stdin,

      output:
        process.stdout
    });


  rl.question(

    "\n🌐 Digite a URL do site que deseja analisar:\n> ",

    async (url) => {

      url =
        url.trim();


      // Adiciona HTTPS automaticamente

      if (
        !url.startsWith("http://") &&
        !url.startsWith("https://")
      ) {

        url =
          `https://${url}`;
      }


      try {

        await analisarSite(url);

      } catch (erro) {

        console.log(
          "\n🚨 Erro inesperado:"
        );

        console.log(
          erro.message
        );

      } finally {

        rl.close();
      }
    }
  );
}


// ======================================================
// EXPORTA PARA O SERVER.JS
// ======================================================

module.exports = {
  analisarSite
};