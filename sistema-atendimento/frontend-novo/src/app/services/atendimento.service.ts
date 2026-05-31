import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Senha, StatusFila, ChamadaPainel,
  RelatorioDiario, RelatorioMensal, TipoSenha
} from '../models/atendimento.model';

@Injectable({ providedIn: 'root' })
export class AtendimentoService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Totem
  emitirSenha(tipo: TipoSenha): Observable<Senha> {
    return this.http.post<Senha>(`${this.api}/senhas/emitir`, { tipo });
  }

  // Atendente
  chamarProxima(): Observable<{ sucesso: boolean; senha?: Senha; mensagem?: string }> {
    return this.http.post<any>(`${this.api}/senhas/chamar`, {});
  }

  finalizarAtendimento(id: number): Observable<{ sucesso: boolean }> {
    return this.http.patch<any>(`${this.api}/senhas/${id}/finalizar`, {});
  }

  // Painel
  ultimasChamadas(): Observable<ChamadaPainel[]> {
    return this.http.get<ChamadaPainel[]>(`${this.api}/painel`);
  }

  // Status
  statusFila(): Observable<StatusFila> {
    return this.http.get<StatusFila>(`${this.api}/status`);
  }

  // Admin
  encerrarExpediente(): Observable<any> {
    return this.http.post<any>(`${this.api}/expediente/encerrar`, {});
  }

  // Relatórios
  relatorioDiario(data?: string): Observable<RelatorioDiario> {
    const params = data ? new HttpParams().set('data', data) : undefined;
    return this.http.get<RelatorioDiario>(`${this.api}/relatorios/diario`, { params });
  }

  relatorioMensal(ano: number, mes: number): Observable<RelatorioMensal> {
    const params = new HttpParams().set('ano', ano).set('mes', mes);
    return this.http.get<RelatorioMensal>(`${this.api}/relatorios/mensal`, { params });
  }
}
