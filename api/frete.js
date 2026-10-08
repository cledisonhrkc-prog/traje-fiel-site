// api/frete.js
// Function serverless da Vercel — calcula frete via Melhor Envio com fallback automatico dos Correios.

const FRETE_ESTADOS = {
  SP: { pac: 16.90, sedex: 21.90, prazoPac: "3 a 5", prazoSedex: "1 a 2" },
  RJ: { pac: 22.90, sedex: 32.90, prazoPac: "5 a 7", prazoSedex: "2 a 3" },
  MG: { pac: 22.90, sedex: 32.90, prazoPac: "5 a 7", prazoSedex: "2 a 4" },
  ES: { pac: 24.90, sedex: 36.90, prazoPac: "6 a 8", prazoSedex: "3 a 4" },
  PR: { pac: 23.90, sedex: 35.90, prazoPac: "5 a 7", prazoSedex: "2 a 4" },
  SC: { pac: 25.90, sedex: 38.90, prazoPac: "6 a 8", prazoSedex: "3 a 4" },
  RS: { pac: 26.90, sedex: 42.90, prazoPac: "6 a 9", prazoSedex: "3 a 5" },
  DF: { pac: 27.90, sedex: 44.90, prazoPac: "6 a 8", prazoSedex: "2 a 4" },
  GO: { pac: 27.90, sedex: 45.90, prazoPac: "6 a 9", prazoSedex: "3 a 5" },
  MS: { pac: 29.90, sedex: 48.90, prazoPac: "7 a 10", prazoSedex: "3 a 5" },
  MT: { pac: 31.90, sedex: 52.90, prazoPac: "7 a 10", prazoSedex: "3 a 5" },
  BA: { pac: 29.90, sedex: 52.90, prazoPac: "7 a 11", prazoSedex: "3 a 5" },
  PE: { pac: 32.90, sedex: 58.90, prazoPac: "8 a 12", prazoSedex: "3 a 6" },
  CE: { pac: 34.90, sedex: 62.90, prazoPac: "8 a 12", prazoSedex: "3 a 6" },
  RN: { pac: 34.90, sedex: 64.90, prazoPac: "8 a 13", prazoSedex: "4 a 6" },
  PB: { pac: 34.90, sedex: 64.90, prazoPac: "8 a 13", prazoSedex: "4 a 6" },
  AL: { pac: 34.90, sedex: 62.90, prazoPac: "8 a 13", prazoSedex: "4 a 6" },
  SE: { pac: 33.90, sedex: 59.90, prazoPac: "8 a 12", prazoSedex: "4 a 6" },
  MA: { pac: 36.90, sedex: 68.90, prazoPac: "9 a 14", prazoSedex: "4 a 6" },
  PI: { pac: 35.90, sedex: 66.90, prazoPac: "9 a 14", prazoSedex: "4 a 6" },
  PA: { pac: 39.90, sedex: 76.90, prazoPac: "10 a 16", prazoSedex: "4 a 7" },
  AM: { pac: 44.90, sedex: 84.90, prazoPac: "11 a 18", prazoSedex: "4 a 7" },
  RO: { pac: 39.90, sedex: 74.90, prazoPac: "10 a 15", prazoSedex: "4 a 7" },
  AC: { pac: 46.90, sedex: 89.90, prazoPac: "12 a 20", prazoSedex: "5 a 8" },
  RR: { pac: 48.90, sedex: 92.90, prazoPac: "12 a 20", prazoSedex: "5 a 8" },
  AP: { pac: 44.90, sedex: 84.90, prazoPac: "11 a 18", prazoSedex: "5 a 8" },
  TO: { pac: 34.90, sedex: 64.90, prazoPac: "8 a 13", prazoSedex: "4 a 6" }
};

