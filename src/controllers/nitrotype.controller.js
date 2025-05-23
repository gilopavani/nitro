/**
 * Controlador para coordenar ações relacionadas ao Nitrotype
 */
const nitrotypeService = require('../services/nitrotype.service');
const logger = require('../utils/logger');

class NitroTypeController {
  /**
   * Inicia uma sessão no Nitrotype
   */
  async iniciarSessao() {
    try {
      logger.info('Iniciando sessão no Nitrotype...');
      
      // Acessa a página de login e realiza o login
      const loginRealizado = await nitrotypeService.realizarLogin();
      
      if (!loginRealizado) {
        throw new Error('Não foi possível realizar o login');
      }
      
      logger.info('Sessão iniciada com sucesso');
      return true;
    } catch (error) {
      logger.error(`Erro ao iniciar sessão: ${error.message}`);
      
      // Tenta fechar o navegador em caso de erro
      await nitrotypeService.fecharNavegador();
      return false;
    }
  }

  /**
   * Finaliza a sessão do Nitrotype
   */
  async finalizarSessao() {
    try {
      logger.info('Finalizando sessão...');
      await nitrotypeService.fecharNavegador();
      logger.info('Sessão finalizada com sucesso');
      return true;
    } catch (error) {
      logger.error(`Erro ao finalizar sessão: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Inicia e completa uma corrida no Nitrotype
   * @returns {Promise<boolean>} True se a corrida for completada com sucesso
   */
  async realizarCorrida() {
    try {
      logger.info('Iniciando corrida no Nitrotype...');
      
      // Inicia uma corrida
      const corridaSucesso = await nitrotypeService.iniciarCorrida();
      
      if (!corridaSucesso) {
        throw new Error('Não foi possível completar a corrida');
      }
      
      logger.info('Corrida completada com sucesso');
      return true;
    } catch (error) {
      logger.error(`Erro ao realizar corrida: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Realiza múltiplas corridas consecutivas
   * @param {number} quantidade - Número de corridas a serem realizadas
   * @returns {Promise<number>} Número de corridas concluídas com sucesso
   */
  async realizarMultiplasCorridas(quantidade = 3) {
    try {
      logger.info(`Iniciando série de ${quantidade} corridas...`);
      
      let corridasRealizadas = 0;
      let continuarCorridas = true;
      
      while (corridasRealizadas < quantidade && continuarCorridas) {
        logger.info(`Iniciando corrida ${corridasRealizadas + 1} de ${quantidade}`);
        
        // Realiza uma corrida
        const corridaSucesso = await this.realizarCorrida();
        
        if (corridaSucesso) {
          corridasRealizadas++;
          logger.info(`Corrida ${corridasRealizadas} concluída com sucesso!`);
          
          // Se não for a última corrida, aguarda antes de iniciar a próxima
          if (corridasRealizadas < quantidade) {
            const tempoEspera = 7000; // 7 segundos conforme solicitado
            logger.info(`Aguardando ${tempoEspera/1000} segundos antes da próxima corrida...`);
            await new Promise(resolve => setTimeout(resolve, tempoEspera));
          }
        } else {
          logger.error(`Falha na corrida ${corridasRealizadas + 1}. Interrompendo a sequência.`);
          continuarCorridas = false;
        }
      }
      
      logger.info(`Série de corridas finalizada. ${corridasRealizadas} de ${quantidade} corridas concluídas com sucesso.`);
      return corridasRealizadas;
    } catch (error) {
      logger.error(`Erro ao realizar múltiplas corridas: ${error.message}`);
      return 0;
    }
  }
}

module.exports = new NitroTypeController();