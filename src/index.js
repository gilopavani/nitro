/**
 * Ponto de entrada principal para a aplicação
 */
require('dotenv').config();
const nitroTypeController = require('./controllers/nitrotype.controller');
const logger = require('./utils/logger');
const { verificarHorarioPermitido } = require('./utils/time-restriction');
const config = require('./config/app.config');
const metrics = require('./utils/metrics');

/**
 * Executa uma sessão completa
 */
async function executarSessao(numeroSessao) {
  logger.info(`-------------------------`);
  logger.info(`INICIANDO SESSÃO #${numeroSessao}`);
  logger.info(`-------------------------`);
  
  metrics.registrarInicioSessao();
  
  try {
    // Iniciar sessão no Nitrotype
    const loginSucesso = await nitroTypeController.iniciarSessao();
    
    if (!loginSucesso) {
      logger.error('Não foi possível realizar login ou verificar autenticação');
      await nitroTypeController.finalizarSessao();
      metrics.registrarFalhaSessao();
      metrics.registrarErro('login');
      
      // Aguarda antes de tentar novamente
      await aguardarTempo(config.session.retryDelay, 'minutos', 'Aguardando antes de tentar novamente');
      return false;
    }
    
    logger.info('Autenticação realizada com sucesso.');
    
    // Realizar múltiplas corridas
    const quantidadeCorridas = config.race.count;
    logger.info(`Iniciando série de ${quantidadeCorridas} corridas...`);
    
    const corridasRealizadas = await nitroTypeController.realizarMultiplasCorridas(quantidadeCorridas);
    
    if (corridasRealizadas > 0) {
      logger.info(`${corridasRealizadas} corridas concluídas com sucesso!`);
      metrics.registrarSucessoSessao();
      return true;
    } else {
      logger.error('Não foi possível completar nenhuma corrida');
      metrics.registrarFalhaSessao();
      metrics.registrarErro('corrida');
      return false;
    }
  } catch (error) {
    logger.error(`Erro na execução da sessão #${numeroSessao}: ${error.message}`);
    metrics.registrarFalhaSessao();
    metrics.registrarErro('outros');
    return false;
  } finally {
    // Finaliza a sessão (fecha o navegador)
    await nitroTypeController.finalizarSessao();
    logger.info('Sessão finalizada');
  }
}

/**
 * Função utilitária para aguardar um tempo especificado
 */
async function aguardarTempo(tempo, unidade, mensagem) {
  const tempoFormatado = unidade === 'minutos' ? tempo / 60000 : tempo / 1000;
  logger.info(`${mensagem}: ${tempoFormatado} ${unidade}...`);
  await new Promise(resolve => setTimeout(resolve, tempo));
}

/**
 * Função principal que inicia a aplicação
 */
async function main() {
  let sessaoAtual = 0;
  const infinito = true; // Flag para controle de execução infinita
  
  while (infinito) {
    sessaoAtual++;
    
    // Verifica se o horário atual é permitido para operação
    if (!verificarHorarioPermitido()) {
      logger.info('Aguardando até o próximo horário permitido...');
      await aguardarTempo(config.timeRestriction.checkInterval, 'minutos', 'Aguardando próximo horário permitido');
      continue;
    }
    
    // Executa uma sessão completa
    await executarSessao(sessaoAtual);
    
    // Exibe resumo das métricas
    const resumo = metrics.getResumo();
    logger.info('------- RESUMO DE MÉTRICAS --------');
    logger.info(`Sessões bem-sucedidas: ${resumo.sessoes}`);
    logger.info(`Corridas bem-sucedidas: ${resumo.corridas}`);
    logger.info(`Tempo médio de corrida: ${resumo.tempoMedio}`);
    logger.info('----------------------------------');
    
    // Aguarda um período de tempo antes de iniciar nova sessão
    await aguardarTempo(config.session.interval, 'segundos', 'Aguardando antes de iniciar nova sessão');
  }
}

// Executa a função principal
main().catch(error => {
  logger.error(`Erro fatal na aplicação: ${error.message}`);
  process.exit(1);
});