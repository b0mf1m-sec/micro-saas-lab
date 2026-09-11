const cheerio = require("cheerio");

const {
  fetchSeguro,
  ErroURLInsegura
} = require("./seguranca");


// ======================================================
// UTILITY
// ======================================================

function esperar(ms) {

  return new Promise(
    resolve => setTimeout(resolve, ms)
  );
}


// ======================================================
// SAFE TEXT READER
// ======================================================

async function lerTextoLimitado(
  resposta,
  limiteCaracteres = 500000
) {

  const texto =
    await resposta.text();


  if (
    texto.length >
    limiteCaracteres
  ) {

    return texto.slice(
      0,
      limiteCaracteres
    );
  }


  return texto;
}


// ======================================================
// NORMALIZE ROBOTS DIRECTIVES
// ======================================================

function normalizarRobots(
  valor
) {

  if (!valor) {

    return null;
  }


  return valor
    .toLowerCase()
    .split(",")
    .map(
      item => item.trim()
    )
    .filter(Boolean)
    .join(", ");
}


// ======================================================
// DETECT NOINDEX
// ======================================================

function contemNoindex(
  valor
) {

  if (!valor) {

    return false;
  }


  return valor
    .toLowerCase()
    .split(/[,;]/)
    .map(
      item => item.trim()
    )
    .some(
      item =>
        item === "noindex" ||
        item.startsWith(
          "noindex:"
        )
    );
}


// ======================================================
// CHECK ROBOTS.TXT
// ======================================================

async function verificarRobotsTxt(
  finalUrl
) {

  const resultado = {

    found:
      false,

    status:
      null,

    url:
      null,

    sitemapUrls:
      [],

    error:
      null
  };


  try {

    const base =
      new URL(
        finalUrl
      );


    const robotsUrl =
      new URL(
        "/robots.txt",
        base.origin
      ).toString();


    resultado.url =
      robotsUrl;


    const resposta =
      await fetchSeguro(
        robotsUrl,
        {

          headers: {

            "User-Agent":
              "ProspectAnalyzer/1.0",

            "Accept":
              "text/plain,*/*"
          }
        }
      );


    resultado.status =
      resposta.status;


    if (
      resposta.status !== 200
    ) {

      return resultado;
    }


    const texto =
      await lerTextoLimitado(
        resposta,
        200000
      );


    resultado.found =
      true;


    // ================================================
    // SITEMAP DIRECTIVES
    // ================================================

    const linhas =
      texto.split(
        /\r?\n/
      );


    for (
      const linha of linhas
    ) {

      const match =
        linha.match(
          /^\s*sitemap\s*:\s*(.+)\s*$/i
        );


      if (!match) {

        continue;
      }


      const sitemap =
        match[1].trim();


      try {

        const parsed =
          new URL(
            sitemap
          );


        if (
          parsed.protocol === "http:" ||
          parsed.protocol === "https:"
        ) {

          resultado
            .sitemapUrls
            .push(
              parsed.toString()
            );
        }

      } catch {

        // Invalid sitemap declaration.
        // Ignore it.
      }
    }


    return resultado;

  } catch (erro) {

    if (
      erro instanceof
      ErroURLInsegura
    ) {

      throw erro;
    }


    resultado.error =
      erro.message;


    return resultado;
  }
}


// ======================================================
// VERIFY A SITEMAP URL
// ======================================================

async function verificarSitemapUrl(
  sitemapUrl
) {

  try {

    const resposta =
      await fetchSeguro(
        sitemapUrl,
        {

          headers: {

            "User-Agent":
              "ProspectAnalyzer/1.0",

            "Accept":
              "application/xml,text/xml,*/*"
          }
        }
      );


    if (
      resposta.status !== 200
    ) {

      return {
        found: false,
        status: resposta.status,
        url: sitemapUrl
      };
    }


    const texto =
      await lerTextoLimitado(
        resposta,
        300000
      );


    const pareceSitemap =
      /<urlset[\s>]/i.test(
        texto
      )
      ||
      /<sitemapindex[\s>]/i.test(
        texto
      );


    return {

      found:
        pareceSitemap,

      status:
        resposta.status,

      url:
        sitemapUrl
    };

  } catch (erro) {

    if (
      erro instanceof
      ErroURLInsegura
    ) {

      throw erro;
    }


    return {

      found:
        false,

      status:
        null,

      url:
        sitemapUrl
    };
  }
}


