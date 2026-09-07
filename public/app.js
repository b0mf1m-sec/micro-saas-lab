const urlInput =
  document.getElementById(
    "urlInput"
  );


const analyzeButton =
  document.getElementById(
    "analyzeButton"
  );


const loading =
  document.getElementById(
    "loading"
  );


const results =
  document.getElementById(
    "results"
  );


const errorBox =
  document.getElementById(
    "error"
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


let findingsAtuais =
  [];


let filtroFindingAtual =
  "all";


// ======================================================
// ANALYZE
// ======================================================

async function analisar() {

  const url =
    urlInput.value.trim();


  if (
    !url
  ) {

    mostrarErro(
      "Enter a website URL."
    );


    return;
  }


  iniciarLoading();


  try {

    const resposta =
      await fetch(
        "/analisar",
        {

          method:
            "POST",

          headers: {

            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              url
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
        "Analysis failed."
      );
    }


    mostrarResultado(
      dados
    );

  } catch (erro) {

    mostrarErro(
      erro.message ||
      "Something went wrong."
    );

  } finally {

    finalizarLoading();
  }
}


// ======================================================
// LOADING
// ======================================================

function iniciarLoading() {

  errorBox.classList.add(
    "hidden"
  );


  results.classList.add(
    "hidden"
  );


  loading.classList.remove(
    "hidden"
  );


  analyzeButton.disabled =
    true;


  urlInput.disabled =
    true;


  analyzeButton.innerHTML =
    '<span class="button-spark">✦</span><span>Analyzing...</span>';
}


function finalizarLoading() {

  loading.classList.add(
    "hidden"
  );


  analyzeButton.disabled =
    false;


  urlInput.disabled =
    false;


  analyzeButton.innerHTML =
    '<span class="button-spark">✦</span><span>Analyze</span>';
}


// ======================================================
// ERROR
// ======================================================

function mostrarErro(
  mensagem
) {

  errorBox.textContent =
    mensagem;


  errorBox.classList.remove(
    "hidden"
  );
}


// ======================================================
// HELPERS
// ======================================================

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
      ? String(valor)
      : fallback;
}


function removerTons(
  elemento
) {

  elemento.classList.remove(
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


  elemento.classList.add(
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


  elemento.dataset.tone =
    tom;
}


function capitalizar(
  texto
) {

  if (
    !texto
  ) {

    return "Unknown";
  }


  return (
    texto.charAt(0).toUpperCase() +
    texto.slice(1)
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


  return (
    nivel ||
    "low"
  );
}


function nomeFinding(
  codigo
) {

  const nomes = {

    LCP_HIGH:
      "High Largest Contentful Paint",

    CLS_HIGH:
      "High Cumulative Layout Shift",

    TITLE_MISSING:
      "Missing Page Title",

    META_DESCRIPTION_MISSING:
      "Missing Meta Description",

    H1_MISSING:
      "Missing H1 Heading"
  };


  return (
    nomes[codigo] ||
    codigo ||
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


function formatarStatusIA(
  status
) {

  const statusMap = {

    generated:
      "Generated",

    cached:
      "Cached",

    no_findings:
      "No findings",

    rate_limited:
      "Temporarily rate limited",

    error:
      "Error",

    invalid_json:
      "Invalid AI response",

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
    statusMap[status] ||
    "Unknown"
  );
}


function textoIAIndisponivel(
  status,
  tipo
) {

  if (
    status ===
    "rate_limited"
  ) {

    return (
      "AI generation is temporarily unavailable due to rate limits. Please try again shortly."
    );
  }


  if (
    status ===
    "no_findings"
  ) {

    return (
      `No ${tipo} was generated because no verified findings were detected.`
    );
  }


  return (
    `No ${tipo} was generated.`
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
      valor => {

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
      normalizar(urlA) ===
      normalizar(urlB)
    );

  } catch {

    return (
      String(urlA)
        .replace(
          /\/$/,
          ""
        )
      ===
      String(urlB)
        .replace(
          /\/$/,
          ""
        )
    );
  }
}


function textoTempoAnalise(
  iso
) {

  if (
    !iso
  ) {

    return (
      "Analyzed just now"
    );
  }


  const data =
    new Date(
      iso
    );


  if (
    Number.isNaN(
      data.getTime()
    )
  ) {

    return (
      "Analyzed just now"
    );
  }


  return (
    `Analyzed ${data.toLocaleTimeString(
      [],
      {
        hour:
          "2-digit",

        minute:
          "2-digit"
      }
    )}`
  );
}


// ======================================================
// PERFORMANCE
// ======================================================

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

    scoreBar.style.width =
      Number.isFinite(
        score
      )
        ? `${Math.max(
            0,
            Math.min(
              score,
              100
            )
          )}%`
        : "0%";


    scoreBar.style.background =
      scoreTom === "good"
        ? "#43d18b"
        : scoreTom === "warning"
          ? "#f2c94c"
          : scoreTom === "bad"
            ? "#ff6b78"
            : "#6b7f98";
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

    scoreTexto
  };
}


// ======================================================
// INDEXABILITY
// ======================================================

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
      indexability?.erro ||
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
    indexability.https === true
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
    indexability.https === false
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
    indexability.indexable === true
  ) {

    definirStatus(
      "indexingStatus",
      "Allowed",
      "good"
    );

  } else if (
    indexability.indexable === false
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
      selfReferencing
        ? "good"
        : "neutral"
    );


    definirTexto(
      "canonicalUrl",
      indexability.canonical
    );

  } else {

    definirStatus(
      "canonicalStatus",
      "Not found",
      "neutral"
    );


    definirTexto(
      "canonicalUrl",
      null,
      "No canonical URL detected"
    );
  }


  if (
    indexability.robotsTxt
      ?.found === true
  ) {

    definirStatus(
      "robotsTxtStatus",
      "Found",
      "good"
    );


    definirTexto(
      "robotsTxtUrl",
      indexability
        .robotsTxt
        .url
    );

  } else if (
    indexability.robotsTxt
      ?.found === false
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
    indexability.sitemap
      ?.found === true
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
    indexability.sitemap
      ?.found === false
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


// ======================================================
// ON-PAGE
// ======================================================

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
      "H1_MISSING"
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


// ======================================================
// SNAPSHOT
// ======================================================

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
      performanceInfo.scoreTom === "good"
        ? "#43d18b"
        : performanceInfo.scoreTom === "warning"
          ? "#f2c94c"
          : performanceInfo.scoreTom === "bad"
            ? "#ff6b78"
            : "#5b718e";


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
        ) === "high"
    ).length;


  const medium =
    findings.filter(
      finding =>
        normalizarSeveridade(
          finding.severidade
        ) === "medium"
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


// ======================================================
// FINDINGS
// ======================================================

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
        contadores[nivel] !==
        undefined
      ) {

        contadores[nivel] +=
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
            ) === filtro
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


      // MAIN

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


      mainText.appendChild(
        titulo
      );


      mainText.appendChild(
        evidencia
      );


      main.appendChild(
        alert
      );


      main.appendChild(
        mainText
      );


      // EVIDENCE

      const evidenceField =
        document.createElement(
          "div"
        );


      evidenceField.className =
        "finding-field";


      const evidenceLabel =
        document.createElement(
          "span"
        );


      evidenceLabel.className =
        "finding-field-label";


      evidenceLabel.textContent =
        "Evidence";


      const evidenceValue =
        document.createElement(
          "span"
        );


      evidenceValue.className =
        "finding-field-value";


      evidenceValue.textContent =
        finding.evidencia ||
        "Verified by analyzer";


      evidenceField.appendChild(
        evidenceLabel
      );


      evidenceField.appendChild(
        evidenceValue
      );


      // CATEGORY

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


      categoryField.appendChild(
        categoryLabel
      );


      categoryField.appendChild(
        categoryValue
      );


      // SEVERITY

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


      const severityValue =
        document.createElement(
          "span"
        );


      const nivel =
        normalizarSeveridade(
          finding.severidade
        );


      severityValue.className =
        `badge badge-${nivel}`;


      severityValue.textContent =
        capitalizar(
          nivel
        );


      severityField.appendChild(
        severityLabel
      );


      severityField.appendChild(
        severityValue
      );


      card.appendChild(
        main
      );


      card.appendChild(
        evidenceField
      );


      card.appendChild(
        categoryField
      );


      card.appendChild(
        severityField
      );


      container.appendChild(
        card
      );
    }
  );
}


