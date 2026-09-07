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


  analyzeButton.textContent =
    "Analyzing...";
}


function finalizarLoading() {

  loading.classList.add(
    "hidden"
  );


  analyzeButton.disabled =
    false;


  urlInput.disabled =
    false;


  analyzeButton.textContent =
    "Analyze";
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
// FRIENDLY FINDING NAME
// ======================================================

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


// ======================================================
// CAPITALIZE
// ======================================================

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


// ======================================================
// AI STATUS
// ======================================================

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


// ======================================================
// AI PLACEHOLDER
// ======================================================

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


// ======================================================
// SAFE TEXT SETTER
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


// ======================================================
// STATUS SETTER
// ======================================================

function definirStatus(
  id,
  texto,
  tipo = "neutral"
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


  elemento.classList.remove(
    "status-success",
    "status-warning",
    "status-danger",
    "status-neutral"
  );


  elemento.classList.add(
    `status-${tipo}`
  );
}


// ======================================================
// URL COMPARISON
// ======================================================

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


// ======================================================
// INDEXABILITY & CRAWLING
// ======================================================

function mostrarIndexability(
  indexability
) {

  // ====================================================
  // DATA UNAVAILABLE
  // ====================================================

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


    return;
  }


  // ====================================================
  // HTTP STATUS
  // ====================================================

  const httpStatus =
    indexability.httpStatus;


  if (
    typeof httpStatus ===
    "number"
  ) {

    let tipo =
      "neutral";


    if (
      httpStatus >= 200 &&
      httpStatus < 300
    ) {

      tipo =
        "success";

    } else if (
      httpStatus >= 300 &&
      httpStatus < 400
    ) {

      tipo =
        "warning";

    } else if (
      httpStatus >= 400
    ) {

      tipo =
        "danger";
    }


    definirStatus(
      "httpStatus",
      httpStatus === 200
        ? "200 OK"
        : String(
            httpStatus
          ),
      tipo
    );

  } else {

    definirStatus(
      "httpStatus",
      "Unknown",
      "neutral"
    );
  }


  // ====================================================
  // HTTPS
  // ====================================================

  if (
    indexability.https === true
  ) {

    definirStatus(
      "httpsStatus",
      "Yes",
      "success"
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
      "danger"
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


  // ====================================================
  // INDEXING DIRECTIVES
  // ====================================================

  if (
    indexability.indexable === true
  ) {

    definirStatus(
      "indexingStatus",
      "Allowed",
      "success"
    );

  } else if (
    indexability.indexable === false
  ) {

    definirStatus(
      "indexingStatus",
      "Blocked",
      "danger"
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


  // ====================================================
  // META ROBOTS
  // ====================================================

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


  // ====================================================
  // CANONICAL
  // ====================================================

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
        ? "success"
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


  // ====================================================
  // ROBOTS.TXT
  // ====================================================

  if (
    indexability.robotsTxt
      ?.found === true
  ) {

    definirStatus(
      "robotsTxtStatus",
      "Found",
      "success"
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


  // ====================================================
  // SITEMAP
  // ====================================================

  if (
    indexability.sitemap
      ?.found === true
  ) {

    definirStatus(
      "sitemapStatus",
      "Found",
      "success"
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


  // ====================================================
  // PERFORMANCE
  // ====================================================

  definirTexto(
    "score",
    dados.performance?.score
  );


  definirTexto(
    "lcp",
    dados.performance?.lcp
  );


  definirTexto(
    "cls",
    dados.performance?.cls
  );


  definirTexto(
    "fcp",
    dados.performance?.fcp
  );


  definirTexto(
    "speedIndex",
    dados.performance?.speedIndex
  );


  // ====================================================
  // INDEXABILITY
  // ====================================================

  mostrarIndexability(
    dados.indexability
  );


  // ====================================================
  // SEO
  // ====================================================

  definirTexto(
    "title",
    dados.seo?.title,
    "Not found"
  );


  definirTexto(
    "metaDescription",
    dados.seo?.metaDescription,
    "Not found"
  );


  definirTexto(
    "h1Count",
    dados.seo?.h1Count
  );


  // ====================================================
  // FINDINGS
  // ====================================================

  mostrarFindings(
    dados.findings
  );


  // ====================================================
  // AGENCY VIEW
  // ====================================================

  const agencyView =
    dados.agencyView ||
    textoIAIndisponivel(
      dados.iaStatus,
      "Agency View"
    );


  document.getElementById(
    "agencyView"
  ).textContent =
    agencyView;


  copyAgencyButton.disabled =
    !dados.agencyView;


  // ====================================================
  // PROSPECT VIEW
  // ====================================================

  const prospectView =
    dados.prospectView ||
    textoIAIndisponivel(
      dados.iaStatus,
      "Prospect View"
    );


  document.getElementById(
    "prospectView"
  ).textContent =
    prospectView;


  copyProspectButton.disabled =
    !dados.prospectView;


  // ====================================================
  // STATUS
  // ====================================================

  const quantidade =
    dados.findings?.length ??
    0;


  const status =
    formatarStatusIA(
      dados.iaStatus
    );


  document.getElementById(
    "analysisStatus"
  ).textContent =
    `${quantidade} verified finding${quantidade === 1 ? "" : "s"} · AI status: ${status}`;


  // ====================================================
  // SHOW RESULTS
  // ====================================================

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
// FINDINGS
// ======================================================

function mostrarFindings(
  findings
) {

  const container =
    document.getElementById(
      "findings"
    );


  container.innerHTML =
    "";


  if (
    !Array.isArray(
      findings
    )
    ||
    findings.length === 0
  ) {

    const vazio =
      document.createElement(
        "div"
      );


    vazio.className =
      "empty-state";


    vazio.textContent =
      "No verified issues were detected in this analysis.";


    container.appendChild(
      vazio
    );


    return;
  }


  findings.forEach(
    finding => {

      const card =
        document.createElement(
          "div"
        );


      card.className =
        "finding";


      // ==================================================
      // TOP
      // ==================================================

      const top =
        document.createElement(
          "div"
        );


      top.className =
        "finding-top";


      // ==================================================
      // NAME
      // ==================================================

      const codigo =
        document.createElement(
          "div"
        );


      codigo.className =
        "finding-code";


      codigo.textContent =
        nomeFinding(
          finding.codigo
        );


      // ==================================================
      // META
      // ==================================================

      const meta =
        document.createElement(
          "div"
        );


      meta.className =
        "finding-meta";


      // ==================================================
      // CATEGORY
      // ==================================================

      const categoria =
        document.createElement(
          "span"
        );


      categoria.className =
        "badge";


      categoria.textContent =
        finding.categoria ===
        "seo"
          ? "SEO"
          : capitalizar(
              finding.categoria
            );


      // ==================================================
      // SEVERITY
      // ==================================================

      const severidade =
        document.createElement(
          "span"
        );


      severidade.className =
        "badge";


      const nivel =
        String(
          finding.severidade ||
          ""
        )
          .toLowerCase();


      if (
        nivel === "high" ||
        nivel === "alta"
      ) {

        severidade
          .classList
          .add(
            "badge-high"
          );

      } else if (
        nivel === "medium" ||
        nivel === "media" ||
        nivel === "média"
      ) {

        severidade
          .classList
          .add(
            "badge-medium"
          );

      } else {

        severidade
          .classList
          .add(
            "badge-low"
          );
      }


      severidade.textContent =
        nivel === "alta"
          ? "High"
          : (
              nivel === "media" ||
              nivel === "média"
            )
            ? "Medium"
            : capitalizar(
                finding.severidade
              );


      meta.appendChild(
        categoria
      );


      meta.appendChild(
        severidade
      );


      top.appendChild(
        codigo
      );


      top.appendChild(
        meta
      );


      // ==================================================
      // EVIDENCE
      // ==================================================

      const evidencia =
        document.createElement(
          "div"
        );


      evidencia.className =
        "finding-evidence";


      evidencia.textContent =
        finding.evidencia ||
        "No evidence provided.";


      card.appendChild(
        top
      );


      card.appendChild(
        evidencia
      );


      container.appendChild(
        card
      );
    }
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
      .textContent
      .trim();


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


// ======================================================
// COPY FEEDBACK
// ======================================================

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