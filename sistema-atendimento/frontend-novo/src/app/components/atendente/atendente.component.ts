import { Component, OnInit } from '@angular/core';
import { AtendimentoService } from '../../services/atendimento.service';
import { Senha, StatusFila } from '../../models/atendimento.model';

@Component({
  selector: 'app-atendente',
  templateUrl: './atendente.component.html',
  styleUrls: ['./atendente.component.scss']
})
export class AtendenteComponent implements OnInit {
  statusFila: StatusFila | null = null;
  senhaAtual: Senha | null = null;
  mensagem: string | null = null;
  carregando = false;
  Math = Math;

  constructor(private svc: AtendimentoService) {}

  ngOnInit(): void {
    this.carregarStatus();
  }

  carregarStatus(): void {
    this.svc.statusFila().subscribe(s => this.statusFila = s);
  }

  chamarProxima(): void {
    this.carregando = true;
    this.mensagem = null;

    this.svc.chamarProxima().subscribe({
      next: (res) => {
        this.carregando = false;
        if (res.sucesso && res.senha) {
          this.senhaAtual = res.senha;
        } else {
          this.mensagem = res.mensagem || 'Sem senhas na fila.';
        }
        this.carregarStatus();
      },
      error: (e) => {
        this.carregando = false;
        this.mensagem = e.error?.erro || 'Erro ao chamar senha.';
      }
    });
  }

  finalizar(): void {
    if (!this.senhaAtual?.id) return;
    this.carregando = true;

    this.svc.finalizarAtendimento(this.senhaAtual.id).subscribe({
      next: () => {
        this.carregando = false;
        this.senhaAtual = null;
        this.mensagem = 'Atendimento finalizado com sucesso!';
        this.carregarStatus();
      },
      error: (e) => {
        this.carregando = false;
        this.mensagem = e.error?.erro || 'Erro ao finalizar.';
      }
    });
  }

  encerrarExpediente(): void {
    if (!confirm('Deseja encerrar o expediente? Senhas pendentes serão descartadas.')) return;
    this.svc.encerrarExpediente().subscribe({
      next: (r) => { this.mensagem = r.mensagem; this.carregarStatus(); },
      error: (e) => { this.mensagem = e.error?.erro || 'Erro ao encerrar expediente.'; }
    });
  }

  tmMinutos(seg?: number): string {
    if (!seg) return '-';
    return `${Math.floor(seg / 60)}min ${seg % 60}s`;
  }

  corTipo(tipo?: string): string {
    const mapa: Record<string, string> = { SP: '#e74c3c', SG: '#2ecc71', SE: '#3498db' };
    return tipo ? (mapa[tipo] || '#fff') : '#fff';
  }
}
