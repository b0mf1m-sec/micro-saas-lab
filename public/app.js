const batchUrls =
  document.getElementById(
    "batchUrls"
  );


const analyzeBatchButton =
  document.getElementById(
    "analyzeBatchButton"
  );


const batchLoading =
  document.getElementById(
    "batchLoading"
  );


const batchError =
  document.getElementById(
    "batchError"
  );


const queueResults =
  document.getElementById(
    "queueResults"
  );


const prospectQueue =
  document.getElementById(
    "prospectQueue"
  );


const queueFilters =
  document.getElementById(
    "queueFilters"
  );


const urlCounter =
  document.getElementById(
    "urlCounter"
  );


const queueView =
  document.getElementById(
    "queueView"
  );


const detailView =
  document.getElementById(
    "detailView"
  );


const backToQueueButton =
  document.getElementById(
    "backToQueueButton"
  );


const brandButton =
  document.getElementById(
    "brandButton"
  );


const themeToggle =
  document.getElementById(
    "themeToggle"
  );


const generateOutreachButton =
  document.getElementById(
    "generateOutreachButton"
  );


const copyAgencyButton =
  document.getElementById(
    "copyAgencyButton"
  );


const copyProspectButton =
  document.getElementById(
    "copyProspectButton"
  );


const findingFilters =
  document.getElementById(
    "findingFilters"
  );


let prospectsAtuais =
  [];


let filtroQueueAtual =
  "all";


let findingsAtuais =
  [];


let filtroFindingAtual =
  "all";


let analiseAtual =
  null;


let analysisIdAtual =
  null;


// =====================================================
// THEME
// =====================================================

function aplicarTema(
  theme
) {
  const finalTheme =
    theme === "light"
      ? "light"
      : "dark";


  document
    .documentElement
    .dataset
    .theme =
      finalTheme;


  localStorage.setItem(
    "prospect-analyzer-theme",
    finalTheme
  );


  const icon =
    document.getElementById(
      "themeIcon"
    );


  const label =
    document.getElementById(
      "themeLabel"
    );


  if (
    icon
  ) {
    icon.textContent =
      finalTheme === "dark"
        ? "☾"
        : "☀";
  }


  if (
    label
  ) {
    label.textContent =
      finalTheme === "dark"
        ? "Dark"
        : "Light";
  }
}


function iniciarTema() {
  const salvo =
    localStorage.getItem(
      "prospect-analyzer-theme"
    );


  if (
    salvo === "light" ||
    salvo === "dark"
  ) {
    aplicarTema(
      salvo
    );


    return;
  }


  const prefereClaro =
    window
      .matchMedia?.(
        "(prefers-color-scheme: light)"
      )
      .matches;


  aplicarTema(
    prefereClaro
      ? "light"
      : "dark"
  );
}


function alternarTema() {
  aplicarTema(
    document
      .documentElement
      .dataset
      .theme === "dark"
      ? "light"
      : "dark"
  );
}


// =====================================================
// GENERIC HELPERS
// =====================================================

function definirTexto(
  id,
  valor,
  fallback = "-"
) {
  const elemento =
    document.getElementById(
      id
    );


  if (
    !elemento
  ) {
    return;
  }


  const temValor =
    valor !== null &&
    valor !== undefined &&
    valor !== "";


  elemento.textContent =
    temValor
      ? String(
          valor
        )
      : fallback;
}


function removerTons(
  elemento
) {
  elemento
    ?.classList
    .remove(
      "good",
      "warning",
      "bad",
      "neutral"
    );
}


function aplicarTom(
  elemento,
  tom = "neutral"
) {
  if (
    !elemento
  ) {
    return;
  }


  removerTons(
    elemento
  );


  elemento
    .classList
    .add(
      tom
    );
}


function definirStatus(
  id,
  texto,
  tom = "neutral"
) {
  const elemento =
    document.getElementById(
      id
    );


  if (
    !elemento
  ) {
    return;
  }


  elemento.textContent =
    texto;


  aplicarTom(
    elemento,
    tom
  );
}


function definirTomCard(
  id,
  tom = "neutral"
) {
  const elemento =
    document.getElementById(
      id
    );


  if (
    !elemento
  ) {
    return;
  }


  removerTons(
    elemento
  );


  if (
    tom !== "neutral"
  ) {
    elemento
      .classList
      .add(
        tom
      );
  }
}


function capitalizar(
  valor
) {
  const texto =
    String(
      valor ||
      ""
    );


  return texto
    ? texto
        .charAt(
          0
        )
        .toUpperCase()
      +
      texto.slice(
        1
      )
    : "";
}


function numeroSeguro(
  valor
) {
  const numero =
    Number(
      valor
    );


  return Number.isFinite(
    numero
  )
    ? numero
    : 0;
}


function listaLimpa(
  valor
) {
  if (
    !Array.isArray(
      valor
    )
  ) {
    return [];
  }


  return valor
    .filter(
      item =>
        item !== null &&
        item !== undefined &&
        String(
          item
        )
          .trim()
    )
    .map(
      item =>
        String(
          item
        )
          .trim()
    );
}


function normalizarSeveridade(
  valor
) {
  const nivel =
    String(
      valor ||
      ""
    )
      .trim()
      .toLowerCase();


  if (
    nivel === "alta"
  ) {
    return "high";
  }


  if (
    nivel === "media" ||
    nivel === "média"
  ) {
    return "medium";
  }


  if (
    nivel === "baixa"
  ) {
    return "low";
  }


  if (
    [
      "high",
      "medium",
      "low"
    ].includes(
      nivel
    )
  ) {
    return nivel;
  }


  return "low";
}


function nomeFinding(
  codigo
) {
  const nomes = {

    LCP_HIGH:
      "Poor Largest Contentful Paint",

    LCP_NEEDS_ATTENTION:
      "Largest Contentful Paint Needs Attention",

    CLS_HIGH:
      "Poor Cumulative Layout Shift",

    CLS_NEEDS_ATTENTION:
      "Cumulative Layout Shift Needs Attention",

    TITLE_MISSING:
      "Missing Page Title",

    META_DESCRIPTION_MISSING:
      "Missing Meta Description",

    H1_MISSING:
      "Missing H1 Heading",

    NOINDEX_DETECTED:
      "Explicit Noindex Detected",

    LCP_ALTO:
      "High Largest Contentful Paint",

    CLS_ALTO:
      "High Cumulative Layout Shift",

    TITLE_AUSENTE:
      "Missing Page Title",

    META_DESCRIPTION_AUSENTE:
      "Missing Meta Description",

    H1_AUSENTE:
      "Missing H1 Heading"
  };


  return (
    nomes[
      codigo
    ]
    ||
    codigo
    ||
    "Finding"
  );
}


function categoriaFinding(
  categoria
) {
  return (
    categoria === "seo"
      ? "SEO"
      : capitalizar(
          categoria
        )
  );
}


function textoTempoAnalise(
  valor
) {
  if (
    !valor
  ) {
    return "Analyzed just now";
  }


  const data =
    new Date(
      valor
    );


  if (
    Number.isNaN(
      data.getTime()
    )
  ) {
    return "Analyzed just now";
  }


  const segundos =
    Math.max(
      0,
      Math.round(
        (
          Date.now() -
          data.getTime()
        )
        /
        1000
      )
    );


  if (
    segundos < 60
  ) {
    return "Analyzed just now";
  }


  const minutos =
    Math.floor(
      segundos /
      60
    );


  if (
    minutos < 60
  ) {
    return (
      `Analyzed ${minutos} min ago`
    );
  }


  return (
    `Analyzed at ${
      data.toLocaleTimeString(
        [],
        {
          hour:
            "2-digit",

          minute:
            "2-digit"
        }
      )
    }`
  );
}


function hostnameLegivel(
  url
) {
  try {
    return new URL(
      url
    )
      .hostname
      .replace(
        /^www\./i,
        ""
      );

  } catch {
    return String(
      url ||
      "Unknown prospect"
    );
  }
}


function formatarStatusIA(
  status
) {
  const mapa = {

    generated:
      "Generated",

    cached:
      "Cached",

    not_generated:
      "Not generated",

    no_findings:
      "No findings",

    rate_limited:
      "Rate limited",

    invalid_json:
      "Invalid AI response",

    error:
      "Error",

    gerado:
      "Generated",

    sem_findings:
      "No findings",

    erro:
      "Error",

    erro_json:
      "Invalid AI response"
  };


  return (
    mapa[
      status
    ]
    ||
    "Not generated"
  );
}


function urlsEquivalentes(
  urlA,
  urlB
) {
  if (
    !urlA ||
    !urlB
  ) {
    return false;
  }


  try {
    const normalizar =
      (
        valor
      ) => {

        const url =
          new URL(
            valor
          );


        const path =
          url.pathname === "/"
            ? ""
            : url.pathname.replace(
                /\/$/,
                ""
              );


        return (
          `${url.protocol}//${url.host}${path}${url.search}`
        );
      };


    return (
      normalizar(
        urlA
      )
      ===
      normalizar(
        urlB
      )
    );

  } catch {
    return false;
  }
}


