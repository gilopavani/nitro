/**
 * Ponto de entrada principal para a aplicação
 */
require('dotenv').config();
const nitroTypeController = require('./controllers/nitrotype.controller');
const logger = require('./utils/logger');
const { verificarHorarioPermitido } = require('./utils/time-restriction');

/**
 * Função principal que inicia a aplicação
 */
async function main() {
  let sessaoAtual = 0;
  const infinito = true; // Flag para controle de execução infinita
  
  while (infinito) {
    sessaoAtual++;
    
    try {
      logger.info(`-------------------------`);
      logger.info(`INICIANDO SESSÃO #${sessaoAtual}`);
      logger.info(`-------------------------`);
      
      // Verifica se o horário atual é permitido para operação
      if (!verificarHorarioPermitido()) {
        logger.info('Aguardando até o próximo horário permitido...');
        // Aguarda 15 minutos antes de verificar novamente
        const tempoEsperaHorario = 15 * 60 * 1000;
        await new Promise(resolve => setTimeout(resolve, tempoEsperaHorario));
        continue;
      }
      
      // Iniciar sessão no Nitrotype
      const loginSucesso = await nitroTypeController.iniciarSessao();
      
      if (!loginSucesso) {
        logger.error('Não foi possível realizar login ou verificar autenticação');
        await nitroTypeController.finalizarSessao();
        
        // Aguarda antes de tentar novamente (1 minutos)
        const tempoEsperaErro = 1 * 60 * 1000;
        logger.info(`Aguardando ${tempoEsperaErro/60000} minutos antes de tentar novamente...`);
        await new Promise(resolve => setTimeout(resolve, tempoEsperaErro));
        continue;
      }
      
      logger.info('Autenticação realizada com sucesso.');
      
      // Realizar múltiplas corridas (configurável via .env ou padrão 3)
      const quantidadeCorridas = parseInt(process.env.RACE_COUNT || '3', 10);
      logger.info(`Iniciando série de ${quantidadeCorridas} corridas...`);
      
      const corridasRealizadas = await nitroTypeController.realizarMultiplasCorridas(quantidadeCorridas);
      
      if (corridasRealizadas > 0) {
        logger.info(`${corridasRealizadas} corridas concluídas com sucesso!`);
      } else {
        logger.error('Não foi possível completar nenhuma corrida');
      }
      
      // Finaliza a sessão (fecha o navegador)
      await nitroTypeController.finalizarSessao();
      
      logger.info('Sessão finalizada com sucesso');
      
      // Aguarda um período de tempo antes de iniciar nova sessão (2 minutos)
      const tempoEsperaEntreSessoes = parseInt(process.env.SESSION_INTERVAL || '120000', 10);
      logger.info(`Aguardando ${tempoEsperaEntreSessoes/1000} segundos antes de iniciar nova sessão...`);
      await new Promise(resolve => setTimeout(resolve, tempoEsperaEntreSessoes));
      
    } catch (error) {
      logger.error(`Erro na execução da sessão #${sessaoAtual}: ${error.message}`);
      
      // Garante que o navegador será fechado em caso de erro
      await nitroTypeController.finalizarSessao();
      
      // Aguarda antes de tentar novamente (1 minutos)
      const tempoEsperaErro = 1 * 60 * 1000;
      logger.info(`Aguardando ${tempoEsperaErro/60000} minutos antes de tentar novamente...`);
      await new Promise(resolve => setTimeout(resolve, tempoEsperaErro));
    }
  }
}

// Executa a função principal
main();