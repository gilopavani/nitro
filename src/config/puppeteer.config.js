/**
 * Configuração do Puppeteer para navegação segura
 */
require('dotenv').config();
const path = require('path');

const puppeteerConfig = {
  // Opções padrão do navegador
  launchOptions: {
    headless: process.env.HEADLESS === 'true',
    defaultViewport: {
      width: 1024,
      height: 640,
      deviceScaleFactor: 1
    },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      // '--window-size=720,640',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--allow-running-insecure-content',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--disable-extensions',
      '--disable-popup-blocking',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--disable-breakpad',
      '--disable-client-side-phishing-detection',
      '--disable-component-update',
      '--disable-default-apps',
      '--disable-domain-reliability',
      '--disable-hang-monitor',
      '--disable-infobars',
      '--disable-notifications',
      '--disable-prompt-on-repost',
      '--disable-sync',
      '--disable-translate',
      '--disable-voice-input',
      '--disable-web-security',
      '--disable-application-cache',
    ],
    ignoreHTTPSErrors: true,
    slowMo: parseInt(process.env.SLOW_MO || '0', 10),
    timeout: parseInt(process.env.TIMEOUT || '30000', 10),
    // Armazenar dados do usuário persistentes entre sessões
    userDataDir: path.join(__dirname, '..', '..', 'user_data')
  },

  // URLs da aplicação
  urls: {
    login: process.env.NITROTYPE_LOGIN_URL || 'https://www.nitrotype.com/login',
    garage: process.env.NITROTYPE_GARAGE_URL || 'https://www.nitrotype.com/garage',
    race: process.env.NITROTYPE_RACE_URL || 'https://www.nitrotype.com/race'
  }
};

module.exports = puppeteerConfig;