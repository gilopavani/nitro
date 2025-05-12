# Automação Nitrotype

Um projeto Node.js que utiliza Puppeteer para automatização segura do site Nitrotype.com.

## Estrutura do Projeto

```
.
├── src/
│   ├── config/       # Arquivos de configuração
│   ├── controllers/  # Controladores da aplicação
│   ├── logs/         # Logs gerados pela aplicação
│   ├── models/       # Modelos de dados
│   ├── services/     # Serviços para interagir com o Nitrotype
│   ├── utils/        # Utilitários
│   └── index.js      # Ponto de entrada da aplicação
├── .env              # Variáveis de ambiente
├── package.json      # Configuração do projeto e dependências
└── README.md         # Este arquivo
```

## Tecnologias Utilizadas

- Node.js
- Puppeteer
- Puppeteer-extra com plugins para evitar detecção
- Dotenv para gerenciamento de variáveis de ambiente

## Recursos de Segurança

- Seleção aleatória de User Agents
- Plugins de stealth para evitar detecção de bot
- Armazenamento de dados do usuário para sessões persistentes
- Limpeza periódica dos dados do usuário a cada 3 sessões
- Restrições de horário para execução automática

## Restrições de Horário

O bot não executará operações nos seguintes períodos:

- Horário noturno: 00:00 às 07:00
- Horário de almoço: 12:00 às 14:00

## Como Usar

### Pré-requisitos

- Node.js 14+
- Yarn

### Instalação

```bash
# Instalar dependências
yarn install
```

### Executar o Projeto

```bash
# Iniciar o projeto
yarn start

# Iniciar em modo desenvolvimento (com auto-reload)
yarn dev
```

## Configurações

Configure as variáveis de ambiente no arquivo `.env`:

- `HEADLESS`: Define se o navegador será aberto visualmente (true/false)
- `DEBUG`: Ativa logs de depuração (true/false)
- `SLOW_MO`: Adiciona delay entre ações do Puppeteer (em ms)
- `TIMEOUT`: Tempo limite para operações (em ms)
- `NITROTYPE_LOGIN_URL`: URL de login do Nitrotype
- `RACE_COUNT`: Número de corridas a serem realizadas por sessão
- `SESSION_INTERVAL`: Intervalo entre sessões (em ms)
