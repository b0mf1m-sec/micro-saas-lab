
const dns = require("node:dns").promises;
const net = require("node:net");
const ipaddr = require("ipaddr.js");
const { Agent, fetch: undiciFetch } = require("undici");

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
  if (typeof input !== "string" || !input.trim()) {
    throw new ErroURLInsegura("Informe uma URL válida.");
  }

  let url = input.trim();

  // HTTPS por padrão quando não há protocolo.
  if (!/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(url)) {
    url = `https://${url}`;
  }

  let parsed;

  try {
    parsed = new URL(url);
  } catch {
    throw new ErroURLInsegura("URL inválida.");
  }

  if (
    parsed.protocol !== "http:" &&
    parsed.protocol !== "https:"
  ) {
    throw new ErroURLInsegura(
      "Apenas URLs HTTP e HTTPS são permitidas."
    );
  }

  if (parsed.username || parsed.password) {
    throw new ErroURLInsegura(
      "URLs com usuário ou senha não são permitidas."
    );
  }

  if (!parsed.hostname) {
    throw new ErroURLInsegura("Hostname inválido.");
  }

  // A URL API normaliza as portas padrão 80 e 443.
  if (parsed.port) {
    throw new ErroURLInsegura("Porta não permitida.");
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
  if (!net.isIP(ip) || !ipaddr.isValid(ip)) {
    return false;
  }

  let endereco = ipaddr.parse(ip);

  // IPv4 representado dentro de IPv6.
  if (
    endereco.kind() === "ipv6" &&
    endereco.isIPv4MappedAddress()
  ) {
    endereco = endereco.toIPv4Address();
  }

  return endereco.range() === "unicast";
}

// ======================================================
// RESOLVE E VALIDA URL CONTRA SSRF
// ======================================================

async function resolverUrlPublica(input) {
  const parsed = normalizarUrl(input);
  const hostname = limparHostname(parsed.hostname);

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

  // IP literal: validar e fixar esse mesmo endereço.
  if (net.isIP(hostname)) {
    if (!ipEhPublico(hostname)) {
      throw new ErroURLInsegura(
        "Endereços IP privados ou internos não são permitidos."
      );
    }

    return {
      url: parsed.toString(),
      hostname,
      enderecos: [
        {
          address: hostname,
          family: net.isIP(hostname)
        }
      ]
    };
  }

  let enderecos;

  try {
    enderecos = await dns.lookup(hostname, {
      all: true,
      verbatim: true
    });
  } catch {
    throw new ErroURLInsegura(
      "Não foi possível resolver o domínio informado."
    );
  }

  if (!enderecos || enderecos.length === 0) {
    throw new ErroURLInsegura(
      "O domínio não possui endereço IP válido."
    );
  }

  // Bloqueia o domínio inteiro se algum resultado
  // DNS apontar para endereço não público.
  for (const endereco of enderecos) {
    if (!ipEhPublico(endereco.address)) {
      throw new ErroURLInsegura(
        "O domínio aponta para um endereço privado ou interno."
      );
    }
  }

  return {
    url: parsed.toString(),
    hostname,
    enderecos: enderecos.map(({ address, family }) => ({
      address,
      family
    }))
  };
}

async function validarUrlPublica(input) {
  const resultado = await resolverUrlPublica(input);
  return resultado.url;
}

// ======================================================
// DNS FIXADO AOS IPs JÁ VALIDADOS
// ======================================================

// O Undici usa este lookup no momento da conexão.
// Assim, não faz uma nova consulta DNS livre que possa
// retornar um IP diferente do que foi validado.

function criarLookupFixado(enderecos) {
  return function lookupFixado(hostname, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }

    options = options || {};

    const familiaSolicitada = options.family || 0;

    let candidatos = enderecos.filter((endereco) => {
      return (
        familiaSolicitada === 0 ||
        endereco.family === familiaSolicitada
      );
    });

    if (candidatos.length === 0) {
      const erro = new Error(
        "Não há endereço validado compatível com a conexão."
      );

      erro.code = "ENOTFOUND";
      callback(erro);
      return;
    }

    // O modo all exige uma lista de endereços.
    if (options.all) {
      callback(
        null,
        candidatos.map(({ address, family }) => ({
          address,
          family
        }))
      );
      return;
    }

    const escolhido = candidatos[0];

    callback(
      null,
      escolhido.address,
      escolhido.family
    );
  };
}

// ======================================================
// FETCH SEGURO
// ======================================================

async function fetchSeguro(input, options = {}) {
  const MAX_REDIRECTS = 3;
  const TIMEOUT_MS = 10000;

  let destino = await resolverUrlPublica(input);

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
    const controller = new AbortController();

    const timer = setTimeout(() => {
      controller.abort();
    }, TIMEOUT_MS);

    // Um Agent exclusivo por destino validado evita
    // reutilizar um pool com regras DNS de outro destino.
    const dispatcher = new Agent({
      connect: {
        lookup: criarLookupFixado(destino.enderecos)
      }
    });

    let resposta;

    try {
      resposta = await undiciFetch(destino.url, {
        ...options,

        // Não permitir que o cliente siga redirects sozinho.
        redirect: "manual",

        // Impede que options substitua o dispatcher seguro.
        dispatcher,

        // Mantém o timeout controlado por esta função.
        signal: controller.signal
      });

      // Inicia o encerramento do Agent. O Undici termina
      // de liberar seus recursos quando o corpo da resposta
      // for consumido ou cancelado.
      void dispatcher.close().catch(() => {});
    } catch (erro) {
      try {
        await dispatcher.destroy();
      } catch {
        // Nada a fazer.
      }

      if (erro.name === "AbortError") {
        throw new Error(
          "O site demorou demais para responder."
        );
      }

      throw erro;
    } finally {
      clearTimeout(timer);
    }

    const redirectsPermitidos = [301, 302, 303, 307, 308];

    if (!redirectsPermitidos.includes(resposta.status)) {
      return resposta;
    }

    if (redirect >= MAX_REDIRECTS) {
      try {
        await resposta.body?.cancel();
      } catch {
        // Nada a fazer.
      }

      throw new Error(
        "O site excedeu o limite de redirects."
      );
    }

    const location = resposta.headers.get("location");

    if (!location) {
      return resposta;
    }

    try {
      await resposta.body?.cancel();
    } catch {
      // Nada a fazer.
    }

    let novaUrl;

    try {
      novaUrl = new URL(location, destino.url).toString();
    } catch {
      throw new ErroURLInsegura(
        "O site tentou redirecionar para uma URL inválida."
      );
    }

    // Cada redirecionamento passa pela mesma validação DNS.
    // A próxima conexão ficará fixada aos IPs recém-validados.
    destino = await resolverUrlPublica(novaUrl);
  }

  throw new Error("Falha ao acessar o site.");
}

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  ErroURLInsegura,
  validarUrlPublica,
  fetchSeguro
};