function getUfPorCep(cepClean){
  const n = parseInt((cepClean || "").slice(0, 2), 10);
  if(n >= 1 && n <= 19) return "SP";
  if(n >= 20 && n <= 28) return "RJ";
  if(n === 29) return "ES";
  if(n >= 30 && n <= 39) return "MG";
  if(n >= 40 && n <= 48) return "BA";
  if(n === 49) return "SE";
  if(n >= 50 && n <= 56) return "PE";
  if(n === 57) return "AL";
  if(n === 58) return "PB";
  if(n === 59) return "RN";
  if(n >= 60 && n <= 63) return "CE";
  if(n === 64) return "PI";
  if(n === 65) return "MA";
  if(n >= 66 && n <= 68) return "PA";
  if(n === 69){
    const sub = parseInt((cepClean || "").slice(0, 3), 10);
    if(sub === 693) return "RR";
    if(sub === 699) return "AC";
    return "AM";
  }
  if(n >= 70 && n <= 72) return "DF";
  if(n >= 73 && n <= 76) return "GO";
  if(n === 77) return "TO";
  if(n === 78) return "MT";
  if(n === 79) return "MS";
  if(n >= 80 && n <= 87) return "PR";
  if(n >= 88 && n <= 89) return "SC";
  if(n >= 90 && n <= 99) return "RS";
  return "SP";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  const { cepDestino } = req.body || {};
  const cleanCep = (cepDestino || "").replace(/\D/g, "");
  if (!cleanCep || cleanCep.length !== 8) {
    return res.status(400).json({ erro: "CEP inválido. Envie 8 dígitos, sem traço." });
  }

  const token = process.env.MELHOR_ENVIO_TOKEN;
  if (!token) {
    // Retorna tabela padrao Correios caso token do Melhor Envio nao tenha sido configurado no painel da Vercel
    const uf = getUfPorCep(cleanCep);
    const info = FRETE_ESTADOS[uf] || { pac: 26.90, sedex: 42.90, prazoPac: "6 a 9", prazoSedex: "3 a 5" };
    return res.status(200).json({
      opcoes: [
        { transportadora: "Correios", servico: "PAC", preco: info.pac, prazoDias: `${info.prazoPac} dias úteis` },
        { transportadora: "Correios", servico: "SEDEX", preco: info.sedex, prazoDias: `${info.prazoSedex} dias úteis` }
      ]
    });
  }

  const CEP_ORIGEM = "13480000";
  const payload = {
    from: { postal_code: CEP_ORIGEM },
    to: { postal_code: cleanCep },
    package: {
      height: 3,
      width: 20,
      length: 27,
      weight: 0.3,
    },
    options: {
      insurance_value: 80,
      receipt: false,
      own_hand: false,
    },
  };

  try {
    const resp = await fetch("https://www.melhorenvio.com.br/api/v2/me/shipment/calculate", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "User-Agent": "Traje Fiel (contato@trajefiel.com)",
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();
    if (!resp.ok) {
      // Fallback para tabela
      const uf = getUfPorCep(cleanCep);
      const info = FRETE_ESTADOS[uf] || { pac: 26.90, sedex: 42.90, prazoPac: "6 a 9", prazoSedex: "3 a 5" };
      return res.status(200).json({
        opcoes: [
          { transportadora: "Correios", servico: "PAC", preco: info.pac, prazoDias: `${info.prazoPac} dias úteis` },
          { transportadora: "Correios", servico: "SEDEX", preco: info.sedex, prazoDias: `${info.prazoSedex} dias úteis` }
        ]
      });
    }

    const opcoes = (Array.isArray(data) ? data : [])
      .filter((o) => !o.error)
      .map((o) => ({
        transportadora: o.company?.name || "Correios",
        servico: o.name,
        preco: parseFloat(o.price),
        prazoDias: `${o.delivery_time} dias úteis`,
      }));

    return res.status(200).json({ opcoes });
  } catch (err) {
    const uf = getUfPorCep(cleanCep);
    const info = FRETE_ESTADOS[uf] || { pac: 26.90, sedex: 42.90, prazoPac: "6 a 9", prazoSedex: "3 a 5" };
    return res.status(200).json({
      opcoes: [
        { transportadora: "Correios", servico: "PAC", preco: info.pac, prazoDias: `${info.prazoPac} dias úteis` },
        { transportadora: "Correios", servico: "SEDEX", preco: info.sedex, prazoDias: `${info.prazoSedex} dias úteis` }
      ]
    });
  }
}