// =====================================================
// BATCH INPUT
// =====================================================

function extrairUrlsDigitadas() {
  return batchUrls
    .value
    .split(
      /\r?\n/
    )
    .map(
      item =>
        item.trim()
    )
    .filter(
      Boolean
    );
}


function atualizarContadorUrls() {
  const quantidade =
    extrairUrlsDigitadas()
      .length;


  urlCounter.textContent =
    `${quantidade} / 50`;


  urlCounter.style.color =
    quantidade > 50
      ? "var(--danger)"
      : "";
}


function mostrarErroBatch(
  mensagem
) {
  batchError.textContent =
    mensagem;


  batchError
    .classList
    .remove(
      "hidden"
    );
}


function limparErroBatch() {
  batchError
    .classList
    .add(
      "hidden"
    );


  batchError.textContent =
    "";
}


function iniciarBatchLoading() {
  limparErroBatch();


  batchLoading
    .classList
    .remove(
      "hidden"
    );


  analyzeBatchButton.disabled =
    true;


  batchUrls.disabled =
    true;


  analyzeBatchButton.innerHTML =
    "<span>Analyzing…</span>";
}


function finalizarBatchLoading() {
  batchLoading
    .classList
    .add(
      "hidden"
    );


  analyzeBatchButton.disabled =
    false;


  batchUrls.disabled =
    false;


  analyzeBatchButton.innerHTML =
    '<span>Analyze prospects</span><span aria-hidden="true">→</span>';
}


async function analisarLote() {
  const urls =
    extrairUrlsDigitadas();


  if (
    urls.length === 0
  ) {
    mostrarErroBatch(
      "Enter at least one prospect URL."
    );


    return;
  }


  if (
    urls.length > 50
  ) {
    mostrarErroBatch(
      "A maximum of 50 URLs can be analyzed per batch."
    );


    return;
  }


  iniciarBatchLoading();


  try {
    const resposta =
      await fetch(
        "/analisar-lote",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              urls
            })
        }
      );


    let dados;


    try {
      dados =
        await resposta.json();

    } catch {
      throw new Error(
        "The server returned an invalid response."
      );
    }


    if (
      !resposta.ok
    ) {
      throw new Error(
        dados.erro ||
        "Batch analysis failed."
      );
    }


    prospectsAtuais =
      Array.isArray(
        dados.prospects
      )
        ? dados.prospects
        : [];


    filtroQueueAtual =
      "all";


    atualizarResumoQueue(
      dados
    );


    ativarFiltroQueue(
      "all"
    );


    renderizarQueue();


    queueResults
      .classList
      .remove(
        "hidden"
      );


    queueResults.scrollIntoView({
      behavior:
        "smooth",

      block:
        "start"
    });

  } catch (
    erro
  ) {
    mostrarErroBatch(
      erro.message ||
      "Something went wrong while analyzing the batch."
    );

  } finally {
    finalizarBatchLoading();
  }
}


// =====================================================
// QUEUE
// =====================================================

function contarProspects() {
  const contagem = {

    all:
      prospectsAtuais.length,

    high:
      0,

    medium:
      0,

    low:
      0,

    none:
      0,

    error:
      0
  };


  for (
    const prospect of
    prospectsAtuais
  ) {
    if (
      prospect.status ===
      "error"
    ) {
      contagem.error +=
        1;


      continue;
    }


    if (
      Object.prototype
        .hasOwnProperty
        .call(
          contagem,
          prospect.tier
        )
    ) {
      contagem[
        prospect.tier
      ] += 1;
    }
  }


  return contagem;
}


function atualizarResumoQueue(
  dados = null
) {
  const contagem =
    contarProspects();


  definirTexto(
    "summaryAll",
    contagem.all,
    "0"
  );


  definirTexto(
    "summaryHigh",
    contagem.high,
    "0"
  );


  definirTexto(
    "summaryMedium",
    contagem.medium,
    "0"
  );


  definirTexto(
    "summaryLow",
    contagem.low,
    "0"
  );


  definirTexto(
    "summaryNone",
    contagem.none,
    "0"
  );


  definirTexto(
    "filterAll",
    contagem.all,
    "0"
  );


  definirTexto(
    "filterHigh",
    contagem.high,
    "0"
  );


  definirTexto(
    "filterMedium",
    contagem.medium,
    "0"
  );


  definirTexto(
    "filterLow",
    contagem.low,
    "0"
  );


  definirTexto(
    "filterNone",
    contagem.none,
    "0"
  );


  definirTexto(
    "filterErrors",
    contagem.error,
    "0"
  );


  if (
    dados
  ) {
    const uniqueCount =
      dados.uniqueCount
      ??
      contagem.all;


    const partes = [
      `${uniqueCount} unique prospect${Number(uniqueCount) === 1 ? "" : "s"}`,
      "0 AI calls"
    ];


    if (
      Number(
        dados.duplicatesRemoved
      ) > 0
    ) {
      partes.push(
        `${
          dados.duplicatesRemoved
        } duplicate${
          dados.duplicatesRemoved === 1
            ? ""
            : "s"
        } removed`
      );
    }


    definirTexto(
      "batchMeta",
      partes.join(
        " · "
      )
    );
  }
}


function ativarFiltroQueue(
  filtro
) {
  filtroQueueAtual =
    filtro;


  document
    .querySelectorAll(
      ".queue-filter"
    )
    .forEach(
      botao => {

        botao
          .classList
          .toggle(
            "active",
            botao.dataset.filter ===
              filtro
          );
      }
    );
}


function prospectPassaFiltro(
  prospect
) {
  if (
    filtroQueueAtual ===
    "all"
  ) {
    return true;
  }


  if (
    filtroQueueAtual ===
    "error"
  ) {
    return (
      prospect.status ===
      "error"
    );
  }


  return (
    prospect.status !==
      "error"
    &&
    prospect.tier ===
      filtroQueueAtual
  );
}


function criarTierBadge(
  tier,
  status
) {
  const span =
    document.createElement(
      "span"
    );


  const nivel =
    status === "error"
      ? "error"
      : (
          tier ||
          "none"
        );


  span.className =
    `tier-badge tier-${nivel}`;


  span.textContent =
    status === "error"
      ? "Error"
      : capitalizar(
          nivel
        );


  return span;
}


function renderizarQueue() {
  prospectQueue.innerHTML =
    "";


  const lista =
    prospectsAtuais.filter(
      prospectPassaFiltro
    );


  if (
    lista.length === 0
  ) {
    const vazio =
      document.createElement(
        "div"
      );


    vazio.className =
      "queue-empty";


    vazio.textContent =
      "No prospects match this filter.";


    prospectQueue.appendChild(
      vazio
    );


    return;
  }


  lista.forEach(
    prospect => {

      const card =
        document.createElement(
          "article"
        );


      card.className =
        `prospect-card${
          prospect.status === "error"
            ? " error"
            : ""
        }`;


      const badge =
        criarTierBadge(
          prospect.tier,
          prospect.status
        );


      const main =
        document.createElement(
          "div"
        );


      main.className =
        "prospect-main";


      const titleRow =
        document.createElement(
          "div"
        );


      titleRow.className =
        "prospect-title-row";


      const title =
        document.createElement(
          "h3"
        );


      title.className =
        "prospect-title";


      title.textContent =
        prospect.businessName
        ||
        hostnameLegivel(
          prospect.url ||
          prospect.inputUrl
        );


      titleRow.appendChild(
        title
      );


      const url =
        document.createElement(
          "div"
        );


      url.className =
        "prospect-url";


      url.textContent =
        prospect.url
        ||
        prospect.inputUrl
        ||
        "Unknown URL";


      const evidence =
        document.createElement(
          "div"
        );


      evidence.className =
        "prospect-evidence";


      if (
        prospect.status ===
        "error"
      ) {
        evidence.textContent =
          prospect.erro
          ||
          "This website could not be analyzed.";

      } else if (
        prospect.topFinding
      ) {
        const strong =
          document.createElement(
            "strong"
          );


        strong.textContent =
          `${
            nomeFinding(
              prospect
                .topFinding
                .codigo
            )
          } · `;


        evidence.appendChild(
          strong
        );


        evidence.append(
          document.createTextNode(
            prospect
              .topFinding
              .evidencia
            ||
            "Verified finding detected."
          )
        );

      } else {
        evidence.textContent =
          "No verified findings were detected in this analysis.";
      }


      main.append(
        titleRow,
        url,
        evidence
      );


      const side =
        document.createElement(
          "div"
        );


      side.className =
        "prospect-actions";


      const stats =
        document.createElement(
          "span"
        );


      stats.className =
        "prospect-stats";


      stats.textContent =
        prospect.status === "error"
          ? "Analysis failed"
          : `${
              prospect.findingsCount
              ||
              0
            } finding${
              Number(
                prospect.findingsCount
                ||
                0
              ) === 1
                ? ""
                : "s"
            }`;


      side.appendChild(
        stats
      );


      if (
        prospect.status !==
          "error"
        &&
        prospect.analysis
      ) {
        const abrir =
          document.createElement(
            "button"
          );


        abrir.className =
          "prospect-open";


        abrir.type =
          "button";


        abrir.textContent =
          "View analysis →";


        abrir.addEventListener(
          "click",
          () =>
            abrirProspect(
              prospect
            )
        );


        side.appendChild(
          abrir
        );


        card.addEventListener(
          "dblclick",
          () =>
            abrirProspect(
              prospect
            )
        );
      }


      card.append(
        badge,
        main,
        side
      );


      prospectQueue.appendChild(
        card
      );
    }
  );
}


