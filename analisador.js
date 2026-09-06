require("dotenv").config();

const cheerio = require("cheerio");
const { GoogleGenAI } = require("@google/genai");
const readline = require("readline");

const {
  fetchSeguro,
  validarUrlPublica,
  ErroURLInsegura
} = require("./seguranca");

const {
  obterCacheIA,
  salvarCacheIA
} = require("./cacheIA");

const pagespeedApiKey =
  process.env.PAGESPEED_API_KEY;


const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});


// ======================================================
// UTILITY
// ======================================================

function esperar(ms) {
  return new Promise(
    resolve => setTimeout(resolve, ms)
  );
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


      // =================================================
      // GOOGLE TEMPORARY ERROR
      // =================================================

      if (
        resposta.status >= 500
      ) {

        if (
          tentativa < maxTentativas
        ) {

          console.log(
            "⚠️ PageSpeed failed. Retrying in 2 seconds..."
          );


          await esperar(2000);

          continue;
        }


        resultado.erro =
          `HTTP ${resposta.status}`;


        return resultado;
      }


      // =================================================
      // OTHER HTTP ERROR
      // =================================================

      if (!resposta.ok) {

        resultado.erro =
          `HTTP ${resposta.status}`;


        return resultado;
      }


      // =================================================
      // RESPONSE
      // =================================================

      const textoResposta =
        await resposta.text();


      let dados;


      try {

        dados =
          JSON.parse(
            textoResposta
          );

      } catch {

        resultado.erro =
          "PageSpeed returned an invalid response.";


        return resultado;
      }


      if (
        dados.error
      ) {

        resultado.erro =
          dados.error.message;


        return resultado;
      }


      const audits =
        dados
          .lighthouseResult
          ?.audits;


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
          "Incomplete Lighthouse data.";


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

      if (
        tentativa <
        maxTentativas
      ) {

        console.log(
          "⚠️ Error contacting PageSpeed. Retrying..."
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
// HTML ANALYSIS
// ======================================================

async function analisarHTML(url) {

  const resultado = {

    title: null,

    metaDescription: null,

    h1Count: null,

    h1Textos: [],

    erro: null
  };


  const maxTentativas =
    2;


  for (
    let tentativa = 1;
    tentativa <= maxTentativas;
    tentativa++
  ) {

    try {

      const resposta =
        await fetchSeguro(
          url,
          {

            headers: {

              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",

              "Accept":
                "text/html,application/xhtml+xml"
            }
          }
        );


      // =================================================
      // TEMPORARY SITE ERROR
      // =================================================

      if (
        resposta.status === 429 ||
        resposta.status >= 500
      ) {

        if (
          tentativa <
          maxTentativas
        ) {

          console.log(
            `⚠️ HTML returned HTTP ${resposta.status}. Retrying in 2 seconds...`
          );


          await esperar(2000);

          continue;
        }
      }


      if (
        !resposta.ok
      ) {

        resultado.erro =
          `HTTP ${resposta.status}`;


        return resultado;
      }


      // =================================================
      // HTML
      // =================================================

      const html =
        await resposta.text();


      const $ =
        cheerio.load(
          html
        );


      // =================================================
      // TITLE
      // =================================================

      const title =
        $("title")
          .first()
          .text()
          .trim();


      resultado.title =
        title || null;


      // =================================================
      // META DESCRIPTION
      // =================================================

      const metaDescription =
        $('meta[name="description"]')
          .attr("content")
          ?.trim();


      resultado.metaDescription =
        metaDescription || null;


      // =================================================
      // H1
      // =================================================

      resultado.h1Count =
        $("h1").length;


      $("h1").each(
        (
          index,
          elemento
        ) => {

          const texto =
            $(elemento)
              .text()
              .trim();


          if (
            texto
          ) {

            resultado
              .h1Textos
              .push(
                texto
              );
          }
        }
      );


      return resultado;

    } catch (erro) {


      // =================================================
      // SECURITY ERRORS MUST NOT RETRY
      // =================================================

      if (
        erro instanceof
        ErroURLInsegura
      ) {

        throw erro;
      }


      // =================================================
      // NORMAL RETRY
      // =================================================

      if (
        tentativa <
        maxTentativas
      ) {

        console.log(
          "⚠️ Error reading HTML. Retrying in 2 seconds..."
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
// VERIFIED FINDINGS
// ======================================================

function gerarFindings(
  performance,
  seo
) {

  const findings =
    [];


  // ====================================================
  // SEO
  // ====================================================

  if (
    !seo.erro
  ) {


    // ==================================================
    // TITLE MISSING
    // ==================================================

    if (
      !seo.title
    ) {

      findings.push({

        codigo:
          "TITLE_MISSING",

        categoria:
          "seo",

        severidade:
          "high",

        evidencia:
          "No title element was found in the page HTML."
      });
    }


    // ==================================================
    // META DESCRIPTION MISSING
    // ==================================================

    if (
      !seo.metaDescription
    ) {

      findings.push({

        codigo:
          "META_DESCRIPTION_MISSING",

        categoria:
          "seo",

        severidade:
          "medium",

        evidencia:
          "No meta description was found in the page HTML."
      });
    }


    // ==================================================
    // H1 MISSING
    // ==================================================

    if (
      seo.h1Count === 0
    ) {

      findings.push({

        codigo:
          "H1_MISSING",

        categoria:
          "seo",

        severidade:
          "medium",

        evidencia:
          "No H1 element was found in the page HTML."
      });
    }
  }


  // ====================================================
  // PERFORMANCE
  // ====================================================

  if (
    !performance.erro
  ) {


    // ==================================================
    // HIGH LCP
    // ==================================================

    if (
      performance.lcpMs !== null &&
      performance.lcpMs > 2500
    ) {

      findings.push({

        codigo:
          "LCP_HIGH",

        categoria:
          "performance",

        severidade:
          "high",

        evidencia:
          `The measured Largest Contentful Paint was ${performance.lcp}.`
      });
    }


    // ==================================================
    // HIGH CLS
    // ==================================================

    if (
      performance.clsValor !== null &&
      performance.clsValor > 0.1
    ) {

      findings.push({

        codigo:
          "CLS_HIGH",

        categoria:
          "performance",

        severidade:
          "high",

        evidencia:
          `The measured Cumulative Layout Shift was ${performance.clsValor}.`
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

  // ====================================================
  // NO FINDINGS
  // ====================================================

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
        "no_findings",

      erro:
        null
    };
  }

  // ====================================================
  // AI CACHE
  // ====================================================

  const cache =
    obterCacheIA(
      url,
      findings
    );


  if (cache) {

    console.log(
      "🧠 AI cache hit. Reusing previous response."
    );


    return {

      agencyView:
        cache.agencyView,

      prospectView:
        cache.prospectView,

      status:
        "cached",

      erro:
        null
    };
  }

  // ====================================================
  // PROMPT
  // ====================================================

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

    // ==================================================
    // GEMINI REQUEST
    // ==================================================

    const resposta =
      await ai.interactions.create({

        model:
          "gemini-3.6-flash",

        input:
          prompt
      });


    const textoBruto =
      resposta
        .output_text
        .trim();


    let dadosIA;


    // ==================================================
    // PARSE JSON
    // ==================================================

    try {

      dadosIA =
        JSON.parse(
          textoBruto
        );

    } catch {

      return {

        agencyView:
          null,

        prospectView:
          null,

        status:
          "invalid_json",

        erro:
          "Gemini returned an invalid JSON response.",

        respostaBruta:
          textoBruto
      };
    }


    // ==================================================
    // SUCCESS
    // ==================================================

        const resultadoIA = {

      agencyView:
        dadosIA.agencyView ?? null,

      prospectView:
        dadosIA.prospectView ?? null
    };


    salvarCacheIA(
      url,
      findings,
      resultadoIA
    );


    console.log(
      "💾 AI response saved to cache."
    );


    return {

      ...resultadoIA,

      status:
        "generated",

      erro:
        null
    };

  } catch (erro) {

    const mensagem =
      erro?.message || "";


    const mensagemLower =
      mensagem.toLowerCase();


    // ==================================================
    // GEMINI RATE LIMIT / QUOTA
    // ==================================================

    if (
      mensagem.includes("429") ||
      mensagemLower.includes("quota") ||
      mensagemLower.includes("rate limit")
    ) {

      return {

        agencyView:
          null,

        prospectView:
          null,

        status:
          "rate_limited",

        erro:
          "AI generation is temporarily rate limited."
      };
    }


    // ==================================================
    // OTHER AI ERROR
    // ==================================================

    return {

      agencyView:
        null,

      prospectView:
        null,

      status:
        "error",

      erro:
        mensagem
    };
  }
}


// ======================================================
// ANALYZE SITE
// ======================================================

async function analisarSite(url) {

  // ====================================================
  // SECURITY VALIDATION
  // ====================================================

  url =
    await validarUrlPublica(
      url
    );


  console.log(
    "\n========================================"
  );


  console.log(
    `🔎 Analyzing: ${url}`
  );


  console.log(
    "========================================"
  );


  // ====================================================
  // PAGESPEED
  // ====================================================

  console.log(
    "\nChecking PageSpeed..."
  );


  const performance =
    await analisarPageSpeed(
      url
    );


  // ====================================================
  // HTML
  // ====================================================

  console.log(
    "Reading website HTML..."
  );


  const seo =
    await analisarHTML(
      url
    );


  // ====================================================
  // FINDINGS
  // ====================================================

  console.log(
    "Generating verified findings..."
  );


  const findings =
    gerarFindings(
      performance,
      seo
    );


  // ====================================================
  // AI
  // ====================================================

  let views;


  if (
    findings.length > 0
  ) {

    console.log(
      "🤖 Generating Agency View and Prospect View..."
    );


    views =
      await gerarViewsComIA(
        url,
        findings
      );

  } else {

    console.log(
      "ℹ️ No verified findings. Gemini will not be called."
    );


    views = {

      agencyView:
        null,

      prospectView:
        null,

      status:
        "no_findings",

      erro:
        null
    };
  }


  // ====================================================
  // FINAL RESULT
  // ====================================================

  const resultado = {

    url,

    analisadoEm:
      new Date()
        .toISOString(),

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
  // TERMINAL RESULT
  // ====================================================

  console.log(
    "\n✅ TECHNICAL RESULT"
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
  // AGENCY VIEW
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
  // PROSPECT VIEW
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
  // AI ERROR
  // ====================================================

  if (
    views.erro
  ) {

    console.log(
      "\n🚨 AI ERROR:"
    );


    console.log(
      views.erro
    );


    if (
      views.respostaBruta
    ) {

      console.log(
        "\nRaw Gemini response:"
      );


      console.log(
        views.respostaBruta
      );
    }
  }


  return resultado;
}


// ======================================================
// TERMINAL MODE
// ======================================================

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

    "\n🌐 Enter the website URL to analyze:\n> ",

    async (url) => {

      url =
        url.trim();


      if (
        !url.startsWith("http://") &&
        !url.startsWith("https://")
      ) {

        url =
          `https://${url}`;
      }


      try {

        await analisarSite(
          url
        );

      } catch (erro) {

        console.log(
          "\n🚨 Unexpected error:"
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
// EXPORT
// ======================================================

module.exports = {
  analisarSite
};