require("dotenv").config();

// Pegamos a chave da API do arquivo .env
const apiKey = process.env.PAGESPEED_API_KEY;

// Função assíncrona responsável por analisar os sites
async function analisarSites() {
  const sites = [
    "https://google.com",
    "https://example.com",
    "https://openai.com"
  ];

  // Percorre cada site da lista
  for (let i = 0; i < sites.length; i++) {
    const url = sites[i];

    console.log(`\nAnalisando site ${i + 1}: ${url}`);

    // Monta o endereço da API usando a URL do site e a chave do .env
    const apiEndpoint =
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${apiKey}`;

    try {
      console.log("Aguardando resposta do Google...");

      // Faz a requisição para a API
      const resposta = await fetch(apiEndpoint);

      // Converte a resposta para JSON
      const dados = await resposta.json();

      // Verifica se a API retornou algum erro
      if (dados.error) {
        console.log(
          `🚨 O Google recusou a análise de ${url}: ${dados.error.message}`
        );

        continue;
      }

      // Extrai as métricas do PageSpeed
      const performanceScore =
        dados.lighthouseResult.categories.performance.score * 100;

      const lcp =
        dados.lighthouseResult.audits["largest-contentful-paint"].displayValue;

      // Exibe os resultados
      console.log(`\n✅ Resultados para: ${url}`);
      console.log(`   Nota de Performance: ${performanceScore}/100`);
      console.log(`   LCP: ${lcp}\n`);

    } catch (erro) {
      console.log(`❌ Erro ao analisar ${url}:`, erro.message);
    }
  }
}

// Inicia a análise
analisarSites();