function filtrarQueue(
  filtro
) {
  ativarFiltroQueue(
    filtro
  );


  renderizarQueue();
}


function voltarParaQueue() {
  detailView
    .classList
    .add(
      "hidden"
    );


  queueView
    .classList
    .remove(
      "hidden"
    );


  analiseAtual =
    null;


  analysisIdAtual =
    null;


  window.scrollTo({
    top:
      0,

    behavior:
      "smooth"
  });
}


function abrirProspect(
  prospect
) {
  if (
    !prospect?.analysis
  ) {
    return;
  }


  analiseAtual =
    prospect.analysis;


  analysisIdAtual =
    prospect.analysisId
    ||
    prospect
      .analysis
      .analysisId
    ||
    null;


  queueView
    .classList
    .add(
      "hidden"
    );


  detailView
    .classList
    .remove(
      "hidden"
    );


  mostrarResultadoDetalhado({
    ...prospect.analysis,

    analysisId:
      analysisIdAtual
  });


  window.scrollTo({
    top:
      0,

    behavior:
      "smooth"
  });
}


// =====================================================
// TABS
// =====================================================

function ativarAba(
  nome
) {
  document
    .querySelectorAll(
      ".tab-button"
    )
    .forEach(
      botao => {

        botao
          .classList
          .toggle(
            "active",
            botao.dataset.tab ===
              nome
          );
      }
    );


  document
    .querySelectorAll(
      ".tab-panel"
    )
    .forEach(
      painel => {

        painel
          .classList
          .toggle(
            "active",
            painel.dataset.panel ===
              nome
          );
      }
    );
}


// =====================================================
// PERFORMANCE
// =====================================================

function atualizarPerformance(
  performance = {}
) {
  definirTexto(
    "score",
    performance.score
  );


  definirTexto(
    "lcp",
    performance.lcp
  );


  definirTexto(
    "cls",
    performance.cls
  );


  definirTexto(
    "fcp",
    performance.fcp
  );


  definirTexto(
    "speedIndex",
    performance.speedIndex
  );


  definirTexto(
    "overviewScore",
    performance.score
  );


  definirTexto(
    "overviewLcp",
    performance.lcp
  );


  definirTexto(
    "overviewCls",
    performance.cls
  );


  definirTexto(
    "overviewFcp",
    performance.fcp
  );


  const score =
    Number(
      performance.score
    );


  let scoreTom =
    "neutral";


  let scoreTexto =
    "Unavailable";


  if (
    Number.isFinite(
      score
    )
  ) {
    if (
      score >= 90
    ) {
      scoreTom =
        "good";


      scoreTexto =
        "Good";

    } else if (
      score >= 50
    ) {
      scoreTom =
        "warning";


      scoreTexto =
        "Needs attention";

    } else {
      scoreTom =
        "bad";


      scoreTexto =
        "Poor";
    }
  }


  definirStatus(
    "scoreStatus",
    scoreTexto,
    scoreTom
  );


  const scoreBar =
    document.getElementById(
      "scoreBar"
    );


  if (
    scoreBar
  ) {
    const bounded =
      Number.isFinite(
        score
      )
        ? Math.max(
            0,
            Math.min(
              score,
              100
            )
          )
        : 0;


    scoreBar.style.width =
      `${bounded}%`;


    scoreBar.style.background =
      scoreTom === "good"
        ? "var(--success)"
        : scoreTom === "warning"
          ? "var(--warning)"
          : scoreTom === "bad"
            ? "var(--danger)"
            : "var(--muted-2)";
  }


  const lcpMs =
    Number(
      performance.lcpMs
    );


  let lcpTom =
    "neutral";


  let lcpTexto =
    "Measured";


  if (
    Number.isFinite(
      lcpMs
    )
  ) {
    if (
      lcpMs <=
      2500
    ) {
      lcpTom =
        "good";


      lcpTexto =
        "Good";

    } else if (
      lcpMs <=
      4000
    ) {
      lcpTom =
        "warning";


      lcpTexto =
        "Needs attention";

    } else {
      lcpTom =
        "bad";


      lcpTexto =
        "Poor";
    }
  }


  definirStatus(
    "lcpStatus",
    lcpTexto,
    lcpTom
  );


  const cls =
    Number(
      performance.clsValor
    );


  let clsTom =
    "neutral";


  let clsTexto =
    "Measured";


  if (
    Number.isFinite(
      cls
    )
  ) {
    if (
      cls <=
      0.1
    ) {
      clsTom =
        "good";


      clsTexto =
        "Good";

    } else if (
      cls <=
      0.25
    ) {
      clsTom =
        "warning";


      clsTexto =
        "Needs attention";

    } else {
      clsTom =
        "bad";


      clsTexto =
        "Poor";
    }
  }


  definirStatus(
    "clsStatus",
    clsTexto,
    clsTom
  );


  return {
    score,
    scoreTom,
    scoreTexto,
    lcpTom,
    clsTom
  };
}


// =====================================================
// INDEXABILITY
// =====================================================