// ======================================================
// FIND SITEMAP
// ======================================================

async function verificarSitemap(
  finalUrl,
  robots
) {

  const candidatos =
    [];


  // Sitemap declared in robots.txt gets priority.

  if (
    robots?.sitemapUrls?.length
  ) {

    candidatos.push(
      ...robots.sitemapUrls.slice(
        0,
        3
      )
    );
  }


  const origin =
    new URL(
      finalUrl
    ).origin;


  // Common fallback locations.

  candidatos.push(
    `${origin}/sitemap.xml`
  );


  candidatos.push(
    `${origin}/sitemap_index.xml`
  );


  // Remove duplicates.

  const unicos =
    [
      ...new Set(
        candidatos
      )
    ];


  for (
    const sitemapUrl of unicos
  ) {

    const resultado =
      await verificarSitemapUrl(
        sitemapUrl
      );


    if (
      resultado.found
    ) {

      return {

        found:
          true,

        status:
          resultado.status,

        url:
          resultado.url,

        source:
          robots?.sitemapUrls
            ?.includes(
              resultado.url
            )
            ? "robots.txt"
            : "common_path"
      };
    }
  }


  return {

    found:
      false,

    status:
      null,

    url:
      null,

    source:
      null
  };
}


// ======================================================
// STRUCTURED DATA / JSON-LD
// ======================================================

function coletarTiposSchema(
  valor,
  tipos
) {

  if (
    valor === null ||
    valor === undefined
  ) {

    return;
  }


  if (
    Array.isArray(
      valor
    )
  ) {

    for (
      const item of valor
    ) {

      coletarTiposSchema(
        item,
        tipos
      );
    }


    return;
  }


  if (
    typeof valor !==
    "object"
  ) {

    return;
  }


  const tipo =
    valor["@type"];


  if (
    typeof tipo ===
    "string"
  ) {

    const limpo =
      tipo.trim();


    if (
      limpo
    ) {

      tipos.add(
        limpo
      );
    }

  } else if (
    Array.isArray(
      tipo
    )
  ) {

    for (
      const item of tipo
    ) {

      if (
        typeof item !==
        "string"
      ) {

        continue;
      }


      const limpo =
        item.trim();


      if (
        limpo
      ) {

        tipos.add(
          limpo
        );
      }
    }
  }


  for (
    const filho of
    Object.values(
      valor
    )
  ) {

    coletarTiposSchema(
      filho,
      tipos
    );
  }
}


function analisarStructuredData(
  $
) {

  const resultado = {

    found:
      false,

    scriptCount:
      0,

    validScripts:
      0,

    invalidScripts:
      0,

    types:
      [],

    erro:
      null
  };


  const tipos =
    new Set();


  $("script").each(
    (
      index,
      elemento
    ) => {

      const type =
        $(elemento)
          .attr(
            "type"
          )
          ?.trim()
          .toLowerCase();


      if (
        type !==
        "application/ld+json"
      ) {

        return;
      }


      resultado.scriptCount +=
        1;


      const conteudo =
        (
          $(elemento)
            .html()
          ||
          ""
        )
          .replace(
            /^\uFEFF/,
            ""
          )
          .trim();


      if (
        !conteudo
      ) {

        resultado.invalidScripts +=
          1;

        return;
      }


      try {

        const dados =
          JSON.parse(
            conteudo
          );


        resultado.validScripts +=
          1;


        coletarTiposSchema(
          dados,
          tipos
        );

      } catch {

        resultado.invalidScripts +=
          1;
      }
    }
  );


  resultado.found =
    resultado.scriptCount >
    0;


  resultado.types =
    [
      ...tipos
    ];


  return resultado;
}


