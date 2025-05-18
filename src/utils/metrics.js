/**
 * Utilitário para coleta e registro de métricas
 */
const fs = require("fs");
const path = require("path");
const logger = require("./logger");

class Metrics {
  constructor() {
    this.stats = {
      sessoes: {
        total: 0,
        sucesso: 0,
        falha: 0,
      },
      corridas: {
        total: 0,
        sucesso: 0,
        falha: 0,
        tempoMedio: 0,
      },
      erros: {
        login: 0,
        corrida: 0,
        navegador: 0,
        outros: 0,
      },
      ultimaAtualizacao: new Date().toISOString(),
    };

    this.metricsFilePath = path.join(__dirname, "..", "..", "metrics.json");
    this.loadMetrics();
  }

  loadMetrics() {
    try {
      if (fs.existsSync(this.metricsFilePath)) {
        const data = fs.readFileSync(this.metricsFilePath, "utf8");
        this.stats = JSON.parse(data);
        logger.debug("Métricas carregadas do arquivo");
      }
    } catch (error) {
      logger.error(`Erro ao carregar métricas: ${error.message}`);
    }
  }

  saveMetrics() {
    try {
      this.stats.ultimaAtualizacao = new Date().toISOString();
      fs.writeFileSync(
        this.metricsFilePath,
        JSON.stringify(this.stats, null, 2),
        "utf8"
      );
    } catch (error) {
      logger.error(`Erro ao salvar métricas: ${error.message}`);
    }
  }

  // Métricas de sessão
  registrarInicioSessao() {
    this.stats.sessoes.total++;
    this.saveMetrics();
  }

  registrarSucessoSessao() {
    this.stats.sessoes.sucesso++;
    this.saveMetrics();
  }

  registrarFalhaSessao() {
    this.stats.sessoes.falha++;
    this.saveMetrics();
  }

  /**
   * Registra o início de uma corrida
   */
  registrarInicioCorrida() {
    this.stats.corridas.total++;
    this.saveMetrics();
  }

  /**
   * Registra uma corrida bem-sucedida e atualiza o tempo médio
   * @param {number} tempoExecucao - Tempo de execução da corrida em milissegundos
   */
  registrarSucessoCorrida(tempoExecucao) {
    this.stats.corridas.sucesso++;

    // Atualiza tempo médio de forma mais eficiente
    if (this.stats.corridas.sucesso === 1) {
      // Para a primeira corrida, o tempo médio é simplesmente o tempo da corrida
      this.stats.corridas.tempoMedio = tempoExecucao;
    } else {
      // Para as demais corridas, usa a fórmula de média ponderada
      const fatorPonderacao = 1 / this.stats.corridas.sucesso;
      this.stats.corridas.tempoMedio =
        this.stats.corridas.tempoMedio * (1 - fatorPonderacao) +
        tempoExecucao * fatorPonderacao;
    }

    this.saveMetrics();
  }

  /**
   * Registra uma corrida que falhou
   */
  registrarFalhaCorrida() {
    this.stats.corridas.falha++;
    this.saveMetrics();
  }

  // Métricas de erro
  registrarErro(tipo = "outros") {
    if (this.stats.erros[tipo] !== undefined) {
      this.stats.erros[tipo]++;
    } else {
      this.stats.erros.outros++;
    }
    this.saveMetrics();
  }

  getResumo() {
    return {
      sessoes: `${this.stats.sessoes.sucesso}/${
        this.stats.sessoes.total
      } (${Math.floor(
        (this.stats.sessoes.sucesso / Math.max(1, this.stats.sessoes.total)) *
          100
      )}%)`,
      corridas: `${this.stats.corridas.sucesso}/${
        this.stats.corridas.total
      } (${Math.floor(
        (this.stats.corridas.sucesso / Math.max(1, this.stats.corridas.total)) *
          100
      )}%)`,
      tempoMedio: `${Math.floor(this.stats.corridas.tempoMedio / 1000)}s`,
      erros: this.stats.erros,
    };
  }
}

module.exports = new Metrics();
