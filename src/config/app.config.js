/**
 * Configurações centralizadas da aplicação
 */
require('dotenv').config();

module.exports = {
  // Configurações do Nitrotype
  nitrotype: {
    username: process.env.NITROTYPE_USERNAME,
    password: process.env.NITROTYPE_PASSWORD,
  },
  
  // Configurações de corridas
  race: {
    count: parseInt(process.env.RACE_COUNT || '3', 10),
    intervalBetweenRaces: parseInt(process.env.RACE_INTERVAL || '4320', 10),
  },
  
  // Configurações de sessão
  session: {
    interval: parseInt(process.env.SESSION_INTERVAL || '120000', 10),
    retryDelay: 1 * 60 * 1000, // 1 minuto
  },
  
  // Configuração de restrição de horário
  timeRestriction: {
    checkInterval: 15 * 60 * 1000, // 15 minutos
  }
};
