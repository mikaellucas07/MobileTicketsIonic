import { Component, OnInit, OnDestroy } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AtendimentoService } from '../../services/atendimento.service';
import { ChamadaPainel, StatusFila } from '../../models/atendimento.model';

@Component({
  selector: 'app-painel',
  templateUrl: './painel.component.html',
  styleUrls: ['./painel.component.scss']
})
export class PainelComponent implements OnInit, OnDestroy {
  chamadas: ChamadaPainel[] = [];
  statusFila: StatusFila | null = null;
  horaAtual = '';

  private sub!: Subscription;
  private clockSub!: Subscription;

  constructor(private svc: AtendimentoService) {}

  ngOnInit(): void {
    this.carregar();

    // Atualiza a cada 5 segundos
    this.sub = interval(5000).pipe(
      switchMap(() => this.svc.ultimasChamadas())
    ).subscribe(c => this.chamadas = c);

    // Relógio
    this.clockSub = interval(1000).subscribe(() => {
      this.horaAtual = new Date().toLocaleTimeString('pt-BR');
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.clockSub?.unsubscribe();
  }

  private carregar(): void {
    this.svc.ultimasChamadas().subscribe(c => this.chamadas = c);
    this.svc.statusFila().subscribe(s => this.statusFila = s);
    this.horaAtual = new Date().toLocaleTimeString('pt-BR');
  }

  corTipo(tipo: string): string {
    const mapa: Record<string, string> = { SP: '#e74c3c', SG: '#2ecc71', SE: '#3498db' };
    return mapa[tipo] || '#fff';
  }

  labelTipo(tipo: string): string {
    const mapa: Record<string, string> = { SP: 'Prioritária', SG: 'Geral', SE: 'Exames' };
    return mapa[tipo] || tipo;
  }
}
