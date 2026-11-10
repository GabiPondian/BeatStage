/**
 * Estimativa de tom (tonalidade) a partir de uma prévia de áudio.
 *
 * Recebe a URL da prévia (a API de busca devolve ~30s de áudio), decodifica no
 * navegador, monta o perfil de cromagrama e compara com os perfis de Krumhansl
 * para maior/menor. É uma estimativa: o músico pode ajustar no formulário.
 */

/** Nomes preferindo bemóis, que é como a maioria dos músicos brasileiros lê. */
const NOMES_NOTAS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

/** Perfis de Krumhansl & Kessler (1982). */
const PERFIL_MAIOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const PERFIL_MENOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

const TAMANHO_JANELA = 4096;
const PASSO = 2048;
const FREQ_MIN = 65;
const FREQ_MAX = 2000;
const DURACAO_MAX_S = 20;
const TIMEOUT_MS = 15_000;

const cache = new Map<string, string | null>();

/** Leitura segura de índice (o projeto compila com noUncheckedIndexedAccess). */
function valor(arr: ArrayLike<number>, indice: number): number {
  return arr[indice] ?? 0;
}

/** FFT radix-2 iterativa (in-place). */
function fft(real: Float32Array, imag: Float32Array) {
  const n = real.length;

  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const realI = valor(real, i);
      const imagI = valor(imag, i);
      real[i] = valor(real, j);
      imag[i] = valor(imag, j);
      real[j] = realI;
      imag[j] = imagI;
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const angulo = (-2 * Math.PI) / len;
    const cosseno = Math.cos(angulo);
    const seno = Math.sin(angulo);

    for (let i = 0; i < n; i += len) {
      let wr = 1;
      let wi = 0;

      for (let k = 0; k < len / 2; k++) {
        const metade = i + k + len / 2;
        const ur = valor(real, i + k);
        const ui = valor(imag, i + k);
        const vr = valor(real, metade) * wr - valor(imag, metade) * wi;
        const vi = valor(real, metade) * wi + valor(imag, metade) * wr;

        real[i + k] = ur + vr;
        imag[i + k] = ui + vi;
        real[metade] = ur - vr;
        imag[metade] = ui - vi;

        const proximoWr = wr * cosseno - wi * seno;
        wi = wr * seno + wi * cosseno;
        wr = proximoWr;
      }
    }
  }
}

function monoComTaxaBaixa(buffer: AudioBuffer): { amostras: Float32Array; taxa: number } {
  const canais = buffer.numberOfChannels;
  const mono = new Float32Array(buffer.length);

  for (let canal = 0; canal < canais; canal++) {
    const dados = buffer.getChannelData(canal);
    for (let i = 0; i < dados.length; i++) {
      mono[i] = valor(mono, i) + valor(dados, i) / canais;
    }
  }

  // Reduz para ~11 kHz: suficiente para o cromagrama e bem mais rápido.
  const fator = Math.max(1, Math.floor(buffer.sampleRate / 11025));
  if (fator === 1) return { amostras: mono, taxa: buffer.sampleRate };

  const reduzido = new Float32Array(Math.floor(mono.length / fator));
  for (let i = 0; i < reduzido.length; i++) {
    let soma = 0;
    for (let j = 0; j < fator; j++) soma += valor(mono, i * fator + j);
    reduzido[i] = soma / fator;
  }

  return { amostras: reduzido, taxa: buffer.sampleRate / fator };
}

