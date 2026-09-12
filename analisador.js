require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");
const readline = require("readline");

const {
  validarUrlPublica
} = require("./seguranca");

const {
  obterCacheIA,
  salvarCacheIA
} = require("./cacheIA");

const {
  analisarPagina
} = require("./pagina");


const pagespeedApiKey =
  process.env.PAGESPEED_API_KEY;


const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});


function esperar(ms) {
  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
  );
}


async function analisarPageSpeed(
  url
) {
  const resultado = {
    score:
      null,

    lcp:
      null,

    lcpMs:
      null,

    cls:
      null,

    clsValor:
      null,

    fcp:
      null,

    fcpMs:
      null,

    speedIndex:
      null,

    speedIndexMs:
      null,

    erro:
      null
  };


  const apiEndpoint =
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${pagespeedApiKey}`;


  const maxTentativas =
    2;


  for (
    let tentativa = 1;
    tentativa <= maxTentativas;
    tentativa++
  ) {
    try {
      const resposta =
        await fetch(
          apiEndpoint
        );


      if (
        resposta.status >= 500
      ) {
        if (
          tentativa <
          maxTentativas
        ) {
          console.log(
            "⚠️ PageSpeed failed. Retrying in 2 seconds..."
          );


          await esperar(
            2000
          );


          continue;
        }


        resultado.erro =
          `HTTP ${resposta.status}`;


        return resultado;
      }


      if (
        !resposta.ok
      ) {
        resultado.erro =
          `HTTP ${resposta.status}`;


        return resultado;
      }


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
        performanceScore ===
          undefined
      ) {
        resultado.erro =
          "Incomplete Lighthouse data.";


        return resultado;
      }


      resultado.score =
        Math.round(
          performanceScore *
          100
        );


      resultado.lcp =
        audits[
          "largest-contentful-paint"
        ]?.displayValue
        ??
        null;


      resultado.lcpMs =
        audits[
          "largest-contentful-paint"
        ]?.numericValue
        ??
        null;


      resultado.cls =
        audits[
          "cumulative-layout-shift"
        ]?.displayValue
        ??
        null;


      resultado.clsValor =
        audits[
          "cumulative-layout-shift"
        ]?.numericValue
        ??
        null;


      resultado.fcp =
        audits[
          "first-contentful-paint"
        ]?.displayValue
        ??
        null;


      resultado.fcpMs =
        audits[
          "first-contentful-paint"
        ]?.numericValue
        ??
        null;


      resultado.speedIndex =
        audits[
          "speed-index"
        ]?.displayValue
        ??
        null;


      resultado.speedIndexMs =
        audits[
          "speed-index"
        ]?.numericValue
        ??
        null;


      return resultado;

    } catch (erro) {

      if (
        tentativa <
        maxTentativas
      ) {
        console.log(
          "⚠️ Error contacting PageSpeed. Retrying..."
        );


        await esperar(
          2000
        );


        continue;
      }


      resultado.erro =
        erro.message;


      return resultado;
    }
  }


  return resultado;
}


function gerarFindings(
  performance,
  seo
) {
  const findings =
    [];


  if (
    !seo.erro
  ) {
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


  if (
    !performance.erro
  ) {
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


async function gerarViewsComIA(
  url,
  findings
) {
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


  const cache =
    obterCacheIA(
      url,
      findings
    );


  if (
    cache
  ) {
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

Do NOT speculate about root causes.

For example, never claim or suggest:

- render-blocking resources
- oversized images
- slow server response
- JavaScript execution issues
- CSS problems
- hosting problems
- third-party scripts
- network latency

unless that exact cause was explicitly verified and included
in the VERIFIED FINDINGS.

Describe WHAT was measured, not WHY it happened.

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
      await ai
        .interactions
        .create({
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


    const resultadoIA = {
      agencyView:
        dadosIA.agencyView
        ??
        null,

      prospectView:
        dadosIA.prospectView
        ??
        null
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
      erro?.message
      ||
      "";


    const mensagemLower =
      mensagem.toLowerCase();


    if (
      mensagem.includes(
        "429"
      )
      ||
      mensagemLower.includes(
        "quota"
      )
      ||
      mensagemLower.includes(
        "rate limit"
      )
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


async function analisarSite(
  url
) {
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


  console.log(
    "\nChecking PageSpeed..."
  );


  console.log(
    "Checking SEO structure, indexability, structured data, images and Local SEO signals..."
  );


  const [
    performance,
    pagina
  ] =
    await Promise.all([
      analisarPageSpeed(
        url
      ),

      analisarPagina(
        url
      )
    ]);


  const seo =
    pagina.seo;


  const indexability =
    pagina.indexability;


  const structuredData =
    pagina.structuredData;


  const images =
    pagina.images;


  const localSeo =
    pagina.localSeo;


  console.log(
    "Generating verified findings..."
  );


  const findings =
    gerarFindings(
      performance,
      seo
    );


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


  const resultado = {
    url,

    analisadoEm:
      new Date()
        .toISOString(),

    performance,

    indexability,

    structuredData,

    images,

    localSeo,

    seo,

    findings,

    agencyView:
      views.agencyView,

    prospectView:
      views.prospectView,

    iaStatus:
      views.status
  };


  console.log(
    "\n✅ TECHNICAL RESULT"
  );


  console.dir(
    {
      url:
        resultado.url,

      performance:
        resultado.performance,

      indexability:
        resultado.indexability,

      structuredData:
        resultado.structuredData,

      images:
        resultado.images,

      localSeo:
        resultado.localSeo,

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


if (
  require.main ===
  module
) {
  const rl =
    readline
      .createInterface({
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
        !url.startsWith(
          "http://"
        )
        &&
        !url.startsWith(
          "https://"
        )
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


module.exports = {
  analisarSite
};