function atualizarIndexability(
  indexability
) {
  if (
    !indexability ||
    indexability.erro
  ) {
    definirStatus(
      "httpStatus",
      "Unavailable",
      "neutral"
    );


    definirStatus(
      "httpsStatus",
      "Unknown",
      "neutral"
    );


    definirStatus(
      "indexingStatus",
      "Unknown",
      "neutral"
    );


    definirStatus(
      "canonicalStatus",
      "Unknown",
      "neutral"
    );


    definirStatus(
      "robotsTxtStatus",
      "Unknown",
      "neutral"
    );


    definirStatus(
      "sitemapStatus",
      "Unknown",
      "neutral"
    );


    definirTexto(
      "httpsDetail",
      "Could not determine protocol"
    );


    definirTexto(
      "indexingReason",
      indexability?.erro,
      "Indexability data is unavailable."
    );


    definirTexto(
      "metaRobots",
      null,
      "Unavailable"
    );


    definirTexto(
      "xRobotsTag",
      null,
      "Unavailable"
    );


    definirTexto(
      "canonicalUrl",
      null,
      "Unavailable"
    );


    definirTexto(
      "robotsTxtUrl",
      null,
      "Unavailable"
    );


    definirTexto(
      "sitemapUrl",
      null,
      "Unavailable"
    );


    definirTexto(
      "sitemapSource",
      null,
      "Unavailable"
    );


    return {
      tom:
        "neutral",

      titulo:
        "Unknown",

      detalhe:
        "Indexability data unavailable"
    };
  }


  const httpStatus =
    indexability.httpStatus;


  if (
    typeof httpStatus ===
    "number"
  ) {
    const tom =
      httpStatus >= 200 &&
      httpStatus < 300
        ? "good"
        : httpStatus >= 300 &&
          httpStatus < 400
          ? "warning"
          : httpStatus >= 400
            ? "bad"
            : "neutral";


    definirStatus(
      "httpStatus",
      httpStatus === 200
        ? "200 OK"
        : String(
            httpStatus
          ),
      tom
    );

  } else {
    definirStatus(
      "httpStatus",
      "Unknown",
      "neutral"
    );
  }


  if (
    indexability.https ===
    true
  ) {
    definirStatus(
      "httpsStatus",
      "Yes",
      "good"
    );


    definirTexto(
      "httpsDetail",
      "Secure connection"
    );

  } else if (
    indexability.https ===
    false
  ) {
    definirStatus(
      "httpsStatus",
      "No",
      "bad"
    );


    definirTexto(
      "httpsDetail",
      "HTTP connection"
    );

  } else {
    definirStatus(
      "httpsStatus",
      "Unknown",
      "neutral"
    );


    definirTexto(
      "httpsDetail",
      "Could not determine protocol"
    );
  }


  if (
    typeof httpStatus ===
      "number"
    &&
    httpStatus >=
      400
  ) {
    definirStatus(
      "indexingStatus",
      "Unavailable",
      "bad"
    );

  } else if (
    indexability.indexable ===
    true
  ) {
    definirStatus(
      "indexingStatus",
      "Allowed",
      "good"
    );

  } else if (
    indexability.indexable ===
    false
  ) {
    definirStatus(
      "indexingStatus",
      "Blocked",
      "bad"
    );

  } else {
    definirStatus(
      "indexingStatus",
      "Unknown",
      "neutral"
    );
  }


  definirTexto(
    "indexingReason",
    indexability.indexabilityReason,
    "No indexability explanation available."
  );


  definirTexto(
    "metaRobots",
    indexability.metaRobots,
    "Not specified"
  );


  definirTexto(
    "xRobotsTag",
    indexability.xRobotsTag,
    "Not specified"
  );


  if (
    indexability.canonical
  ) {
    const selfReferencing =
      urlsEquivalentes(
        indexability.canonical,
        indexability.finalUrl
      );


    definirStatus(
      "canonicalStatus",
      selfReferencing
        ? "Self-referencing"
        : "Specified",
      "neutral"
    );


    definirTexto(
      "canonicalUrl",
      indexability.canonical
    );

  } else {
    definirStatus(
      "canonicalStatus",
      "Not detected",
      "neutral"
    );


    definirTexto(
      "canonicalUrl",
      null,
      "No canonical detected"
    );
  }


  if (
    indexability
      .robotsTxt
      ?.found ===
      true
  ) {
    definirStatus(
      "robotsTxtStatus",
      "Found",
      "neutral"
    );


    definirTexto(
      "robotsTxtUrl",
      indexability
        .robotsTxt
        .url,
      "robots.txt detected"
    );

  } else if (
    indexability
      .robotsTxt
      ?.found ===
      false
  ) {
    definirStatus(
      "robotsTxtStatus",
      "Not found",
      "neutral"
    );


    definirTexto(
      "robotsTxtUrl",
      indexability
        .robotsTxt
        ?.url,
      "No robots.txt detected"
    );

  } else {
    definirStatus(
      "robotsTxtStatus",
      "Unknown",
      "neutral"
    );


    definirTexto(
      "robotsTxtUrl",
      null,
      "robots.txt was not checked"
    );
  }


  if (
    indexability
      .sitemap
      ?.found ===
      true
  ) {
    definirStatus(
      "sitemapStatus",
      "Found",
      "good"
    );


    definirTexto(
      "sitemapUrl",
      indexability
        .sitemap
        .url
    );


    const source =
      indexability
        .sitemap
        .source;


    definirTexto(
      "sitemapSource",
      source === "robots.txt"
        ? "Detected via robots.txt"
        : source === "common_path"
          ? "Detected at a common sitemap path"
          : "Sitemap detected"
    );

  } else if (
    indexability
      .sitemap
      ?.found ===
      false
  ) {
    definirStatus(
      "sitemapStatus",
      "Not found",
      "neutral"
    );


    definirTexto(
      "sitemapUrl",
      null,
      "No sitemap detected"
    );


    definirTexto(
      "sitemapSource",
      null,
      "Checked declared and common sitemap locations"
    );

  } else {
    definirStatus(
      "sitemapStatus",
      "Unknown",
      "neutral"
    );


    definirTexto(
      "sitemapUrl",
      null,
      "Sitemap was not checked"
    );


    definirTexto(
      "sitemapSource",
      null,
      "-"
    );
  }


  if (
    typeof httpStatus ===
      "number"
    &&
    httpStatus >=
      400
  ) {
    return {
      tom:
        "bad",

      titulo:
        "Unavailable",

      detalhe:
        `HTTP ${httpStatus}`
    };
  }


  if (
    indexability.indexable ===
    false
  ) {
    return {
      tom:
        "bad",

      titulo:
        "Blocked",

      detalhe:
        "Explicit noindex detected"
    };
  }


  if (
    indexability.https ===
    false
  ) {
    return {
      tom:
        "warning",

      titulo:
        "Review",

      detalhe:
        "Page is not using HTTPS"
    };
  }


  if (
    indexability.indexable ===
    true
  ) {
    return {
      tom:
        "good",

      titulo:
        "Allowed",

      detalhe:
        "No explicit noindex detected"
    };
  }


  return {
    tom:
      "neutral",

    titulo:
      "Unknown",

    detalhe:
      "Could not determine indexing directives"
  };
}


// =====================================================
// STRUCTURED DATA
// =====================================================

function atualizarStructuredData(
  structuredData
) {
  if (
    !structuredData ||
    structuredData.erro
  ) {
    definirStatus(
      "schemaStatus",
      "Unavailable",
      "neutral"
    );


    definirTexto(
      "schemaSummary",
      structuredData?.erro,
      "Structured data could not be analyzed."
    );


    definirStatus(
      "schemaParsingStatus",
      "Unknown",
      "neutral"
    );


    definirTexto(
      "schemaParsingDetail",
      null,
      "JSON-LD parsing was not completed."
    );


    definirTexto(
      "schemaMainTypes",
      null,
      "Unavailable"
    );


    definirTexto(
      "schemaOtherTypes",
      null,
      "Schema types unavailable."
    );


    return;
  }


  const scriptCount =
    numeroSeguro(
      structuredData.scriptCount
    );


  const validScripts =
    numeroSeguro(
      structuredData.validScripts
    );


  const invalidScripts =
    numeroSeguro(
      structuredData.invalidScripts
    );


  const types =
    listaLimpa(
      structuredData.types
    );


  if (
    structuredData.found !==
    true
  ) {
    definirStatus(
      "schemaStatus",
      "Not detected",
      "neutral"
    );


    definirTexto(
      "schemaSummary",
      null,
      "No JSON-LD script was detected in the analyzed HTML."
    );


    definirStatus(
      "schemaParsingStatus",
      "None",
      "neutral"
    );


    definirTexto(
      "schemaParsingDetail",
      null,
      "No JSON-LD scripts were available to parse."
    );


    definirTexto(
      "schemaMainTypes",
      null,
      "None detected"
    );


    definirTexto(
      "schemaOtherTypes",
      null,
      "No Schema types detected."
    );


    return;
  }


  definirStatus(
    "schemaStatus",
    "Detected",
    "neutral"
  );


  definirTexto(
    "schemaSummary",
    `${scriptCount} JSON-LD script${scriptCount === 1 ? "" : "s"} detected`
  );


  const parsingTone =
    invalidScripts > 0
      ? "warning"
      : validScripts > 0
        ? "good"
        : "neutral";


  definirStatus(
    "schemaParsingStatus",
    `${validScripts} parsed`,
    parsingTone
  );


  definirTexto(
    "schemaParsingDetail",
    `${invalidScripts} parse error${invalidScripts === 1 ? "" : "s"} · ${scriptCount} total`
  );


  const priorityTypes = [
    "LocalBusiness",
    "Organization",
    "WebSite",
    "WebPage",
    "Service",
    "Product",
    "BreadcrumbList"
  ];


  const mainTypes =
    [];


  if (
    types[0]
  ) {
    mainTypes.push(
      types[0]
    );
  }


  for (
    const type of
    priorityTypes
  ) {
    if (
      types.includes(
        type
      )
      &&
      !mainTypes.includes(
        type
      )
      &&
      mainTypes.length < 4
    ) {
      mainTypes.push(
        type
      );
    }
  }


  for (
    const type of
    types
  ) {
    if (
      !mainTypes.includes(
        type
      )
      &&
      mainTypes.length < 4
    ) {
      mainTypes.push(
        type
      );
    }
  }


  const mainSet =
    new Set(
      mainTypes
    );


  const outros =
    types.filter(
      type =>
        !mainSet.has(
          type
        )
    );


  definirTexto(
    "schemaMainTypes",
    mainTypes.length
      ? mainTypes.join(
          " · "
        )
      : null,
    "No @type values detected"
  );


  definirTexto(
    "schemaOtherTypes",
    outros.length
      ? `+${outros.length} additional type${outros.length === 1 ? "" : "s"} detected`
      : types.length
        ? "No additional types detected"
        : "No @type values detected"
  );
}


// =====================================================
// IMAGES
// =====================================================

