const $ = (id) => document.getElementById(id);

const batchUrls = $("batchUrls");
const analyzeBatchButton = $("analyzeBatchButton");
const batchLoading = $("batchLoading");
const batchError = $("batchError");
const queueResults = $("queueResults");
const prospectQueue = $("prospectQueue");
const queueFilters = $("queueFilters");
const urlCounter = $("urlCounter");
const queueView = $("queueView");
const detailView = $("detailView");
const backToQueueButton = $("backToQueueButton");
const brandButton = $("brandButton");
const themeToggle = $("themeToggle");
const generateOutreachButton = $("generateOutreachButton");
const copyAgencyButton = $("copyAgencyButton");
const copyProspectButton = $("copyProspectButton");
const findingFilters = $("findingFilters");
const selectVisibleCheckbox = $("selectVisibleCheckbox");
const selectedCount = $("selectedCount");
const clearSelectionButton = $("clearSelectionButton");

const MAX_OUTREACH_SELECIONADOS = 10;

let generateSelectedOutreachButton = $("generateSelectedOutreachButton");
let prospectsAtuais = [];
let filtroQueueAtual = "all";
let findingsAtuais = [];
let filtroFindingAtual = "all";
let analiseAtual = null;
let analysisIdAtual = null;
let batchIdAtual = null;
let pollingBatchAtivo = false;
let gerandoOutreachSelecionados = false;
let progressoOutreachSelecionados = null;
let resumoUltimaGeracaoSelecionados = null;

const prospectIdsSelecionados = new Set();


// =====================================================
// THEME
// =====================================================

function aplicarTema(theme) {
  const finalTheme =
    theme === "light"
      ? "light"
      : "dark";

  document.documentElement.dataset.theme =
    finalTheme;

  localStorage.setItem(
    "prospect-analyzer-theme",
    finalTheme
  );

  const icon =
    $("themeIcon");

  const label =
    $("themeLabel");

  if (icon) {
    icon.textContent =
      finalTheme === "dark"
        ? "☾"
        : "☀";
  }

  if (label) {
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

  aplicarTema(
    window
      .matchMedia?.(
        "(prefers-color-scheme: light)"
      )
      .matches
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
    $(id);

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
    $(id);

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
    $(id);

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


// Dados ausentes continuam null.
// Isso evita Number(null) virar 0.
function numeroOpcional(
  valor
) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return null;
  }

  const numero =
    Number(
      valor
    );

  return Number.isFinite(
    numero
  )
    ? numero
    : null;
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
// BATCH INPUT / PROGRESSIVE BATCH
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

  analyzeBatchButton.textContent =
    "Starting batch…";
}


function atualizarBotaoBatch(
  dados
) {
  const completed =
    numeroSeguro(
      dados?.progress?.completed
    );

  const total =
    numeroSeguro(
      dados?.progress?.total
    );

  if (
    dados?.status ===
      "processing"
    &&
    total > 0
  ) {
    analyzeBatchButton.textContent =
      `Analyzing ${completed}/${total}…`;
  }
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


function esperar(
  ms
) {
  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
  );
}


function mesclarSnapshotProspects(
  novosProspects
) {
  const anterioresPorId =
    new Map(
      prospectsAtuais
        .filter(
          prospect =>
            prospect.analysisId
        )
        .map(
          prospect => [
            prospect.analysisId,
            prospect
          ]
        )
    );

  return novosProspects.map(
    prospect => {

      const anterior =
        prospect.analysisId
          ? anterioresPorId.get(
              prospect.analysisId
            )
          : null;

      return {
        ...prospect,

        analysis:
          anterior?.analysis
          ||
          null,

        outreachStatus:
          anterior?.outreachStatus,

        agencyView:
          anterior?.agencyView
          ??
          null,

        prospectView:
          anterior?.prospectView
          ??
          null,

        outreachError:
          anterior?.outreachError
          ??
          null
      };
    }
  );
}


function aplicarSnapshotBatch(
  dados
) {
  batchIdAtual =
    dados.batchId ||
    batchIdAtual;

  prospectsAtuais =
    Array.isArray(
      dados.prospects
    )
      ? mesclarSnapshotProspects(
          dados.prospects
        )
      : prospectsAtuais;

  limparSelecoesInvalidas();

  atualizarResumoQueue(
    dados
  );

  atualizarBotaoBatch(
    dados
  );

  renderizarQueue();

  queueResults
    .classList
    .remove(
      "hidden"
    );
}


async function buscarSnapshotBatch(
  batchId
) {
  const resposta =
    await fetch(
      `/analisar-lote/${encodeURIComponent(batchId)}`,
      {
        method:
          "GET",

        headers: {
          Accept:
            "application/json"
        }
      }
    );

  let dados;

  try {
    dados =
      await resposta.json();

  } catch {
    throw new Error(
      "The server returned an invalid batch status response."
    );
  }

  if (
    !resposta.ok
  ) {
    throw new Error(
      dados.erro ||
      "Could not read batch progress."
    );
  }

  return dados;
}


async function acompanharLote(
  batchId,
  snapshotInicial
) {
  pollingBatchAtivo =
    true;

  let falhasConsecutivas =
    0;

  let dados =
    snapshotInicial;

  while (
    pollingBatchAtivo &&
    batchIdAtual === batchId
  ) {
    aplicarSnapshotBatch(
      dados
    );

    if (
      dados.status ===
      "completed"
    ) {
      pollingBatchAtivo =
        false;

      return dados;
    }

    if (
      dados.status ===
      "failed"
    ) {
      pollingBatchAtivo =
        false;

      throw new Error(
        "The batch stopped before every prospect could be analyzed."
      );
    }

    await esperar(
      1000
    );

    try {
      dados =
        await buscarSnapshotBatch(
          batchId
        );

      falhasConsecutivas =
        0;

    } catch (
      erro
    ) {
      falhasConsecutivas +=
        1;

      if (
        falhasConsecutivas >= 5
      ) {
        pollingBatchAtivo =
          false;

        throw erro;
      }

      await esperar(
        1000
      );
    }
  }

  return dados;
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

  pollingBatchAtivo =
    false;

  batchIdAtual =
    null;

  prospectsAtuais =
    [];

  prospectIdsSelecionados.clear();

  resumoUltimaGeracaoSelecionados =
    null;

  progressoOutreachSelecionados =
    null;

  gerandoOutreachSelecionados =
    false;

  filtroQueueAtual =
    "all";

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

    if (
      !dados.batchId
    ) {
      throw new Error(
        "The server did not return a batchId."
      );
    }

    batchIdAtual =
      dados.batchId;

    ativarFiltroQueue(
      "all"
    );

    aplicarSnapshotBatch(
      dados
    );

    queueResults
      .scrollIntoView({
        behavior:
          "smooth",

        block:
          "start"
      });

    const final =
      await acompanharLote(
        dados.batchId,
        dados
      );

    aplicarSnapshotBatch(
      final
    );

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
      prospect.status !==
      "completed"
    ) {
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
      ] +=
        1;
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
    !dados
  ) {
    return;
  }

  const uniqueCount =
    dados.uniqueCount
    ??
    contagem.all;

  const completed =
    numeroSeguro(
      dados.progress?.completed
    );

  const analyzing =
    numeroSeguro(
      dados.progress?.analyzing
    );

  const queued =
    numeroSeguro(
      dados.progress?.queued
    );

  const partes =
    [];

  if (
    dados.status ===
    "processing"
  ) {
    partes.push(
      `${completed}/${uniqueCount} analyzed`
    );

    partes.push(
      `${analyzing} analyzing`
    );

    partes.push(
      `${queued} queued`
    );

  } else {
    partes.push(
      `${completed}/${uniqueCount} analyzed`
    );
  }

  partes.push(
    "0 AI calls during scan"
  );

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
    prospect.status ===
      "completed"
    &&
    prospect.tier ===
      filtroQueueAtual
  );
}


