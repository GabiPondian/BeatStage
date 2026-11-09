/**
 * Contratos de dados da API BeatStage.
 * Os tipos espelham exatamente o que os controllers/services do backend retornam.
 */

export type EstadoEquipamento = "PROPRIO" | "EMPRESTADO";
export type TipoAgenda = "INDIVIDUAL" | "BANDA";

export interface Musico {
  idMusico: number;
  nome: string;
  email: string;
  cargo: string;
  fotoPerfil: string | null;
}

export interface Perfil extends Musico {
  ativo: boolean;
}

export interface LoginResponse {
  mensagem: string;
  token: string;
  musico: Musico;
}

export interface Banda {
  idBanda: number;
  nome: string;
  descricao: string | null;
  codigoConvite: string;
  idLider: number;
  idMembros: number[];
}

export interface RepertorioMusico {
  idMusico: number;
  funcaoMusico: string | null;
}

export interface Repertorio {
  idRepertorio: number;
  musica: string;
  tom: string | null;
  duracaoSegundos: number | null;
  observacao: string | null;
  idBanda: number;
  musicos: RepertorioMusico[];
}

export interface Evento {
  idEvento: number;
  nome: string;
  data: string;
  local: string | null;
  descricao: string | null;
  idBanda: number;
  idEquipamentos: number[];
  idRepertorios: number[];
}

export interface Ensaio {
  idEnsaio: number;
  data: string;
  local: string | null;
  descricao: string | null;
  idBanda: number;
}

export interface Equipamento {
  idEquipamento: number;
  nome: string;
  estado: EstadoEquipamento;
  responsavel: string | null;
  descricao: string | null;
  idBanda: number;
}

export interface Agenda {
  idAgenda: number;
  titulo: string;
  descricao: string | null;
  data: string;
  horario: string;
  concluido: boolean;
  criadoPor: string | null;
  tipoAgenda: TipoAgenda;
  visibilidade: TipoAgenda;
  idEvento: number | null;
  idBanda: number | null;
  idMusico: number | null;
}

export interface Feedback {
  idFeedback: number;
  comentario: string;
  anonimo: boolean;
  idBanda: number;
  idMusico: number | null;
}

/* ---------- Payloads de escrita (mesmos contratos validados pelo Zod) ---------- */

export interface CriarMusicoPayload {
  nome: string;
  email: string;
  senha: string;
  cargo: string;
  fotoPerfil?: string;
}

export interface LoginPayload {
  email: string;
  senha: string;
}

export interface AtualizarPerfilPayload {
  nome?: string;
  email?: string;
  cargo?: string;
  fotoPerfil?: string | null;
}

export interface AlterarSenhaPayload {
  senhaAtual: string;
  novaSenha: string;
}

export interface CriarBandaPayload {
  nome: string;
  descricao?: string;
  idLider: number;
  idMembros?: number[];
}

export interface AtualizarBandaPayload {
  nome?: string;
  descricao?: string | null;
  idLider?: number;
  idMembros?: number[];
}

export interface CriarRepertorioPayload {
  idBanda: number;
  musica: string;
  tom?: string;
  duracaoSegundos?: number;
  observacao?: string;
  musicos?: { idMusico: number; funcaoMusico?: string }[];
}

export interface AtualizarRepertorioPayload {
  musica?: string;
  tom?: string | null;
  duracaoSegundos?: number | null;
  observacao?: string | null;
  musicos?: { idMusico: number; funcaoMusico?: string }[];
}

export interface CriarEventoPayload {
  idBanda: number;
  nome: string;
  data: string;
  local?: string;
  descricao?: string;
  idEquipamentos?: number[];
  idRepertorios?: number[];
}

export interface AtualizarEventoPayload {
  nome?: string;
  data?: string;
  local?: string | null;
  descricao?: string | null;
  idEquipamentos?: number[];
  idRepertorios?: number[];
}

export interface CriarEnsaioPayload {
  idBanda: number;
  data: string;
  local?: string;
  descricao?: string;
}

export interface AtualizarEnsaioPayload {
  data?: string;
  local?: string | null;
  descricao?: string | null;
}

export interface CriarEquipamentoPayload {
  nome: string;
  estado: EstadoEquipamento;
  responsavel?: string;
  descricao?: string;
  idBanda: number;
}

export interface AtualizarEquipamentoPayload {
  nome?: string;
  estado?: EstadoEquipamento;
  responsavel?: string | null;
  descricao?: string | null;
  idBanda?: number;
}

export interface CriarAgendaPayload {
  titulo: string;
  descricao?: string;
  data: string;
  horario: string;
  concluido?: boolean;
  tipoAgenda: TipoAgenda;
  visibilidade?: TipoAgenda;
  idBanda?: number;
  idEvento?: number;
}

export interface AtualizarAgendaPayload {
  titulo?: string;
  descricao?: string | null;
  data?: string;
  horario?: string;
  concluido?: boolean;
  visibilidade?: TipoAgenda;
  idEvento?: number | null;
}

export interface CriarFeedbackPayload {
  idBanda: number;
  comentario: string;
  anonimo?: boolean;
}

export interface AtualizarFeedbackPayload {
  comentario?: string;
  anonimo?: boolean;
}

/* ---------- Envelopes de resposta ---------- */

export interface MensagemResponse {
  mensagem: string;
}

export interface BandaResponse extends MensagemResponse {
  banda: Banda;
}

export interface MusicoResponse extends MensagemResponse {
  musico: Musico;
}

export interface RepertorioResponse extends MensagemResponse {
  repertorio: Repertorio;
}

export interface EventoResponse extends MensagemResponse {
  evento: Evento;
}

export interface EnsaioResponse extends MensagemResponse {
  ensaio: Ensaio;
}

export interface EquipamentoResponse extends MensagemResponse {
  equipamento: Equipamento;
}

export interface AgendaResponse extends MensagemResponse {
  agenda: Agenda;
}

export interface FeedbackResponse extends MensagemResponse {
  feedback: Feedback;
}

export interface ErroValidacao {
  campo: string;
  mensagem: string;
}

export interface ErroApiPayload {
  mensagem?: string;
  erros?: ErroValidacao[];
}