function atualizarImages(
  images
) {
  if (
    !images ||
    images.erro
  ) {
    definirTexto(
      "imagesTotal",
      null,
      "Unavailable"
    );


    definirTexto(
      "imagesWithAltText",
      null,
      "Unavailable"
    );


    definirTexto(
      "imagesWithAltTextDetail",
      images?.erro,
      "Image data could not be analyzed."
    );


    definirTexto(
      "imagesEmptyAlt",
      null,
      "Unavailable"
    );


    definirTexto(
      "imagesEmptyAltDetail",
      null,
      "Image data could not be analyzed."
    );


    definirStatus(
      "imagesMissingAltStatus",
      "Unavailable",
      "neutral"
    );


    definirTexto(
      "imagesMissingAltDetail",
      null,
      "Missing alt coverage could not be determined."
    );


    definirTexto(
      "imagesMissingAltCount",
      null,
      "Unavailable"
    );


    definirTexto(
      "imagesMissingAltSamples",
      null,
      "No evidence available."
    );


    return;
  }


  const total =
    numeroSeguro(
      images.total
    );


  const withAltText =
    numeroSeguro(
      images.withAltText
    );


  const emptyAlt =
    numeroSeguro(
      images.emptyAlt
    );


  const missingAlt =
    numeroSeguro(
      images.missingAlt
    );


  const samples =
    listaLimpa(
      images.missingAltSamples
    );


  definirTexto(
    "imagesTotal",
    total
  );


  definirTexto(
    "imagesWithAltText",
    withAltText
  );


  definirTexto(
    "imagesWithAltTextDetail",
    total > 0
      ? `${withAltText} of ${total} detected image${total === 1 ? " contains" : "s contain"} non-empty alt text.`
      : "No img elements were detected in the analyzed HTML."
  );


  definirTexto(
    "imagesEmptyAlt",
    emptyAlt
  );


  definirTexto(
    "imagesEmptyAltDetail",
    emptyAlt > 0
      ? `${emptyAlt} image${emptyAlt === 1 ? " has" : "s have"} an empty alt attribute. This can be intentional for decorative images.`
      : total > 0
        ? "No empty alt attributes were detected."
        : "No img elements were detected in the analyzed HTML."
  );


  definirTexto(
    "imagesMissingAltCount",
    missingAlt
  );


  if (
    total === 0
  ) {
    definirStatus(
      "imagesMissingAltStatus",
      "No images",
      "neutral"
    );


    definirTexto(
      "imagesMissingAltDetail",
      "No img elements were detected in the analyzed HTML."
    );

  } else if (
    missingAlt > 0
  ) {
    definirStatus(
      "imagesMissingAltStatus",
      `${missingAlt} missing`,
      "warning"
    );


    definirTexto(
      "imagesMissingAltDetail",
      `${missingAlt} image${missingAlt === 1 ? " is" : "s are"} missing the alt attribute in the analyzed HTML.`
    );

  } else {
    definirStatus(
      "imagesMissingAltStatus",
      "None missing",
      "good"
    );


    definirTexto(
      "imagesMissingAltDetail",
      "Every detected img element includes an alt attribute."
    );
  }


  definirTexto(
    "imagesMissingAltSamples",
    samples.length
      ? samples.join(
          " · "
        )
      : missingAlt > 0
        ? "No image source samples were available."
        : "No missing-alt image samples."
  );
}


// =====================================================
// LOCAL SEO
// =====================================================

function textoListaLocal(
  valores,
  fallback = "Not detected"
) {
  const limpos =
    listaLimpa(
      valores
    );


  return limpos.length
    ? limpos.join(
        " · "
      )
    : fallback;
}


function detalheSinalLocalidade(
  localSeo,
  localKey,
  regionKey
) {
  const sinais =
    localSeo
      ?.localitySignals
    ||
    {};


  const partes =
    [];


  if (
    sinais.locality
  ) {
    const valor =
      sinais[
        localKey
      ];


    partes.push(
      `${sinais.locality}: ${
        valor === true
          ? "detected"
          : valor === false
            ? "not detected"
            : "unknown"
      }`
    );
  }


  if (
    sinais.region
  ) {
    const valor =
      sinais[
        regionKey
      ];


    partes.push(
      `${sinais.region}: ${
        valor === true
          ? "detected"
          : valor === false
            ? "not detected"
            : "unknown"
      }`
    );
  }


  return partes.length
    ? partes.join(
        " · "
      )
    : "No verified locality or region was available from the selected structured address.";
}


function statusSinalLocalidade(
  localSeo,
  localKey,
  regionKey
) {
  const sinais =
    localSeo
      ?.localitySignals
    ||
    {};


  const valores =
    [];


  if (
    sinais.locality
  ) {
    valores.push(
      sinais[
        localKey
      ]
    );
  }


  if (
    sinais.region
  ) {
    valores.push(
      sinais[
        regionKey
      ]
    );
  }


  if (
    !valores.length
  ) {
    return "Unavailable";
  }


  if (
    valores.some(
      valor =>
        valor === true
    )
  ) {
    return "Detected";
  }


  if (
    valores.every(
      valor =>
        valor === false
    )
  ) {
    return "Not detected";
  }


  return "Unknown";
}


function atualizarLocalSeo(
  localSeo
) {
  if (
    !localSeo ||
    localSeo.erro
  ) {
    definirStatus(
      "localSeoSchemaStatus",
      "Unavailable",
      "neutral"
    );


    definirTexto(
      "localSeoSchemaDetail",
      localSeo?.erro,
      "Local SEO signals could not be analyzed."
    );


    definirTexto(
      "localSeoEntityTypes",
      null,
      "Unavailable"
    );


    definirTexto(
      "localSeoBusinessName",
      null,
      "Unavailable"
    );


    definirTexto(
      "localSeoSchemaPhones",
      null,
      "Unavailable"
    );


    definirStatus(
      "localSeoClickToCallStatus",
      "Unavailable",
      "neutral"
    );


    definirTexto(
      "localSeoClickToCallDetail",
      null,
      "Click-to-call signals could not be analyzed."
    );


    definirTexto(
      "localSeoAddress",
      null,
      "Unavailable"
    );


    definirTexto(
      "localSeoAddressDetail",
      null,
      "Structured address could not be analyzed."
    );


    definirStatus(
      "localSeoHoursStatus",
      "Unavailable",
      "neutral"
    );


    definirTexto(
      "localSeoHoursDetail",
      null,
      "Opening hours could not be analyzed."
    );


    definirStatus(
      "localSeoAreaServedStatus",
      "Unavailable",
      "neutral"
    );


    definirTexto(
      "localSeoAreaServedDetail",
      null,
      "Area served could not be analyzed."
    );


    definirStatus(
      "localSeoGeoStatus",
      "Unavailable",
      "neutral"
    );


    definirTexto(
      "localSeoGeoDetail",
      null,
      "Geo data could not be analyzed."
    );


    definirStatus(
      "localSeoMapsStatus",
      "Unavailable",
      "neutral"
    );


    definirTexto(
      "localSeoMapsDetail",
      null,
      "Google Maps signals could not be analyzed."
    );


    definirTexto(
      "localSeoSameAsCount",
      null,
      "Unavailable"
    );


    definirTexto(
      "localSeoSameAsDetail",
      null,
      "sameAs data could not be analyzed."
    );


    definirStatus(
      "localSeoTitleLocationStatus",
      "Unavailable",
      "neutral"
    );


    definirTexto(
      "localSeoTitleLocationDetail",
      null,
      "Location-title comparison unavailable."
    );


    definirStatus(
      "localSeoH1LocationStatus",
      "Unavailable",
      "neutral"
    );


    definirTexto(
      "localSeoH1LocationDetail",
      null,
      "Location-H1 comparison unavailable."
    );


    return;
  }


  const schema =
    localSeo.schema ||
    {};


  const localTypes =
    listaLimpa(
      schema.localBusinessTypes
    );


  const selectedTypes =
    listaLimpa(
      schema.selectedEntityTypes
    );


  if (
    schema.localBusinessFound ===
    true
  ) {
    definirStatus(
      "localSeoSchemaStatus",
      "Detected",
      "neutral"
    );


    definirTexto(
      "localSeoSchemaDetail",
      localTypes.length
        ? `Detected type${localTypes.length === 1 ? "" : "s"}: ${localTypes.join(" · ")}`
        : "A LocalBusiness-compatible Schema entity was detected."
    );

  } else {
    definirStatus(
      "localSeoSchemaStatus",
      "Not detected",
      "neutral"
    );


    definirTexto(
      "localSeoSchemaDetail",
      schema.organizationFound ===
        true
        ? "No LocalBusiness-compatible type was detected. An Organization entity was available."
        : "No LocalBusiness-compatible Schema entity was detected in the analyzed JSON-LD."
    );
  }


  definirTexto(
    "localSeoEntityTypes",
    selectedTypes.length
      ? selectedTypes.join(
          " · "
        )
      : null,
    "Not detected"
  );


  definirTexto(
    "localSeoBusinessName",
    localSeo.businessName,
    "Not detected"
  );


  definirTexto(
    "localSeoSchemaPhones",
    textoListaLocal(
      localSeo.schemaPhones
    ),
    "Not detected"
  );


  const clickToCall =
    localSeo.clickToCall ||
    {};


  const clickCount =
    numeroSeguro(
      clickToCall.count
    );


  const clickPhones =
    listaLimpa(
      clickToCall.phones
    );


  definirStatus(
    "localSeoClickToCallStatus",
    clickCount > 0
      ? "Detected"
      : "Not detected",
    "neutral"
  );


  definirTexto(
    "localSeoClickToCallDetail",
    clickCount > 0
      ? `${clickCount} tel: link${clickCount === 1 ? "" : "s"} detected${
          clickPhones.length
            ? ` · ${clickPhones.join(" · ")}`
            : ""
        }`
      : "No tel: links were detected in the analyzed server HTML."
  );


  const address =
    localSeo.address ||
    {};


  definirTexto(
    "localSeoAddress",
    address.found ===
      true
      ? address.formatted
      : null,
    "Not detected"
  );


  definirTexto(
    "localSeoAddressDetail",
    address.found ===
      true
      ? "Structured address associated with the selected entity."
      : "No structured address was detected for the selected entity."
  );


  const openingHours =
    localSeo.openingHours ||
    {};


  definirStatus(
    "localSeoHoursStatus",
    openingHours.found ===
      true
      ? "Detected"
      : "Not detected",
    "neutral"
  );


  definirTexto(
    "localSeoHoursDetail",
    openingHours.found ===
      true
      ? textoListaLocal(
          openingHours.values
        )
      : "No opening hours were detected for the selected entity."
  );


  const areaServed =
    localSeo.areaServed ||
    {};


  definirStatus(
    "localSeoAreaServedStatus",
    areaServed.found ===
      true
      ? "Detected"
      : "Not detected",
    "neutral"
  );


  definirTexto(
    "localSeoAreaServedDetail",
    areaServed.found ===
      true
      ? textoListaLocal(
          areaServed.values
        )
      : "No areaServed value was detected for the selected entity."
  );


  const geo =
    localSeo.geo ||
    {};


  definirStatus(
    "localSeoGeoStatus",
    geo.found ===
      true
      ? "Detected"
      : "Not detected",
    "neutral"
  );


  definirTexto(
    "localSeoGeoDetail",
    geo.found ===
      true
      ? `${geo.latitude}, ${geo.longitude}`
      : "No geo coordinates were associated with the selected entity."
  );


  const maps =
    localSeo.googleMaps ||
    {};


  const mapsCount =
    numeroSeguro(
      maps.count
    );


  const mapsUrls =
    listaLimpa(
      maps.urls
    );


  definirStatus(
    "localSeoMapsStatus",
    maps.found ===
      true
      ? "Detected"
      : "Not detected",
    "neutral"
  );


  definirTexto(
    "localSeoMapsDetail",
    maps.found ===
      true
      ? `${mapsCount} Google Maps reference${mapsCount === 1 ? "" : "s"}${
          mapsUrls.length
            ? ` · ${mapsUrls.join(" · ")}`
            : ""
        }`
      : "No Google Maps link or embed was detected in the analyzed server HTML."
  );


  const sameAs =
    localSeo.sameAs ||
    {};


  const sameAsCount =
    numeroSeguro(
      sameAs.count
    );


  const sameAsUrls =
    listaLimpa(
      sameAs.urls
    );


  definirTexto(
    "localSeoSameAsCount",
    sameAsCount
  );


  definirTexto(
    "localSeoSameAsDetail",
    sameAsCount > 0
      ? textoListaLocal(
          sameAsUrls
        )
      : "No sameAs URLs were detected for the selected entity."
  );


  definirStatus(
    "localSeoTitleLocationStatus",
    statusSinalLocalidade(
      localSeo,
      "localityInTitle",
      "regionInTitle"
    ),
    "neutral"
  );


  definirTexto(
    "localSeoTitleLocationDetail",
    detalheSinalLocalidade(
      localSeo,
      "localityInTitle",
      "regionInTitle"
    )
  );


  definirStatus(
    "localSeoH1LocationStatus",
    statusSinalLocalidade(
      localSeo,
      "localityInH1",
      "regionInH1"
    ),
    "neutral"
  );


  definirTexto(
    "localSeoH1LocationDetail",
    detalheSinalLocalidade(
      localSeo,
      "localityInH1",
      "regionInH1"
    )
  );
}


