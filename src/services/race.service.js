/**
 * Serviço dedicado para gerenciar corridas no Nitrotype
 */
const logger = require('../utils/logger');

class RaceService {
  /**
   * Completa uma corrida no Nitrotype
   * @param {Object} page - Instância da página Puppeteer
   * @returns {Promise<boolean>} True se a corrida for concluída com sucesso
   */
  async completarCorrida(page) {
    try {
      logger.info('Preparando para completar corrida...');
      
      // Extrai o texto a ser digitado
      const textoExtraido = await this._extrairTexto(page);
      
      if (!textoExtraido || textoExtraido.length === 0) {
        logger.error('Falha ao extrair texto para digitação');
        return false;
      }
      
      logger.info(`Texto extraído: "${textoExtraido}"`);
      
      // Aguarda a adição da classe is-racing na seção principal
      logger.info('Aguardando início da corrida (classe is-racing)...');
      await this._aguardarInicioCorridaReal(page);
      
      // Pequena pausa antes de iniciar a digitação
      await new Promise(resolve => setTimeout(resolve, 200)); // 0.2 segundos
      
      // Encontra a maior palavra do texto para pular com Enter
      const maiorPalavra = this._encontrarMaiorPalavra(textoExtraido);
      logger.info(`Maior palavra identificada: "${maiorPalavra}"`);
      
      // Digita o texto com velocidade variável e erros ocasionais
      logger.info('Iniciando digitação...');
      await this._digitarTextoComErros(page, textoExtraido, maiorPalavra);
      
      // Aguarda a finalização da corrida
      logger.info('Corrida finalizada! Aguardando resultados...');
      await page.waitForSelector('.raceResults', {
        visible: true,
        timeout: 10000
      }).catch(() => logger.debug('Timeout ao aguardar resultados da corrida'));
      
      // Aguarda tempo para visualização dos resultados
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Extrai e exibe os resultados da corrida
      await this._extrairResultadosCorrida(page);
      
      logger.info('Corrida completada com sucesso!');
      return true;
    } catch (error) {
      logger.error(`Erro ao completar corrida: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Encontra a maior palavra em um texto
   * @param {string} texto - Texto para analisar
   * @returns {string} A maior palavra encontrada
   * @private
   */
  _encontrarMaiorPalavra(texto) {
    const palavras = texto.split(' ');
    return palavras.reduce((maiorPalavra, palavraAtual) => 
      palavraAtual.length > maiorPalavra.length ? palavraAtual : maiorPalavra, '');
  }
  
  /**
   * Aguarda o início real da corrida observando a adição da classe is-racing
   * @param {Object} page - Instância da página Puppeteer
   * @returns {Promise<void>}
   * @private
   */
  async _aguardarInicioCorridaReal(page) {
    try {
      logger.info('Monitorando a adição da classe is-racing...');
      
      // Selector para a seção principal da corrida
      const sectionSelector = '.racev3.racev3--track--hd.racev3Theme--default.card.card--b.card--shadow.card--grit.card--f.card--o.well.well--b.well--l';
      
      // Verifica se o elemento base está presente
      const elementoExiste = await page.waitForSelector(sectionSelector, { 
        visible: true,
        timeout: 10000 
      }).then(() => true).catch(() => false);
      
      if (!elementoExiste) {
        logger.error('Elemento da seção da corrida não encontrado');
        throw new Error('Elemento da seção da corrida não encontrado');
      }

      // Força a página a permanecer visível (para casos onde a janela está em segundo plano)
      await page.evaluate(() => {
        // Força o estado de visibilidade para visible
        Object.defineProperty(document, 'visibilityState', { value: 'visible' });
        Object.defineProperty(document, 'hidden', { value: false });
        
        // Dispara eventos para notificar a mudança
        document.dispatchEvent(new Event('visibilitychange'));
        window.dispatchEvent(new Event('focus'));
      });

      // Espera pela adição da classe is-racing
      await page.waitForFunction(
        (selector) => {
          const elemento = document.querySelector(selector);
          return elemento && elemento.classList.contains('is-racing');
        },
        { timeout: 15000 },
        sectionSelector
      );
      
      logger.info('Classe is-racing detectada! Corrida iniciada!');
    } catch (error) {
      logger.error(`Erro ao aguardar início da corrida: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Extrai o texto a ser digitado da página da corrida
   * @param {Object} page - Instância da página Puppeteer
   * @returns {Promise<string>} O texto completo a ser digitado
   * @private
   */
  async _extrairTexto(page) {
    try {
      logger.info('Extraindo texto da corrida...');
      
      // Aguarda pelo container de texto
      await page.waitForSelector('.dash-copyContainer', { visible: true, timeout: 10000 });
      
      // Extrai o texto letra por letra
      return await page.evaluate(() => {
        const letras = Array.from(document.querySelectorAll('.dash-letter'));
        let texto = '';
        
        for (const letra of letras) {
          // Ignora a imagem de bandeira no final
          if (letra.querySelector('img')) continue;
          
          // Verifica se é um espaço
          if (letra.innerHTML === '&nbsp;') {
            texto += ' ';
          } else {
            texto += letra.textContent;
          }
        }
        
        return texto;
      });
    } catch (error) {
      logger.error(`Erro ao extrair texto: ${error.message}`);
      return '';
    }
  }
  
  /**
   * Digita o texto com velocidade variável e erros ocasionais, pulando a maior palavra com Enter
   * @param {Object} page - Instância da página Puppeteer
   * @param {string} texto - Texto a ser digitado
   * @param {string} maiorPalavra - A maior palavra que será pulada
   * @private
   */
  async _digitarTextoComErros(page, texto, maiorPalavra) {
    try {
      // Obtém os limites de velocidade de digitação das variáveis de ambiente
      const minDelay = parseInt(process.env.TYPING_SPEED_MIN || '40', 10);
      const maxDelay = parseInt(process.env.TYPING_SPEED_MAX || '60', 10);
      
      // Frequência de erros: a cada quantos caracteres, em média, ocorre um erro
      const frequenciaErros = parseInt(process.env.TYPING_ERROR_FREQUENCY || '20', 10);
      
      logger.debug(`Digitando com velocidade variável entre ${minDelay}ms e ${maxDelay}ms por caractere`);
      logger.debug(`Frequência média de erros: 1 a cada ${frequenciaErros} caracteres`);
      
      // Prepara variáveis para controle da digitação
      let palavraTerminou = true; // Inicialmente verdadeiro para detectar o início da primeira palavra
      let palavraPulada = false;
      let contadorCaracteres = 0;
      
      // Digita cada caractere com tempo variável
      for (let i = 0; i < texto.length; i++) {
        const caractereAtual = texto[i];
        
        // Detecta o início de uma nova palavra
        if (caractereAtual !== ' ' && palavraTerminou) {
          palavraTerminou = false;
          
          // Verifica se estamos no início da maior palavra
          if (!palavraPulada && this._verificaInicioDaMaiorPalavra(texto, i, maiorPalavra)) {
            logger.info(`Detectado início da maior palavra "${maiorPalavra}" na posição ${i}. Pulando com Enter.`);
            await page.keyboard.press('Enter');
            palavraPulada = true;
            
            // Avança o índice até o final da palavra (próximo espaço)
            while (i < texto.length && texto[i] !== ' ') {
              i++;
            }
            
            // Se chegou ao fim do texto, sai do loop
            if (i >= texto.length) break;
            
            // Reinicia o controle para a próxima palavra
            palavraTerminou = true;
            continue;
          }
        }
        
        // Marca que a palavra terminou quando encontra um espaço
        if (caractereAtual === ' ') {
          palavraTerminou = true;
        }
        
        // Decide se vai digitar um caractere errado (com base na frequência de erros)
        const cometerErro = Math.random() < (1 / frequenciaErros);
        
        if (cometerErro) {
          // Gera um caractere errado aleatório
          const caractereErrado = this._gerarCaractereErrado(caractereAtual);
          
          // Digita o caractere errado
          logger.debug(`Digitando erro: '${caractereErrado}' em vez de '${caractereAtual}'`);
          await page.keyboard.type(caractereErrado);
          
          // Aguarda um tempo para corrigir o erro
          const delayCorrecao = Math.floor(300 + Math.random() * 200);
          await new Promise(resolve => setTimeout(resolve, delayCorrecao));
          
          // Corrige o erro (apaga o caractere errado)
          await page.keyboard.press('Backspace');
          
          // Aguarda um tempo antes de digitar o caractere correto
          const delayAntesCorrecao = Math.floor(100 + Math.random() * 100);
          await new Promise(resolve => setTimeout(resolve, delayAntesCorrecao));
        }
        
        // Digita o caractere correto (ou após corrigir um erro)
        await page.keyboard.type(caractereAtual);
        contadorCaracteres++;
        
        // Aguarda o delay calculado
        const delay = Math.floor(minDelay + Math.random() * (maxDelay - minDelay));
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      logger.info(`Digitação completa! Total de ${contadorCaracteres} caracteres digitados`);
      if (palavraPulada) {
        logger.info(`Foi pulada a maior palavra "${maiorPalavra}" com Enter`);
      } else {
        logger.warn(`Não foi possível pular a maior palavra "${maiorPalavra}". Verifique a lógica de detecção.`);
      }
    } catch (error) {
      logger.error(`Erro ao digitar texto: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Verifica se estamos no início da maior palavra
   * @param {string} texto - Texto completo
   * @param {number} posicaoAtual - Índice atual no texto
   * @param {string} maiorPalavra - A maior palavra a ser encontrada
   * @returns {boolean} True se estivermos no início da maior palavra
   * @private
   */
  _verificaInicioDaMaiorPalavra(texto, posicaoAtual, maiorPalavra) {
    // Verifica se há caracteres suficientes à frente para formar a maior palavra
    if (posicaoAtual + maiorPalavra.length > texto.length) {
      return false;
    }
    
    // Extrai um segmento do texto a partir da posição atual, do tamanho da maior palavra
    const segmentoAtual = texto.substring(posicaoAtual, posicaoAtual + maiorPalavra.length);
    
    // Verifica se o segmento corresponde à maior palavra
    if (segmentoAtual !== maiorPalavra) {
      return false;
    }
    
    // Verifica se o segmento está isolado (é uma palavra completa)
    // Deve ter um espaço ou início do texto antes, e um espaço ou fim do texto depois
    const temEspacoAntes = posicaoAtual === 0 || texto[posicaoAtual - 1] === ' ';
    const posDepois = posicaoAtual + maiorPalavra.length;
    const temEspacoDepois = posDepois >= texto.length || texto[posDepois] === ' ';
    
    return temEspacoAntes && temEspacoDepois;
  }
  
  /**
   * Gera um caractere errado para simular um erro de digitação
   * @param {string} caractereCorreto - Caractere que deveria ser digitado
   * @returns {string} Um caractere errado
   * @private
   */
  _gerarCaractereErrado(caractereCorreto) {
    // Mapa de caracteres próximos no teclado para simular erros realistas
    const tecladoProximo = {
      'a': ['s', 'q', 'z'],
      'b': ['v', 'g', 'h', 'n'],
      'c': ['x', 'd', 'v'],
      'd': ['s', 'e', 'f', 'c'],
      'e': ['w', 'r', 'd', '3'],
      'f': ['d', 'r', 'g', 'v'],
      'g': ['f', 't', 'h', 'b'],
      'h': ['g', 'y', 'j', 'n'],
      'i': ['u', 'o', 'k', '8'],
      'j': ['h', 'u', 'k', 'm'],
      'k': ['j', 'i', 'l', ','],
      'l': ['k', 'o', 'ç', ','],
      'm': ['n', 'j', 'k', ','],
      'n': ['b', 'h', 'j', 'm'],
      'o': ['i', 'p', 'l', '9'],
      'p': ['o', '0', 'ç', '['],
      'q': ['1', 'w', 'a', '2'],
      'r': ['e', 't', 'f', '4'],
      's': ['a', 'w', 'd', 'z'],
      't': ['r', 'y', 'g', '5'],
      'u': ['y', 'i', 'j', '7'],
      'v': ['c', 'f', 'g', 'b'],
      'w': ['q', 'e', 's', '2'],
      'x': ['z', 's', 'd', 'c'],
      'y': ['t', 'u', 'h', '6'],
      'z': ['a', 's', 'x'],
      '.': [',', 'l', ';'],
      ',': ['m', 'k', 'l', '.'],
      ' ': ['b', 'n', 'm', ',', '.']
    };
    
    // Se o caractere não estiver no mapa, retorna um caractere aleatório
    if (!tecladoProximo[caractereCorreto.toLowerCase()]) {
      const caracteresAleatorios = 'abcdefghijklmnopqrstuvwxyz';
      return caracteresAleatorios.charAt(Math.floor(Math.random() * caracteresAleatorios.length));
    }
    
    // Obtém os caracteres próximos e escolhe um aleatoriamente
    const caracteresPróximos = tecladoProximo[caractereCorreto.toLowerCase()];
    const caractereErrado = caracteresPróximos[Math.floor(Math.random() * caracteresPróximos.length)];
    
    // Preserva maiúscula/minúscula
    return caractereCorreto === caractereCorreto.toUpperCase() 
      ? caractereErrado.toUpperCase() 
      : caractereErrado;
  }

  /**
   * Extrai e exibe os resultados da corrida atual
   * @param {Object} page - Instância da página Puppeteer
   * @private
   */
  async _extrairResultadosCorrida(page) {
    try {
      // Obtém o username do usuário das variáveis de ambiente
      const username = process.env.NITROTYPE_USERNAME;
      if (!username) {
        logger.warn('Nome de usuário não configurado no arquivo .env. Não é possível extrair resultados personalizados.');
        return;
      }
      
      // Extrai as informações dos resultados da corrida
      const resultados = await page.evaluate((username) => {
        const resultado = {};
        
        // Procura pela linha do jogador na tabela de resultados
        const linhasJogadores = document.querySelectorAll('.gridTable-row');
        let linhaJogador = null;
        
        for (const linha of linhasJogadores) {
          const nomeElemento = linha.querySelector('.player-name--container');
          if (nomeElemento && nomeElemento.textContent.trim().includes(username)) {
            linhaJogador = linha;
            break;
          }
        }
        
        if (linhaJogador) {
          // Extrai a posição
          const posicaoElemento = linhaJogador.querySelector('.raceResults-placement-other');
          if (posicaoElemento) {
            resultado.posicao = posicaoElemento.textContent.trim();
          }
          
          // Extrai WPM e precisão
          const statsItems = linhaJogador.querySelectorAll('.list-item');
          if (statsItems.length >= 2) {
            resultado.wpm = statsItems[0].textContent.trim();
            resultado.precisao = statsItems[1].textContent.trim();
          }
        }
        
        // Extrai totais de dinheiro e XP
        const totaisElemento = document.querySelector('.raceResults-reward-totals');
        if (totaisElemento) {
          const dinheiro = totaisElemento.querySelector('.raceResults-reward-cash');
          const xp = totaisElemento.querySelector('.raceResults-reward-xp');
          
          if (dinheiro) {
            resultado.dinheiroTotal = dinheiro.textContent.trim();
          }
          
          if (xp) {
            resultado.xpTotal = xp.textContent.trim();
          }
        }
        
        // Extrai a linha específica da posição
        const posicaoLinhas = document.querySelectorAll('.raceResults--line-item');
        for (const linha of posicaoLinhas) {
          const titulo = linha.querySelector('.raceResults-reward-title');
          if (titulo && resultado.posicao && titulo.textContent.trim().includes(resultado.posicao.replace(/[0-9]/g, '').trim())) {
            const dinheiroPos = linha.querySelector('.raceResults-reward-cash');
            const xpPos = linha.querySelector('.raceResults-reward-xp');
            
            if (dinheiroPos) {
              resultado.dinheiroPosicao = dinheiroPos.textContent.trim();
            }
            
            if (xpPos) {
              resultado.xpPosicao = xpPos.textContent.trim();
            }
            
            break;
          }
        }
        
        return resultado;
      }, username);
      
      // Se não encontrou resultados, retorna sem erro
      if (!resultados || Object.keys(resultados).length === 0) {
        logger.warn('Não foi possível extrair os resultados da corrida.');
        return;
      }
      
      // Formata e exibe os resultados como INFO
      let mensagemResultado = `\n=== RESULTADOS DA CORRIDA ===\n`;
      
      if (resultados.posicao) {
        mensagemResultado += `Posição: ${resultados.posicao}\n`;
      }
      
      if (resultados.wpm) {
        mensagemResultado += `Velocidade: ${resultados.wpm}\n`;
      }
      
      if (resultados.precisao) {
        mensagemResultado += `Precisão: ${resultados.precisao}\n`;
      }
      
      mensagemResultado += `\n--- RECOMPENSAS ---\n`;
      
      if (resultados.dinheiroPosicao && resultados.xpPosicao) {
        mensagemResultado += `Pela posição: ${resultados.dinheiroPosicao} e ${resultados.xpPosicao}\n`;
      }
      
      if (resultados.dinheiroTotal && resultados.xpTotal) {
        mensagemResultado += `Total recebido: ${resultados.dinheiroTotal} e ${resultados.xpTotal}\n`;
      }
      
      logger.info(mensagemResultado);
    } catch (error) {
      // Não interrompemos a execução em caso de falha na extração de resultados
      logger.warn(`Não foi possível extrair os resultados da corrida: ${error.message}`);
    }
  }
}

module.exports = new RaceService();
