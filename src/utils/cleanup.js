/**
 * Utilitário para limpeza de recursos
 */
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * Contador global para controlar o número de sessões
 * @type {number}
 */
let contadorSessoes = 0;

/**
 * Incrementa o contador de sessões e verifica se deve limpar o diretório user_data
 * @param {number} frequencia - Número de sessões após as quais a limpeza deve ocorrer
 * @returns {boolean} True se a limpeza foi realizada, false caso contrário
 */
function verificarLimpezaPeriodica(frequencia = 3) {
  contadorSessoes++;
  
  if (contadorSessoes >= frequencia) {
    limparDiretorioUserData();
    contadorSessoes = 0;
    return true;
  }
  
  logger.info(`Contagem de sessões: ${contadorSessoes}/${frequencia} antes da próxima limpeza.`);
  return false;
}

/**
 * Limpa o diretório user_data removendo todos os arquivos e subdiretórios
 */
function limparDiretorioUserData() {
  try {
    logger.info('Iniciando limpeza periódica do diretório user_data...');
    const userDataDir = path.join(__dirname, '..', '..', 'user_data');
    
    if (!fs.existsSync(userDataDir)) {
      logger.info('Diretório user_data não existe. Nenhuma limpeza necessária.');
      return;
    }
    
    // Função recursiva para deletar diretório não vazio
    const deletarRecursivo = (diretorio) => {
      if (fs.existsSync(diretorio)) {
        fs.readdirSync(diretorio).forEach((arquivo) => {
          const caminhoAtual = path.join(diretorio, arquivo);
          if (fs.lstatSync(caminhoAtual).isDirectory()) {
            // Recursivamente remove subdiretórios
            deletarRecursivo(caminhoAtual);
          } else {
            // Remove arquivo
            fs.unlinkSync(caminhoAtual);
          }
        });
        
        // Remove o diretório vazio
        if (diretorio === userDataDir) {
          // Recria o diretório vazio se for o diretório user_data principal
          fs.rmdirSync(diretorio);
          fs.mkdirSync(diretorio, { recursive: true });
          logger.info('Diretório user_data foi limpo e recriado com sucesso.');
        } else {
          fs.rmdirSync(diretorio);
        }
      }
    };
    
    // Inicia a limpeza recursiva
    deletarRecursivo(userDataDir);
    logger.info('Limpeza periódica do diretório user_data concluída com sucesso.');
    
  } catch (error) {
    logger.error(`Erro ao limpar diretório user_data: ${error.message}`);
    // Não re-lança o erro para não interromper a execução principal
  }
}

module.exports = {
  verificarLimpezaPeriodica,
  limparDiretorioUserData
};