function ordemTierQueue(
  tier
) {
  const ordem = {
    high:
      0,

    medium:
      1,

    low:
      2,

    none:
      3
  };

  return ordem[
    tier
  ]
  ??
  4;
}


function ordenarProspectsQueue(
  prospects
) {
  const statusOrder = {
    completed:
      0,

    error:
      1,

    analyzing:
      2,

    queued:
      3
  };

  return [
    ...prospects
  ]
    .sort(
      (
        a,
        b
      ) => {

        const statusDifference =
          (
            statusOrder[
              a.status
            ]
            ??
            4
          )
          -
          (
            statusOrder[
              b.status
            ]
            ??
            4
          );

        if (
          statusDifference !== 0
        ) {
          return statusDifference;
        }

        if (
          a.status ===
            "completed"
          &&
          b.status ===
            "completed"
        ) {
          const tierDifference =
            ordemTierQueue(
              a.tier
            )
            -
            ordemTierQueue(
              b.tier
            );

          if (
            tierDifference !== 0
          ) {
            return tierDifference;
          }

          const scoreDifference =
            numeroSeguro(
              b.priorityScore
            )
            -
            numeroSeguro(
              a.priorityScore
            );

          if (
            scoreDifference !== 0
          ) {
            return scoreDifference;
          }
        }

        return (
          numeroSeguro(
            a.batchIndex
          )
          -
          numeroSeguro(
            b.batchIndex
          )
        );
      }
    );
}


// =====================================================
// MULTI-SELECT + BATCH OUTREACH
// =====================================================

function prospectSelecionavel(
  prospect
) {
  return (
    prospect?.status ===
      "completed"
    &&
    Boolean(
      prospect?.analysisId
    )
  );
}


function limparSelecoesInvalidas() {
  const idsValidos =
    new Set(
      prospectsAtuais
        .filter(
          prospectSelecionavel
        )
        .map(
          prospect =>
            prospect.analysisId
        )
    );

  for (
    const analysisId of
    prospectIdsSelecionados
  ) {
    if (
      !idsValidos.has(
        analysisId
      )
    ) {
      prospectIdsSelecionados
        .delete(
          analysisId
        );
    }
  }
}


function obterProspectsVisiveisSelecionaveis() {
  return prospectsAtuais
    .filter(
      prospectPassaFiltro
    )
    .filter(
      prospectSelecionavel
    );
}


