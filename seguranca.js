const dns = require("dns").promises;
const net = require("net");
const ipaddr = require("ipaddr.js");


// ======================================================
// ERRO DE SEGURANÇA
// ======================================================

class ErroURLInsegura extends Error {

  constructor(mensagem) {

    super(mensagem);

    this.name = "ErroURLInsegura";
    this.codigo = "URL_INSEGURA";
  }
}


// ======================================================
// NORMALIZA URL
// ======================================================

function normalizarUrl(input) {

  if (
    typeof input !== "string" ||
    !input.trim()
  ) {

    throw new ErroURLInsegura(
      "Informe uma URL válida."
    );
  }


  let url = input.trim();


  // Se não houver protocolo,
  // usa HTTPS por padrão.

  if (
    !/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(url)
  ) {

    url = `https://${url}`;
  }


  let parsed;


  try {

    parsed = new URL(url);

  } catch {

    throw new ErroURLInsegura(
      "URL inválida."
    );
  }


  // Apenas sites HTTP/HTTPS

  if (
    parsed.protocol !== "http:" &&
    parsed.protocol !== "https:"
  ) {

    throw new ErroURLInsegura(
      "Apenas URLs HTTP e HTTPS são permitidas."
    );
  }


  // Impede URLs tipo:
  //
  // http://usuario:senha@site.com

  if (
    parsed.username ||
    parsed.password
  ) {

    throw new ErroURLInsegura(
      "URLs com usuário ou senha não são permitidas."
    );
  }


  if (!parsed.hostname) {

    throw new ErroURLInsegura(
      "Hostname inválido."
    );
  }


  // Nosso SaaS analisa websites.
  // Não existe motivo para acessar portas arbitrárias.

  if (parsed.port) {

    const portaPermitida =
      (
        parsed.protocol === "http:" &&
        parsed.port === "80"
      )
      ||
      (
        parsed.protocol === "https:" &&
        parsed.port === "443"
      );


    if (!portaPermitida) {

      throw new ErroURLInsegura(
        "Porta não permitida."
      );
    }
  }


  parsed.hash = "";


  return parsed;
}


// ======================================================
// LIMPA HOSTNAME
// ======================================================

function limparHostname(hostname) {

  return hostname
    .toLowerCase()
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .replace(/\.$/, "");
}


// ======================================================
// VERIFICA SE IP É PÚBLICO
// ======================================================

function ipEhPublico(ip) {

  if (!ipaddr.isValid(ip)) {

    return false;
  }


  let endereco =
    ipaddr.parse(ip);


  // Trata IPv4 representado dentro de IPv6

  if (
    endereco.kind() === "ipv6" &&
    endereco.isIPv4MappedAddress()
  ) {

    endereco =
      endereco.toIPv4Address();
  }


  const faixa =
    endereco.range();


  /*
    ipaddr.js classifica endereços como:

    loopback
    private
    linkLocal
    multicast
    reserved
    carrierGradeNat
    unspecified
    etc.

    Só permitimos IPs públicos normais.
  */

  return faixa === "unicast";
}


// ======================================================
// VALIDA URL CONTRA SSRF
// ======================================================

async function validarUrlPublica(input) {

  const parsed =
    normalizarUrl(input);


  const hostname =
    limparHostname(
      parsed.hostname
    );


  // ====================================================
  // HOSTNAMES INTERNOS
  // ====================================================

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {

    throw new ErroURLInsegura(
      "Endereços locais ou internos não são permitidos."
    );
  }


  // ====================================================
  // SE O HOST JÁ FOR UM IP
  // ====================================================

  if (net.isIP(hostname)) {

    if (!ipEhPublico(hostname)) {

      throw new ErroURLInsegura(
        "Endereços IP privados ou internos não são permitidos."
      );
    }


    return parsed.toString();
  }


  // ====================================================
  // RESOLVE DNS
  // ====================================================

  let enderecos;


  try {

    enderecos =
      await dns.lookup(
        hostname,
        {
          all: true,
          verbatim: true
        }
      );

  } catch {

    throw new ErroURLInsegura(
      "Não foi possível resolver o domínio informado."
    );
  }


  if (
    !enderecos ||
    enderecos.length === 0
  ) {

    throw new ErroURLInsegura(
      "O domínio não possui endereço IP válido."
    );
  }


  // IMPORTANTE:
  // Se QUALQUER IP retornado for interno,
  // bloqueamos o domínio inteiro.

  for (
    const endereco of enderecos
  ) {

    if (
      !ipEhPublico(
        endereco.address
      )
    ) {

      throw new ErroURLInsegura(
        "O domínio aponta para um endereço privado ou interno."
      );
    }
  }


  return parsed.toString();
}


// ======================================================
// FETCH SEGURO
// ======================================================

async function fetchSeguro(
  input,
  options = {}
) {

  const MAX_REDIRECTS = 3;
  const TIMEOUT_MS = 10000;


  let urlAtual =
    await validarUrlPublica(input);


  for (
    let redirect = 0;
    redirect <= MAX_REDIRECTS;
    redirect++
  ) {

    const controller =
      new AbortController();


    const timer =
      setTimeout(
        () => controller.abort(),
        TIMEOUT_MS
      );


    let resposta;


    try {

      resposta =
        await fetch(
          urlAtual,
          {
            ...options,

            // Não deixamos o fetch seguir
            // redirects automaticamente.
            //
            // Precisamos validar o novo endereço
            // antes de acessá-lo.

            redirect: "manual",

            signal:
              controller.signal
          }
        );

    } catch (erro) {

      if (
        erro.name === "AbortError"
      ) {

        throw new Error(
          "O site demorou demais para responder."
        );
      }


      throw erro;

    } finally {

      clearTimeout(timer);
    }


    // ==================================================
    // REDIRECT
    // ==================================================

    const redirectsPermitidos = [
      301,
      302,
      303,
      307,
      308
    ];


    if (
      redirectsPermitidos.includes(
        resposta.status
      )
    ) {

      if (
        redirect >= MAX_REDIRECTS
      ) {

        throw new Error(
          "O site excedeu o limite de redirects."
        );
      }


      const location =
        resposta.headers.get(
          "location"
        );


      if (!location) {

        return resposta;
      }


      // Libera conexão anterior

      try {

        await resposta.body?.cancel();

      } catch {
        // Nada a fazer
      }


      let novaUrl;


      try {

        novaUrl =
          new URL(
            location,
            urlAtual
          ).toString();

      } catch {

        throw new ErroURLInsegura(
          "O site tentou redirecionar para uma URL inválida."
        );
      }


      // CRÍTICO:
      // valida novamente depois do redirect.

      urlAtual =
        await validarUrlPublica(
          novaUrl
        );


      continue;
    }


    return resposta;
  }


  throw new Error(
    "Falha ao acessar o site."
  );
}


// ======================================================
// EXPORTS
// ======================================================

module.exports = {

  ErroURLInsegura,

  validarUrlPublica,

  fetchSeguro
};