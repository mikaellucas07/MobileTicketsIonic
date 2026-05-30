require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const cron     = require('node-cron');
const routes   = require('./routes');
const SenhaService = require('./services/senhaService');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middlewares ────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Rotas ──────────────────────────────────────────────────────────────────
app.use('/api', routes);

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', hora: new Date() }));

// ── Cron: encerrar expediente automaticamente às 17h ──────────────────────
cron.schedule('0 17 * * 1-6', async () => {
  console.log('[CRON] Encerrando expediente...');
  try {
    await SenhaService.encerrarExpediente();
    console.log('[CRON] Expediente encerrado com sucesso.');
  } catch (err) {
    console.error('[CRON] Erro ao encerrar expediente:', err.message);
  }
}, { timezone: 'America/Recife' });

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = app;
