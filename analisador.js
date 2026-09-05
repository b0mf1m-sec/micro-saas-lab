require("dotenv").config();
const cheerio = require("cheerio");

const apiKey = process.env.PAGESPEED_API_KEY;


// =========================
// UTILITÁRIO: ESPERAR
// =========================

function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


// =========================
// ANALISA O PAGESPEED
// =========================

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
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${apiKey}`;

  const maxTentativas = 2;

  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {

    try {
      const resposta = await fetch(apiEndpoint);

      // Se o PageSpeed responder 500, tenta novamente
      if (resposta.status >= 500) {

        if (tentativa < maxTentativas) {
          console.log(
            `⚠️ PageSpeed falhou. Tentando novamente em 2 segundos...`
          );

          await esperar(2000);
          continue;
        }

        resultado.erro = `HTTP ${resposta.status}`;
        return resultado;
      }

      if (!resposta.ok) {
        resultado.erro = `HTTP ${resposta.status}`;
        return resultado;
      }

      // Primeiro pegamos como texto
      const textoResposta = await resposta.text();

      let dados;

      try {
        dados = JSON.parse(textoResposta);
      } catch {
        resultado.erro =
          "O PageSpeed retornou uma resposta inválida.";
        return resultado;
      }

      if (dados.error) {
        resultado.erro = dados.error.message;
        return resultado;
      }

      const audits = dados.lighthouseResult?.audits;

      const performanceScore =
        dados.lighthouseResult?.categories?.performance?.score;

      if (!audits || performanceScore === undefined) {
        resultado.erro =
          "Dados do Lighthouse incompletos.";
        return resultado;
      }

      resultado.score =
        Math.round(performanceScore * 100);

      resultado.lcp =
        audits["largest-contentful-paint"]?.displayValue ?? null;

      resultado.lcpMs =
        audits["largest-contentful-paint"]?.numericValue ?? null;

      resultado.cls =
        audits["cumulative-layout-shift"]?.displayValue ?? null;

      resultado.clsValor =
        audits["cumulative-layout-shift"]?.numericValue ?? null;

      resultado.fcp =
        audits["first-contentful-paint"]?.displayValue ?? null;

      resultado.fcpMs =
        audits["first-contentful-paint"]?.numericValue ?? null;

      resultado.speedIndex =
        audits["speed-index"]?.displayValue ?? null;

      resultado.speedIndexMs =
        audits["speed-index"]?.numericValue ?? null;

      return resultado;

    } catch (erro) {

      if (tentativa < maxTentativas) {
        console.log(
          `⚠️ Erro ao consultar PageSpeed. Tentando novamente...`
        );

        await esperar(2000);
        continue;
      }

      resultado.erro = erro.message;
      return resultado;
    }
  }

  return resultado;
}


// =========================
// ANALISA O HTML
// =========================

async function analisarHTML(url) {
  const resultado = {
    title: null,
    metaDescription: null,
    h1Count: null,
    h1Textos: [],
    erro: null
  };

  try {
    const resposta = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml"
      }
    });

    if (!resposta.ok) {
      resultado.erro = `HTTP ${resposta.status}`;
      return resultado;
    }

    const html = await resposta.text();

    const $ = cheerio.load(html);

    resultado.title =
      $("title").first().text().trim() || "Não encontrado";

    resultado.metaDescription =
      $('meta[name="description"]')
        .attr("content")
        ?.trim() || "Não encontrada";

    resultado.h1Count =
      $("h1").length;

    $("h1").each((index, elemento) => {
      const texto =
        $(elemento).text().trim();

      if (texto) {
        resultado.h1Textos.push(texto);
      }
    });

  } catch (erro) {
    resultado.erro = erro.message;
  }

  return resultado;
}


// =========================
// GERA FINDINGS
// =========================

function gerarFindings(performance, seo) {
  const findings = [];

  // =========================
  // SEO
  // =========================

  if (!seo.erro) {

    if (
      !seo.title ||
      seo.title === "Não encontrado"
    ) {
      findings.push({
        codigo: "TITLE_AUSENTE",
        categoria: "seo",
        severidade: "alta",
        evidencia:
          "Nenhum elemento title foi encontrado no HTML da página."
      });
    }

    if (
      !seo.metaDescription ||
      seo.metaDescription === "Não encontrada"
    ) {
      findings.push({
        codigo: "META_DESCRIPTION_AUSENTE",
        categoria: "seo",
        severidade: "media",
        evidencia:
          "Nenhuma meta description foi encontrada no HTML da página."
      });
    }

    if (seo.h1Count === 0) {
      findings.push({
        codigo: "H1_AUSENTE",
        categoria: "seo",
        severidade: "media",
        evidencia:
          "Nenhum elemento H1 foi encontrado no HTML da página."
      });
    }
  }


  // =========================
  // PERFORMANCE
  // =========================

  if (!performance.erro) {

    if (
      performance.lcpMs !== null &&
      performance.lcpMs > 2500
    ) {
      findings.push({
        codigo: "LCP_ALTO",
        categoria: "performance",
        severidade: "alta",
        evidencia:
          `O Largest Contentful Paint medido foi de ${performance.lcp}.`
      });
    }

    if (
      performance.clsValor !== null &&
      performance.clsValor > 0.1
    ) {
      findings.push({
        codigo: "CLS_ALTO",
        categoria: "performance",
        severidade: "alta",
        evidencia:
          `O Cumulative Layout Shift medido foi de ${performance.clsValor}.`
      });
    }
  }

  return findings;
}


// =========================
// FUNÇÃO PRINCIPAL
// =========================

async function analisarSites() {

  const sites = [
    "https://washdent.com",
    "https://www.dupontdental.com",
    "https://districtcapitalservices.com",
    "https://dcwashingtonplumber.com",
    "https://www.ngachelectric.com"
  ];

  for (let i = 0; i < sites.length; i++) {

    const url = sites[i];

    console.log(
      `\nAnalisando site ${i + 1}: ${url}`
    );

    console.log("Consultando PageSpeed...");
    const performance =
      await analisarPageSpeed(url);

    console.log("Lendo HTML do site...");
    const seo =
      await analisarHTML(url);

    console.log("Gerando findings...");
    const findings =
      gerarFindings(performance, seo);

    const resultado = {
      url,

      analisadoEm:
        new Date().toISOString(),

      performance,

      seo,

      findings
    };

    console.log(
      "\n✅ Resultado completo:"
    );

    console.dir(
      resultado,
      { depth: null }
    );
  }
}


// =========================
// INICIA O PROGRAMA
// =========================

analisarSites();