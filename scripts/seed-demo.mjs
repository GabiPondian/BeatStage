/**
 * Seed de demonstração do BeatStage.
 *
 * Cria dados REAIS via API (nada é injetado direto no banco):
 * músicos, banda, repertório, equipamentos, ensaios, eventos, agenda e feedback.
 * Use apenas em ambiente de desenvolvimento. Credenciais: senha "demo12345".
 *
 * Uso: node scripts/seed-demo.mjs
 */

const API = process.env.BEATSTAGE_API ?? "http://127.0.0.1:3000/api";
const SENHA = "demo12345";

function isoDate(offsetDays) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function call(path, { method = "GET", body, token } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(
      `${method} ${path} → ${response.status} ${data?.mensagem ?? ""}`
    );
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

async function login(email) {
  const data = await call("/auth/login", {
    method: "POST",
    body: { email, senha: SENHA }
  });
  return data.token;
}

async function ensureUser({ nome, email, cargo }) {
  try {
    await call("/musicos", {
      method: "POST",
      body: { nome, email, senha: SENHA, cargo }
    });
    console.log(`  + músico ${nome}`);
  } catch (error) {
    if (error.status !== 409) throw error;
    console.log(`  = músico ${nome} já existe`);
  }

  const token = await login(email);
  const perfil = await call("/musicos/perfil", { token });
  return { ...perfil, token };
}

async function main() {
  console.log(`Semeando dados em ${API}`);

  const manoel = await ensureUser({
    nome: "Manoel Oliveira",
    email: "manoel@beatstage.demo",
    cargo: "Guitarrista"
  });
  const marina = await ensureUser({
    nome: "Marina Costa",
    email: "marina@beatstage.demo",
    cargo: "Vocalista"
  });
  const lucas = await ensureUser({
    nome: "Lucas Prado",
    email: "lucas@beatstage.demo",
    cargo: "Guitarrista"
  });
  const rafael = await ensureUser({
    nome: "Rafael Nunes",
    email: "rafael@beatstage.demo",
    cargo: "Baterista"
  });
  const beatriz = await ensureUser({
    nome: "Beatriz Lima",
    email: "beatriz@beatstage.demo",
    cargo: "Tecladista"
  });

  const tokenLider = manoel.token;
  const membros = [marina, lucas, rafael, beatriz];

  let bandas = await call("/bandas", { token: tokenLider });
  let banda = bandas.find((item) => item.nome === "Aurora Elétrica");

  if (!banda) {
    const resposta = await call("/bandas", {
      method: "POST",
      token: tokenLider,
      body: {
        nome: "Aurora Elétrica",
        descricao:
          "Rock autoral com pitadas de pop e MPB. Uma banda que transforma o caos em espetáculo.",
        idLider: manoel.idMusico,
        idMembros: membros.map((musico) => musico.idMusico)
      }
    });
    banda = resposta.banda;
    console.log(`  + banda ${banda.nome} (código ${banda.codigoConvite})`);
  } else {
    console.log(`  = banda ${banda.nome} já existe (código ${banda.codigoConvite})`);
  }

  let repertorios = await call("/repertorios", { token: tokenLider });
  const doBanda = repertorios.filter((item) => item.idBanda === banda.idBanda);

  if (doBanda.length === 0) {
    const musicas = [
      {
        musica: "Aonde Quer Que Eu Vá",
        tom: "Bb",
        duracaoSegundos: 234,
        observacao: "Abre o show. Entrada de guitarra limpa.",
        funcoes: { [manoel.idMusico]: "Guitarra solo", [marina.idMusico]: "Voz principal", [lucas.idMusico]: "Guitarra base", [rafael.idMusico]: "Bateria", [beatriz.idMusico]: "Teclado" }
      },
      {
        musica: "O Sol",
        tom: "G",
        duracaoSegundos: 198,
        observacao: "Refrão em uníssono com a plateia.",
        funcoes: { [marina.idMusico]: "Voz principal", [manoel.idMusico]: "Guitarra", [lucas.idMusico]: "Guitarra base", [rafael.idMusico]: "Bateria" }
      },
      {
        musica: "Tempo Perdido",
        tom: "Em",
        duracaoSegundos: 226,
        observacao: "Puxa o público para o refrão final.",
        funcoes: { [manoel.idMusico]: "Guitarra solo", [marina.idMusico]: "Voz principal", [rafael.idMusico]: "Bateria", [lucas.idMusico]: "Baixo" }
      },
      {
        musica: "Exagerado",
        tom: "C",
        duracaoSegundos: 210,
        observacao: "Versão mais lenta, com teclado em destaque.",
        funcoes: { [marina.idMusico]: "Voz principal", [beatriz.idMusico]: "Teclado", [manoel.idMusico]: "Guitarra" }
      },
      {
        musica: "Como É Grande o Meu Amor por Você",
        tom: "F",
        duracaoSegundos: 255,
        observacao: "Balada. Solo de guitarra no segundo refrão.",
        funcoes: { [marina.idMusico]: "Voz principal", [manoel.idMusico]: "Guitarra solo", [beatriz.idMusico]: "Teclado", [rafael.idMusico]: "Bateria" }
      },
      {
        musica: "Proibida pra Mim",
        tom: "A",
        duracaoSegundos: 182,
        observacao: "Entrada direta, sem contagem.",
        funcoes: { [manoel.idMusico]: "Guitarra", [marina.idMusico]: "Voz principal", [lucas.idMusico]: "Guitarra base", [rafael.idMusico]: "Bateria" }
      },
      {
        musica: "Dias de Luta, Dias de Glória",
        tom: "Dm",
        duracaoSegundos: 205,
        observacao: "Participação do público no refrão.",
        funcoes: { [manoel.idMusico]: "Guitarra solo", [marina.idMusico]: "Voz principal", [beatriz.idMusico]: "Teclado", [rafael.idMusico]: "Bateria" }
      },
      {
        musica: "Céu Azul",
        tom: "C#m",
        duracaoSegundos: 240,
        observacao: "Encerramento. Solta a guitarra no final.",
        funcoes: { [manoel.idMusico]: "Guitarra solo", [marina.idMusico]: "Voz principal", [lucas.idMusico]: "Guitarra base", [rafael.idMusico]: "Bateria", [beatriz.idMusico]: "Teclado" }
      }
    ];

    for (const musica of musicas) {
      await call("/repertorios", {
        method: "POST",
        token: tokenLider,
        body: {
          idBanda: banda.idBanda,
          musica: musica.musica,
          tom: musica.tom,
          duracaoSegundos: musica.duracaoSegundos,
          observacao: musica.observacao,
          musicos: Object.entries(musica.funcoes).map(([idMusico, funcaoMusico]) => ({
            idMusico: Number(idMusico),
            funcaoMusico
          }))
        }
      });
    }
    console.log(`  + ${musicas.length} músicas no repertório`);
  } else {
    console.log(`  = repertório com ${doBanda.length} músicas já existe`);
  }

  let equipamentos = await call("/equipamentos", { token: tokenLider });
  const equipamentosDaBanda = equipamentos.filter(
    (item) => item.idBanda === banda.idBanda
  );

  if (equipamentosDaBanda.length === 0) {
    const itens = [
      { nome: "Guitarra Fender Stratocaster", estado: "PROPRIO", responsavel: "Manoel Oliveira", descricao: "Guitarra principal dos shows, cordas .010." },
      { nome: "Amplificador Marshall", estado: "PROPRIO", responsavel: "Lucas Prado", descricao: "Combo 100W, usado nos ensaios e shows." },
      { nome: "Bateria Pearl Export", estado: "EMPRESTADO", responsavel: "Rafael Nunes", descricao: "Emprestada pelo Estúdio Central. Devolver após a temporada." },
      { nome: "Teclado Roland Juno", estado: "PROPRIO", responsavel: "Beatriz Lima", descricao: "Com suporte e pedal de sustain." },
      { nome: "Mesa de som Behringer", estado: "EMPRESTADO", responsavel: "Estúdio Central", descricao: "12 canais, para eventos menores." }
    ];

    for (const item of itens) {
      await call("/equipamentos", {
        method: "POST",
        token: tokenLider,
        body: { ...item, idBanda: banda.idBanda }
      });
    }
    console.log(`  + ${itens.length} equipamentos`);
  }

  let ensaios = await call("/ensaios", { token: tokenLider });
  const ensaiosDaBanda = ensaios.filter((item) => item.idBanda === banda.idBanda);

  if (ensaiosDaBanda.length === 0) {
    const agendaEnsaios = [
      { data: isoDate(2), local: "Estúdio Central", descricao: "Ensaio geral — passagem do setlist novo" },
      { data: isoDate(9), local: "Estúdio Central", descricao: "Ajustes de arranjo e backing vocals" },
      { data: isoDate(16), local: "Arena BeatStage", descricao: "Passagem de som para o Festival de Inverno" }
    ];

    for (const ensaio of agendaEnsaios) {
      await call("/ensaios", {
        method: "POST",
        token: tokenLider,
        body: { ...ensaio, idBanda: banda.idBanda }
      });
    }
    console.log(`  + ${agendaEnsaios.length} ensaios`);
  }

  repertorios = await call("/repertorios", { token: tokenLider });
  equipamentos = await call("/equipamentos", { token: tokenLider });
  const repertoriosDaBanda = repertorios.filter(
    (item) => item.idBanda === banda.idBanda
  );
  equipamentos = equipamentos.filter((item) => item.idBanda === banda.idBanda);

  let eventos = await call("/eventos", { token: tokenLider });
  const eventosDaBanda = eventos.filter((item) => item.idBanda === banda.idBanda);

  if (eventosDaBanda.length === 0) {
    const festival = await call("/eventos", {
      method: "POST",
      token: tokenLider,
      body: {
        idBanda: banda.idBanda,
        nome: "Festival de Inverno",
        data: isoDate(6),
        local: "Arena BeatStage",
        descricao: "Festival anual de inverno com três bandas convidadas. Som e luz profissionais.",
        idRepertorios: repertoriosDaBanda.slice(0, 7).map((item) => item.idRepertorio),
        idEquipamentos: equipamentos.slice(0, 3).map((item) => item.idEquipamento)
      }
    });

    await call("/eventos", {
      method: "POST",
      token: tokenLider,
      body: {
        idBanda: banda.idBanda,
        nome: "Noite Acústica",
        data: isoDate(21),
        local: "Café do Sol",
        descricao: "Formato acústico, voz e violão. Repertório reduzido.",
        idRepertorios: repertoriosDaBanda.slice(2, 6).map((item) => item.idRepertorio),
        idEquipamentos: equipamentos.slice(3, 5).map((item) => item.idEquipamento)
      }
    });

    await call("/eventos", {
      method: "POST",
      token: tokenLider,
      body: {
        idBanda: banda.idBanda,
        nome: "Show de Abertura",
        data: isoDate(-10),
        local: "Casa de Cultura",
        descricao: "Abertura para a banda convidada. Setlist curto.",
        idRepertorios: repertoriosDaBanda.slice(0, 4).map((item) => item.idRepertorio)
      }
    });

    console.log("  + 3 eventos (próximo, futuro e realizado)");

    // Agenda da banda vinculada ao evento principal
    agendas = await call("/agendas", { token: tokenLider });
    if (agendas.filter((item) => item.idBanda === banda.idBanda).length === 0) {
      await call("/agendas", {
        method: "POST",
        token: tokenLider,
        body: {
          titulo: "Passagem de som — Festival de Inverno",
          descricao: "Chegar às 16h, conferir equipamentos e testar o setlist.",
          data: isoDate(6),
          horario: "16:00",
          tipoAgenda: "BANDA",
          idBanda: banda.idBanda,
          idEvento: festival.evento.idEvento
        }
      });

      await call("/agendas", {
        method: "POST",
        token: tokenLider,
        body: {
          titulo: "Aula de canto",
          descricao: "Aula particular de técnica vocal.",
          data: isoDate(1),
          horario: "20:00",
          tipoAgenda: "INDIVIDUAL"
        }
      });

      await call("/agendas", {
        method: "POST",
        token: tokenLider,
        body: {
          titulo: "Revisar setlist",
          descricao: "Ouvir as referências e ajustar as tonalidades.",
          data: isoDate(-2),
          horario: "21:00",
          tipoAgenda: "INDIVIDUAL",
          concluido: true
        }
      });

      console.log("  + 3 atividades na agenda");
    }
  } else {
    console.log(`  = ${eventosDaBanda.length} eventos já existem`);
  }

  const feedbacks = await call("/feedbacks", { token: tokenLider });
  if (feedbacks.filter((item) => item.idBanda === banda.idBanda).length === 0) {
    await call("/feedbacks", {
      method: "POST",
      token: marina.token,
      body: {
        idBanda: banda.idBanda,
        comentario:
          "O ensaio de terça rendeu muito. Acho que o setlist está no ponto certo para o festival.",
        anonimo: false
      }
    });

    await call("/feedbacks", {
      method: "POST",
      token: lucas.token,
      body: {
        idBanda: banda.idBanda,
        comentario:
          "Sugiro baixar meio tom em duas músicas para a voz da Marina brilhar sem esforço no final do show.",
        anonimo: true
      }
    });

    await call("/feedbacks", {
      method: "POST",
      token: beatriz.token,
      body: {
        idBanda: banda.idBanda,
        comentario:
          "A passagem de som precisa de mais tempo para o teclado. Podemos chegar uma hora antes?",
        anonimo: false
      }
    });

    console.log("  + 3 feedbacks (um anônimo)");
  }

  console.log("\nDados de demonstração prontos.");
  console.log(`  líder: manoel@beatstage.demo / ${SENHA}`);
  console.log(`  banda: ${banda.nome} · código ${banda.codigoConvite}`);
}

let agendas; // usada dentro do bloco de eventos
main().catch((error) => {
  console.error("Falha ao semear dados:", error.message);
  if (error.payload) console.error(JSON.stringify(error.payload, null, 2));
  process.exitCode = 1;
});
