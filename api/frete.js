// api/frete.js
// Function serverless da Vercel — calcula frete via Melhor Envio sem expor o token no navegador.
// O token fica guardado em uma variável de ambiente (MELHOR_ENVIO_TOKEN), configurada no painel da Vercel.

export default async function handler(req, res) {
  // Permite chamada só via POST
  if (req.method !== "POST") {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  const token = process.env.MELHOR_ENVIO_TOKEN;
  if (!token) {
    return res.status(500).json({ erro: "Token do Melhor Envio não configurado no servidor." });
  }

  const { cepDestino } = req.body || {};
  if (!cepDestino || !/^\d{8}$/.test(cepDestino.replace(/\D/g, ""))) {
    return res.status(400).json({ erro: "CEP inválido. Envie 8 dígitos, sem traço." });
  }

  // CEP de origem: onde a Carina despacha os produtos.
  // IMPORTANTE: troque pelo CEP real de onde ela envia (sem traço, 8 dígitos).
  const CEP_ORIGEM = "13480000"; // <-- AJUSTAR para o CEP real de envio

  const payload = {
    from: { postal_code: CEP_ORIGEM },
    to: { postal_code: cepDestino.replace(/\D/g, "") },
    // Pacote padrão para uma camiseta dobrada em envelope/caixa pequena.
    // Ajuste se o padrão de embalagem da loja for diferente.
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
      return res.status(resp.status).json({ erro: "Erro ao consultar frete", detalhe: data });
    }

    // Filtra só as opções válidas (sem erro) e simplifica o retorno pro front-end
    const opcoes = (Array.isArray(data) ? data : [])
      .filter((o) => !o.error)
      .map((o) => ({
        transportadora: o.company?.name || "—",
        servico: o.name,
        preco: o.price,
        prazoDias: o.delivery_time,
      }));

    return res.status(200).json({ opcoes });
  } catch (err) {
    return res.status(500).json({ erro: "Falha ao conectar com o Melhor Envio", detalhe: String(err) });
  }
}
