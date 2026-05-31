import { Component } from '@angular/core';
import { AtendimentoService } from '../../services/atendimento.service';
import { Senha, TipoSenha } from '../../models/atendimento.model';

@Component({
  selector: 'app-totem',
  templateUrl: './totem.component.html',
  styleUrls: ['./totem.component.scss']
})
export class TotemComponent {
  senhaEmitida: Senha | null = null;
  erro: string | null = null;
  carregando = false;

  readonly tipos: { tipo: TipoSenha; label: string; descricao: string; cor: string }[] = [
    { tipo: 'SP', label: 'Prioritária',     descricao: 'Gestante, idoso, PCD e outros',   cor: '#e74c3c' },
    { tipo: 'SG', label: 'Geral',           descricao: 'Atendimento padrão',               cor: '#2ecc71' },
    { tipo: 'SE', label: 'Retirada Exames', descricao: 'Buscar resultado de exames',        cor: '#3498db' },
  ];

  constructor(private svc: AtendimentoService) {}

  emitir(tipo: TipoSenha): void {
    this.carregando = true;
    this.senhaEmitida = null;
    this.erro = null;

    this.svc.emitirSenha(tipo).subscribe({
      next: (s) => {
        this.senhaEmitida = s;
        this.carregando = false;
      },
      error: (e) => {
        this.erro = e.error?.erro || 'Erro ao emitir senha.';
        this.carregando = false;
      }
    });
  }

  nova(): void {
    this.senhaEmitida = null;
    this.erro = null;
  }
}
