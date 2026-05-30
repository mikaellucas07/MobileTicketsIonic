/**
 * senha service - SQLite (better-sqlite3)
 * API síncrona: prepare().get() / prepare().run() / db.transaction()
 */

const db = require('../config/database.js');

function calcularTM(tipo) {
  switch (tipo) {
    case 'SP': {
      const variacao = (Math.random() < 0.5 ? 1 : -1) *
Math.floor(Math.random() * 5 * 60);
      return 15 * 60 + variacao;
    }
    case 'SG': {
      const variacao = (Math.random() < 0.5 ? 1 : -1) *
Math.floor(Math.random() * 3 * 60);
      return 5 * 60 + variacao;
    }
    case 'SE':
      return Math.random() < 0.95 ? 60 : 5 * 60;
    default:
      return 60;
  }
}

function gerarCodigo(tipo,seq,data = new Date()){
  const yy = String(data.getFullYear()).slice(-2);
  const mm = String(data.getMonth() + 1).padStart(2,'0');
  const dd = String(data.getDate()).padStart(2,'0');
  return `${yy}${mm}${dd}-${tipo}${String(seq).padStart(4, '0')}`
}

function dentroDoExpediente() {
  const agora = new Date();
  const minutos = agora.getHours() * 60 + agora.getMinutes();
  return minutos >= 7 * 60 && minutos < 17 * 60;
}

function agora() {
  return new Date().toISOString().replace('T',' ').slice(0, 19);
}

function hoje(){
  return new Date().toISOString().slice(0, 10);
}

const stmts = {
  proximaSeq: db.prepare(
    `SELECT COALESCE(MAX(sequencia),0) + 1 AS proxima
    FROM senhas WHERE tipo = ? AND date(emitida_em) = ?`
  ),
  inserirSenha: db.prepare(
    `INSERT INTO senhas (codigo, tipo, sequencia, status, emitida_em)
    VALUES (?, ?, ?, ?, ?)`
  ),
  ultimaChamada: db.prepare(
    `SELECT tipo FROM senhas 
    WHERE status IN ('chamada','atendida') AND date(emitida_em) = ?
    ORDER BY chamada_em DESC LIMIT 1`
  ),
  proximaFila: db.prepare(
    `SELECT id, codigo, tipo, sequencia FROM senhas
    WHERE status = 'aguardando' AND tipo = ? AND date(emitida_em) = ?
    ORDER BY emitida_em ASC LIMIT 1`
  ),
  guicheLivre: db.prepare(
    `SELECT id, numero FROM guiches WHERE status = 'livre' LIMIT 1`
  ),
  chamarSenha: db.prepare(
    `UPDATE senhas 
    SET status = 'chamada', chamada_em = ?, atendimento_inicio = ?, guiche_id = ?, tm_segundos = ?
    WHERE id = ?`
  ),
  ocuparGuiche: db.prepare(
    `UPDATE guiches SET status = 'ocupado', updated_at = ? WHERE id = ?`
  ),
  logChamada: db.prepare(
    `INSERT INTO chamadas_log (senha_id, guiche_id, chamada_em)
   VALUES (?, ?, ?)`
  ),
  finalizarSenha: db.prepare(
    `UPDATE senhas SET status = 'atendida', atendimento_fim = ? WHERE id = ?`
  ),
  liberarGuiche: db.prepare(
    `UPDATE guiches SET status = 'livre', updated_at = ? WHERE id = ?`
  ), 
  ultimasChamadas: db.prepare(
    `SELECT s.codigo, s.tipo, s.status, g.numero AS guiche, s.chamada_em
    FROM chamadas_log cl
    JOIN senhas s ON s.id = cl.senha_id
    JOIN guiches g ON g.id = cl.guiche_id
    ORDER BY cl.chamada_em DESC LIMIT 5`
  ),
  filaStatus: db.prepare(
    `SELECT tipo, COUNT(*) AS aguardando
    FROM senhas 
    WHERE status = 'aguardando' AND date(emitida_em) = ?
    GROUP BY tipo`
  ),
  guichesStatus: db.prepare(
    `SELECT numero, status FROM guiches ORDER BY numero`
  ),
  encerrarPendentes: db.prepare(
    `UPDATE senhas SET status = 'descartada'
    WHERE date(emitida_em) = ? AND status IN ('aguardando', 'chamada')`
  ),
  //Relatótios
  resumoDiario: db.prepare(
    `SELECT date(emitida_em) AS data, tipo, COUNT(*) AS total_emitidas, 
    SUM(CASE WHEN status = 'atendida' THEN 1 ELSE 0 END) AS total_atendidas, 
    SUM(CASE WHEN status = 'descartada' THEN 1 ELSE 0 END) AS tota_descartadas,
    SUM(CASE WHEN status IN ('aguardando','chamada')THEN 1 ELSE 0 END) AS total_pendentes,
    ROUND(AVG(CASE WHEN status = 'atendida' THEN tm_segundos END) / 60.0, 2) AS tm_medio_min 
    FROM senhas 
    WHERE date(emitida_em) = ?
    GROUP BY date(emitida_em), tipo`
  ),
  detalhaDiario: db.prepare(
    `SELECT s.codigo, s.tipo, s.status, s.emitida_em, s.chamada_em, s.atendimento_inicio, s.atendimento_fim, s.tm_segundos, g.numero AS guiche 
    FROM senhas s
    LEFT JOIN guiches g ON g.id = s.guiche_id
    WHERE date(s.emitida_em) = ?
    ORDER BY s.emitida_em ASC`
  ),
  resumoMensal: db.prepare(
    `SELECT date(emitida_em) AS data, tipo, COUNT(*) AS total_emitidas,
    SUM(CASE WHEN status = 'atendida' THEN 1 ELSE 0 END) AS total_atendidas,
    SUM(CASE WHEN status = 'descartada' THEN 1 ELSE 0 END) AS total_descartadas,
    SUM(CASE WHEN status IN ('aguardando','chamada') THEN 1 ELSE 0 END) AS total_pendentes,
    ROUND(AVG(CASE WHEN status = 'atendida' THEN tm_segundos END) / 60.0, 2) AS tm_medio_min
    FROM senhas
    WHERE date(emitida_em) BETWEEN ? AND ?
    GROUP BY date(emitida_em), tipo
    ORDER BY date(emitida_em), tipo`
  ),
  buscarSenha: db.prepare(
  `SELECT * FROM senhas WHERE id = ?`
  ),
};