function structuredDataIndisponivel(
  mensagem = null
) {

  return {

    found:
      false,

    scriptCount:
      0,

    validScripts:
      0,

    invalidScripts:
      0,

    types:
      [],

    erro:
      mensagem
  };
}

// ======================================================
// IMAGES / ALT ATTRIBUTES
// ======================================================

function analisarImagens(
  $,
  finalUrl
) {

  const resultado = {

    total:
      0,

    withAltText:
      0,

    emptyAlt:
      0,

    missingAlt:
      0,

    missingAltSamples:
      [],

    erro:
      null
  };


  $("img").each(
    (
      index,
      elemento
    ) => {

      resultado.total +=
        1;


      const altExiste =
        $(elemento)
          .is(
            "[alt]"
          );


      // ===============================================
      // ALT ATTRIBUTE MISSING
      // ===============================================

      if (
        !altExiste
      ) {

        resultado.missingAlt +=
          1;


        // Save up to 5 examples as evidence.

        if (
          resultado
            .missingAltSamples
            .length < 5
        ) {

          const src =
            $(elemento)
              .attr(
                "src"
              )
            ||
            $(elemento)
              .attr(
                "data-src"
              )
            ||
            $(elemento)
              .attr(
                "data-lazy-src"
              )
            ||
            null;


          if (
            src
          ) {

            try {

              resultado
                .missingAltSamples
                .push(
                  new URL(
                    src,
                    finalUrl
                  ).toString()
                );

            } catch {

              resultado
                .missingAltSamples
                .push(
                  src
                );
            }
          }
        }


        return;
      }


      // ===============================================
      // ALT ATTRIBUTE EXISTS
      // ===============================================

      const alt =
        $(elemento)
          .attr(
            "alt"
          )
        ??
        "";


      if (
        alt.trim()
      ) {

        resultado.withAltText +=
          1;

      } else {

        resultado.emptyAlt +=
          1;
      }
    }
  );


  return resultado;
}


function imagesIndisponiveis(
  mensagem = null
) {

  return {

    total:
      0,

    withAltText:
      0,

    emptyAlt:
      0,

    missingAlt:
      0,

    missingAltSamples:
      [],

    erro:
      mensagem
  };
}

// ======================================================
// ANALYZE PAGE
// ======================================================