// =====================================================
// ON-PAGE
// =====================================================

function atualizarOnPage(
  seo = {},
  findings = []
) {
  definirTexto(
    "title",
    seo.title,
    "Not found"
  );


  definirTexto(
    "metaDescription",
    seo.metaDescription,
    "Not found"
  );


  definirTexto(
    "h1Count",
    seo.h1Count
  );


  const titleOk =
    Boolean(
      seo.title
    );


  const metaOk =
    Boolean(
      seo.metaDescription
    );


  const h1Ok =
    Number(
      seo.h1Count
    ) > 0;


  definirStatus(
    "titleStatus",
    titleOk
      ? "✓"
      : "!",
    titleOk
      ? "good"
      : "bad"
  );


  definirStatus(
    "metaDescriptionStatus",
    metaOk
      ? "✓"
      : "!",
    metaOk
      ? "good"
      : "warning"
  );


  definirStatus(
    "h1Status",
    h1Ok
      ? "✓"
      : "!",
    h1Ok
      ? "good"
      : "warning"
  );


  definirTexto(
    "h1Detail",
    Number.isFinite(
      Number(
        seo.h1Count
      )
    )
      ? `${seo.h1Count} heading${Number(seo.h1Count) === 1 ? "" : "s"} detected`
      : "Heading count unavailable"
  );


  const onPageCodes =
    new Set([
      "TITLE_MISSING",
      "META_DESCRIPTION_MISSING",
      "H1_MISSING",
      "TITLE_AUSENTE",
      "META_DESCRIPTION_AUSENTE",
      "H1_AUSENTE"
    ]);


  const issues =
    findings.filter(
      finding =>
        onPageCodes.has(
          finding.codigo
        )
    );


  if (
    issues.length === 0 &&
    !seo.erro
  ) {
    return {
      tom:
        "good",

      titulo:
        "Core tags present",

      detalhe:
        "Title, meta description and H1 detected"
    };
  }


  if (
    issues.length > 0
  ) {
    const high =
      issues.some(
        finding =>
          normalizarSeveridade(
            finding.severidade
          ) === "high"
      );


    return {
      tom:
        high
          ? "bad"
          : "warning",

      titulo:
        `${issues.length} issue${issues.length === 1 ? "" : "s"}`,

      detalhe:
        "Verified on-page findings detected"
    };
  }


  return {
    tom:
      "neutral",

    titulo:
      "Unknown",

    detalhe:
      "On-page data unavailable"
  };
}


// =====================================================
// SNAPSHOT
// =====================================================

function atualizarSnapshot({
  performanceInfo,
  indexabilityInfo,
  onPageInfo,
  findings
}) {
  const score =
    performanceInfo.score;


  definirTexto(
    "snapshotScore",
    Number.isFinite(
      score
    )
      ? score
      : "-"
  );


  definirTexto(
    "snapshotPerformance",
    performanceInfo.scoreTexto
  );


  definirTexto(
    "snapshotPerformanceDetail",
    Number.isFinite(
      score
    )
      ? `Lighthouse score ${score}/100`
      : "Performance unavailable"
  );


  definirTomCard(
    "snapshotPerformanceCard",
    performanceInfo.scoreTom
  );


  const ring =
    document.getElementById(
      "snapshotScoreRing"
    );


  if (
    ring
  ) {
    const bounded =
      Number.isFinite(
        score
      )
        ? Math.max(
            0,
            Math.min(
              score,
              100
            )
          )
        : 0;


    const color =
      performanceInfo.scoreTom ===
        "good"
        ? "var(--success)"
        : performanceInfo.scoreTom ===
            "warning"
          ? "var(--warning)"
          : performanceInfo.scoreTom ===
              "bad"
            ? "var(--danger)"
            : "var(--muted-2)";


    ring.style.setProperty(
      "--score-angle",
      `${bounded * 3.6}deg`
    );


    ring.style.setProperty(
      "--score-color",
      color
    );
  }


  definirTexto(
    "snapshotIndexability",
    indexabilityInfo.titulo
  );


  definirTexto(
    "snapshotIndexabilityDetail",
    indexabilityInfo.detalhe
  );


  definirTomCard(
    "snapshotIndexabilityCard",
    indexabilityInfo.tom
  );


  definirTexto(
    "snapshotOnPage",
    onPageInfo.titulo
  );


  definirTexto(
    "snapshotOnPageDetail",
    onPageInfo.detalhe
  );


  definirTomCard(
    "snapshotOnPageCard",
    onPageInfo.tom
  );


  const quantidade =
    findings.length;


  const high =
    findings.filter(
      finding =>
        normalizarSeveridade(
          finding.severidade
        ) ===
        "high"
    ).length;


  const medium =
    findings.filter(
      finding =>
        normalizarSeveridade(
          finding.severidade
        ) ===
        "medium"
    ).length;


  let tom =
    "good";


  let titulo =
    "No findings";


  let detalhe =
    "No verified opportunities detected";


  if (
    high > 0
  ) {
    tom =
      "bad";


    titulo =
      `${high} high priority`;


    detalhe =
      `${quantidade} verified finding${quantidade === 1 ? "" : "s"}`;

  } else if (
    medium > 0
  ) {
    tom =
      "warning";


    titulo =
      `${medium} to review`;


    detalhe =
      `${quantidade} verified finding${quantidade === 1 ? "" : "s"}`;

  } else if (
    quantidade > 0
  ) {
    tom =
      "warning";


    titulo =
      `${quantidade} detected`;


    detalhe =
      "Verified opportunities available";
  }


  definirTexto(
    "snapshotOpportunities",
    titulo
  );


  definirTexto(
    "snapshotOpportunitiesDetail",
    detalhe
  );


  definirTomCard(
    "snapshotOpportunitiesCard",
    tom
  );
}


