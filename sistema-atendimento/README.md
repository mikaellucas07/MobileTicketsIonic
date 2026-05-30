# 🏥 Sistema de Controle de Atendimento — Laboratório Médico

> Projeto acadêmico — Sistema de gerenciamento de filas e atendimento com emissão de senhas, painel de chamadas, interface do atendente e relatórios.

---

## 📋 Sobre o Projeto

Sistema web completo para controle de atendimento de um laboratório médico, desenvolvido como projeto de faculdade. Permite a emissão de senhas por tipo de serviço, chamada automática por guichê, exibição em painel público e geração de relatórios diários e mensais.

### Tipos de Senha

| Código | Descrição              | Tempo médio estimado |
|--------|------------------------|----------------------|
| `SP`   | Serviço Prioritário    | ~15 minutos          |
| `SG`   | Serviço Geral          | ~5 minutos           |
| `SE`   | Serviço Exame          | ~1 minuto            |

---

## 🛠️ Tecnologias Utilizadas

**Backend**
- [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) (banco de dados SQLite)
- [node-cron](https://github.com/node-cron/node-cron) (encerramento automático do expediente)
- [dotenv](https://github.com/motdotla/dotenv)

**Frontend**
- [Angular 17](https://angular.io/) com SSR (Angular Universal)
- TypeScript
- SCSS

---

## 📁 Estrutura do Projeto

```
sistema-atendimento/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js          # Conexão e inicialização do SQLite
│   │   ├── controllers/
│   │   │   └── senhaController.js   # Handlers HTTP
│   │   ├── routes/
│   │   │   └── index.js             # Definição das rotas da API
│   │   ├── services/
│   │   │   └── senhaService.js      # Regras de negócio
│   │   └── server.js                # Entrada da aplicação + cron job
│   ├── data/
│   │   └── atendimento.db           # Banco SQLite (gerado em runtime)
│   ├── .env.example
│   └── package.json
├── frontend-novo/
│   └── src/
│       └── app/
│           ├── components/
│           │   ├── totem/            # Tela de emissão de senha
│           │   ├── painel/           # Painel público de chamadas
│           │   ├── atendente/        # Interface do atendente
│           │   └── relatorio/        # Tela de relatórios
│           ├── models/
│           │   └── atendimento.model.ts
│           └── services/
│               └── atendimento.service.ts
└── database/
    └── schema.sql                    # Schema MySQL de referência
```

---

## ⚙️ Pré-requisitos

- [Node.js](https://nodejs.org/) v18 ou superior
- npm v9 ou superior
- [Angular CLI](https://angular.io/cli) v17 (`npm install -g @angular/cli`)

---

## 🚀 Como Executar

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/sistema-atendimento.git
cd sistema-atendimento
```

### 2. Backend

```bash
cd backend

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env

# Inicie o servidor
npm run dev       # desenvolvimento (nodemon)
# ou
npm start         # produção
```

O servidor estará disponível em `http://localhost:3001`.

### 3. Frontend

```bash
cd frontend-novo

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm start
```

O frontend estará disponível em `http://localhost:4200`.

---

## 🌐 Endpoints da API

| Método   | Rota                        | Descrição                              |
|----------|-----------------------------|----------------------------------------|
| `POST`   | `/api/senhas/emitir`        | Emite uma nova senha                   |
| `POST`   | `/api/senhas/chamar`        | Chama a próxima senha da fila          |
| `PATCH`  | `/api/senhas/:id/finalizar` | Finaliza o atendimento de uma senha    |
| `GET`    | `/api/painel`               | Retorna as últimas 5 chamadas          |
| `GET`    | `/api/status`               | Status atual da fila e guichês         |
| `POST`   | `/api/expediente/encerrar`  | Encerra o expediente manualmente       |
| `GET`    | `/api/relatorios/diario`    | Relatório diário (query: `?data=`)     |
| `GET`    | `/api/relatorios/mensal`    | Relatório mensal (query: `?ano=&mes=`) |
| `GET`    | `/health`                   | Health check do servidor               |

---

## 🖥️ Telas do Sistema

- **Totem** — Cliente seleciona o tipo de serviço e recebe a senha impressa/exibida
- **Painel** — Tela pública exibindo as últimas 5 senhas chamadas e o guichê correspondente
- **Atendente** — Interface para chamar a próxima senha e finalizar o atendimento
- **Relatório** — Consulta de relatórios diários e mensais com resumo e detalhamento

---

## 🗓️ Regras de Negócio

- Atendimento funciona de **segunda a sábado, das 07h às 17h**
- O expediente é encerrado automaticamente às 17h via cron job (fuso: `America/Recife`)
- A fila respeita **prioridade**: após uma senha SP, o sistema prefere SE e SG antes de chamar outro SP
- Senhas têm **5% de chance de descarte imediato** na emissão (simulação de desistência)
- O formato do código da senha é `YYMMDD-TIPO####` (ex: `260530-SP0001`)
- 3 guichês disponíveis; cada guichê só recebe uma senha por vez

---

## 🗃️ Banco de Dados

O projeto usa **SQLite** em runtime (arquivo `backend/data/atendimento.db`). O arquivo `database/schema.sql` contém o schema equivalente em **MySQL 8.0** para referência e deploy em produção.

**Tabelas principais:**

| Tabela          | Descrição                                      |
|-----------------|------------------------------------------------|
| `guiches`       | Registro dos guichês e seus status             |
| `senhas`        | Todas as senhas emitidas com ciclo de vida     |
| `chamadas_log`  | Log das chamadas para o painel                 |
| `expediente`    | Configuração e controle do horário de trabalho |

---

## 👥 Autores

Mikael Lucas da Silva - 01815744

---

## 📄 Licença

Este projeto é de uso acadêmico.
