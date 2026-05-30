-- ============================================================
-- SISTEMA DE CONTROLE DE ATENDIMENTO - LABORATÓRIO MÉDICO
-- MySQL 8.0 - Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS controle_atendimento
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE controle_atendimento;

-- ------------------------------------------------------------
-- GUICHÊS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS guiches (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  numero    TINYINT UNSIGNED NOT NULL UNIQUE,   -- 1, 2, 3
  status    ENUM('livre','ocupado') NOT NULL DEFAULT 'livre',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO guiches (numero, status) VALUES (1,'livre'),(2,'livre'),(3,'livre');

-- ------------------------------------------------------------
-- SENHAS
-- formato: YYMMDD-PPSQ  (PP = SP | SG | SE)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS senhas (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo          VARCHAR(14) NOT NULL UNIQUE,   -- ex: 250529-SP0001
  tipo            ENUM('SP','SG','SE') NOT NULL,
  sequencia       MEDIUMINT UNSIGNED NOT NULL,   -- contador por tipo/dia
  status          ENUM('aguardando','chamada','atendida','descartada') NOT NULL DEFAULT 'aguardando',
  emitida_em      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  chamada_em      DATETIME NULL,
  atendimento_inicio DATETIME NULL,
  atendimento_fim DATETIME NULL,
  guiche_id       INT UNSIGNED NULL,
  tm_segundos     SMALLINT UNSIGNED NULL,        -- tempo real de atendimento
  FOREIGN KEY (guiche_id) REFERENCES guiches(id)
);

-- índices para relatórios
CREATE INDEX idx_senhas_tipo       ON senhas(tipo);
CREATE INDEX idx_senhas_status     ON senhas(status);
CREATE INDEX idx_senhas_emitida_em ON senhas(emitida_em);

-- ------------------------------------------------------------
-- LOG DE CHAMADAS (painel — últimas 5)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chamadas_log (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  senha_id   BIGINT UNSIGNED NOT NULL,
  guiche_id  INT UNSIGNED NOT NULL,
  chamada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (senha_id)  REFERENCES senhas(id),
  FOREIGN KEY (guiche_id) REFERENCES guiches(id)
);

-- ------------------------------------------------------------
-- CONFIGURAÇÕES DE EXPEDIENTE (auditável)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expediente (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  data         DATE NOT NULL UNIQUE,
  inicio       TIME NOT NULL DEFAULT '07:00:00',
  fim          TIME NOT NULL DEFAULT '17:00:00',
  encerrado    TINYINT(1) NOT NULL DEFAULT 0,
  encerrado_em DATETIME NULL
);

-- ------------------------------------------------------------
-- VIEW: resumo diário (base dos relatórios)
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_resumo_diario AS
SELECT
  DATE(emitida_em)                                     AS data,
  tipo,
  COUNT(*)                                             AS total_emitidas,
  SUM(status = 'atendida')                             AS total_atendidas,
  SUM(status = 'descartada')                           AS total_descartadas,
  SUM(status = 'aguardando' OR status = 'chamada')     AS total_pendentes,
  ROUND(AVG(CASE WHEN status='atendida' THEN tm_segundos END) / 60, 2) AS tm_medio_min
FROM senhas
GROUP BY DATE(emitida_em), tipo;

-- ------------------------------------------------------------
-- PROCEDURE: encerrar expediente (descarta pendentes)
-- ------------------------------------------------------------
DELIMITER $$
CREATE PROCEDURE IF NOT EXISTS sp_encerrar_expediente(IN p_data DATE)
BEGIN
  UPDATE senhas
  SET status = 'descartada'
  WHERE DATE(emitida_em) = p_data
    AND status IN ('aguardando','chamada');

  UPDATE expediente
  SET encerrado = 1, encerrado_em = NOW()
  WHERE data = p_data;
END$$
DELIMITER ;