async function analisarPagina(
  url
) {

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


      if (
        (
          resposta.status === 429 ||
          resposta.status >= 500
        )
        &&
        tentativa <
          maxTentativas
      ) {

        console.log(
          `⚠️ Page returned HTTP ${resposta.status}. Retrying in 2 seconds...`
        );


        await esperar(
          2000
        );


        continue;
      }


      const finalUrl =
        resposta.url ||
        url;


      // =================================================
      // BASIC INDEXABILITY DATA
      // =================================================

      const httpStatus =
        resposta.status;


      const https =
        new URL(
          finalUrl
        ).protocol ===
        "https:";


      const xRobotsTag =
        normalizarRobots(
          resposta.headers.get(
            "x-robots-tag"
          )
        );


      // =================================================
      // NON-SUCCESS RESPONSE
      // =================================================

      if (
        !resposta.ok
      ) {

        return {

          seo: {

            title:
              null,

            metaDescription:
              null,

            h1Count:
              null,

            h1Textos:
              [],

            erro:
              `HTTP ${httpStatus}`
          },


          structuredData:
            structuredDataIndisponivel(
              `HTML was not analyzed because the page returned HTTP ${httpStatus}.`
            ),


          images:
            imagesIndisponiveis(
              `HTML was not analyzed because the page returned HTTP ${httpStatus}.`
          ),


          indexability: {

            httpStatus,

            finalUrl,

            https,

            indexable:
              false,

            indexabilityReason:
              `The page returned HTTP ${httpStatus}.`,

            metaRobots:
              null,

            xRobotsTag,

            canonical:
              null,

            robotsTxt:
              null,

            sitemap:
              null,

            erro:
              null
          }
        };
      }


      const html =
        await lerTextoLimitado(
          resposta
        );


      const $ =
        cheerio.load(
          html
        );


      // =================================================
      // STRUCTURED DATA / JSON-LD
      // =================================================

      const structuredData =
        analisarStructuredData(
          $
        );

      // =================================================
      // IMAGES / ALT ATTRIBUTES
      // =================================================

      const images =
        analisarImagens(
          $,
          finalUrl
        );

      // =================================================
      // ON-PAGE SEO
      // =================================================

      const title =
        $("title")
          .first()
          .text()
          .trim()
        ||
        null;


      const metaDescription =
        $(
          'meta[name="description"]'
        )
          .attr(
            "content"
          )
          ?.trim()
        ||
        null;


      const h1Textos =
        [];


      $("h1").each(
        (
          index,
          elemento
        ) => {

          const texto =
            $(elemento)
              .text()
              .trim();


          if (texto) {

            h1Textos.push(
              texto
            );
          }
        }
      );


      // =================================================
      // META ROBOTS
      // =================================================

      const metaRobotsRaw =
        $(
          'meta[name="robots"]'
        )
          .attr(
            "content"
          );


      const metaRobots =
        normalizarRobots(
          metaRobotsRaw
        );


      // =================================================
      // CANONICAL
      // =================================================

      const canonicalHref =
        $(
          'link[rel="canonical"]'
        )
          .first()
          .attr(
            "href"
          )
          ?.trim();


      let canonical =
        null;


      if (
        canonicalHref
      ) {

        try {

          canonical =
            new URL(
              canonicalHref,
              finalUrl
            ).toString();

        } catch {

          canonical =
            canonicalHref;
        }
      }


      // =================================================
      // INDEXABLE
      // =================================================

      const noindexMeta =
        contemNoindex(
          metaRobots
        );


      const noindexHeader =
        contemNoindex(
          xRobotsTag
        );


      const explicitNoindex =
        noindexMeta ||
        noindexHeader;


      const indexable =
        !explicitNoindex;


      const indexabilityReason =
        explicitNoindex
          ? "An explicit noindex directive was detected."
          : "No explicit noindex directive was detected.";


      // =================================================
      // ROBOTS.TXT
      // =================================================

      const robots =
        await verificarRobotsTxt(
          finalUrl
        );


      // =================================================
      // SITEMAP
      // =================================================

      const sitemap =
        await verificarSitemap(
          finalUrl,
          robots
        );


      // =================================================
      // RESULT
      // =================================================

      return {

        seo: {

          title,

          metaDescription,

          h1Count:
            $("h1").length,

          h1Textos,

          erro:
            null
        },


        structuredData,


        images,


        indexability: {

          httpStatus,

          finalUrl,

          https,

          indexable,

          indexabilityReason,

          metaRobots:
            metaRobots ||
            "Not specified",

          xRobotsTag:
            xRobotsTag ||
            "Not specified",

          canonical,

          robotsTxt: {

            found:
              robots.found,

            status:
              robots.status,

            url:
              robots.url
          },

          sitemap: {

            found:
              sitemap.found,

            status:
              sitemap.status,

            url:
              sitemap.url,

            source:
              sitemap.source
          },

          erro:
            null
        }
      };

    } catch (erro) {

      if (
        erro instanceof
        ErroURLInsegura
      ) {

        throw erro;
      }


      if (
        tentativa <
        maxTentativas
      ) {

        console.log(
          "⚠️ Error analyzing page. Retrying in 2 seconds..."
        );


        await esperar(
          2000
        );


        continue;
      }


      return {

        seo: {

          title:
            null,

          metaDescription:
            null,

          h1Count:
            null,

          h1Textos:
            [],

          erro:
            erro.message
        },


        structuredData:
          structuredDataIndisponivel(
            erro.message
          ),


        images:
          imagesIndisponiveis(
            erro.message
          ),


        indexability: {

          httpStatus:
            null,

          finalUrl:
            url,

          https:
            null,

          indexable:
            null,

          indexabilityReason:
            null,

          metaRobots:
            null,

          xRobotsTag:
            null,

          canonical:
            null,

          robotsTxt:
            null,

          sitemap:
            null,

          erro:
            erro.message
        }
      };
    }
  }
}


// ======================================================
// EXPORT
// ======================================================

module.exports = {
  analisarPagina
};