function garantirBotaoOutreachSelecionados() {
  if (
    generateSelectedOutreachButton
  ) {
    return;
  }

  const actions =
    document
      .querySelector(
        ".selection-actions"
      );

  if (
    !actions
  ) {
    return;
  }

  const botao =
    document
      .createElement(
        "button"
      );

  botao.id =
    "generateSelectedOutreachButton";

  botao.className =
    "primary-button small";

  botao.type =
    "button";

  botao.disabled =
    true;

  botao.textContent =
    "Generate outreach";

  if (
    clearSelectionButton
  ) {
    actions
      .insertBefore(
        botao,
        clearSelectionButton
      );

  } else {
    actions
      .appendChild(
        botao
      );
  }

  generateSelectedOutreachButton =
    botao;
}


function atualizarControlesSelecao() {
  garantirBotaoOutreachSelecionados();

  const quantidadeSelecionada =
    prospectIdsSelecionados.size;

  if (
    selectedCount
  ) {
    if (
      gerandoOutreachSelecionados
      &&
      progressoOutreachSelecionados
    ) {
      selectedCount.textContent =
        `${
          quantidadeSelecionada
        } selected · generating ${
          progressoOutreachSelecionados.atual
        }/${
          progressoOutreachSelecionados.total
        }`;

    } else if (
      resumoUltimaGeracaoSelecionados
    ) {
      selectedCount.textContent =
        `${
          quantidadeSelecionada
        } selected · ${
          resumoUltimaGeracaoSelecionados
        }`;

    } else {
      selectedCount.textContent =
        `${quantidadeSelecionada} selected`;
    }
  }

  if (
    clearSelectionButton
  ) {
    clearSelectionButton.disabled =
      quantidadeSelecionada === 0
      ||
      gerandoOutreachSelecionados;
  }

  if (
    generateSelectedOutreachButton
  ) {
    if (
      gerandoOutreachSelecionados
      &&
      progressoOutreachSelecionados
    ) {
      generateSelectedOutreachButton.disabled =
        true;

      generateSelectedOutreachButton.textContent =
        `Generating ${
          progressoOutreachSelecionados.atual
        }/${
          progressoOutreachSelecionados.total
        }…`;

    } else if (
      quantidadeSelecionada >
      MAX_OUTREACH_SELECIONADOS
    ) {
      generateSelectedOutreachButton.disabled =
        true;

      generateSelectedOutreachButton.textContent =
        `Max ${MAX_OUTREACH_SELECIONADOS} per run`;

    } else {
      generateSelectedOutreachButton.disabled =
        quantidadeSelecionada === 0;

      generateSelectedOutreachButton.textContent =
        quantidadeSelecionada > 0
          ? `Generate outreach (${quantidadeSelecionada})`
          : "Generate outreach";
    }
  }

  if (
    !selectVisibleCheckbox
  ) {
    return;
  }

  const visiveis =
    obterProspectsVisiveisSelecionaveis();

  const selecionadosVisiveis =
    visiveis
      .filter(
        prospect =>
          prospectIdsSelecionados
            .has(
              prospect.analysisId
            )
      )
      .length;

  selectVisibleCheckbox.disabled =
    visiveis.length === 0
    ||
    gerandoOutreachSelecionados;

  selectVisibleCheckbox.checked =
    visiveis.length > 0
    &&
    selecionadosVisiveis ===
      visiveis.length;

  selectVisibleCheckbox.indeterminate =
    selecionadosVisiveis > 0
    &&
    selecionadosVisiveis <
      visiveis.length;
}


function selecionarProspect(
  analysisId,
  selecionado
) {
  if (
    !analysisId
    ||
    gerandoOutreachSelecionados
  ) {
    return;
  }

  resumoUltimaGeracaoSelecionados =
    null;

  if (
    selecionado
  ) {
    prospectIdsSelecionados
      .add(
        analysisId
      );

  } else {
    prospectIdsSelecionados
      .delete(
        analysisId
      );
  }

  atualizarControlesSelecao();
}


function selecionarProspectsVisiveis(
  selecionado
) {
  if (
    gerandoOutreachSelecionados
  ) {
    return;
  }

  resumoUltimaGeracaoSelecionados =
    null;

  for (
    const prospect of
    obterProspectsVisiveisSelecionaveis()
  ) {
    if (
      selecionado
    ) {
      prospectIdsSelecionados
        .add(
          prospect.analysisId
        );

    } else {
      prospectIdsSelecionados
        .delete(
          prospect.analysisId
        );
    }
  }

  renderizarQueue();
}


function limparSelecao() {
  if (
    gerandoOutreachSelecionados
  ) {
    return;
  }

  prospectIdsSelecionados.clear();

  resumoUltimaGeracaoSelecionados =
    null;

  renderizarQueue();
}


function statusOutreachProspect(
  prospect
) {
  const status =
    prospect?.outreachStatus;

  if (
    status ===
    "generating"
  ) {
    return "generating AI…";
  }

  if (
    status ===
      "generated"
    ||
    status ===
      "cached"
  ) {
    return "AI ready";
  }

  if (
    status ===
    "no_findings"
  ) {
    return "no AI needed";
  }

  if (
    status ===
    "rate_limited"
  ) {
    return "AI rate limited";
  }

  if (
    status ===
      "error"
    ||
    status ===
      "invalid_json"
  ) {
    return "AI failed";
  }

  return null;
}


