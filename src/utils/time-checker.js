/**
 * Utilitário para verificar restrições de horário
 */
const logger = require('./logger');

/**
 * Verifica se o horário atual está dentro dos períodos restritos
 * @returns {boolean} True se estiver em um período restrito, false caso contrário
 */
function estaEmHorarioRestrito() {
  const agora = new Date();
  const hora = agora.getHours();
  
  // Restrição noturna: entre 00:00 e 07:00
  const restricaoNoturna = hora >= 0 && hora < 7;
  
  // Restrição do almoço: entre 12:00 e 14:00
  const restricaoAlmoco = hora >= 12 && hora < 14;
  
  // Se qualquer restrição for verdadeira, o horário é restrito
  return restricaoNoturna || restricaoAlmoco;
}

/**
 * Verifica se o horário atual é permitido para execução
 * Se não for, registra o motivo no log
 * @returns {boolean} True se o horário for permitido para execução
 */
function verificarHorarioPermitido() {
  if (estaEmHorarioRestrito()) {
    const agora = new Date();
    const hora = agora.getHours();
    let motivo = '';
    
    if (hora >= 0 && hora < 7) {
      motivo = 'horário noturno (00:00-07:00)';
    } else if (hora >= 12 && hora < 14) {
      motivo = 'horário de almoço (12:00-14:00)';
    }
    
    logger.info(`Bot não será executado durante o ${motivo}. Próxima verificação em 15 minutos.`);
    return false;
  }
  
  return true;
}

module.exports = {
  estaEmHorarioRestrito,
  verificarHorarioPermitido
};
