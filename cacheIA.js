const crypto = require("crypto");


// ======================================================
// CONFIG
// ======================================================

// Cache dura 30 minutos.

const CACHE_TTL_MS =
  30 * 60 * 1000;


// Evita crescimento infinito em memória.

const MAX_CACHE_ENTRIES =
  100;


// ======================================================
// CACHE
// ======================================================

const cacheIA =
  new Map();


// ======================================================
// GENERATE KEY
// ======================================================

function gerarChave(
  url,
  findings
) {

  const conteudo =
    JSON.stringify({
      url,
      findings
    });


  return crypto
    .createHash("sha256")
    .update(conteudo)
    .digest("hex");
}


// ======================================================
// CLEAN EXPIRED
// ======================================================

function limparExpirados() {

  const agora =
    Date.now();


  for (
    const [
      chave,
      item
    ] of cacheIA
  ) {

    if (
      agora >
      item.expiraEm
    ) {

      cacheIA.delete(
        chave
      );
    }
  }
}


// ======================================================
// GET
// ======================================================

function obterCacheIA(
  url,
  findings
) {

  limparExpirados();


  const chave =
    gerarChave(
      url,
      findings
    );


  const item =
    cacheIA.get(
      chave
    );


  if (!item) {

    return null;
  }


  if (
    Date.now() >
    item.expiraEm
  ) {

    cacheIA.delete(
      chave
    );


    return null;
  }


  return item.valor;
}


// ======================================================
// SAVE
// ======================================================

function salvarCacheIA(
  url,
  findings,
  valor
) {

  limparExpirados();


  // Remove o item mais antigo
  // caso o cache fique cheio.

  if (
    cacheIA.size >=
    MAX_CACHE_ENTRIES
  ) {

    const primeiraChave =
      cacheIA
        .keys()
        .next()
        .value;


    if (primeiraChave) {

      cacheIA.delete(
        primeiraChave
      );
    }
  }


  const chave =
    gerarChave(
      url,
      findings
    );


  cacheIA.set(
    chave,
    {

      valor,

      expiraEm:
        Date.now() +
        CACHE_TTL_MS
    }
  );
}


// ======================================================
// INFO
// ======================================================

function tamanhoCacheIA() {

  limparExpirados();

  return cacheIA.size;
}


// ======================================================
// EXPORT
// ======================================================

module.exports = {

  obterCacheIA,

  salvarCacheIA,

  tamanhoCacheIA
};