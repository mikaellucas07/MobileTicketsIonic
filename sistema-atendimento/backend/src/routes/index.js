const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/senhaController');

// Totem — emissão de senha
router.post('/senhas/emitir',            ctrl.emitir);

// Atendente — fluxo de guichê
router.post('/senhas/chamar',            ctrl.chamarProxima);
router.patch('/senhas/:id/finalizar',    ctrl.finalizar);

// Painel público — últimas 5 chamadas
router.get('/painel',                    ctrl.painel);

// Status geral da fila
router.get('/status',                    ctrl.status);

// Administração
router.post('/expediente/encerrar',      ctrl.encerrar);

// Relatórios
router.get('/relatorios/diario',         ctrl.relatorioDiario);
router.get('/relatorios/mensal',         ctrl.relatorioMensal);

module.exports = router;
