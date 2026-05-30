require('dotenv').config();
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3')

const DB_PATH = process.env.DB_PATH ||'./data/atendimento.db';

const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive:true });

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
    CREATE TABLE IF NOT EXISTS guiches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero INTEGER NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'livre' CHECK(status IN ('livre','ocupado')), 
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')));
      
    CREATE TABLE IF NOT EXISTS senhas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL UNIQUE, 
      tipo TEXT NOT NULL CHECK(tipo IN('SP','SG','SE')),
      sequencia INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'aguardando' CHECK(status IN ('aguardando','chamada','atendida','descartada')),
      emitida_em  TEXT NOT NULL DEFAULT(datetime('now','localtime')),
      chamada_em TEXT,
      atendimento_inicio TEXT,
      atendimento_fim TEXT,
      guiche_id INTEGER REFERENCES guiches(id),
      tm_segundos INTEGER
      );
      
    CREATE INDEX IF NOT EXISTS idx_senhas_tipo ON senhas(tipo);
    CREATE INDEX IF NOT EXISTS idx_senhas_status ON senhas(status);
    CREATE INDEX IF NOT EXISTS idx_senhas_emitida_em ON senhas(emitida_em);
      
    CREATE TABLE IF NOT EXISTS chamadas_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      senha_id INTEGER NOT NULL REFERENCES senhas(id),
      guiche_id INTEGER NOT NULL REFERENCES guiches(id),
      chamada_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
        
    CREATE TABLE IF NOT EXISTS expediente (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL UNIQUE,
      inicio TEXT NOT NULL DEFAULT '07:00:00',
      fim TEXT NOT NULL DEFAULT '17:00:00',
      encerrado INTEGER NOT NULL DEFAULT 0,
      encerramento_em TEXT
      );
    `);

const seedGuiches = db.prepare(
  `INSERT OR IGNORE INTO guiches (numero, status) VALUES (?, 'livre')`
);
db.transaction(() => {
  [1, 2, 3].forEach(n => seedGuiches.run(n));
})();

module.exports = db;

    