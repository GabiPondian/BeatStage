/**
 * Sugestões de músicas a partir da API pública de busca do iTunes.
 * Não exige chave e responde com CORS liberado, então roda direto no navegador.
 * Traz título, artista, álbum, duração e a prévia de áudio (usada para estimar o tom).
 */
export interface SugestaoMusica {
  id: number;
  titulo: string;
  artista: string;
  album: string | null;
  duracaoSegundos: number | null;
  previewUrl: string | null;
  capaUrl: string | null;
}

interface ItunesTrack {
  trackId?: number;
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  trackTimeMillis?: number;
  previewUrl?: string;
  artworkUrl100?: string;
}

const API_BUSCA = "https://itunes.apple.com/search";
const TIMEOUT_MS = 8_000;
const LIMITE = 8;

const cache = new Map<string, SugestaoMusica[]>();

function normalizar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function mapear(track: ItunesTrack): SugestaoMusica {
  return {
    id: track.trackId ?? Math.random(),
    titulo: (track.trackName ?? "").trim(),
    artista: (track.artistName ?? "").trim(),
    album: track.collectionName?.trim() || null,
    duracaoSegundos: track.trackTimeMillis ? Math.round(track.trackTimeMillis / 1000) : null,
    previewUrl: track.previewUrl ?? null,
    capaUrl: track.artworkUrl100?.replace("100x100", "300x300") ?? null
  };
}

/** Remove duplicatas (mesma música em álbuns diferentes) e prioriza quem bate com o termo. */
function ordenar(sugestoes: SugestaoMusica[], termo: string): SugestaoMusica[] {
  const alvo = normalizar(termo);
  const vistos = new Set<string>();
  const unicas: SugestaoMusica[] = [];

  for (const sugestao of sugestoes) {
    if (!sugestao.titulo || !sugestao.artista) continue;
    const chave = `${normalizar(sugestao.titulo)}|${normalizar(sugestao.artista)}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    unicas.push(sugestao);
  }

  const pontuar = (sugestao: SugestaoMusica) => {
    const titulo = normalizar(sugestao.titulo);
    const artista = normalizar(sugestao.artista);
    let pontos = 0;
    if (titulo === alvo) pontos += 6;
    else if (titulo.startsWith(alvo)) pontos += 4;
    else if (alvo.startsWith(titulo)) pontos += 3;
    else if (alvo.includes(titulo)) pontos += 2;
    if (alvo.includes(artista) || artista.includes(alvo)) pontos += 3;
    if (/\(ao vivo|live|karaok|tribute|cover\)/i.test(sugestao.titulo)) pontos -= 2;
    return pontos;
  };

  return unicas.sort((a, b) => pontuar(b) - pontuar(a));
}

export const musicasService = {
  /** Busca músicas conforme o texto digitado. Devolve lista vazia para termos curtos. */
  async buscarSugestoes(termo: string): Promise<SugestaoMusica[]> {
    const texto = termo.trim();
    if (texto.length < 2) return [];

    const chave = normalizar(texto);
    const emCache = cache.get(chave);
    if (emCache) return emCache;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const params = new URLSearchParams({
        term: texto,
        media: "music",
        entity: "song",
        limit: String(LIMITE * 2),
        country: "BR",
        lang: "pt_br"
      });

      const resposta = await fetch(`${API_BUSCA}?${params.toString()}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" }
      });

      if (!resposta.ok) throw new Error(`Busca de músicas falhou (${resposta.status})`);

      const dados = (await resposta.json()) as { results?: ItunesTrack[] };
      const sugestoes = ordenar((dados.results ?? []).map(mapear), texto).slice(0, LIMITE);

      cache.set(chave, sugestoes);
      return sugestoes;
    } finally {
      window.clearTimeout(timeout);
    }
  }
};
