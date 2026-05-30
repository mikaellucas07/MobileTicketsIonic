const SenhaService = require('../services/senhaService');

const SenhaController = {
  async emitir(req, res) {
    try {
      const { tipo } = req.body;
      if (!tipo) return res.status(400).json({ erro: 'Campo "tipo" é obrigatório.' });
      const resultado = await SenhaService.emitirSenha(tipo);
      res.status(201).json(resultado);
    } catch (err) {
      res.status(400).json({ erro: err.message });
    }
  },

  async chamarProxima(req, res) {
    try {
      const resultado = await SenhaService.chamarProxima();
      res.json(resultado);
    } catch (err) {
      res.status(400).json({ erro: err.message });
    }
  },

  async finalizar(req, res) {
    try {
      const { id } = req.params;
      const resultado = await SenhaService.finalizarAtendimento(parseInt(id));
      res.json(resultado);
    } catch (err) {
      res.status(400).json({ erro: err.message });
    }
  },

  async painel(req, res) {
    try {
      const chamadas = await SenhaService.ultimasChamadas();
      res.json(chamadas);
    } catch (err) {
      res.status(500).json({ erro: err.message });
    }
  },

  async status(req, res) {
    try {
      const status = await SenhaService.statusFila();
      res.json(status);
    } catch (err) {
      res.status(500).json({ erro: err.message });
    }
  },

  async encerrar(req, res) {
    try {
      const resultado = await SenhaService.encerrarExpediente();
      res.json(resultado);
    } catch (err) {
      res.status(500).json({ erro: err.message });
    }
  },

  async relatorioDiario(req, res) {
    try {
      const { data } = req.query;
      const relatorio = await SenhaService.relatorioDiario(data);
      res.json(relatorio);
    } catch (err) {
      res.status(500).json({ erro: err.message });
    }
  },

  async relatorioMensal(req, res) {
    try {
      const { ano, mes } = req.query;
      if (!ano || !mes) return res.status(400).json({ erro: 'Parâmetros "ano" e "mes" são obrigatórios.' });
      const relatorio = await SenhaService.relatorioMensal(parseInt(ano), parseInt(mes));
      res.json(relatorio);
    } catch (err) {
      res.status(500).json({ erro: err.message });
    }
  },
};

module.exports = SenhaController;
