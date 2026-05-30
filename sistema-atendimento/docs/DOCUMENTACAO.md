# 📖 Documentação Técnica — Sistema de Controle de Atendimento

## Índice

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Backend](#2-backend)
   - [Configuração do Banco de Dados](#21-configuração-do-banco-de-dados)
   - [Modelos de Dados](#22-modelos-de-dados)
   - [Serviço de Senhas](#23-serviço-de-senhas)
   - [Controladores](#24-controladores)
   - [Rotas da API](#25-rotas-da-api)
   - [Servidor e Cron Job](#26-servidor-e-cron-job)
3. [Frontend](#3-frontend)
   - [Módulos e Roteamento](#31-módulos-e-roteamento)
   - [Models (TypeScript)](#32-models-typescript)
   - [Serviço de Atendimento](#33-serviço-de-atendimento)
   - [Componentes](#34-componentes)
4. [Banco de Dados](#4-banco-de-dados)
5. [Variáveis de Ambiente](#5-variáveis-de-ambiente)
6. [Fluxo de Atendimento](#6-fluxo-de-atendimento)
7. [Algoritmo de Prioridade da Fila](#7-algoritmo-de-prioridade-da-fila)
8. [Relatórios](#8-relatórios)

---

## 1. Visão Geral da Arquitetura

O sistema segue uma arquitetura cliente-servidor desacoplada:

```
┌─────────────────────────────────────────┐
│              FRONTEND (Angular 17)       │
│  ┌─────────┐ ┌────────┐ ┌───────────┐  │
│  │  Totem  │ │ Painel │ │ Atendente │  │
│  └────┬────┘ └───┬────┘ └─────┬─────┘  │
│       └──────────┴────────────┘         │
│              AtendimentoService          │
│                 (HTTP Client)            │
└──────────────────┬──────────────────────┘
                   │ REST API (JSON)
                   │ http://localhost:3001/api
┌──────────────────▼──────────────────────┐
│              BACKEND (Node.js/Express)   │
│  Routes → Controller → Service → DB     │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │   SQLite (better-sqlite3)         │   │
│  │   backend/data/atendimento.db    │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Comunicação:** O frontend consome a API REST do backend via `HttpClient` do Angular. Todas as respostas são em JSON.

---

## 2. Backend

### 2.1 Configuração do Banco de Dados

**Arquivo:** `backend/src/config/database.js`

Inicializa a conexão com SQLite usando `better-sqlite3` (API síncrona). As tabelas são criadas automaticamente na primeira execução via `CREATE TABLE IF NOT EXISTS`.

As tabelas criadas são: `guiches`, `senhas` e `chamadas_log`.

Guichês são pré-populados com os números 1, 2 e 3.

### 2.2 Modelos de Dados

**Tabela `guiches`**

| Campo        | Tipo                    | Descrição                    |
|--------------|-------------------------|------------------------------|
| `id`         | INTEGER PK              | Identificador                |
| `numero`     | INTEGER UNIQUE          | Número do guichê (1, 2, 3)   |
| `status`     | `'livre'` \| `'ocupado'` | Estado atual                |
| `updated_at` | DATETIME                | Última atualização           |

**Tabela `senhas`**

| Campo                | Tipo                                              | Descrição                     |
|----------------------|---------------------------------------------------|-------------------------------|
| `id`                 | INTEGER PK                                        | Identificador                 |
| `codigo`             | VARCHAR(14) UNIQUE                                | Ex: `260530-SP0001`           |
| `tipo`               | `'SP'` \| `'SG'` \| `'SE'`                       | Tipo do serviço               |
| `sequencia`          | INTEGER                                           | Contador por tipo/dia         |
| `status`             | `'aguardando'` \| `'chamada'` \| `'atendida'` \| `'descartada'` | Ciclo de vida |
| `emitida_em`         | DATETIME                                          | Momento da emissão            |
| `chamada_em`         | DATETIME NULL                                     | Momento da chamada            |
| `atendimento_inicio` | DATETIME NULL                                     | Início do atendimento         |
| `atendimento_fim`    | DATETIME NULL                                     | Fim do atendimento            |
| `guiche_id`          | FK → guiches                                      | Guichê responsável            |
| `tm_segundos`        | INTEGER NULL                                      | Tempo de atendimento (s)      |

**Tabela `chamadas_log`**

| Campo        | Tipo         | Descrição                  |
|--------------|--------------|----------------------------|
| `id`         | INTEGER PK   | Identificador              |
| `senha_id`   | FK → senhas  | Senha chamada              |
| `guiche_id`  | FK → guiches | Guichê que chamou          |
| `chamada_em` | DATETIME     | Momento do registro        |

### 2.3 Serviço de Senhas

**Arquivo:** `backend/src/services/senhaService.js`

Contém todas as regras de negócio. Usa a API síncrona do `better-sqlite3` com `prepare()` para performance (statements compilados uma única vez na inicialização).

#### Métodos

---

**`emitirSenha(tipo)`**

Emite uma nova senha para o tipo informado (`SP`, `SG` ou `SE`).

Validações:
- Tipo deve ser `SP`, `SG` ou `SE`
- Deve estar dentro do horário de expediente (07h–17h)

Lógica:
1. Calcula a próxima sequência do dia para o tipo informado
2. Gera o código no formato `YYMMDD-TIPO####`
3. Com 5% de probabilidade, descarta a senha imediatamente (simulação de desistência)
4. Insere no banco dentro de uma transação

Retorna: `{ id, codigo, tipo, seq, descartada }`

---

**`proximaSenha()`**

Determina a próxima senha a ser chamada respeitando a regra de prioridade (ver seção 7).

Retorna: `{ id, codigo, tipo, sequencia }` ou `null`

---

**`chamarProxima()`**

Verifica se há guichê livre, busca a próxima senha via `proximaSenha()`, atualiza o status da senha para `'chamada'`, ocupa o guichê e registra no `chamadas_log`. Tudo em uma única transação.

Retorna: `{ sucesso: boolean, senha?, mensagem? }`

---

**`finalizarAtendimento(senhaId)`**

Marca a senha como `'atendida'` e libera o guichê correspondente. Valida que a senha existe e está no status `'chamada'`.

---

**`statusFila()`**

Retorna o estado atual do sistema:
- Contagem de senhas aguardando por tipo
- Status de cada guichê
- Flag indicando se o expediente está ativo

---

**`encerrarExpediente()`**

Descarta todas as senhas com status `'aguardando'` ou `'chamada'` do dia atual.

---

**`relatorioDiario(data)`**

Retorna resumo e detalhamento de todas as senhas de uma data. Se `data` não for informado, usa a data atual.

---

**`relatorMensal(ano, mes)`**

Retorna o resumo agrupado por dia e tipo para o mês/ano informados.

---

#### Funções auxiliares internas

| Função                | Descrição                                                        |
|-----------------------|------------------------------------------------------------------|
| `calcularTM(tipo)`    | Calcula tempo médio de atendimento com variação aleatória por tipo |
| `gerarCodigo(tipo, seq, data)` | Formata o código da senha: `YYMMDD-TIPO####`          |
| `dentroDoExpediente()` | Verifica se o horário atual está entre 07h e 17h               |
| `agora()`             | Retorna timestamp atual no formato `YYYY-MM-DD HH:MM:SS`        |
| `hoje()`              | Retorna a data atual no formato `YYYY-MM-DD`                    |

**Tempos médios por tipo:**

| Tipo | Base   | Variação        |
|------|--------|-----------------|
| `SP` | 15 min | ±0 a 5 min aleatório |
| `SG` | 5 min  | ±0 a 3 min aleatório |
| `SE` | 1 min  | 95% de 1 min; 5% de 5 min |

### 2.4 Controladores

**Arquivo:** `backend/src/controllers/senhaController.js`

Camada fina de HTTP que delega ao `SenhaService`. Trata erros com `try/catch` e retorna os códigos de status adequados:

- `201` — Criação com sucesso (emissão de senha)
- `200` — Operação bem-sucedida
- `400` — Erro de validação ou regra de negócio
- `500` — Erro interno do servidor

### 2.5 Rotas da API

**Arquivo:** `backend/src/routes/index.js`

```
POST   /api/senhas/emitir            → ctrl.emitir
POST   /api/senhas/chamar            → ctrl.chamarProxima
PATCH  /api/senhas/:id/finalizar     → ctrl.finalizar
GET    /api/painel                   → ctrl.painel
GET    /api/status                   → ctrl.status
POST   /api/expediente/encerrar      → ctrl.encerrar
GET    /api/relatorios/diario        → ctrl.relatorioDiario  (?data=YYYY-MM-DD)
GET    /api/relatorios/mensal        → ctrl.relatorioMensal  (?ano=YYYY&mes=MM)
GET    /health                       → { status: 'ok', hora: Date }
```

### 2.6 Servidor e Cron Job

**Arquivo:** `backend/src/server.js`

Inicializa o Express com os middlewares `cors` e `express.json()`, registra as rotas e sobe na porta definida em `PORT` (padrão: `3001`).

**Cron job:** Executa às 17h00 de segunda a sábado (`'0 17 * * 1-6'`), fuso horário `America/Recife`, chamando `SenhaService.encerrarExpediente()` automaticamente.

---

## 3. Frontend

### 3.1 Módulos e Roteamento

**Arquivo:** `frontend-novo/src/app/app-routing.module.ts`

O projeto usa Angular com roteamento baseado em módulos (`AppRoutingModule`). As rotas mapeiam os 4 componentes principais do sistema.

**Arquivo:** `frontend-novo/src/app/app.module.ts`

Declara os componentes e importa `HttpClientModule` (necessário para chamadas HTTP ao backend) e `FormsModule`.

### 3.2 Models (TypeScript)

**Arquivo:** `frontend-novo/src/app/models/atendimento.model.ts`

Define os tipos e interfaces que espelham as entidades do backend:

```typescript
// Tipos base
type TipoSenha   = 'SP' | 'SG' | 'SE';
type StatusSenha = 'aguardando' | 'chamada' | 'atendida' | 'descartada';
type StatusGuiche = 'livre' | 'ocupado';

// Interfaces principais
interface Senha         // Entidade senha completa
interface Guiche        // Estado de um guichê
interface StatusFila    // Snapshot da fila + guichês
interface ChamadaPainel // Registro para exibição no painel
interface ResumoDiario  // Linha do relatório agrupado
interface RelatorioDiario  // Resposta do endpoint diário
interface RelatorioMensal  // Resposta do endpoint mensal
```

### 3.3 Serviço de Atendimento

**Arquivo:** `frontend-novo/src/app/services/atendimento.service.ts`

Serviço Angular injetável (`providedIn: 'root'`) que centraliza todas as chamadas HTTP para o backend. Usa `HttpClient` com `Observable` para comunicação reativa.

A URL base da API é configurada via `environment.apiUrl`.

| Método                         | Endpoint chamado                    |
|--------------------------------|-------------------------------------|
| `emitirSenha(tipo)`            | `POST /api/senhas/emitir`           |
| `chamarProxima()`              | `POST /api/senhas/chamar`           |
| `finalizarAtendimento(id)`     | `PATCH /api/senhas/:id/finalizar`   |
| `ultimasChamadas()`            | `GET /api/painel`                   |
| `statusFila()`                 | `GET /api/status`                   |
| `encerrarExpediente()`         | `POST /api/expediente/encerrar`     |
| `relatorioDiario(data?)`       | `GET /api/relatorios/diario`        |
| `relatorioMensal(ano, mes)`    | `GET /api/relatorios/mensal`        |

### 3.4 Componentes

**Totem** (`src/app/components/totem/`)

Interface do cliente. Exibe os 3 botões de tipo de senha (SP, SG, SE). Ao clicar, chama `emitirSenha()` e exibe o código gerado para o usuário.

**Painel** (`src/app/components/painel/`)

Tela pública de exibição. Mostra as últimas 5 senhas chamadas com o número do guichê correspondente. Atualiza periodicamente via polling ao endpoint `/api/painel`.

**Atendente** (`src/app/components/atendente/`)

Interface operacional. Permite chamar a próxima senha da fila e finalizar o atendimento em andamento. Exibe o status atual dos guichês e contagem por fila.

**Relatório** (`src/app/components/relatorio/`)

Tela administrativa. Permite consultar relatórios diários (com detalhamento por senha) e relatórios mensais (resumo por dia e tipo). Inputs de data e mês/ano acionam as consultas.

---

## 4. Banco de Dados

O projeto inclui dois schemas:

**SQLite (runtime):** criado automaticamente pelo `database.js` na primeira execução do backend. Arquivo em `backend/data/atendimento.db`.

**MySQL 8.0 (referência):** arquivo `database/schema.sql` — versão normalizada com:
- Suporte a `utf8mb4`
- Índices para relatórios (`idx_senhas_tipo`, `idx_senhas_status`, `idx_senhas_emitida_em`)
- View `vw_resumo_diario` para relatórios
- Stored procedure `sp_encerrar_expediente(p_data)`
- Tabela `expediente` para controle auditável do horário

---

## 5. Variáveis de Ambiente

**Backend** (`.env`):

```env
PORT=3001
```

O arquivo `.env.example` serve como template. Copiar para `.env` antes de executar.

**Frontend:**

Configurado via `src/environments/environment.ts`:

```typescript
export const environment = {
  apiUrl: 'http://localhost:3001/api'
};
```

---

## 6. Fluxo de Atendimento

```
Cliente chega
     │
     ▼
[Totem] Seleciona tipo (SP / SG / SE)
     │
     ▼
POST /api/senhas/emitir
     │
     ├── Fora do expediente? → Erro 400
     ├── Descarte imediato (5%)? → status = 'descartada'
     └── Sucesso → status = 'aguardando', exibe código
     │
     ▼
[Atendente] Clica em "Chamar próxima"
     │
     ▼
POST /api/senhas/chamar
     │
     ├── Fora do expediente? → Erro 400
     ├── Nenhum guichê livre? → { sucesso: false }
     ├── Fila vazia? → { sucesso: false }
     └── Sucesso → senha.status = 'chamada', guiche.status = 'ocupado'
     │
     ▼
[Painel] Exibe senha + guichê
     │
     ▼
[Atendente] Clica em "Finalizar"
     │
     ▼
PATCH /api/senhas/:id/finalizar
     └── senha.status = 'atendida', guiche.status = 'livre'
```

---

## 7. Algoritmo de Prioridade da Fila

O método `proximaSenha()` aplica a seguinte lógica:

1. Verifica qual foi o **último tipo chamado** no dia
2. Se o último tipo chamado foi `SP` (Prioritário), os candidatos são `['SE', 'SG']` — evita chamar dois SP seguidos
3. Caso contrário, os candidatos são `['SP', 'SE', 'SG']` — SP tem preferência
4. Retorna a senha mais antiga (`ORDER BY emitida_em ASC`) do primeiro tipo com fila não vazia

Isso garante que senhas prioritárias (SP) sejam sempre atendidas, mas intercaladas com outros tipos para evitar starvation da fila SG e SE.

---

## 8. Relatórios

### Relatório Diário

**Endpoint:** `GET /api/relatorios/diario?data=YYYY-MM-DD`

Retorna dois níveis de detalhe para a data informada:

- **Resumo por tipo:** total emitidas, atendidas, descartadas, pendentes e tempo médio de atendimento (em minutos)
- **Detalhado:** lista completa de todas as senhas com todos os timestamps e guichê associado

### Relatório Mensal

**Endpoint:** `GET /api/relatorios/mensal?ano=YYYY&mes=MM`

Retorna o resumo agrupado por **dia e tipo** para o intervalo do mês informado. Permite visualizar a evolução diária do atendimento.

**Campos do resumo:**

| Campo              | Descrição                                    |
|--------------------|----------------------------------------------|
| `data`             | Data no formato `YYYY-MM-DD`                 |
| `tipo`             | Tipo da senha (`SP`, `SG`, `SE`)             |
| `total_emitidas`   | Total de senhas emitidas                     |
| `total_atendidas`  | Senhas com status `atendida`                 |
| `total_descartadas`| Senhas com status `descartada`               |
| `total_pendentes`  | Senhas com status `aguardando` ou `chamada`  |
| `tm_medio_min`     | Tempo médio de atendimento em minutos        |