// =====================================================
// TOP OPPORTUNITY
// =====================================================

function atualizarTopOpportunity(
  findings
) {
  const container =
    document.getElementById(
      "topOpportunity"
    );


  const marcador =
    container
      ?.querySelector(
        ".opportunity-marker"
      );


  if (
    !Array.isArray(
      findings
    )
    ||
    findings.length === 0
  ) {
    container
      ?.classList
      .add(
        "empty-opportunity"
      );


    if (
      marcador
    ) {
      marcador.textContent =
        "✓";
    }


    definirTexto(
      "topOpportunityTitle",
      "No verified findings"
    );


    definirTexto(
      "topOpportunityEvidence",
      "No verified opportunities were detected in this analysis."
    );


    definirStatus(
      "topOpportunitySeverity",
      "Clear",
      "good"
    );


    return;
  }


  const peso = {

    high:
      3,

    medium:
      2,

    low:
      1
  };


  const principal =
    [
      ...findings
    ]
      .sort(
        (
          a,
          b
        ) =>
          (
            peso[
              normalizarSeveridade(
                b.severidade
              )
            ]
            ||
            0
          )
          -
          (
            peso[
              normalizarSeveridade(
                a.severidade
              )
            ]
            ||
            0
          )
      )[0];


  const nivel =
    normalizarSeveridade(
      principal.severidade
    );


  container
    ?.classList
    .remove(
      "empty-opportunity"
    );


  if (
    marcador
  ) {
    marcador.textContent =
      "!";
  }


  definirTexto(
    "topOpportunityTitle",
    nomeFinding(
      principal.codigo
    )
  );


  definirTexto(
    "topOpportunityEvidence",
    principal.evidencia,
    "Verified by analyzer."
  );


  definirStatus(
    "topOpportunitySeverity",
    capitalizar(
      nivel
    ),
    nivel === "high"
      ? "bad"
      : nivel === "medium"
        ? "warning"
        : "good"
  );
}


// =====================================================
// FINDINGS
// =====================================================

function atualizarContadoresFindings(
  findings
) {
  const contadores = {

    all:
      findings.length,

    high:
      0,

    medium:
      0,

    low:
      0
  };


  findings.forEach(
    finding => {

      const nivel =
        normalizarSeveridade(
          finding.severidade
        );


      if (
        contadores[
          nivel
        ] !== undefined
      ) {
        contadores[
          nivel
        ] += 1;
      }
    }
  );


  definirTexto(
    "filterAllCount",
    contadores.all,
    "0"
  );


  definirTexto(
    "filterHighCount",
    contadores.high,
    "0"
  );


  definirTexto(
    "filterMediumCount",
    contadores.medium,
    "0"
  );


  definirTexto(
    "filterLowCount",
    contadores.low,
    "0"
  );


  definirTexto(
    "tabOpportunityCount",
    contadores.all,
    "0"
  );
}


function criarCampoFinding(
  label,
  valor
) {
  const campo =
    document.createElement(
      "div"
    );


  campo.className =
    "finding-field";


  const titulo =
    document.createElement(
      "span"
    );


  titulo.className =
    "finding-field-label";


  titulo.textContent =
    label;


  const texto =
    document.createElement(
      "span"
    );


  texto.className =
    "finding-field-value";


  texto.textContent =
    valor;


  campo.append(
    titulo,
    texto
  );


  return campo;
}


function mostrarFindings(
  findings,
  filtro = "all"
) {
  const container =
    document.getElementById(
      "findings"
    );


  container.innerHTML =
    "";


  const lista =
    Array.isArray(
      findings
    )
      ? findings
      : [];


  atualizarContadoresFindings(
    lista
  );


  const filtrados =
    filtro === "all"
      ? lista
      : lista.filter(
          finding =>
            normalizarSeveridade(
              finding.severidade
            ) ===
            filtro
        );


  if (
    filtrados.length === 0
  ) {
    const vazio =
      document.createElement(
        "div"
      );


    vazio.className =
      "empty-state";


    vazio.textContent =
      lista.length === 0
        ? "No verified issues were detected in this analysis."
        : `No ${filtro} severity findings in this analysis.`;


    container.appendChild(
      vazio
    );


    return;
  }


  filtrados.forEach(
    finding => {

      const card =
        document.createElement(
          "article"
        );


      card.className =
        "finding";


      const main =
        document.createElement(
          "div"
        );


      main.className =
        "finding-main";


      const alert =
        document.createElement(
          "div"
        );


      alert.className =
        "finding-alert";


      alert.textContent =
        "!";


      const mainText =
        document.createElement(
          "div"
        );


      const titulo =
        document.createElement(
          "div"
        );


      titulo.className =
        "finding-code";


      titulo.textContent =
        nomeFinding(
          finding.codigo
        );


      const evidencia =
        document.createElement(
          "div"
        );


      evidencia.className =
        "finding-evidence";


      evidencia.textContent =
        finding.evidencia ||
        "No evidence provided.";


      mainText.append(
        titulo,
        evidencia
      );


      main.append(
        alert,
        mainText
      );


      const evidenceField =
        criarCampoFinding(
          "Evidence",
          finding.evidencia ||
          "Verified by analyzer"
        );


      const categoryField =
        document.createElement(
          "div"
        );


      categoryField.className =
        "finding-field";


      const categoryLabel =
        document.createElement(
          "span"
        );


      categoryLabel.className =
        "finding-field-label";


      categoryLabel.textContent =
        "Category";


      const categoryValue =
        document.createElement(
          "span"
        );


      categoryValue.className =
        "badge";


      categoryValue.textContent =
        categoriaFinding(
          finding.categoria
        );


      categoryField.append(
        categoryLabel,
        categoryValue
      );


      const severityField =
        document.createElement(
          "div"
        );


      severityField.className =
        "finding-field";


      const severityLabel =
        document.createElement(
          "span"
        );


      severityLabel.className =
        "finding-field-label";


      severityLabel.textContent =
        "Severity";


      const nivel =
        normalizarSeveridade(
          finding.severidade
        );


      const severityValue =
        document.createElement(
          "span"
        );


      severityValue.className =
        `badge badge-${nivel}`;


      severityValue.textContent =
        capitalizar(
          nivel
        );


      severityField.append(
        severityLabel,
        severityValue
      );


      card.append(
        main,
        evidenceField,
        categoryField,
        severityField
      );


      container.appendChild(
        card
      );
    }
  );
}


function ativarFiltroVisual(
  filtro
) {
  document
    .querySelectorAll(
      ".filter-chip"
    )
    .forEach(
      botao => {

        botao
          .classList
          .toggle(
            "active",
            botao.dataset.filter ===
              filtro
          );
      }
    );
}


function filtrarFindings(
  filtro
) {
  filtroFindingAtual =
    filtro;


  ativarFiltroVisual(
    filtro
  );


  mostrarFindings(
    findingsAtuais,
    filtro
  );
}


// =====================================================
// OUTREACH
// =====================================================

function atualizarBlocoOutreach(
  dados
) {
  const findings =
    Array.isArray(
      dados.findings
    )
      ? dados.findings
      : [];


  const status =
    dados.iaStatus ||
    "not_generated";


  const agencyView =
    dados.agencyView
    ||
    (
      findings.length === 0
        ? "No Agency View can be generated because no verified findings were detected."
        : "AI has not been generated for this prospect yet."
    );


  const prospectView =
    dados.prospectView
    ||
    (
      findings.length === 0
        ? "No Prospect View can be generated because no verified findings were detected."
        : "AI has not been generated for this prospect yet."
    );


  definirTexto(
    "agencyView",
    agencyView
  );


  definirTexto(
    "prospectView",
    prospectView
  );


  copyAgencyButton.disabled =
    !dados.agencyView;


  copyProspectButton.disabled =
    !dados.prospectView;


  const statusEl =
    document.getElementById(
      "aiGenerationStatus"
    );


  statusEl
    .classList
    .remove(
      "good",
      "warning",
      "bad"
    );


  if (
    findings.length === 0
  ) {
    generateOutreachButton.disabled =
      true;


    generateOutreachButton.textContent =
      "No findings to generate";


    statusEl.textContent =
      "No verified findings were detected, so AI generation is intentionally disabled.";

  } else if (
    status === "generated" ||
    status === "cached"
  ) {
    generateOutreachButton.disabled =
      false;


    generateOutreachButton.textContent =
      "Generate again";


    statusEl.textContent =
      `AI outreach ${
        status === "cached"
          ? "loaded from cache"
          : "generated"
      } from these verified findings.`;


    statusEl
      .classList
      .add(
        "good"
      );

  } else if (
    status ===
    "rate_limited"
  ) {
    generateOutreachButton.disabled =
      false;


    generateOutreachButton.textContent =
      "Try again";


    statusEl.textContent =
      "AI generation is temporarily rate limited. The technical analysis is still available.";


    statusEl
      .classList
      .add(
        "warning"
      );

  } else if (
    status === "error" ||
    status === "invalid_json"
  ) {
    generateOutreachButton.disabled =
      false;


    generateOutreachButton.textContent =
      "Try again";


    statusEl.textContent =
      "AI generation failed. The verified technical analysis was not affected.";


    statusEl
      .classList
      .add(
        "bad"
      );

  } else {
    generateOutreachButton.disabled =
      !analysisIdAtual;


    generateOutreachButton.textContent =
      "Generate outreach";


    statusEl.textContent =
      analysisIdAtual
        ? "AI has not been generated for this prospect. Generate it only if this prospect is worth contacting."
        : "This analysis does not have a valid analysis ID. Run the batch again to generate outreach.";
  }


  definirTexto(
    "analysisStatus",
    `${findings.length} verified finding${findings.length === 1 ? "" : "s"} · AI status: ${formatarStatusIA(status)}`
  );
}


