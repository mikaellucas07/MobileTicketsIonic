import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule }    from './app-routing.module';
import { AppComponent }        from './app.component';
import { TotemComponent }      from './components/totem/totem.component';
import { PainelComponent }     from './components/painel/painel.component';
import { AtendenteComponent }  from './components/atendente/atendente.component';
import { RelatorioComponent }  from './components/relatorio/relatorio.component';

@NgModule({
  declarations: [
    AppComponent,
    TotemComponent,
    PainelComponent,
    AtendenteComponent,
    RelatorioComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
