/**
 * Utilitário para gerenciar o navegador Puppeteer com plugins de segurança
 */
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const AnonymizeUaPlugin = require("puppeteer-extra-plugin-anonymize-ua");
const { getRandomUserAgent } = require("../config/user-agents");
const puppeteerConfig = require("../config/puppeteer.config");
const logger = require("./logger");

// Adicionar plugins para evitar detecção
puppeteer.use(StealthPlugin());
puppeteer.use(AnonymizeUaPlugin({ makeWindows: true }));

/**
 * Delay simples baseado em Promise
 * @param {number} ms - Tempo em milissegundos para aguardar
 * @returns {Promise<void>} Promise que resolve após o tempo especificado
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Classe para gerenciar o navegador Puppeteer
 */
class BrowserManager {
  constructor() {
    this.browser = null;
    this.page = null;
    this.currentUserAgent = null;
  }

  /**
   * Inicializa o navegador com as configurações de segurança
   */
  async init() {
    try {
      logger.info("Iniciando o navegador...");

      // Obter um novo user agent aleatório
      this.currentUserAgent = getRandomUserAgent();

      // Configurar com user agent aleatório
      const launchOptions = {
        ...puppeteerConfig.launchOptions,
      };

      // Nota: O Puppeteer criará o diretório userDataDir automaticamente

      // Iniciar o navegador com as configurações
      this.browser = await puppeteer.launch(launchOptions);
      this.page = await this.browser.newPage();

      // Configurar o user agent na página
      await this.page.setUserAgent(this.currentUserAgent);

      // Configurações adicionais para evitar detecção
      await this.page.evaluateOnNewDocument(() => {
        // Ocultar sinais de webdriver
        Object.defineProperty(navigator, "webdriver", { get: () => false });

        // Ocultar Chrome
        window.chrome = { runtime: {} };

        // Adicionar plugins falsos
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) =>
          parameters.name === "notifications"
            ? Promise.resolve({ state: Notification.permission })
            : originalQuery(parameters);
      });

      // Configurar listeners de console para debugging
      if (process.env.DEBUG === "true") {
        this.page.on("console", (msg) => logger.debug(`PÁGINA: ${msg.text()}`));
        this.page.on("pageerror", (error) =>
          logger.error(`ERRO NA PÁGINA: ${error.message}`)
        );
      }

      // Configurar timeout padrão de navegação
      await this.page.setDefaultNavigationTimeout(
        puppeteerConfig.launchOptions.timeout
      );

      logger.info("Navegador iniciado com sucesso");
      return this.page;
    } catch (error) {
      logger.error(`Erro ao iniciar o navegador: ${error.message}`);
      throw error;
    }
  }

  /**
   * Navega para uma URL específica
   * @param {string} url - URL para navegar
   */
  async goTo(url) {
    try {
      logger.info(`Navegando para ${url}`);
      if (!this.page) {
        await this.init();
      }

      // Navegação com menos estratégias de espera para páginas de corrida
      if (url.includes("nitrotype.com/race")) {
        const response = await this.page.goto(url, {
          waitUntil: ["domcontentloaded"],
          timeout: puppeteerConfig.launchOptions.timeout,
        });

        logger.info(`Navegação básica para ${url} completada`);
        return;
      }

      // Navegação normal para outras páginas
      const response = await this.page.goto(url, {
        waitUntil: ["networkidle2"],
        timeout: puppeteerConfig.launchOptions.timeout,
      });

      if (!response) {
        throw new Error("Falha na navegação: sem resposta");
      }

      const status = response.status();
      if (status >= 400) {
        throw new Error(`Página retornou status de erro: ${status}`);
      }

      // Aguarda tempo adicional para garantir que o JavaScript da página seja executado
      await delay(1000);

      logger.info(`Navegou com sucesso para ${url}`);
    } catch (error) {
      logger.error(`Erro ao navegar para ${url}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Método utilitário para aguardar um tempo específico
   * @param {number} ms - Tempo em milissegundos para aguardar
   */
  async wait(ms) {
    return delay(ms);
  }

  /**
   * Fecha o navegador
   */
  async close() {
    try {
      if (this.browser) {
        logger.info("Fechando o navegador...");
        await this.browser.close();
        this.browser = null;
        this.page = null;
        this.currentUserAgent = null;
        logger.info("Navegador fechado com sucesso");
      }
    } catch (error) {
      logger.error(`Erro ao fechar o navegador: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new BrowserManager();