function atualizarProspectComOutreach(
  prospect,
  dados
) {
  prospect.outreachStatus =
    dados.iaStatus
    ||
    "error";

  prospect.agencyView =
    dados.agencyView
    ??
    null;

  prospect.prospectView =
    dados.prospectView
    ??
    null;

  prospect.outreachError =
    dados.erro
    ??
    null;

  if (
    prospect.analysis
  ) {
    prospect.analysis = {
      ...prospect.analysis,

      agencyView:
        prospect.agencyView,

      prospectView:
        prospect.prospectView,

      iaStatus:
        prospect.outreachStatus
    };
  }
}


async function solicitarOutreach(
  analysisId
) {
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
            analysisId
          })
      }
    );

  let dados;

  try {
    dados =
      await resposta.json();

  } catch {
    throw new Error(
      "The server returned an invalid AI response."
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

  return dados;
}


async function gerarOutreachSelecionados() {
  if (
    gerandoOutreachSelecionados
  ) {
    return;
  }

  const selecionados =
    prospectsAtuais
      .filter(
        prospect =>
          prospectSelecionavel(
            prospect
          )
          &&
          prospectIdsSelecionados
            .has(
              prospect.analysisId
            )
      );

  if (
    selecionados.length === 0
  ) {
    return;
  }

  if (
    selecionados.length >
    MAX_OUTREACH_SELECIONADOS
  ) {
    resumoUltimaGeracaoSelecionados =
      `select up to ${MAX_OUTREACH_SELECIONADOS} for AI`;

    atualizarControlesSelecao();

    return;
  }

  gerandoOutreachSelecionados =
    true;

  resumoUltimaGeracaoSelecionados =
    null;

  progressoOutreachSelecionados = {
    atual:
      0,

    total:
      selecionados.length
  };

  let prontos =
    0;

  let semFindings =
    0;

  let erros =
    0;

  for (
    let indice = 0;
    indice <
      selecionados.length;
    indice++
  ) {
    const prospect =
      selecionados[
        indice
      ];

    progressoOutreachSelecionados.atual =
      indice + 1;

    atualizarControlesSelecao();

    if (
      numeroSeguro(
        prospect.findingsCount
      ) === 0
    ) {
      prospect.outreachStatus =
        "no_findings";

      semFindings +=
        1;

      renderizarQueue();

      continue;
    }

    if (
      prospect.outreachStatus ===
        "generated"
      ||
      prospect.outreachStatus ===
        "cached"
    ) {
      prontos +=
        1;

      renderizarQueue();

      continue;
    }

    prospect.outreachStatus =
      "generating";

    prospect.outreachError =
      null;

    renderizarQueue();

    try {
      const dados =
        await solicitarOutreach(
          prospect.analysisId
        );

      atualizarProspectComOutreach(
        prospect,
        dados
      );

      if (
        prospect.outreachStatus ===
          "generated"
        ||
        prospect.outreachStatus ===
          "cached"
      ) {
        prontos +=
          1;

      } else if (
        prospect.outreachStatus ===
          "no_findings"
      ) {
        semFindings +=
          1;

      } else {
        erros +=
          1;
      }

    } catch (
      erro
    ) {
      prospect.outreachStatus =
        "error";

      prospect.outreachError =
        erro.message
        ||
        "AI generation failed.";

      erros +=
        1;
    }

    renderizarQueue();
  }

  gerandoOutreachSelecionados =
    false;

  progressoOutreachSelecionados =
    null;

  const partes =
    [];

  if (
    prontos > 0
  ) {
    partes.push(
      `${prontos} AI ready`
    );
  }

  if (
    semFindings > 0
  ) {
    partes.push(
      `${semFindings} skipped`
    );
  }

  if (
    erros > 0
  ) {
    partes.push(
      `${erros} failed`
    );
  }

  resumoUltimaGeracaoSelecionados =
    partes.length > 0
      ? partes.join(
          " · "
        )
      : "finished";

  renderizarQueue();
}


// =====================================================
// QUEUE RENDER
// =====================================================

function criarTierBadge(
  tier,
  status
) {
  const span =
    document
      .createElement(
        "span"
      );

  if (
    status ===
    "error"
  ) {
    span.className =
      "tier-badge tier-error";

    span.textContent =
      "Error";

    return span;
  }

  if (
    status ===
    "analyzing"
  ) {
    span.className =
      "tier-badge tier-medium";

    span.textContent =
      "Analyzing";

    return span;
  }

  if (
    status ===
    "queued"
  ) {
    span.className =
      "tier-badge tier-none";

    span.textContent =
      "Queued";

    return span;
  }

  const nivel =
    tier ||
    "none";

  span.className =
    `tier-badge tier-${nivel}`;

  span.textContent =
    capitalizar(
      nivel
    );

  return span;
}


function renderizarQueue() {
  prospectQueue.innerHTML =
    "";

  const lista =
    ordenarProspectsQueue(
      prospectsAtuais
        .filter(
          prospectPassaFiltro
        )
    );

  if (
    lista.length === 0
  ) {
    const vazio =
      document
        .createElement(
          "div"
        );

    vazio.className =
      "queue-empty";

    vazio.textContent =
      "No prospects match this filter yet.";

    prospectQueue
      .appendChild(
        vazio
      );

    atualizarControlesSelecao();

    return;
  }

  lista.forEach(
    prospect => {

      const selecionavel =
        prospectSelecionavel(
          prospect
        );

      const selecionado =
        selecionavel
        &&
        prospectIdsSelecionados
          .has(
            prospect.analysisId
          );

      const card =
        document
          .createElement(
            "article"
          );

      card.className =
        `prospect-card${
          prospect.status ===
            "error"
            ? " error"
            : ""
        }${
          selecionado
            ? " selected"
            : ""
        }`;

      const selection =
        document
          .createElement(
            "label"
          );

      selection.className =
        `prospect-select${
          selecionavel
            ? ""
            : " disabled"
        }`;

      const checkbox =
        document
          .createElement(
            "input"
          );

      checkbox.type =
        "checkbox";

      checkbox.className =
        "prospect-checkbox";

      checkbox.checked =
        selecionado;

      checkbox.disabled =
        !selecionavel
        ||
        gerandoOutreachSelecionados;

      checkbox.setAttribute(
        "aria-label",
        `Select ${
          prospect.businessName
          ||
          hostnameLegivel(
            prospect.url
            ||
            prospect.inputUrl
          )
        }`
      );

      checkbox
        .addEventListener(
          "click",
          event =>
            event.stopPropagation()
        );

      checkbox
        .addEventListener(
          "dblclick",
          event =>
            event.stopPropagation()
        );

      checkbox
        .addEventListener(
          "change",
          () => {

            selecionarProspect(
              prospect.analysisId,
              checkbox.checked
            );

            card
              .classList
              .toggle(
                "selected",
                checkbox.checked
              );
          }
        );

      selection
        .appendChild(
          checkbox
        );

      const badge =
        criarTierBadge(
          prospect.tier,
          prospect.status
        );

      const main =
        document
          .createElement(
            "div"
          );

      main.className =
        "prospect-main";

      const titleRow =
        document
          .createElement(
            "div"
          );

      titleRow.className =
        "prospect-title-row";

      const title =
        document
          .createElement(
            "h3"
          );

      title.className =
        "prospect-title";

      title.textContent =
        prospect.businessName
        ||
        hostnameLegivel(
          prospect.url
          ||
          prospect.inputUrl
        );

      titleRow
        .appendChild(
          title
        );

      const url =
        document
          .createElement(
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
        document
          .createElement(
            "div"
          );

      evidence.className =
        "prospect-evidence";

      if (
        prospect.status ===
        "queued"
      ) {
        evidence.textContent =
          "Waiting for an analysis slot.";

      } else if (
        prospect.status ===
        "analyzing"
      ) {
        evidence.textContent =
          "Technical analysis in progress…";

      } else if (
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
          document
            .createElement(
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

        evidence
          .appendChild(
            strong
          );

        evidence.append(
          document
            .createTextNode(
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
        document
          .createElement(
            "div"
          );

      side.className =
        "prospect-actions";

      const stats =
        document
          .createElement(
            "span"
          );

      stats.className =
        "prospect-stats";

      if (
        prospect.status ===
        "queued"
      ) {
        stats.textContent =
          "Queued";

      } else if (
        prospect.status ===
        "analyzing"
      ) {
        stats.textContent =
          "Analyzing…";

      } else if (
        prospect.status ===
        "error"
      ) {
        stats.textContent =
          "Analysis failed";

      } else {
        const findingsCount =
          numeroSeguro(
            prospect.findingsCount
          );

        const outreachStatus =
          statusOutreachProspect(
            prospect
          );

        stats.textContent =
          `${
            findingsCount
          } finding${
            findingsCount === 1
              ? ""
              : "s"
          }${
            outreachStatus
              ? ` · ${outreachStatus}`
              : ""
          }`;
      }

      side
        .appendChild(
          stats
        );

      if (
        prospect.status ===
          "completed"
        &&
        prospect.analysisId
      ) {
        const abrir =
          document
            .createElement(
              "button"
            );

        abrir.className =
          "prospect-open";

        abrir.type =
          "button";

        abrir.textContent =
          "View analysis →";

        abrir
          .addEventListener(
            "click",
            async () => {

              const textoOriginal =
                abrir.textContent;

              abrir.disabled =
                true;

              abrir.textContent =
                "Loading…";

              try {
                await abrirProspect(
                  prospect
                );

              } finally {
                if (
                  abrir.isConnected
                ) {
                  abrir.disabled =
                    false;

                  abrir.textContent =
                    textoOriginal;
                }
              }
            }
          );

        side
          .appendChild(
            abrir
          );

        card
          .addEventListener(
            "dblclick",
            event => {

              if (
                event.target
                  .closest(
                    ".prospect-select"
                  )
              ) {
                return;
              }

              abrirProspect(
                prospect
              );
            }
          );
      }

      card.append(
        selection,
        badge,
        main,
        side
      );

      prospectQueue
        .appendChild(
          card
        );
    }
  );

  atualizarControlesSelecao();
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

  renderizarQueue();

  window
    .scrollTo({
      top:
        0,

      behavior:
        "smooth"
    });
}


async function carregarAnaliseProspect(
  prospect
) {
  if (
    prospect.analysis
  ) {
    return prospect.analysis;
  }

  if (
    !prospect.analysisId
  ) {
    throw new Error(
      "This prospect does not have an available analysis yet."
    );
  }

  const resposta =
    await fetch(
      `/analise/${encodeURIComponent(prospect.analysisId)}`,
      {
        method:
          "GET",

        headers: {
          Accept:
            "application/json"
        }
      }
    );

  let dados;

  try {
    dados =
      await resposta.json();

  } catch {
    throw new Error(
      "The server returned an invalid analysis response."
    );
  }

  if (
    !resposta.ok
  ) {
    throw new Error(
      dados.erro ||
      "Could not load this analysis."
    );
  }

  const atual =
    prospectsAtuais
      .find(
        item =>
          item.analysisId ===
          prospect.analysisId
      );

  if (
    atual
  ) {
    atual.analysis =
      dados;
  }

  prospect.analysis =
    dados;

  if (
    dados.iaStatus
  ) {
    prospect.outreachStatus =
      dados.iaStatus;

    prospect.agencyView =
      dados.agencyView
      ??
      null;

    prospect.prospectView =
      dados.prospectView
      ??
      null;
  }

  return dados;
}


async function abrirProspect(
  prospect
) {
  if (
    prospect?.status !==
      "completed"
    ||
    !prospect?.analysisId
  ) {
    return;
  }

  try {
    const analise =
      await carregarAnaliseProspect(
        prospect
      );

    analiseAtual =
      analise;

    analysisIdAtual =
      prospect.analysisId;

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
      ...analise,

      analysisId:
        analysisIdAtual
    });

    window
      .scrollTo({
        top:
          0,

        behavior:
          "smooth"
      });

  } catch (
    erro
  ) {
    mostrarErroBatch(
      erro.message ||
      "Could not open this prospect."
    );
  }
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
    numeroOpcional(
      performance.score
    );

  let scoreTom =
    "neutral";

  let scoreTexto =
    "Unavailable";

  if (
    score !== null
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
    $("scoreBar");

  if (
    scoreBar
  ) {
    const bounded =
      score !== null
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
    numeroOpcional(
      performance.lcpMs
    );

  let lcpTom =
    "neutral";

  let lcpTexto =
    lcpMs === null
      ? "Unavailable"
      : "Measured";

  if (
    lcpMs !== null
  ) {
    if (
      lcpMs <= 2500
    ) {
      lcpTom =
        "good";

      lcpTexto =
        "Good";

    } else if (
      lcpMs <= 4000
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
    numeroOpcional(
      performance.clsValor
    );

  let clsTom =
    "neutral";

  let clsTexto =
    cls === null
      ? "Unavailable"
      : "Measured";

  if (
    cls !== null
  ) {
    if (
      cls <= 0.1
    ) {
      clsTom =
        "good";

      clsTexto =
        "Good";

    } else if (
      cls <= 0.25
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
    clsTom,

    erro:
      performance.erro
      ||
      null
  };
}


// =====================================================
// INDEXABILITY
// =====================================================

function atualizarIndexability(
  indexability
) {
  if (
    !indexability
    ||
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
      httpStatus >= 200
      &&
      httpStatus < 300
        ? "good"
        : httpStatus >= 300
          &&
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
    httpStatus >= 400
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
    httpStatus >= 400
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
    !structuredData
    ||
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
    `${
      scriptCount
    } JSON-LD script${
      scriptCount === 1
        ? ""
        : "s"
    } detected`
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
    `${
      invalidScripts
    } parse error${
      invalidScripts === 1
        ? ""
        : "s"
    } · ${
      scriptCount
    } total`
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
    types
      .filter(
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
      ? `+${
          outros.length
        } additional type${
          outros.length === 1
            ? ""
            : "s"
        } detected`
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
    !images
    ||
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
      ? `${
          withAltText
        } of ${
          total
        } detected image${
          total === 1
            ? " contains"
            : "s contain"
        } non-empty alt text.`
      : "No img elements were detected in the analyzed HTML."
  );

  definirTexto(
    "imagesEmptyAlt",
    emptyAlt
  );

  definirTexto(
    "imagesEmptyAltDetail",
    emptyAlt > 0
      ? `${
          emptyAlt
        } image${
          emptyAlt === 1
            ? " has"
            : "s have"
        } an empty alt attribute. This can be intentional for decorative images.`
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
      `${
        missingAlt
      } image${
        missingAlt === 1
          ? " is"
          : "s are"
      } missing the alt attribute in the analyzed HTML.`
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
      `${
        sinais.locality
      }: ${
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
      `${
        sinais.region
      }: ${
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
    !localSeo
    ||
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
    localSeo.schema
    ||
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
        ? `Detected type${
            localTypes.length === 1
              ? ""
              : "s"
          }: ${
            localTypes.join(
              " · "
            )
          }`
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
    localSeo.clickToCall
    ||
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
      ? `${
          clickCount
        } tel: link${
          clickCount === 1
            ? ""
            : "s"
        } detected${
          clickPhones.length
            ? ` · ${
                clickPhones.join(
                  " · "
                )
              }`
            : ""
        }`
      : "No tel: links were detected in the analyzed server HTML."
  );

  const address =
    localSeo.address
    ||
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
    localSeo.openingHours
    ||
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
    localSeo.areaServed
    ||
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
    localSeo.geo
    ||
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
      ? `${
          geo.latitude
        }, ${
          geo.longitude
        }`
      : "No geo coordinates were associated with the selected entity."
  );

  const maps =
    localSeo.googleMaps
    ||
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
      ? `${
          mapsCount
        } Google Maps reference${
          mapsCount === 1
            ? ""
            : "s"
        }${
          mapsUrls.length
            ? ` · ${
                mapsUrls.join(
                  " · "
                )
              }`
            : ""
        }`
      : "No Google Maps link or embed was detected in the analyzed server HTML."
  );

  const sameAs =
    localSeo.sameAs
    ||
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
  const seoDisponivel =
    !seo.erro;

  definirTexto(
    "title",
    seoDisponivel
      ? seo.title
      : null,
    seoDisponivel
      ? "Not found"
      : "Unavailable"
  );

  definirTexto(
    "metaDescription",
    seoDisponivel
      ? seo.metaDescription
      : null,
    seoDisponivel
      ? "Not found"
      : "Unavailable"
  );

  definirTexto(
    "h1Count",
    seoDisponivel
      ? seo.h1Count
      : null
  );

  const titleOk =
    seoDisponivel
    &&
    Boolean(
      seo.title
    );

  const metaOk =
    seoDisponivel
    &&
    Boolean(
      seo.metaDescription
    );

  const h1Count =
    seoDisponivel
      ? numeroOpcional(
          seo.h1Count
        )
      : null;

  const h1Ok =
    h1Count !== null
    &&
    h1Count > 0;

  definirStatus(
    "titleStatus",
    !seoDisponivel
      ? "?"
      : titleOk
        ? "✓"
        : "!",
    !seoDisponivel
      ? "neutral"
      : titleOk
        ? "good"
        : "bad"
  );

  definirStatus(
    "metaDescriptionStatus",
    !seoDisponivel
      ? "?"
      : metaOk
        ? "✓"
        : "!",
    !seoDisponivel
      ? "neutral"
      : metaOk
        ? "good"
        : "warning"
  );

  definirStatus(
    "h1Status",
    h1Count === null
      ? "?"
      : h1Ok
        ? "✓"
        : "!",
    h1Count === null
      ? "neutral"
      : h1Ok
        ? "good"
        : "warning"
  );

  definirTexto(
    "h1Detail",
    h1Count !== null
      ? `${
          h1Count
        } heading${
          h1Count === 1
            ? ""
            : "s"
        } detected`
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
    findings
      .filter(
        finding =>
          onPageCodes.has(
            finding.codigo
          )
      );

  if (
    issues.length === 0
    &&
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
      issues
        .some(
          finding =>
            normalizarSeveridade(
              finding.severidade
            ) ===
            "high"
        );

    return {
      tom:
        high
          ? "bad"
          : "warning",

      titulo:
        `${
          issues.length
        } issue${
          issues.length === 1
            ? ""
            : "s"
        }`,

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
      : performanceInfo.erro
        ? `Performance unavailable: ${performanceInfo.erro}`
        : "Performance unavailable"
  );

  definirTomCard(
    "snapshotPerformanceCard",
    performanceInfo.scoreTom
  );

  const ring =
    $("snapshotScoreRing");

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
    findings
      .filter(
        finding =>
          normalizarSeveridade(
            finding.severidade
          ) ===
          "high"
      )
      .length;

  const medium =
    findings
      .filter(
        finding =>
          normalizarSeveridade(
            finding.severidade
          ) ===
          "medium"
      )
      .length;

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
      `${
        quantidade
      } verified finding${
        quantidade === 1
          ? ""
          : "s"
      }`;

  } else if (
    medium > 0
  ) {
    tom =
      "warning";

    titulo =
      `${medium} to review`;

    detalhe =
      `${
        quantidade
      } verified finding${
        quantidade === 1
          ? ""
          : "s"
      }`;

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
    $("topOpportunity");

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

  findings
    .forEach(
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
          ] +=
            1;
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
    document
      .createElement(
        "div"
      );

  campo.className =
    "finding-field";

  const titulo =
    document
      .createElement(
        "span"
      );

  titulo.className =
    "finding-field-label";

  titulo.textContent =
    label;

  const texto =
    document
      .createElement(
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
    $("findings");

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
      document
        .createElement(
          "div"
        );

    vazio.className =
      "empty-state";

    vazio.textContent =
      lista.length === 0
        ? "No verified issues were detected in this analysis."
        : `No ${filtro} severity findings in this analysis.`;

    container
      .appendChild(
        vazio
      );

    return;
  }

  filtrados
    .forEach(
      finding => {

        const card =
          document
            .createElement(
              "article"
            );

        card.className =
          "finding";

        const main =
          document
            .createElement(
              "div"
            );

        main.className =
          "finding-main";

        const alert =
          document
            .createElement(
              "div"
            );

        alert.className =
          "finding-alert";

        alert.textContent =
          "!";

        const mainText =
          document
            .createElement(
              "div"
            );

        const titulo =
          document
            .createElement(
              "div"
            );

        titulo.className =
          "finding-code";

        titulo.textContent =
          nomeFinding(
            finding.codigo
          );

        const evidencia =
          document
            .createElement(
              "div"
            );

        evidencia.className =
          "finding-evidence";

        evidencia.textContent =
          finding.evidencia
          ||
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
            finding.evidencia
            ||
            "Verified by analyzer"
          );

        const categoryField =
          document
            .createElement(
              "div"
            );

        categoryField.className =
          "finding-field";

        const categoryLabel =
          document
            .createElement(
              "span"
            );

        categoryLabel.className =
          "finding-field-label";

        categoryLabel.textContent =
          "Category";

        const categoryValue =
          document
            .createElement(
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
          document
            .createElement(
              "div"
            );

        severityField.className =
          "finding-field";

        const severityLabel =
          document
            .createElement(
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
          document
            .createElement(
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

        container
          .appendChild(
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
// OUTREACH DETAIL
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
    dados.iaStatus
    ||
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
    $("aiGenerationStatus");

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
    status ===
      "generated"
    ||
    status ===
      "cached"
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
    status ===
      "error"
    ||
    status ===
      "invalid_json"
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
    `${
      findings.length
    } verified finding${
      findings.length === 1
        ? ""
        : "s"
    } · AI status: ${
      formatarStatusIA(
        status
      )
    }`
  );
}


async function gerarOutreachAtual() {
  if (
    !analiseAtual
    ||
    !analysisIdAtual
  ) {
    const statusEl =
      $("aiGenerationStatus");

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
    $("aiGenerationStatus");

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
    const dados =
      await solicitarOutreach(
        analysisIdAtual
      );

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
      prospectsAtuais
        .find(
          item =>
            item.analysisId ===
            analysisIdAtual
        );

    if (
      prospect
    ) {
      atualizarProspectComOutreach(
        prospect,
        dados
      );
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
      erro.message
      ||
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
    dados.opportunity
    ||
    {};

  const tier =
    opportunity.tier
    ||
    (
      findings
        .some(
          item =>
            normalizarSeveridade(
              item.severidade
            ) ===
            "high"
        )
        ? "high"
        : findings
            .some(
              item =>
                normalizarSeveridade(
                  item.severidade
                ) ===
                "medium"
            )
          ? "medium"
          : findings.length
            ? "low"
            : "none"
    );

  const tierEl =
    $("detailTier");

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
      dados.performance
      ||
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
      dados.seo
      ||
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
    $(elementoId)
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
      document
        .createElement(
          "textarea"
        );

    textarea.value =
      texto;

    textarea.style.position =
      "fixed";

    textarea.style.opacity =
      "0";

    document.body
      .appendChild(
        textarea
      );

    textarea.select();

    document
      .execCommand(
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

garantirBotaoOutreachSelecionados();

atualizarControlesSelecao();

iniciarTema();

atualizarContadorUrls();


themeToggle
  .addEventListener(
    "click",
    alternarTema
  );


batchUrls
  .addEventListener(
    "input",
    atualizarContadorUrls
  );


analyzeBatchButton
  .addEventListener(
    "click",
    analisarLote
  );


if (
  selectVisibleCheckbox
) {
  selectVisibleCheckbox
    .addEventListener(
      "change",
      () =>
        selecionarProspectsVisiveis(
          selectVisibleCheckbox.checked
        )
    );
}


if (
  clearSelectionButton
) {
  clearSelectionButton
    .addEventListener(
      "click",
      limparSelecao
    );
}


if (
  generateSelectedOutreachButton
) {
  generateSelectedOutreachButton
    .addEventListener(
      "click",
      gerarOutreachSelecionados
    );
}


backToQueueButton
  .addEventListener(
    "click",
    voltarParaQueue
  );


brandButton
  .addEventListener(
    "click",
    voltarParaQueue
  );


generateOutreachButton
  .addEventListener(
    "click",
    gerarOutreachAtual
  );


queueFilters
  .addEventListener(
    "click",
    event => {

      const botao =
        event.target
          .closest(
            ".queue-filter"
          );

      if (
        !botao
      ) {
        return;
      }

      filtrarQueue(
        botao.dataset.filter
        ||
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

      card
        .addEventListener(
          "click",
          ativar
        );

      card
        .addEventListener(
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

      botao
        .addEventListener(
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

      botao
        .addEventListener(
          "click",
          () =>
            ativarAba(
              botao.dataset.goTab
            )
        );
    }
  );


copyAgencyButton
  .addEventListener(
    "click",
    () =>
      copiarTexto(
        "agencyView",
        copyAgencyButton
      )
  );


copyProspectButton
  .addEventListener(
    "click",
    () =>
      copiarTexto(
        "prospectView",
        copyProspectButton
      )
  );


findingFilters
  .addEventListener(
    "click",
    event => {

      const botao =
        event.target
          .closest(
            ".filter-chip"
          );

      if (
        !botao
      ) {
        return;
      }

      filtrarFindings(
        botao.dataset.filter
        ||
        "all"
      );
    }
  );