// ======================================================
// RESULT
// ======================================================

function mostrarResultado(
  dados
) {

  errorBox.classList.add(
    "hidden"
  );


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


  ativarFiltroVisual(
    "all"
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


  mostrarFindings(
    findings,
    "all"
  );


  const agencyView =
    dados.agencyView ||
    textoIAIndisponivel(
      dados.iaStatus,
      "Agency View"
    );


  definirTexto(
    "agencyView",
    agencyView
  );


  copyAgencyButton.disabled =
    !dados.agencyView;


  const prospectView =
    dados.prospectView ||
    textoIAIndisponivel(
      dados.iaStatus,
      "Prospect View"
    );


  definirTexto(
    "prospectView",
    prospectView
  );


  copyProspectButton.disabled =
    !dados.prospectView;


  const quantidade =
    findings.length;


  const statusIA =
    formatarStatusIA(
      dados.iaStatus
    );


  definirTexto(
    "analysisStatus",
    `${quantidade} verified finding${quantidade === 1 ? "" : "s"} · AI status: ${statusIA}`
  );


  const freshness =
    textoTempoAnalise(
      dados.analisadoEm
    );


  definirTexto(
    "analysisFreshness",
    freshness
  );


  definirTexto(
    "lastAnalyzed",
    freshness
  );


  document
    .getElementById(
      "lastAnalyzed"
    )
    ?.classList
    .remove(
      "hidden"
    );


  results.classList.remove(
    "hidden"
  );


  results.scrollIntoView({

    behavior:
      "smooth",

    block:
      "start"
  });
}


// ======================================================
// FILTERS
// ======================================================

function ativarFiltroVisual(
  filtro
) {

  document
    .querySelectorAll(
      ".filter-chip"
    )
    .forEach(
      botao => {

        botao.classList.toggle(
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


// ======================================================
// COPY
// ======================================================

async function copiarTexto(
  elementoId,
  botao
) {

  const elemento =
    document.getElementById(
      elementoId
    );


  const texto =
    elemento
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


    mostrarCopiado(
      botao
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


    mostrarCopiado(
      botao
    );
  }
}


function mostrarCopiado(
  botao
) {

  const original =
    botao.textContent;


  botao.textContent =
    "Copied!";


  botao.classList.add(
    "copied"
  );


  setTimeout(
    () => {

      botao.textContent =
        original;


      botao.classList.remove(
        "copied"
      );

    },
    1600
  );
}


// ======================================================
// EVENTS
// ======================================================

analyzeButton.addEventListener(
  "click",
  analisar
);


urlInput.addEventListener(
  "keydown",
  event => {

    if (
      event.key ===
      "Enter"
    ) {

      analisar();
    }
  }
);


copyAgencyButton.addEventListener(
  "click",
  () => {

    copiarTexto(
      "agencyView",
      copyAgencyButton
    );
  }
);


copyProspectButton.addEventListener(
  "click",
  () => {

    copiarTexto(
      "prospectView",
      copyProspectButton
    );
  }
);


findingFilters.addEventListener(
  "click",
  event => {

    const botao =
      event.target.closest(
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