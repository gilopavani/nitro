/**
 * Configuração do Puppeteer para navegação segura
 */
require('dotenv').config();
const path = require('path');
const { getRandomUserAgent } = require('./user-agents');

const puppeteerConfig = {
  // Opções padrão do navegador
  launchOptions: {
    headless: process.env.HEADLESS === 'true',
    defaultViewport: {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
      isLandscape: true
    },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1920,1080',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--allow-running-insecure-content',
      '--disable-blink-features=AutomationControlled',
      '--disable-blink-features=AutomationControlled',
      '--disable-device-discovery-notifications'
    ],
    ignoreHTTPSErrors: true,
    slowMo: parseInt(process.env.SLOW_MO || '0', 10),
    timeout: parseInt(process.env.TIMEOUT || '30000', 10),
    // Armazenar dados do usuário persistentes entre sessões
    userDataDir: path.join(__dirname, '..', '..', 'user_data')
  },

  // Configuração específica para garantir detecção como desktop
  browserConfig: {
    userAgent: getRandomUserAgent(),
    platform: 'Win32',
    acceptLanguage: 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
  },

  // URLs da aplicação
  urls: {
    login: process.env.NITROTYPE_LOGIN_URL || 'https://www.nitrotype.com/login',
    garage: process.env.NITROTYPE_GARAGE_URL || 'https://www.nitrotype.com/garage',
    race: process.env.NITROTYPE_RACE_URL || 'https://www.nitrotype.com/race'
  }
};

module.exports = puppeteerConfig;