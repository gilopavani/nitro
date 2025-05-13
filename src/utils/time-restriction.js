/**
 * Utilitário para verificar restrições de horário de operação
 */
const logger = require('./logger');

/**
 * Verifica se o sistema pode operar no horário atual
 * Restrições:
 * - Entre 00:00 e 06:45 (madrugada)
 * - Entre 12:00 e 14:00 (horário de almoço)
 * 
 * @returns {boolean} True se estiver em um horário permitido, False caso contrário
 */
function verificarHorarioPermitido() {
  // Verifica se a restrição de horário está ativa
  if (process.env.DISABLE_TIME_RESTRICTION === 'true') {
    logger.info('Restrição de horário desativada por configuração');
    return true;
  }

  const agora = new Date();
  const hora = agora.getHours();
  const minutos = agora.getMinutes();
  
  // Converte o horário atual para minutos desde o início do dia
  const horarioEmMinutos = hora * 60 + minutos;
  
  // Define as restrições em minutos desde o início do dia
  const restricoes = [
    { inicio: 0, fim: 6 * 60 + 45 }, // Das 00:00 às 06:45
    { inicio: 12 * 60, fim: 14 * 60 } // Das 12:00 às 14:00
  ];
  
  // Verifica se o horário atual está dentro de algum período restrito
  for (const restricao of restricoes) {
    if (horarioEmMinutos >= restricao.inicio && horarioEmMinutos < restricao.fim) {
      const inicioHora = Math.floor(restricao.inicio / 60);
      const inicioMinuto = restricao.inicio % 60;
      const fimHora = Math.floor(restricao.fim / 60);
      const fimMinuto = restricao.fim % 60;
      
      logger.warn(
        `Operação não permitida no horário atual (${hora.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}). ` +
        `Horário restrito: ${inicioHora.toString().padStart(2, '0')}:${inicioMinuto.toString().padStart(2, '0')} até ` +
        `${fimHora.toString().padStart(2, '0')}:${fimMinuto.toString().padStart(2, '0')}`
      );
      
      return false;
    }
  }
  
  logger.info(`Operação permitida no horário atual: ${hora.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`);
  return true;
}

module.exports = {
  verificarHorarioPermitido
};
