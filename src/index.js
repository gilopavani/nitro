/**
 * Ponto de entrada principal para a aplicação
 */
require('dotenv').config();
const nitroTypeController = require('./controllers/nitrotype.controller');
const logger = require('./utils/logger');
const timeChecker = require('./utils/time-checker');
const cleanup = require('./utils/cleanup');

/**
 * Função principal que inicia a aplicação
 */
async function main() {
  let sessaoAtual = 0;
  const infinito = true; // Flag para controle de execução infinita
  
  while (infinito) {
    // Verifica se o horário atual é permitido para execução
    if (!timeChecker.verificarHorarioPermitido()) {
      // Aguarda 15 minutos antes de verificar novamente
      const tempoEsperaHorarioRestrito = 15 * 60 * 1000; // 15 minutos
      logger.info(`Aguardando ${tempoEsperaHorarioRestrito/60000} minutos antes de verificar o horário novamente...`);
      await new Promise(resolve => setTimeout(resolve, tempoEsperaHorarioRestrito));
      continue;
    }
    
    sessaoAtual++;
    
    try {
      logger.info(`-------------------------`);
      logger.info(`INICIANDO SESSÃO #${sessaoAtual}`);
      logger.info(`-------------------------`);
      
      // Verifica se deve limpar a pasta user_data a cada 3 sessões
      cleanup.verificarLimpezaPeriodica(3);
      
      // Iniciar sessão no Nitrotype
      const loginSucesso = await nitroTypeController.iniciarSessao();
      
      if (!loginSucesso) {
        logger.error('Não foi possível realizar login ou verificar autenticação');
        await nitroTypeController.finalizarSessao();
        
        // Aguarda antes de tentar novamente (5 minutos)
        const tempoEsperaErro = 5 * 60 * 1000;
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
      
      // Aguarda um período de tempo antes de iniciar nova sessão
      const tempoEsperaEntreSessoes = parseInt(process.env.SESSION_INTERVAL || '120000', 10);
      logger.info(`Aguardando ${tempoEsperaEntreSessoes/1000} segundos antes de iniciar nova sessão...`);
      await new Promise(resolve => setTimeout(resolve, tempoEsperaEntreSessoes));
      
    } catch (error) {
      logger.error(`Erro na execução da sessão #${sessaoAtual}: ${error.message}`);
      
      // Garante que o navegador será fechado em caso de erro
      await nitroTypeController.finalizarSessao();
      
      // Aguarda antes de tentar novamente (3 minutos)
      const tempoEsperaErro = 3 * 60 * 1000;
      logger.info(`Aguardando ${tempoEsperaErro/60000} minutos antes de tentar novamente...`);
      await new Promise(resolve => setTimeout(resolve, tempoEsperaErro));
    }
  }
}

// Executa a função principal
main();