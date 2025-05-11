/**
 * Módulo de logging para registro de eventos
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Criar pasta de logs se não existir
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Formato de data para os logs
const getTimestamp = () => {
  return new Date().toISOString();
};

// Caminho do arquivo de log
const getLogFilePath = () => {
  const date = new Date();
  const filename = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.log`;
  return path.join(logsDir, filename);
};

// Escrever no arquivo de log
const writeToFile = (message, level) => {
  const logMessage = `[${getTimestamp()}] [${level}] ${message}\n`;
  fs.appendFileSync(getLogFilePath(), logMessage);
};

// Logger
const logger = {
  debug: (message) => {
    if (process.env.DEBUG === 'true') {
      console.log(`[DEBUG] ${message}`);
      writeToFile(message, 'DEBUG');
    }
  },
  info: (message) => {
    console.log(`[INFO] ${message}`);
    writeToFile(message, 'INFO');
  },
  warn: (message) => {
    console.warn(`[WARN] ${message}`);
    writeToFile(message, 'WARN');
  },
  error: (message) => {
    console.error(`[ERROR] ${message}`);
    writeToFile(message, 'ERROR');
  }
};

module.exports = logger;