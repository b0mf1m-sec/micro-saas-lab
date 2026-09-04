require("dotenv").config();
const cheerio = require("cheerio");

const apiKey = process.env.PAGESPEED_API_KEY;

async function analisarPageSpeed(url) {
  const resultado = {
    score: null,
    lcp: null,
    cls: null,
    fcp: null,
    speedIndex: null,
    erro: null
  };

  const apiEndpoint =
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${apiKey}`;

  try {
    const resposta = await fetch(apiEndpoint);
    const dados = await resposta.json();

    if (dados.error) {
      resultado.erro = dados.error.message;
      return resultado;
    }

    const audits = dados.lighthouseResult.audits;

    resultado.score =
      dados.lighthouseResult.categories.performance.score * 100;

    resultado.lcp =
      audits["largest-contentful-paint"]?.displayValue || null;

    resultado.cls =
      audits["cumulative-layout-shift"]?.displayValue || null;

    resultado.fcp =
      audits["first-contentful-paint"]?.displayValue || null;

    resultado.speedIndex =
      audits["speed-index"]?.displayValue || null;

  } catch (erro) {
    resultado.erro = erro.message;
  }

  return resultado;
}

async function analisarHTML(url) {
  const resultado = {
    title: null,
    metaDescription: null,
    h1Count: null,
    h1Textos: [],
    erro: null
  };

  try {
    const resposta = await fetch(url);

    if (!resposta.ok) {
      resultado.erro = `HTTP ${resposta.status}`;
      return resultado;
    }

    const html = await resposta.text();

    const $ = cheerio.load(html);

    resultado.title =
      $("title").first().text().trim() || "Não encontrado";

    resultado.metaDescription =
      $('meta[name="description"]').attr("content")?.trim() ||
      "Não encontrada";

    resultado.h1Count = $("h1").length;

    $("h1").each((index, elemento) => {
      const texto = $(elemento).text().trim();

      if (texto) {
        resultado.h1Textos.push(texto);
      }
    });

  } catch (erro) {
    resultado.erro = erro.message;
  }

  return resultado;
}

async function analisarSites() {
  const sites = [
    "https://google.com",
    "https://example.com",
    "https://openai.com"
  ];

  for (let i = 0; i < sites.length; i++) {
    const url = sites[i];

    console.log(`\nAnalisando site ${i + 1}: ${url}`);

    console.log("Consultando PageSpeed...");
    const performance = await analisarPageSpeed(url);

    console.log("Lendo HTML do site...");
    const seo = await analisarHTML(url);

    const resultado = {
      url,
      performance,
      seo
    };

    console.log("\n✅ Resultado completo:");
    console.dir(resultado, { depth: null });
  }
}

analisarSites();