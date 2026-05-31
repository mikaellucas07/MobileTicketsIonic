import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TotemComponent }     from './components/totem/totem.component';
import { PainelComponent }    from './components/painel/painel.component';
import { AtendenteComponent } from './components/atendente/atendente.component';
import { RelatorioComponent } from './components/relatorio/relatorio.component';

const routes: Routes = [
  { path: '',          redirectTo: 'totem', pathMatch: 'full' },
  { path: 'totem',     component: TotemComponent },
  { path: 'painel',    component: PainelComponent },
  { path: 'atendente', component: AtendenteComponent },
  { path: 'relatorio', component: RelatorioComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
