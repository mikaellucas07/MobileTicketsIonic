import { Component } from '@angular/core';
import { AtendimentoService } from '../../services/atendimento.service';
import { RelatorioDiario, RelatorioMensal } from '../../models/atendimento.model';

@Component({
  selector: 'app-relatorio',
  templateUrl: './relatorio.component.html',
  styleUrls: ['./relatorio.component.scss']
})
export class RelatorioComponent {
  tipo: 'diario' | 'mensal' = 'diario';
  dataDiario: string = new Date().toISOString().slice(0, 10);
  anoMensal: number = new Date().getFullYear();
  mesMensal: number = new Date().getMonth() + 1;

  relatorioDiario: RelatorioDiario | null = null;
  relatorioMensal: RelatorioMensal | null = null;
  carregando = false;
  erro: string | null = null;

  constructor(private svc: AtendimentoService) {}

  buscar(): void {
    this.carregando = true;
    this.erro = null;
    this.relatorioDiario = null;
    this.relatorioMensal = null;

    if (this.tipo === 'diario') {
      this.svc.relatorioDiario(this.dataDiario).subscribe({
        next: (r) => { this.relatorioDiario = r; this.carregando = false; },
        error: (e) => { this.erro = e.error?.erro || 'Erro.'; this.carregando = false; }
      });
    } else {
      this.svc.relatorioMensal(this.anoMensal, this.mesMensal).subscribe({
        next: (r) => { this.relatorioMensal = r; this.carregando = false; },
        error: (e) => { this.erro = e.error?.erro || 'Erro.'; this.carregando = false; }
      });
    }
  }

  totalEmitidas(resumo: any[]): number {
    return resumo.reduce((a, r) => a + Number(r.total_emitidas), 0);
  }
  totalAtendidas(resumo: any[]): number {
    return resumo.reduce((a, r) => a + Number(r.total_atendidas), 0);
  }

  corTipo(tipo: string): string {
    const mapa: Record<string, string> = { SP: '#e74c3c', SG: '#2ecc71', SE: '#3498db' };
    return mapa[tipo] || '#999';
  }

  nomeMes(m: number): string {
    return ['', 'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
            'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][m];
  }
}
