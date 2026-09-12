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

  candidatos.push(
    `${origin}/sitemap.xml`
  );

  candidatos.push(
    `${origin}/sitemap_index.xml`
  );

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

function arrayificar(
  valor
) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return [];
  }

  return Array.isArray(
    valor
  )
    ? valor
    : [
        valor
      ];
}


function textoSchema(
  valor
) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return null;
  }

  if (
    typeof valor === "string" ||
    typeof valor === "number" ||
    typeof valor === "boolean"
  ) {
    const texto =
      String(
        valor
      ).trim();

    return texto ||
      null;
  }

  if (
    typeof valor ===
    "object"
  ) {
    return (
      textoSchema(
        valor.name
      )
      ||
      textoSchema(
        valor.addressLocality
      )
      ||
      textoSchema(
        valor.addressRegion
      )
      ||
      textoSchema(
        valor["@id"]
      )
      ||
      textoSchema(
        valor.url
      )
    );
  }

  return null;
}


function normalizarTipoSchema(
  valor
) {
  if (
    typeof valor !==
    "string"
  ) {
    return null;
  }

  const limpo =
    valor.trim();

  if (
    !limpo
  ) {
    return null;
  }

  const partes =
    limpo.split(
      /[\/#]/
    );

  return (
    partes[
      partes.length - 1
    ]
      ?.trim()
    ||
    limpo
  );
}


function tiposSchemaDoObjeto(
  objeto
) {
  return arrayificar(
    objeto?.["@type"]
  )
    .map(
      normalizarTipoSchema
    )
    .filter(Boolean);
}


function extrairTipoDoAtributoScript(
  atributos
) {
  if (
    !atributos
  ) {
    return null;
  }

  const match =
    atributos.match(
      /\btype\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i
    );

  if (
    !match
  ) {
    return null;
  }

  const bruto =
    (
      match[1]
      ??
      match[2]
      ??
      match[3]
      ??
      ""
    )
      .trim()
      .toLowerCase();

  return bruto
    .split(
      ";",
      1
    )[0]
    .trim();
}


function extrairBlocosJsonLdDoHtml(
  html
) {
  const blocos =
    [];

  if (
    typeof html !==
      "string"
    ||
    !html
  ) {
    return blocos;
  }

  const regexScript =
    /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;

  let match;

  while (
    (
      match =
        regexScript.exec(
          html
        )
    ) !== null
  ) {
    const atributos =
      match[1] ||
      "";

    const tipo =
      extrairTipoDoAtributoScript(
        atributos
      );

    if (
      tipo !==
      "application/ld+json"
    ) {
      continue;
    }

    blocos.push(
      match[2] ||
      ""
    );
  }

  return blocos;
}


function coletarObjetosJsonLd(
  valor,
  objetos
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
      coletarObjetosJsonLd(
        item,
        objetos
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

  objetos.push(
    valor
  );

  for (
    const filho of
    Object.values(
      valor
    )
  ) {
    coletarObjetosJsonLd(
      filho,
      objetos
    );
  }
}


function analisarJsonLd(
  html
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

    objects:
      [],

    erro:
      null
  };

  const tipos =
    new Set();

  const objetos =
    [];

  const blocos =
    extrairBlocosJsonLdDoHtml(
      html
    );

  resultado.scriptCount =
    blocos.length;

  for (
    const bloco of blocos
  ) {
    const conteudo =
      (
        bloco ||
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

      continue;
    }

    try {
      const dados =
        JSON.parse(
          conteudo
        );

      resultado.validScripts +=
        1;

      coletarObjetosJsonLd(
        dados,
        objetos
      );

    } catch {
      resultado.invalidScripts +=
        1;
    }
  }

  for (
    const objeto of objetos
  ) {
    for (
      const tipo of
      tiposSchemaDoObjeto(
        objeto
      )
    ) {
      tipos.add(
        tipo
      );
    }
  }

  resultado.found =
    resultado.scriptCount >
    0;

  resultado.types =
    [
      ...tipos
    ];

  resultado.objects =
    objetos;

  return resultado;
}


function resumirStructuredData(
  jsonLd
) {
  return {
    found:
      jsonLd.found,

    scriptCount:
      jsonLd.scriptCount,

    validScripts:
      jsonLd.validScripts,

    invalidScripts:
      jsonLd.invalidScripts,

    types:
      jsonLd.types,

    erro:
      jsonLd.erro
  };
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

      if (
        !altExiste
      ) {
        resultado.missingAlt +=
          1;

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
// LOCAL SEO SNAPSHOT
// ======================================================

const LOCAL_BUSINESS_TYPES =
  new Set([
    "LocalBusiness",
    "AnimalShelter",
    "AutomotiveBusiness",
    "AutoBodyShop",
    "AutoDealer",
    "AutoPartsStore",
    "AutoRental",
    "AutoRepair",
    "AutoWash",
    "GasStation",
    "MotorcycleDealer",
    "MotorcycleRepair",
    "ChildCare",
    "Dentist",
    "DryCleaningOrLaundry",
    "EmergencyService",
    "FireStation",
    "Hospital",
    "PoliceStation",
    "EmploymentAgency",
    "EntertainmentBusiness",
    "AmusementPark",
    "ArtGallery",
    "Casino",
    "ComedyClub",
    "MovieTheater",
    "NightClub",
    "FinancialService",
    "AccountingService",
    "AutomatedTeller",
    "BankOrCreditUnion",
    "InsuranceAgency",
    "FoodEstablishment",
    "Bakery",
    "BarOrPub",
    "Brewery",
    "CafeOrCoffeeShop",
    "Distillery",
    "FastFoodRestaurant",
    "IceCreamShop",
    "Restaurant",
    "Winery",
    "GovernmentOffice",
    "PostOffice",
    "HealthAndBeautyBusiness",
    "BeautySalon",
    "DaySpa",
    "HairSalon",
    "HealthClub",
    "NailSalon",
    "TattooParlor",
    "HomeAndConstructionBusiness",
    "Electrician",
    "GeneralContractor",
    "HVACBusiness",
    "HousePainter",
    "Locksmith",
    "MovingCompany",
    "Plumber",
    "RoofingContractor",
    "InternetCafe",
    "LegalService",
    "Attorney",
    "Notary",
    "Library",
    "LodgingBusiness",
    "BedAndBreakfast",
    "Campground",
    "Hostel",
    "Hotel",
    "Motel",
    "Resort",
    "MedicalBusiness",
    "MedicalClinic",
    "Optician",
    "Pharmacy",
    "Physician",
    "VeterinaryCare",
    "ProfessionalService",
    "RadioStation",
    "RealEstateAgent",
    "RecyclingCenter",
    "SelfStorage",
    "ShoppingCenter",
    "SportsActivityLocation",
    "BowlingAlley",
    "ExerciseGym",
    "GolfCourse",
    "PublicSwimmingPool",
    "SkiResort",
    "SportsClub",
    "StadiumOrArena",
    "Store",
    "BikeStore",
    "BookStore",
    "ClothingStore",
    "ComputerStore",
    "ConvenienceStore",
    "DepartmentStore",
    "ElectronicsStore",
    "Florist",
    "FurnitureStore",
    "GardenStore",
    "GroceryStore",
    "HardwareStore",
    "HobbyShop",
    "HomeGoodsStore",
    "JewelryStore",
    "LiquorStore",
    "MensClothingStore",
    "MobilePhoneStore",
    "MovieRentalStore",
    "MusicStore",
    "OfficeEquipmentStore",
    "OutletStore",
    "PawnShop",
    "PetStore",
    "ShoeStore",
    "SportingGoodsStore",
    "TireShop",
    "ToyStore",
    "WholesaleStore",
    "TelevisionStation",
    "TouristInformationCenter",
    "TravelAgency"
  ]);


function entidadeEhLocalBusiness(
  entidade
) {
  return tiposSchemaDoObjeto(
    entidade
  )
    .some(
      tipo =>
        LOCAL_BUSINESS_TYPES.has(
          tipo
        )
    );
}


function entidadeEhOrganization(
  entidade
) {
  return tiposSchemaDoObjeto(
    entidade
  )
    .includes(
      "Organization"
    );
}


// ======================================================
// JSON-LD @ID CONSOLIDATION
// ======================================================

function construirIndicePorId(
  objetos
) {
  const indice =
    new Map();

  for (
    const objeto of objetos
  ) {
    if (
      !objeto ||
      typeof objeto !==
      "object"
    ) {
      continue;
    }

    const id =
      textoSchema(
        objeto["@id"]
      );

    if (
      !id
    ) {
      continue;
    }

    const existente =
      indice.get(
        id
      );

    if (
      !existente
    ) {
      indice.set(
        id,
        objeto
      );

      continue;
    }

    const tipos =
      [
        ...new Set([
          ...tiposSchemaDoObjeto(
            existente
          ),

          ...tiposSchemaDoObjeto(
            objeto
          )
        ])
      ];

    indice.set(
      id,
      {
        ...existente,
        ...objeto,

        ...(
          tipos.length >
          0
            ? {
                "@type":
                  tipos
              }
            : {}
        )
      }
    );
  }

  return indice;
}


function resolverReferencia(
  valor,
  indicePorId
) {
  if (
    !valor ||
    typeof valor !==
      "object" ||
    Array.isArray(
      valor
    )
  ) {
    return valor;
  }

  const id =
    textoSchema(
      valor["@id"]
    );

  if (
    !id
  ) {
    return valor;
  }

  const resolvido =
    indicePorId.get(
      id
    );

  if (
    !resolvido ||
    resolvido === valor
  ) {
    return valor;
  }

  return {
    ...resolvido,
    ...valor
  };
}


// ======================================================
// LOCAL BUSINESS FIELD EXTRACTORS
// ======================================================

function valoresTexto(
  valor
) {
  return [
    ...new Set(
      arrayificar(
        valor
      )
        .map(
          textoSchema
        )
        .filter(Boolean)
    )
  ];
}


function extrairTelefonesEntidade(
  entidade,
  indicePorId
) {
  const telefones =
    [
      ...valoresTexto(
        entidade?.telephone
      )
    ];

  for (
    const pontoBruto of
    arrayificar(
      entidade?.contactPoint
    )
  ) {
    const ponto =
      resolverReferencia(
        pontoBruto,
        indicePorId
      );

    telefones.push(
      ...valoresTexto(
        ponto?.telephone
      )
    );
  }

  return [
    ...new Set(
      telefones
        .map(
          item =>
            item.trim()
        )
        .filter(Boolean)
    )
  ];
}


function extrairEndereco(
  entidade,
  indicePorId
) {
  for (
    const candidatoBruto of
    arrayificar(
      entidade?.address
    )
  ) {
    const candidato =
      resolverReferencia(
        candidatoBruto,
        indicePorId
      );

    if (
      typeof candidato ===
      "string"
    ) {
      const formatted =
        candidato.trim();

      if (
        formatted
      ) {
        return {
          found:
            true,

          streetAddress:
            null,

          locality:
            null,

          region:
            null,

          postalCode:
            null,

          country:
            null,

          formatted
        };
      }

      continue;
    }

    if (
      !candidato ||
      typeof candidato !==
      "object"
    ) {
      continue;
    }

    const streetAddress =
      textoSchema(
        candidato.streetAddress
      );

    const locality =
      textoSchema(
        candidato.addressLocality
      );

    const region =
      textoSchema(
        candidato.addressRegion
      );

    const postalCode =
      textoSchema(
        candidato.postalCode
      );

    const country =
      textoSchema(
        candidato.addressCountry
      );

    const formatted =
      [
        streetAddress,
        locality,
        region,
        postalCode,
        country
      ]
        .filter(Boolean)
        .join(
          ", "
        )
      ||
      textoSchema(
        candidato.name
      );

    if (
      formatted
    ) {
      return {
        found:
          true,

        streetAddress,

        locality,

        region,

        postalCode,

        country,

        formatted
      };
    }
  }

  return {
    found:
      false,

    streetAddress:
      null,

    locality:
      null,

    region:
      null,

    postalCode:
      null,

    country:
      null,

    formatted:
      null
  };
}


function resumirOpeningHoursSpecification(
  valor,
  indicePorId
) {
  const resultado =
    [];

  for (
    const specBruto of
    arrayificar(
      valor
    )
  ) {
    const spec =
      resolverReferencia(
        specBruto,
        indicePorId
      );

    if (
      !spec ||
      typeof spec !==
      "object"
    ) {
      continue;
    }

    const dias =
      arrayificar(
        spec.dayOfWeek
      )
        .map(
          item =>
            resolverReferencia(
              item,
              indicePorId
            )
        )
        .map(
          textoSchema
        )
        .filter(Boolean)
        .map(
          dia => {
            const partes =
              dia.split(
                /[\/#]/
              );

            return (
              partes[
                partes.length - 1
              ]
              ||
              dia
            );
          }
        );

    const opens =
      textoSchema(
        spec.opens
      );

    const closes =
      textoSchema(
        spec.closes
      );

    const horario =
      opens &&
      closes
        ? `${opens}-${closes}`
        : opens
          ? `Opens ${opens}`
          : closes
            ? `Closes ${closes}`
            : null;

    const resumo =
      [
        dias.length >
        0
          ? dias.join(
              ", "
            )
          : null,

        horario
      ]
        .filter(Boolean)
        .join(
          " · "
        );

    if (
      resumo
    ) {
      resultado.push(
        resumo
      );
    }
  }

  return [
    ...new Set(
      resultado
    )
  ];
}


function extrairOpeningHours(
  entidade,
  indicePorId
) {
  const values =
    [
      ...valoresTexto(
        entidade?.openingHours
      ),

      ...resumirOpeningHoursSpecification(
        entidade?.openingHoursSpecification,
        indicePorId
      )
    ];

  const unicos =
    [
      ...new Set(
        values
      )
    ];

  return {
    found:
      unicos.length >
      0,

    values:
      unicos
  };
}


function extrairAreaServed(
  entidade,
  indicePorId
) {
  const values =
    arrayificar(
      entidade?.areaServed
    )
      .map(
        item =>
          resolverReferencia(
            item,
            indicePorId
          )
      )
      .map(
        textoSchema
      )
      .filter(Boolean);

  const unicos =
    [
      ...new Set(
        values
      )
    ];

  return {
    found:
      unicos.length >
      0,

    values:
      unicos
  };
}


function extrairGeo(
  entidade,
  indicePorId
) {
  for (
    const geoBruto of
    arrayificar(
      entidade?.geo
    )
  ) {
    const geo =
      resolverReferencia(
        geoBruto,
        indicePorId
      );

    if (
      !geo ||
      typeof geo !==
      "object"
    ) {
      continue;
    }

    const latitude =
      Number(
        geo.latitude
      );

    const longitude =
      Number(
        geo.longitude
      );

    if (
      Number.isFinite(
        latitude
      )
      &&
      Number.isFinite(
        longitude
      )
      &&
      latitude >=
      -90
      &&
      latitude <=
      90
      &&
      longitude >=
      -180
      &&
      longitude <=
      180
    ) {
      return {
        found:
          true,

        latitude,

        longitude
      };
    }
  }

  return {
    found:
      false,

    latitude:
      null,

    longitude:
      null
  };
}


function extrairSameAs(
  entidade
) {
  const urls =
    valoresTexto(
      entidade?.sameAs
    )
      .filter(
        valor => {
          try {
            const url =
              new URL(
                valor
              );

            return (
              url.protocol ===
              "http:"
              ||
              url.protocol ===
              "https:"
            );

          } catch {
            return false;
          }
        }
      );

  return {
    count:
      urls.length,

    urls:
      urls.slice(
        0,
        10
      )
  };
}


// ======================================================
// CHOOSE BEST LOCAL ENTITY
// ======================================================

function pontuarEntidadeLocal(
  entidade,
  indicePorId
) {
  let score =
    0;

  const tipos =
    tiposSchemaDoObjeto(
      entidade
    );

  if (
    tipos.some(
      tipo =>
        tipo !==
          "LocalBusiness"
        &&
        LOCAL_BUSINESS_TYPES.has(
          tipo
        )
    )
  ) {
    score +=
      2;
  }

  if (
    textoSchema(
      entidade?.name
    )
    ||
    textoSchema(
      entidade?.legalName
    )
  ) {
    score +=
      2;
  }

  if (
    extrairTelefonesEntidade(
      entidade,
      indicePorId
    ).length >
    0
  ) {
    score +=
      2;
  }

  if (
    extrairEndereco(
      entidade,
      indicePorId
    ).found
  ) {
    score +=
      3;
  }

  if (
    extrairOpeningHours(
      entidade,
      indicePorId
    ).found
  ) {
    score +=
      1;
  }

  if (
    extrairAreaServed(
      entidade,
      indicePorId
    ).found
  ) {
    score +=
      1;
  }

  if (
    extrairGeo(
      entidade,
      indicePorId
    ).found
  ) {
    score +=
      1;
  }

  return score;
}


function escolherEntidadeLocal(
  objetos,
  indicePorId
) {
  const entidades =
    [];

  const vistos =
    new Set();

  for (
    const objeto of objetos
  ) {
    if (
      !objeto ||
      typeof objeto !==
      "object"
    ) {
      continue;
    }

    const id =
      textoSchema(
        objeto["@id"]
      );

    const consolidado =
      id &&
      indicePorId.has(
        id
      )
        ? indicePorId.get(
            id
          )
        : objeto;

    if (
      vistos.has(
        consolidado
      )
    ) {
      continue;
    }

    vistos.add(
      consolidado
    );

    entidades.push(
      consolidado
    );
  }

  const ordenar =
    lista =>
      [
        ...lista
      ]
        .sort(
          (
            a,
            b
          ) =>
            pontuarEntidadeLocal(
              b,
              indicePorId
            )
            -
            pontuarEntidadeLocal(
              a,
              indicePorId
            )
        )[0];

  const locais =
    entidades.filter(
      entidadeEhLocalBusiness
    );

  if (
    locais.length >
    0
  ) {
    return {
      entidade:
        ordenar(
          locais
        ),

      source:
        "local_business"
    };
  }

  const organizations =
    entidades.filter(
      entidadeEhOrganization
    );

  if (
    organizations.length >
    0
  ) {
    return {
      entidade:
        ordenar(
          organizations
        ),

      source:
        "organization"
    };
  }

  return {
    entidade:
      null,

    source:
      null
  };
}


// ======================================================
// CLICK TO CALL
// ======================================================

function analisarClickToCall(
  $
) {
  let count =
    0;

  const phones =
    [];

  $("a[href]").each(
    (
      index,
      elemento
    ) => {

      const href =
        $(elemento)
          .attr(
            "href"
          )
          ?.trim();

      if (
        !href ||
        !/^tel:/i.test(
          href
        )
      ) {
        return;
      }

      count +=
        1;

      let telefone =
        href
          .replace(
            /^tel:/i,
            ""
          )
          .trim();

      try {
        telefone =
          decodeURIComponent(
            telefone
          );

      } catch {
        // Keep original tel value.
      }

      if (
        telefone
      ) {
        phones.push(
          telefone
        );
      }
    }
  );

  return {
    count,

    phones:
      [
        ...new Set(
          phones
        )
      ]
        .slice(
          0,
          10
        )
  };
}


// ======================================================
// GOOGLE MAPS
// ======================================================

function ehUrlGoogleMaps(
  valor,
  finalUrl
) {
  if (
    !valor
  ) {
    return false;
  }

  try {
    const url =
      new URL(
        valor,
        finalUrl
      );

    const host =
      url.hostname
        .toLowerCase();

    const path =
      url.pathname
        .toLowerCase();

    if (
      host ===
      "maps.app.goo.gl"
    ) {
      return true;
    }

    if (
      host ===
      "goo.gl"
      &&
      path.startsWith(
        "/maps"
      )
    ) {
      return true;
    }

    const googleHost =
      /^(?:[a-z0-9-]+\.)*google\.[a-z.]+$/i
        .test(
          host
        );

    return (
      googleHost
      &&
      (
        path.startsWith(
          "/maps"
        )
        ||
        host.startsWith(
          "maps.google."
        )
      )
    );

  } catch {
    return false;
  }
}


function analisarGoogleMaps(
  $,
  finalUrl
) {
  let count =
    0;

  const urls =
    [];

  const candidatos =
    [
      [
        "a[href]",
        "href"
      ],

      [
        "iframe[src]",
        "src"
      ]
    ];

  for (
    const [
      selector,
      atributo
    ]
    of candidatos
  ) {
    $(selector).each(
      (
        index,
        elemento
      ) => {

        const valor =
          $(elemento)
            .attr(
              atributo
            )
            ?.trim();

        if (
          !ehUrlGoogleMaps(
            valor,
            finalUrl
          )
        ) {
          return;
        }

        count +=
          1;

        try {
          urls.push(
            new URL(
              valor,
              finalUrl
            ).toString()
          );

        } catch {
          if (
            valor
          ) {
            urls.push(
              valor
            );
          }
        }
      }
    );
  }

  return {
    found:
      count >
      0,

    count,

    urls:
      [
        ...new Set(
          urls
        )
      ]
        .slice(
          0,
          5
        )
  };
}


// ======================================================
// LOCALITY SIGNALS
// ======================================================

function normalizarParaComparacao(
  valor
) {
  if (
    !valor
  ) {
    return "";
  }

  return String(
    valor
  )
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(
      /\./g,
      ""
    )
    .replace(
      /[^a-z0-9]+/g,
      " "
    )
    .trim()
    .replace(
      /\s+/g,
      " "
    );
}


function contemTermoLocal(
  texto,
  termo
) {
  const textoNormalizado =
    normalizarParaComparacao(
      texto
    );

  const termoNormalizado =
    normalizarParaComparacao(
      termo
    );

  if (
    !textoNormalizado ||
    !termoNormalizado
  ) {
    return null;
  }

  return (
    ` ${textoNormalizado} `
      .includes(
        ` ${termoNormalizado} `
      )
  );
}


function analisarSinaisLocalidade(
  title,
  h1Textos,
  endereco
) {
  const h1Combinado =
    Array.isArray(
      h1Textos
    )
      ? h1Textos.join(
          " "
        )
      : "";

  const locality =
    endereco?.locality ||
    null;

  const region =
    endereco?.region ||
    null;

  return {
    locality,

    region,

    localityInTitle:
      locality
        ? contemTermoLocal(
            title,
            locality
          )
        : null,

    localityInH1:
      locality
        ? contemTermoLocal(
            h1Combinado,
            locality
          )
        : null,

    regionInTitle:
      region
        ? contemTermoLocal(
            title,
            region
          )
        : null,

    regionInH1:
      region
        ? contemTermoLocal(
            h1Combinado,
            region
          )
        : null
  };
}


// ======================================================
// LOCAL SEO ANALYZER
// ======================================================

function analisarLocalSeo(
  $,
  finalUrl,
  title,
  h1Textos,
  jsonLd
) {
  const objetos =
    Array.isArray(
      jsonLd?.objects
    )
      ? jsonLd.objects
      : [];

  const indicePorId =
    construirIndicePorId(
      objetos
    );

  const objetosConsolidados =
    objetos.map(
      objeto => {

        if (
          !objeto ||
          typeof objeto !==
          "object"
        ) {
          return objeto;
        }

        const id =
          textoSchema(
            objeto["@id"]
          );

        return (
          id &&
          indicePorId.has(
            id
          )
            ? indicePorId.get(
                id
              )
            : objeto
        );
      }
    );

  const localBusinessNodes =
    objetosConsolidados.filter(
      entidadeEhLocalBusiness
    );

  const localBusinessTypes =
    [
      ...new Set(
        localBusinessNodes
          .flatMap(
            tiposSchemaDoObjeto
          )
          .filter(
            tipo =>
              LOCAL_BUSINESS_TYPES.has(
                tipo
              )
          )
      )
    ];

  const organizationFound =
    objetosConsolidados.some(
      entidadeEhOrganization
    );

  const {
    entidade,
    source
  } =
    escolherEntidadeLocal(
      objetosConsolidados,
      indicePorId
    );

  const businessName =
    entidade
      ? (
          textoSchema(
            entidade.name
          )
          ||
          textoSchema(
            entidade.legalName
          )
        )
      : null;

  const schemaPhones =
    entidade
      ? extrairTelefonesEntidade(
          entidade,
          indicePorId
        )
      : [];

  const address =
    extrairEndereco(
      entidade,
      indicePorId
    );

  const openingHours =
    entidade
      ? extrairOpeningHours(
          entidade,
          indicePorId
        )
      : {
          found:
            false,

          values:
            []
        };

  const areaServed =
    entidade
      ? extrairAreaServed(
          entidade,
          indicePorId
        )
      : {
          found:
            false,

          values:
            []
        };

  const geo =
    entidade
      ? extrairGeo(
          entidade,
          indicePorId
        )
      : {
          found:
            false,

          latitude:
            null,

          longitude:
            null
        };

  const sameAs =
    entidade
      ? extrairSameAs(
          entidade
        )
      : {
          count:
            0,

          urls:
            []
        };

  return {
    schema: {
      localBusinessFound:
        localBusinessNodes.length >
        0,

      localBusinessTypes,

      organizationFound,

      selectedSource:
        source,

      selectedEntityTypes:
        entidade
          ? tiposSchemaDoObjeto(
              entidade
            )
          : []
    },

    businessName,

    schemaPhones,

    clickToCall:
      analisarClickToCall(
        $
      ),

    address,

    openingHours,

    areaServed,

    geo,

    googleMaps:
      analisarGoogleMaps(
        $,
        finalUrl
      ),

    sameAs,

    localitySignals:
      analisarSinaisLocalidade(
        title,
        h1Textos,
        address
      ),

    erro:
      null
  };
}


function localSeoIndisponivel(
  mensagem = null
) {
  return {
    schema: {
      localBusinessFound:
        false,

      localBusinessTypes:
        [],

      organizationFound:
        false,

      selectedSource:
        null,

      selectedEntityTypes:
        []
    },

    businessName:
      null,

    schemaPhones:
      [],

    clickToCall: {
      count:
        0,

      phones:
        []
    },

    address: {
      found:
        false,

      streetAddress:
        null,

      locality:
        null,

      region:
        null,

      postalCode:
        null,

      country:
        null,

      formatted:
        null
    },

    openingHours: {
      found:
        false,

      values:
        []
    },

    areaServed: {
      found:
        false,

      values:
        []
    },

    geo: {
      found:
        false,

      latitude:
        null,

      longitude:
        null
    },

    googleMaps: {
      found:
        false,

      count:
        0,

      urls:
        []
    },

    sameAs: {
      count:
        0,

      urls:
        []
    },

    localitySignals: {
      locality:
        null,

      region:
        null,

      localityInTitle:
        null,

      localityInH1:
        null,

      regionInTitle:
        null,

      regionInH1:
        null
    },

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

          localSeo:
            localSeoIndisponivel(
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


      // =================================================
      // HTML
      // =================================================

      const html =
        await lerTextoLimitado(
          resposta,
          2000000
        );

      const $ =
        cheerio.load(
          html
        );


      // =================================================
      // STRUCTURED DATA / JSON-LD
      // =================================================

      const jsonLd =
        analisarJsonLd(
          html
        );

      const structuredData =
        resumirStructuredData(
          jsonLd
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
      // LOCAL SEO SNAPSHOT
      // =================================================

      const localSeo =
        analisarLocalSeo(
          $,
          finalUrl,
          title,
          h1Textos,
          jsonLd
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

        localSeo,

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

        localSeo:
          localSeoIndisponivel(
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