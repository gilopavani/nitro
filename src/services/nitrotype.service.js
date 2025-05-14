/**
 * Serviço para interagir com o site Nitrotype
 */
const browserManager = require("../utils/browser");
const puppeteerConfig = require("../config/puppeteer.config");
const logger = require("../utils/logger");
const raceService = require("./race.service");
const fs = require("fs");
const path = require("path");

class NitroTypeService {
  // Propriedade para controlar se o usuário já está autenticado
  _usuarioJaAutenticado = false;

  /**
   * Acessa a página de login do Nitrotype e verifica se há redirecionamento para o garage
   * @returns {Promise<boolean>} True se a página foi acessada com sucesso ou se já está autenticado
   */
  async acessarPaginaLogin() {
    try {
      logger.info("Acessando a página de login do Nitrotype...");
      await browserManager.goTo(puppeteerConfig.urls.login);

      // Aguarda a página carregar
      await browserManager.wait(2000);

      // Verifica para qual URL fomos direcionados após tentar acessar a página de login
      const currentUrl = await browserManager.page.url();
      logger.debug(
        `URL após tentativa de acesso à página de login: ${currentUrl}`,
      );

      // Verifica se foi redirecionado para o garage (indica login por cookie)
      if (currentUrl.includes("nitrotype.com/garage")) {
        logger.info(
          "Redirecionado automaticamente para o garage. Verificando login por cookie...",
        );

        // Verifica se o usuário está autenticado
        const autenticacaoVerificada = await this.verificarAutenticacao(false);

        if (autenticacaoVerificada) {
          logger.info(
            "Usuário já autenticado por cookie! Não será necessário fazer login.",
          );
          this._usuarioJaAutenticado = true;
          return true;
        } else {
          logger.info(
            "Cookie detectado, mas autenticação não confirmada. Tentando página de login...",
          );
          await browserManager.goTo(
            puppeteerConfig.urls.login + "?forceLogin=true",
          );
        }
      }

      // Verifica se estamos na página de login procurando pelos campos de login
      const loginPageLoaded = await browserManager.page
        .waitForSelector("#username", {
          visible: true,
          timeout: 5000,
        })
        .then(() => true)
        .catch(() => false);

      if (!loginPageLoaded) {
        logger.error(
          "Não foi possível carregar a página de login. Elementos não encontrados.",
        );
        return false;
      }

      logger.info("Página de login do Nitrotype acessada com sucesso");
      return true;
    } catch (error) {
      logger.error(
        `Erro ao acessar página de login do Nitrotype: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Realiza o login no Nitrotype usando as credenciais do arquivo .env
   * Se o usuário já estiver autenticado por cookie, pula o processo de login
   */
  async realizarLogin() {
    try {
      logger.info("Realizando login no Nitrotype...");

      // Verifica se as credenciais estão configuradas
      const username = process.env.NITROTYPE_USERNAME;
      const password = process.env.NITROTYPE_PASSWORD;

      if (!username || !password) {
        throw new Error("Credenciais não configuradas no arquivo .env");
      }

      // Garante que estamos na página de login ou já autenticados
      if (!(await this.acessarPaginaLogin())) {
        throw new Error("Não foi possível acessar a página de login");
      }

      // Se já estiver autenticado pelos cookies, pula o processo de login
      if (this._usuarioJaAutenticado) {
        logger.info(
          "Usuário já autenticado por cookie. Pulando processo de login.",
        );
        return true;
      }

      // Preenche o campo de usuário com digitação lenta para simular comportamento humano
      logger.debug("Preenchendo campo de usuário...");
      await this._typeHumanLike("#username", username);

      // Preenche o campo de senha com digitação lenta
      logger.debug("Preenchendo campo de senha...");
      await this._typeHumanLike("#password", password);

      // Pequena pausa antes de clicar no botão (comportamento humano)
      await browserManager.wait(500 + Math.random() * 500);

      // Clica no botão de login
      logger.debug("Clicando no botão de login...");
      await browserManager.page.click(".btn--primary.btn--fw");

      // Aguarda a navegação para a página após o login
      await browserManager.page.waitForNavigation({
        waitUntil: "networkidle2",
      });

      logger.info("Primeiro redirecionamento após login completo");

      // Verifica se o login foi bem-sucedido e o usuário está autenticado
      const autenticacaoVerificada = await this.verificarAutenticacao();
      if (!autenticacaoVerificada) {
        throw new Error("Não foi possível confirmar a autenticação do usuário");
      }

      logger.info("Login e verificação de autenticação realizados com sucesso");
      return true;
    } catch (error) {
      logger.error(`Erro ao realizar login: ${error.message}`);
      return false;
    }
  }

  /**
   * Verifica se o usuário está autenticado no Nitrotype
   * Verifica se está na página do garage e se o username do usuário aparece na página
   * @param {boolean} navegarParaGarage - Se verdadeiro, navega para a página do garage caso não esteja nela
   * @returns {Promise<boolean>} True se a autenticação for confirmada
   */
  async verificarAutenticacao(navegarParaGarage = true) {
    try {
      logger.info("Verificando autenticação do usuário...");

      // Verificar URL atual
      const currentUrl = await browserManager.page.url();
      logger.debug(`URL atual: ${currentUrl}`);

      // Verificar se estamos na página do garage ou navegar para ela
      if (!currentUrl.includes("nitrotype.com/garage") && navegarParaGarage) {
        logger.info("Navegando para a página do garage...");
        await browserManager.goTo(puppeteerConfig.urls.garage);

        // Aguarda a navegação completa
        await browserManager.page
          .waitForNavigation({ waitUntil: "networkidle2" })
          .catch(() =>
            logger.debug(
              "Timeout na navegação para o garage, continuando mesmo assim",
            ),
          );

        // Aguarda um momento adicional para garantir carregamento de elementos dinâmicos
        await browserManager.wait(2000);
      }

      // Obter o nome de usuário configurado
      const username = process.env.NITROTYPE_USERNAME;
      if (!username) {
        throw new Error("Nome de usuário não configurado no arquivo .env");
      }

      logger.debug(
        `Procurando pelo nome de usuário "${username}" na página...`,
      );

      // Busca pelo nome de usuário no conteúdo da página
      const usernameFound = await browserManager.page.evaluate((username) => {
        // Converte para texto todo o conteúdo da página
        const pageText = document.body.innerText;

        // Verifica se o nome de usuário está presente em algum lugar
        if (pageText.includes(username)) {
          return true;
        }

        // Verificar em elementos específicos que podem conter o username
        const possibleElements = [
          // Seletores onde o nome de usuário pode aparecer
          ".username",
          ".user-info",
          ".account-info",
          ".dash-header",
          ".profile-name",
          // Caso não encontre em elementos específicos, busca em todos os divs e spans
          "div",
          "span",
        ];

        for (const selector of possibleElements) {
          const elements = document.querySelectorAll(selector);
          for (const element of elements) {
            if (element.innerText && element.innerText.includes(username)) {
              return true;
            }
          }
        }

        return false;
      }, username);

      if (usernameFound) {
        logger.info(
          `Usuário "${username}" encontrado na página. Autenticação confirmada.`,
        );
        return true;
      } else {
        logger.error(
          `Usuário "${username}" não encontrado na página. Autenticação falhou.`,
        );

        // Salvar screenshot para depuração
        await browserManager.page.screenshot({
          path: "./auth-verification-failed.png",
          fullPage: true,
        });
        logger.debug("Screenshot salvo em ./auth-verification-failed.png");

        return false;
      }
    } catch (error) {
      logger.error(`Erro ao verificar autenticação: ${error.message}`);
      return false;
    }
  }

  /**
   * Método utilitário para digitar como humano
   * @param {string} selector - Seletor CSS do elemento
   * @param {string} text - Texto a ser digitado
   * @private
   */
  async _typeHumanLike(selector, text) {
    try {
      await browserManager.page.focus(selector);

      // Limpa o campo por segurança
      await browserManager.page.evaluate((selector) => {
        document.querySelector(selector).value = "";
      }, selector);

      // Digita caractere por caractere com variações de tempo
      for (const char of text) {
        // Tempo aleatório entre digitações (50-150ms)
        await browserManager.wait(50 + Math.random() * 100);
        await browserManager.page.type(selector, char);
      }
    } catch (error) {
      logger.error(`Erro ao digitar no campo ${selector}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Inicia uma corrida no Nitrotype
   * @returns {Promise<boolean>} True se a corrida for concluída com sucesso
   */
  async iniciarCorrida() {
    try {
      logger.info("Navegando para a página de corrida...");
      await browserManager.goTo(puppeteerConfig.urls.race);

      // Verifica se estamos na página de corrida
      const paginaCorridaCarregada = await this._verificarPaginaCorrida();

      if (!paginaCorridaCarregada) {
        logger.error("Página de corrida não carregada corretamente");
        return false;
      }

      // Realiza a corrida usando o serviço dedicado
      return await raceService.completarCorrida(browserManager.page);
    } catch (error) {
      logger.error(`Erro ao iniciar corrida: ${error.message}`);
      return false;
    }
  }

  /**
   * Verifica se estamos na página de corrida correta
   * @returns {Promise<boolean>}
   * @private
   */
  async _verificarPaginaCorrida() {
    try {
      logger.info("Verificando se a página de corrida está carregada...");

      // Verifica URL
      const currentUrl = await browserManager.page.url();
      if (!currentUrl.includes("nitrotype.com/race")) {
        logger.error(`URL atual não é a página de corrida: ${currentUrl}`);
        return false;
      }

      // Verifica se há mensagem de falha de login
      const textoFalhaLogin = await browserManager.page.evaluate(() => {
        const mensagemErro = document.querySelector(".error-message");
        if (mensagemErro) {
          return mensagemErro.textContent.trim();
        }

        // Verifica se há outras mensagens que indicam problemas de autenticação
        const conteudo = document.body.innerText;
        if (
          conteudo.includes("Please log in") ||
          conteudo.includes("session expired") ||
          conteudo.includes("Authentication failed")
        ) {
          return "Erro de autenticação detectado";
        }

        return null;
      });

      if (textoFalhaLogin) {
        logger.error(`Falha de login detectada: "${textoFalhaLogin}"`);
        await this.realizarLogout();
        return false;
      }

      // Aguarda o container de texto aparecer
      const textContainerExists = await browserManager.page
        .waitForSelector(".dash-copyContainer", {
          visible: true,
          timeout: 20000, // Tempo maior para garantir que a página carregue completamente
        })
        .then(() => true)
        .catch(() => false);

      // Se o container principal não foi encontrado, verifica os seletores alternativos
      if (!textContainerExists) {
        logger.info(
          "Container principal (.dash-copyContainer) não encontrado, verificando seletores alternativos...",
        );

        // Verifica se os seletores alternativos estão presentes
        const alternativeSelectorsFound = await browserManager.page.evaluate(
          () => {
            const dashContent = document.querySelector(".dash-content");
            const dashCopy = document.querySelector(".dash-copy");

            return {
              dashContentFound: !!dashContent,
              dashCopyFound: !!dashCopy,
            };
          },
        );

        // Se ambos os seletores alternativos forem encontrados, considera que o container existe
        if (
          alternativeSelectorsFound.dashContentFound ||
          alternativeSelectorsFound.dashCopyFound
        ) {
          logger.info(
            "Seletores alternativos encontrados (dash-content e dash-copy). Página de corrida confirmada.",
          );
          return true;
        }

        // Logs para ajudar na depuração
        logger.error("Container de texto da corrida não encontrado");
        logger.debug(
          `Resultado da verificação alternativa: dash-content: ${alternativeSelectorsFound.dashContentFound}, dash-copy: ${alternativeSelectorsFound.dashCopyFound}`,
        );

        // Salvar screenshot para depuração
        await browserManager.page.screenshot({
          path: "./race-page-error.png",
          fullPage: true,
        });

        logger.debug("Screenshot salvo em ./race-page-error.png");
        return false;
      }

      logger.info("Página de corrida verificada com sucesso");
      return true;
    } catch (error) {
      logger.error(`Erro ao verificar página de corrida: ${error.message}`);
      return false;
    }
  }

  /**
   * Fecha o navegador
   */
  async fecharNavegador() {
    return browserManager.close();
  }

  /**
   * Realiza logout completo e limpa dados do usuário
   */
  async realizarLogout() {
    try {
      logger.info("Realizando logout e limpando dados do usuário...");

      // Fecha o navegador atual
      await this.fecharNavegador();

      // Limpa o diretório user_data
      const userDataDir = path.join(__dirname, "..", "..", "user_data");
      if (fs.existsSync(userDataDir)) {
        logger.info(`Removendo diretório de dados do usuário: ${userDataDir}`);

        // Em sistemas Unix/Linux/Mac
        try {
          fs.rmSync(userDataDir, { recursive: true, force: true });
          logger.info("Diretório de dados do usuário removido com sucesso");
        } catch (error) {
          logger.error(`Erro ao remover diretório de dados: ${error.message}`);
        }
      }

      // Reinicia a flag de autenticação
      this._usuarioJaAutenticado = false;

      logger.info("Logout realizado com sucesso");
      return true;
    } catch (error) {
      logger.error(`Erro ao realizar logout: ${error.message}`);
      return false;
    }
  }
}

module.exports = new NitroTypeService();