async function gerarOutreachAtual() {
  if (
    !analiseAtual ||
    !analysisIdAtual
  ) {
    const statusEl =
      document.getElementById(
        "aiGenerationStatus"
      );


    statusEl.textContent =
      "This analysis expired or has no analysis ID. Run the prospect scan again.";


    statusEl
      .classList
      .add(
        "bad"
      );


    return;
  }


  if (
    !Array.isArray(
      analiseAtual.findings
    )
    ||
    analiseAtual
      .findings
      .length === 0
  ) {
    return;
  }


  generateOutreachButton.disabled =
    true;


  generateOutreachButton.textContent =
    "Generating…";


  const statusEl =
    document.getElementById(
      "aiGenerationStatus"
    );


  statusEl
    .classList
    .remove(
      "good",
      "warning",
      "bad"
    );


  statusEl.textContent =
    "Generating Agency View and Prospect View from verified findings…";


  try {
    const resposta =
      await fetch(
        "/gerar-outreach",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              analysisId:
                analysisIdAtual
            })
        }
      );


    let dados;


    try {
      dados =
        await resposta.json();

    } catch {
      throw new Error(
        "The server returned an invalid response."
      );
    }


    if (
      !resposta.ok
    ) {
      throw new Error(
        dados.erro ||
        "AI generation failed."
      );
    }


    analiseAtual = {
      ...analiseAtual,

      agencyView:
        dados.agencyView
        ??
        null,

      prospectView:
        dados.prospectView
        ??
        null,

      iaStatus:
        dados.iaStatus
        ||
        "error"
    };


    const prospect =
      prospectsAtuais.find(
        item =>
          item.analysisId ===
          analysisIdAtual
      );


    if (
      prospect?.analysis
    ) {
      prospect.analysis = {
        ...prospect.analysis,
        ...analiseAtual
      };
    }


    atualizarBlocoOutreach(
      analiseAtual
    );

  } catch (
    erro
  ) {
    generateOutreachButton.disabled =
      false;


    generateOutreachButton.textContent =
      "Try again";


    statusEl.textContent =
      erro.message ||
      "AI generation failed.";


    statusEl
      .classList
      .add(
        "bad"
      );
  }
}


// =====================================================
// DETAIL RESULT
// =====================================================

function mostrarResultadoDetalhado(
  dados
) {
  const findings =
    Array.isArray(
      dados.findings
    )
      ? dados.findings
      : [];


  findingsAtuais =
    findings;


  filtroFindingAtual =
    "all";


  analiseAtual =
    dados;


  analysisIdAtual =
    dados.analysisId
    ||
    analysisIdAtual;


  const title =
    dados
      .localSeo
      ?.businessName
    ||
    hostnameLegivel(
      dados.url
    );


  definirTexto(
    "detailTitle",
    title,
    "Website Analysis"
  );


  definirTexto(
    "detailUrl",
    dados.url,
    "Unknown URL"
  );


  const opportunity =
    dados.opportunity ||
    {};


  const tier =
    opportunity.tier
    ||
    (
      findings.some(
        item =>
          normalizarSeveridade(
            item.severidade
          ) === "high"
      )
        ? "high"
        : findings.some(
            item =>
              normalizarSeveridade(
                item.severidade
              ) === "medium"
          )
          ? "medium"
          : findings.length
            ? "low"
            : "none"
    );


  const tierEl =
    document.getElementById(
      "detailTier"
    );


  tierEl.className =
    `tier-badge tier-${tier}`;


  tierEl.textContent =
    capitalizar(
      tier
    );


  const freshness =
    textoTempoAnalise(
      dados.analisadoEm
    );


  definirTexto(
    "detailFreshness",
    freshness
  );


  definirTexto(
    "analysisFreshness",
    freshness
  );


  const performanceInfo =
    atualizarPerformance(
      dados.performance ||
      {}
    );


  const indexabilityInfo =
    atualizarIndexability(
      dados.indexability
    );


  atualizarStructuredData(
    dados.structuredData
  );


  atualizarImages(
    dados.images
  );


  atualizarLocalSeo(
    dados.localSeo
  );


  const onPageInfo =
    atualizarOnPage(
      dados.seo ||
      {},
      findings
    );


  atualizarSnapshot({

    performanceInfo,

    indexabilityInfo,

    onPageInfo,

    findings
  });


  atualizarTopOpportunity(
    findings
  );


  ativarFiltroVisual(
    "all"
  );


  mostrarFindings(
    findings,
    "all"
  );


  atualizarBlocoOutreach(
    dados
  );


  ativarAba(
    "overview"
  );
}


// =====================================================
// COPY
// =====================================================

async function copiarTexto(
  elementoId,
  botao
) {
  const texto =
    document
      .getElementById(
        elementoId
      )
      ?.textContent
      ?.trim();


  if (
    !texto
  ) {
    return;
  }


  try {
    await navigator
      .clipboard
      .writeText(
        texto
      );

  } catch {
    const textarea =
      document.createElement(
        "textarea"
      );


    textarea.value =
      texto;


    textarea.style.position =
      "fixed";


    textarea.style.opacity =
      "0";


    document.body.appendChild(
      textarea
    );


    textarea.select();


    document.execCommand(
      "copy"
    );


    textarea.remove();
  }


  const original =
    botao.textContent;


  botao.textContent =
    "Copied!";


  setTimeout(
    () => {
      botao.textContent =
        original;
    },
    1500
  );
}


// =====================================================
// EVENTS
// =====================================================

iniciarTema();


atualizarContadorUrls();


themeToggle.addEventListener(
  "click",
  alternarTema
);


batchUrls.addEventListener(
  "input",
  atualizarContadorUrls
);


analyzeBatchButton.addEventListener(
  "click",
  analisarLote
);


backToQueueButton.addEventListener(
  "click",
  voltarParaQueue
);


brandButton.addEventListener(
  "click",
  voltarParaQueue
);


generateOutreachButton.addEventListener(
  "click",
  gerarOutreachAtual
);


queueFilters.addEventListener(
  "click",
  event => {

    const botao =
      event
        .target
        .closest(
          ".queue-filter"
        );


    if (
      !botao
    ) {
      return;
    }


    filtrarQueue(
      botao.dataset.filter ||
      "all"
    );
  }
);


document
  .querySelectorAll(
    "[data-queue-filter]"
  )
  .forEach(
    card => {

      const ativar =
        () =>
          filtrarQueue(
            card
              .dataset
              .queueFilter
            ||
            "all"
          );


      card.addEventListener(
        "click",
        ativar
      );


      card.addEventListener(
        "keydown",
        event => {

          if (
            event.key ===
              "Enter"
            ||
            event.key ===
              " "
          ) {
            event.preventDefault();


            ativar();
          }
        }
      );
    }
  );


document
  .querySelectorAll(
    ".tab-button"
  )
  .forEach(
    botao => {

      botao.addEventListener(
        "click",
        () =>
          ativarAba(
            botao.dataset.tab
          )
      );
    }
  );


document
  .querySelectorAll(
    "[data-go-tab]"
  )
  .forEach(
    botao => {

      botao.addEventListener(
        "click",
        () =>
          ativarAba(
            botao.dataset.goTab
          )
      );
    }
  );


copyAgencyButton.addEventListener(
  "click",
  () =>
    copiarTexto(
      "agencyView",
      copyAgencyButton
    )
);


copyProspectButton.addEventListener(
  "click",
  () =>
    copiarTexto(
      "prospectView",
      copyProspectButton
    )
);


findingFilters.addEventListener(
  "click",
  event => {

    const botao =
      event
        .target
        .closest(
          ".filter-chip"
        );


    if (
      !botao
    ) {
      return;
    }


    filtrarFindings(
      botao.dataset.filter ||
      "all"
    );
  }
);