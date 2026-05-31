export type TipoSenha = 'SP' | 'SG' | 'SE';
export type StatusSenha = 'aguardando' | 'chamada' | 'atendida' | 'descartada';
export type StatusGuiche = 'livre' | 'ocupado';

export interface Senha {
  id: number;
  codigo: string;
  tipo: TipoSenha;
  sequencia: number;
  status: StatusSenha;
  emitida_em: string;
  chamada_em?: string;
  atendimento_inicio?: string;
  atendimento_fim?: string;
  guiche?: number;
  tm_segundos?: number;
  descartada?: boolean;
}

export interface Guiche {
  numero: number;
  status: StatusGuiche;
}

export interface StatusFila {
  fila: { tipo: TipoSenha; aguardando: number }[];
  guiches: Guiche[];
  expediente: boolean;
}

export interface ChamadaPainel {
  codigo: string;
  tipo: TipoSenha;
  status: StatusSenha;
  guiche: number;
  chamada_em: string;
}

export interface ResumoDiario {
  data: string;
  tipo: TipoSenha;
  total_emitidas: number;
  total_atendidas: number;
  total_descartadas: number;
  total_pendentes: number;
  tm_medio_min: number;
}

export interface RelatorioDiario {
  data: string;
  resumo: ResumoDiario[];
  detalhado: Senha[];
}

export interface RelatorioMensal {
  ano: number;
  mes: number;
  resumo: ResumoDiario[];
}