const SenhaService = {
  emitirSenha(tipo) {
    if (!['SP', 'SG', 'SE'].includes(tipo)){
      throw new Error(`Tipo inválido: ${tipo}`);
    }
    if (!dentroDoExpediente()){
      throw new Error('Fora do expediente. Atendimento das 07h às 17h.');
    }
    const dataStr = hoje();
    const ts = agora();

    const emitir = db.transaction(() => {
      const { proxima: seq } = stmts.proximaSeq.get(tipo, dataStr);
      const codigo = gerarCodigo(tipo, seq);
      const descartarImediato = Math.random() < 0.05;
      const status = descartarImediato ? 'descartada' : 'aguardando';

      const { lastInsertRowid: id} = stmts.inserirSenha.run(codigo, tipo, seq, status, ts);
      return { id, codigo, tipo, seq, descartada: descartarImediato };
    });

    return emitir();
  },

  proximaSenha(){
    const dataStr = hoje();
    const ultima = stmts.ultimaChamada.get(dataStr);
    const ultimoTipo = ultima ? ultima.tipo : null;

    const candidatos = ultimoTipo === 'SP' ?['SE', 'SG'] : ['SP', 'SE', 'SG'];

    for (const tipo of candidatos) {
      const senha = stmts.proximaFila.get(tipo, dataStr);
      if (senha) return senha;
    }
    return null;
  },
  chamarProxima() {
    if (!dentroDoExpediente()) throw new Error('Fora do expediente.');

    const chamar = db.transaction(() => {
      const guiche = stmts.guicheLivre.get();
      if (!guiche) return { sucesso: false, mensagem: 'Nenhum guichê livre no momento.' };

      const senha = this.proximaSenha();
      if (!senha) return { sucesso: false, mensagem: 'Fila vazia.' };

      const tm = calcularTM(senha.tipo);
      const ts = agora();

      stmts.chamarSenha.run(ts, ts, guiche.id, tm, senha.id);
      stmts.ocuparGuiche.run(ts, guiche.id);
      stmts.logChamada.run(senha.id, guiche.id, ts);

      return {
        sucesso: true,
        senha: { ...senha, guiche: guiche.numero, tm_segundos: tm, chamada_em: ts },
      };
    });

    return chamar();
  },
  finalizarAtendimento(senhaId) {
    const finalizar = db.transaction(() => {
      const senha = stmts.buscarSenha.get(senhaId);
      if(!senha || senha.status !== 'chamada') {
        throw new Error('Senha inválida ou não está em atendimento.');
      }
      const ts = agora();
      stmts.finalizarSenha.run(ts, senhaId);
      stmts.liberarGuiche.run(ts, senha.guiche_id);
      return { sucesso: true };
    });

    return finalizar();
  },

  ultimasChamadas(){
    return stmts.ultimasChamadas.all();
  },

  statusFila() {
    return{
      fila: stmts.filaStatus.all(hoje()),
      guiches: stmts.guichesStatus.all(),
      expediente: dentroDoExpediente(),
    };
  },

  encerrarExpediente(){
    stmts.encerrarPendentes.run(hoje());
    return { sucesso: true, mensagem: 'Expediente encerraado. Senhas pendentes descartaadas.' };
  }, 

  relatorioDiario(data){
    const d = data || hoje();
    return {
      data,
      resumo: stmts.resumoDiario.all(d),
      detalhado: stmts.detalhaDiario.all(d),
    };
  },

  relatorMensal(ano, mes){
    const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
    const fim = `${ano}-${String(mes).padStart(2,'0')}-31`;
    return {
      ano, mes, 
      resumo: stmts.resumoMensal.all(inicio, fim),
    };
  },
};

module.exports = SenhaService;