function cromagrama(amostras: Float32Array, taxa: number): Float32Array {
  const croma = new Float32Array(12);
  const janela = new Float32Array(TAMANHO_JANELA);

  for (let i = 0; i < TAMANHO_JANELA; i++) {
    janela[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (TAMANHO_JANELA - 1));
  }

  const limite = Math.min(amostras.length, Math.floor(taxa * DURACAO_MAX_S));
  const real = new Float32Array(TAMANHO_JANELA);
  const imag = new Float32Array(TAMANHO_JANELA);
  const binMin = Math.max(1, Math.floor((FREQ_MIN * TAMANHO_JANELA) / taxa));
  const binMax = Math.min(TAMANHO_JANELA / 2 - 1, Math.ceil((FREQ_MAX * TAMANHO_JANELA) / taxa));

  for (let inicio = 0; inicio + TAMANHO_JANELA <= limite; inicio += PASSO) {
    let energia = 0;

    for (let i = 0; i < TAMANHO_JANELA; i++) {
      const amostra = valor(amostras, inicio + i);
      energia += amostra * amostra;
      real[i] = amostra * valor(janela, i);
      imag[i] = 0;
    }

    // Ignora trechos praticamente silenciosos.
    if (Math.sqrt(energia / TAMANHO_JANELA) < 0.01) continue;

    fft(real, imag);

    for (let bin = binMin; bin <= binMax; bin++) {
      const magnitude = Math.hypot(valor(real, bin), valor(imag, bin));
      if (magnitude <= 0) continue;

      const frequencia = (bin * taxa) / TAMANHO_JANELA;
      const midi = 69 + 12 * Math.log2(frequencia / 440);
      const nota = ((Math.round(midi) % 12) + 12) % 12;
      croma[nota] = valor(croma, nota) + magnitude;
    }
  }

  return croma;
}

function correlacao(a: number[], b: number[]): number {
  const n = a.length;
  let somaA = 0;
  let somaB = 0;

  for (let i = 0; i < n; i++) {
    somaA += valor(a, i);
    somaB += valor(b, i);
  }

  const mediaA = somaA / n;
  const mediaB = somaB / n;

  let numerador = 0;
  let quadradoA = 0;
  let quadradoB = 0;

  for (let i = 0; i < n; i++) {
    const da = valor(a, i) - mediaA;
    const db = valor(b, i) - mediaB;
    numerador += da * db;
    quadradoA += da * da;
    quadradoB += db * db;
  }

  if (quadradoA === 0 || quadradoB === 0) return 0;
  return numerador / Math.sqrt(quadradoA * quadradoB);
}

function estimar(croma: Float32Array): string | null {
  const valores = Array.from(croma);
  if (valores.every((item) => item === 0)) return null;

  let melhorNota = 0;
  let melhorModo: "maior" | "menor" = "maior";
  let melhorPontuacao = -1;

  const perfis: Array<[number[], "maior" | "menor"]> = [
    [PERFIL_MAIOR, "maior"],
    [PERFIL_MENOR, "menor"]
  ];

  for (const [perfil, modo] of perfis) {
    for (let tonica = 0; tonica < 12; tonica++) {
      const girado = Array.from({ length: 12 }, (_, i) => valor(perfil, (i - tonica + 12) % 12));
      const pontos = correlacao(valores, girado);

      if (pontos > melhorPontuacao) {
        melhorPontuacao = pontos;
        melhorNota = tonica;
        melhorModo = modo;
      }
    }
  }

  // Correlação baixa demais: melhor não sugerir nada do que sugerir errado.
  if (melhorPontuacao < 0.5) return null;

  return `${NOMES_NOTAS[melhorNota] ?? "C"}${melhorModo === "menor" ? "m" : ""}`;
}

async function baixarAudio(url: string): Promise<ArrayBuffer> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const resposta = await fetch(url, { signal: controller.signal });
    if (!resposta.ok) throw new Error(`Prévia indisponível (${resposta.status})`);
    return resposta.arrayBuffer();
  } finally {
    window.clearTimeout(timeout);
  }
}

export const tomService = {
  /** Devolve o tom estimado (ex.: "Em", "Bb") ou null quando não dá para estimar. */
  async detectar(previewUrl: string | null | undefined): Promise<string | null> {
    if (!previewUrl) return null;
    if (cache.has(previewUrl)) return cache.get(previewUrl) ?? null;

    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    const contexto = new AudioCtx();

    try {
      const bytes = await baixarAudio(previewUrl);
      const audio = await contexto.decodeAudioData(bytes);
      const { amostras, taxa } = monoComTaxaBaixa(audio);
      const tom = estimar(cromagrama(amostras, taxa));
      cache.set(previewUrl, tom);
      return tom;
    } catch {
      cache.set(previewUrl, null);
      return null;
    } finally {
      void contexto.close();
    }
  }
};
