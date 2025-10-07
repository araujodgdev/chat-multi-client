# Product Requirements Document (PRD)
## Sistema de Chat Distribuído com Salas de Múltiplos Usuários

---

### 📋 Informações do Documento

**Versão:** 1.0  
**Data:** Outubro 2025  
**Objetivo:** Trabalho Acadêmico - Sistemas Distribuídos  
**Critérios de Avaliação:**
- Arquitetura Distribuída (4 pontos)
- Concorrência/Paralelismo (2 pontos)
- Documentação/Artigo (4 pontos)

---

## 1. Visão Geral do Projeto

### 1.1 Objetivo
Desenvolver um sistema de chat distribuído que permita comunicação em tempo real entre múltiplos usuários organizados em salas, demonstrando conceitos de arquitetura distribuída, concorrência e paralelismo.

### 1.2 Escopo
Sistema cliente-servidor com suporte a múltiplos clientes simultâneos, salas de chat, transferência de arquivos e recursos que explorem processamento concorrente e paralelo.

### 1.3 Justificativa Acadêmica
O projeto permite demonstrar:
- **Arquitetura Distribuída:** Modelo cliente-servidor com comunicação via sockets
- **Concorrência:** Gerenciamento de múltiplas conexões simultâneas
- **Paralelismo:** Processamento paralelo de tarefas (compressão, validação, logs)
- **Sincronização:** Controle de acesso a recursos compartilhados
- **Comunicação:** Protocolos de mensagens estruturadas

---

## 2. Requisitos Funcionais

### RF01 - Servidor de Chat
**Prioridade:** Alta  
**Descrição:** O servidor deve gerenciar múltiplas conexões de clientes simultaneamente.

**Critérios de Aceite:**
- Suportar no mínimo 5 clientes simultâneos
- Usar threads ou processos para cada conexão
- Manter lista de clientes conectados
- Implementar heartbeat para detecção de desconexões

**Relação com Avaliação:** Arquitetura Distribuída (1.0 pt)

---

### RF02 - Cliente de Chat
**Prioridade:** Alta  
**Descrição:** Aplicação cliente que conecta ao servidor e permite envio/recebimento de mensagens.

**Critérios de Aceite:**
- Interface simples (CLI ou GUI básica)
- Thread separada para recebimento de mensagens
- Reconexão automática em caso de falha
- Exibir status de conexão

**Relação com Avaliação:** Arquitetura Distribuída (0.5 pt)

---

### RF03 - Salas de Chat
**Prioridade:** Alta  
**Descrição:** Sistema de salas públicas e privadas para organização de conversas.

**Critérios de Aceite:**
- Sala pública padrão (todos os usuários)
- Criação de salas privadas
- Listar salas disponíveis
- Entrar/sair de salas
- Mensagens enviadas apenas para usuários da mesma sala

**Relação com Avaliação:** Arquitetura Distribuída (1.0 pt)

---

### RF04 - Autenticação de Usuários
**Prioridade:** Média  
**Descrição:** Sistema simples de autenticação com nickname único.

**Critérios de Aceite:**
- Nickname único por sessão
- Validação de nickname duplicado
- Mensagem de boas-vindas personalizada

**Relação com Avaliação:** Arquitetura Distribuída (0.5 pt)

---

### RF05 - Broadcast de Mensagens
**Prioridade:** Alta  
**Descrição:** Envio de mensagens para todos os usuários de uma sala.

**Critérios de Aceite:**
- Sincronização adequada (locks/semáforos)
- Timestamp em cada mensagem
- Identificação do remetente
- Broadcast assíncrono

**Relação com Avaliação:** Concorrência/Paralelismo (0.5 pt), Arquitetura (0.5 pt)

---

### RF06 - Transferência de Arquivos
**Prioridade:** Média  
**Descrição:** Envio de arquivos pequenos entre usuários com processamento paralelo.

**Critérios de Aceite:**
- Limite de tamanho (ex: 5MB)
- Compressão paralela usando Worker Thread antes do envio
- Validação de checksum
- Stream API para transferência eficiente
- Progress callback para acompanhamento

**Implementação Node.js:**
- Worker Thread dedicado para compressão (CPU-bound)
- Stream com pipeline para leitura/gravação
- EventEmitter para progresso de transferência

**Relação com Avaliação:** Concorrência/Paralelismo (0.8 pt), Arquitetura (0.5 pt)

---

### RF07 - Sistema de Presença
**Prioridade:** Média  
**Descrição:** Exibir status dos usuários (online, ausente, offline).

**Critérios de Aceite:**
- Lista de usuários online
- Notificação de entrada/saída
- Thread de heartbeat
- Timeout configurável

**Relação com Avaliação:** Concorrência/Paralelismo (0.3 pt)

---

### RF08 - Log Assíncrono
**Prioridade:** Baixa  
**Descrição:** Sistema de logging com gravação assíncrona em arquivo.

**Critérios de Aceite:**
- Thread separada para I/O de logs
- Fila thread-safe para mensagens de log
- Registro de todas as operações principais
- Rotação de logs por tamanho

**Relação com Avaliação:** Concorrência/Paralelismo (0.4 pt)

---

## 3. Requisitos Não-Funcionais

### RNF01 - Performance
- Latência máxima de 100ms para mensagens de texto
- Suportar 10 mensagens/segundo por sala
- Uso de memória ≤ 200MB por cliente

### RNF02 - Escalabilidade
- Arquitetura preparada para adicionar mais servidores
- Pool de threads configurável
- Documentar limitações de escala

### RNF03 - Confiabilidade
- Reconexão automática do cliente
- Tratamento de exceções adequado
- Graceful shutdown do servidor

### RNF04 - Reprodutibilidade
- Código bem documentado
- README com instruções de instalação/execução
- Dependências explícitas
- Scripts de inicialização

### RNF05 - Testabilidade
- Testes de carga básicos
- Simulação de múltiplos clientes
- Logs para debugging
- Métricas de performance

---

## 4. Arquitetura Técnica

### 4.1 Visão Geral
**Padrão:** Cliente-Servidor  
**Comunicação:** TCP Sockets / WebSockets  
**Protocolo:** JSON sobre TCP  
**Concorrência:** Event Loop + Worker Threads + Cluster API  
**Linguagem:** Node.js (JavaScript/TypeScript)

### 4.2 Componentes Principais

#### Servidor
```
Server (Master Process)
├── Cluster Manager (fork múltiplos workers)
│   └── Worker Process[]
├── ConnectionManager (EventEmitter)
│   ├── ClientHandler (socket por cliente)
│   └── HeartbeatMonitor (setInterval)
├── RoomManager (Map thread-safe)
│   └── Room[] (Set de sockets)
├── MessageBroker (EventEmitter + Queue)
├── FileProcessor (Worker Threads)
│   └── CompressionWorker
└── LogWriter (Worker Thread + Stream)
```

#### Cliente
```
Client (Single Process)
├── ConnectionHandler (net.Socket/WebSocket)
├── MessageReceiver (EventEmitter)
├── UIController (readline/blessed)
├── FileTransferManager (Worker Thread)
└── ReconnectionHandler (exponential backoff)
```

### 4.3 Protocolo de Mensagens

```json
{
  "type": "MESSAGE|JOIN|LEAVE|FILE|HEARTBEAT",
  "sender": "nickname",
  "room": "room_name",
  "content": "...",
  "timestamp": "ISO8601",
  "metadata": {}
}
```

---

## 5. Conceitos de Concorrência/Paralelismo Aplicados (Node.js)

### Event Loop (Concorrência)
- **Main Thread:** Gerencia I/O não-bloqueante via event loop
- **Callbacks/Promises:** Operações assíncronas (conexões, mensagens)
- **EventEmitter:** Comunicação entre componentes via eventos

### Worker Threads (Paralelismo Real)
- **File Compression:** Worker dedicado para compressão CPU-intensiva
- **Checksum Validation:** Cálculo paralelo de hashes
- **Log Processing:** Worker para escrita assíncrona em disco
- **Thread Pool:** Gerenciamento de múltiplos workers

### Cluster API (Multi-Processo)
- **Master Process:** Coordena workers e distribui conexões
- **Worker Processes:** Múltiplas instâncias do servidor (1 por CPU core)
- **IPC (Inter-Process Communication):** Mensagens entre master e workers
- **Load Balancing:** Round-robin automático entre workers

### Sincronização
- **Atomic Operations:** SharedArrayBuffer para contadores globais
- **EventEmitter:** Coordenação via eventos
- **Promises/async-await:** Controle de fluxo assíncrono
- **Semaphore Pattern:** Limitar conexões simultâneas

### Operações Assíncronas
- **Non-blocking I/O:** Socket connections via event loop
- **Stream API:** Transferência de arquivos com backpressure
- **Promise.all():** Broadcast paralelo para múltiplos clientes
- **AsyncIterator:** Processamento de filas de mensagens

### Demonstração Prática dos Conceitos
```javascript
// Exemplo de estrutura no servidor:
const cluster = require('cluster');
const { Worker } = require('worker_threads');

// 1. MULTI-PROCESSO (Cluster)
if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork(); // Processos paralelos
  }
}

// 2. CONCORRÊNCIA (Event Loop)
server.on('connection', async (socket) => {
  // Non-blocking I/O
  socket.on('data', handleMessage);
});

// 3. PARALELISMO (Worker Threads)
function compressFile(file) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./compression-worker.js');
    worker.postMessage(file);
    worker.on('message', resolve);
  });
}

// 4. SINCRONIZAÇÃO (Broadcast com Promise.all)
async function broadcastToRoom(room, message) {
  const clients = roomManager.getClients(room);
  await Promise.all(
    clients.map(client => sendMessage(client, message))
  );
}
```

---

## 6. Estrutura do Projeto Node.js

### 6.1 Estrutura de Diretórios
```
chat-distribuido/
├── src/
│   ├── client/
│   │   ├── connection.ts         # Cliente WebSocket com reconexão
│   │   ├── file-transfer.ts      # Upload via streams e chunks
│   │   ├── index.ts              # Bootstrap CLI
│   │   └── ui/
│   │       └── cli.ts            # Interface de linha de comando
│   ├── server/
│   │   ├── cluster-manager.ts    # Orquestração via Cluster API
│   │   ├── connection-manager.ts # Sessões, heartbeat, presença
│   │   ├── file-processor.ts     # Pool de workers para compressão
│   │   ├── index.ts              # Entry point HTTP/WebSocket
│   │   ├── message-broker.ts     # Broadcast assíncrono
│   │   ├── room-manager.ts       # Salas públicas/privadas
│   │   ├── types.ts
│   │   ├── utils/
│   │   │   ├── logger.ts         # Logger Winston
│   │   │   └── serialization-queue.ts
│   │   └── workers/
│   │       ├── compression-worker.ts
│   │       └── log-worker.ts
│   └── shared/
│       ├── config.ts             # Carregamento de variáveis de ambiente
│       ├── constants.ts
│       ├── index.ts
│       ├── message-types.ts
│       ├── protocol.ts           # Serialização/validação JSON
│       └── rooms.ts
├── tests/
│   ├── client.test.ts
│   ├── load-test.ts
│   └── server.test.ts
├── artillery.yml                 # Cenário de carga WebSocket
├── jest.config.ts
├── tsconfig.json
├── package.json
├── .env.example
├── .eslintrc.cjs
├── .gitignore
├── logs/
│   └── .gitkeep
└── README.md
```

### 6.2 package.json
```json
{
  "name": "chat-distribuido",
  "version": "1.0.0",
  "description": "Sistema de chat distribuído com múltiplos clientes e salas",
  "type": "module",
  "private": true,
  "main": "dist/server/index.js",
  "exports": {
    "./server": "./dist/server/index.js",
    "./client": "./dist/client/index.js"
  },
  "scripts": {
    "build": "tsc --project tsconfig.json",
    "clean": "rimraf dist",
    "start:server": "node dist/server/index.js",
    "start:client": "node dist/client/index.js",
    "dev:server": "tsx watch src/server/index.ts",
    "dev:client": "tsx src/client/index.ts",
    "dev:client:watch": "tsx watch src/client/index.ts",
    "cluster": "node dist/server/cluster-manager.js",
    "lint": "eslint src --ext .ts",
    "test": "jest",
    "test:load": "artillery run artillery.yml"
  },
  "dependencies": {
    "blessed": "^0.1.81",
    "blessed-contrib": "^4.11.0",
    "chalk": "^5.3.0",
    "dotenv": "^16.3.1",
    "uuid": "^9.0.1",
    "winston": "^3.11.0",
    "ws": "^8.14.2"
  },
  "devDependencies": {
    "@types/node": "^20.10.5",
    "@types/ws": "^8.5.8",
    "@typescript-eslint/eslint-plugin": "^6.13.2",
    "@typescript-eslint/parser": "^6.13.2",
    "artillery": "^2.0.0",
    "eslint": "^8.54.0",
    "jest": "^29.7.0",
    "rimraf": "^5.0.5",
    "ts-jest": "^29.1.1",
    "ts-node": "^10.9.1",
    "tsx": "^4.7.0",
    "typescript": "^5.3.2"
  },
  "engines": {
    "node": ">=18.18.0"
  }
}
```

### 6.3 Variáveis de Ambiente (.env)
```bash
# Servidor
SERVER_HOST=0.0.0.0
SERVER_PORT=9090
MAX_CONNECTIONS=100
HEARTBEAT_INTERVAL=30000
HEARTBEAT_TIMEOUT=45000

# Cluster
CLUSTER_WORKERS=auto  # 'auto' = número de CPUs

# Worker Threads
COMPRESSION_WORKERS=2
LOG_WORKER_QUEUE_SIZE=1000

# Arquivos
MAX_FILE_SIZE=5242880  # 5MB em bytes
ALLOWED_FILE_TYPES=.txt,.pdf,.jpg,.png,.zip

# Logs
LOG_LEVEL=info
LOG_FILE=./logs/chat.log
LOG_MAX_SIZE=10485760  # 10MB
```

### 6.4 Comandos de Execução

#### Desenvolvimento (Modo Single Process)
```bash
# Terminal 1 - Servidor
npm run dev:server

# Terminal 2, 3, 4... - Clientes
npm run dev:client

# Opcional: CLI com auto-reload (reinicia a cada alteração)
npm run dev:client:watch
```

#### Produção (Modo Cluster)
```bash
# Servidor com cluster (múltiplos processos)
npm run cluster

# Ou com PM2 (recomendado)
pm2 start src/server/cluster-manager.js -i max
pm2 monit
```

#### Testes
```bash
# Build de TypeScript (necessário antes dos scripts start:*)
npm run build

# Testes unitários
npm test

# Teste de carga (múltiplos clientes simultâneos)
npm run test:load
```

### 6.5 Estado Atual da Implementação (Outubro/2025)
- **Concluído:** estrutura TypeScript com build para `dist/`, servidor WebSocket (heartbeat, presença, salas, broadcast, cluster stub), cliente CLI com reconexão e comandos de sala, carregamento de configuração via `.env`, log estruturado com Winston, script de carga Artillery.
- **Em andamento:** integração dos workers de compressão/log ao fluxo de transferência, ampliação de testes automatizados, tratamento completo de upload/download no servidor, documentação README.
- **Pendentes:** interface TUI (blessed), métricas e dashboards, testes de carga com relatórios, artigo acadêmico e diagramas finais.

---

## 7. Tecnologias Sugeridas

### Tecnologia Escolhida: Node.js

**Justificativa:**
- Event-driven architecture (ideal para I/O intensivo)
- JavaScript tanto no servidor quanto no cliente
- NPM com vasto ecossistema
- Async/await nativo para código limpo
- Worker threads e cluster para paralelismo

**Stack Tecnológico:**
```
Backend (Servidor):
- net / ws (comunicação TCP/WebSocket)
- worker_threads (paralelismo real)
- cluster (múltiplos processos)
- events (EventEmitter)
- zlib (compressão)
- uuid (identificadores únicos)
- winston (logging assíncrono)

Frontend (Cliente):
- ws (cliente WebSocket)
- readline/promises + chalk (CLI)
- blessed/blessed-contrib (TUI avançada - pendente)
- electron (opcional: GUI desktop)

DevOps:
- tsx (desenvolvimento com reload)
- eslint + @typescript-eslint (qualidade de código)
- jest/ts-jest (testes)
- artillery (testes de carga)
- pm2 (produção/cluster)
```

---

## 8. Plano de Desenvolvimento

### Fase 1 - Fundação 
- [x] Setup do ambiente Node.js (v18+)
- [x] Estrutura do projeto (src, tests, logs)
- [x] package.json com scripts e dependências
- [x] Estrutura básica cliente-servidor
- [x] Conexão TCP/WebSocket funcional
- [x] EventEmitter para gerenciamento de eventos
- [x] Mensagem simples texto
- [ ] README básico

### Fase 2 - Concorrência 
- [x] Sistema de salas (RoomManager)
- [x] Broadcast sincronizado via Promise.all()
- [x] Heartbeat com setInterval e reconexão
- [x] Múltiplas conexões simultâneas (event loop)
- [x] Winston para logging estruturado
- [ ] Testes básicos com Jest

### Fase 3 - Paralelismo
- [ ] Transferência de arquivos com Streams
- [ ] Worker Thread para compressão (zlib)
- [ ] Worker Thread para log assíncrono
- [x] Cluster API (múltiplos processos)
- [x] Testes de carga com Artillery
- [ ] Métricas de performance (latência, throughput)

### Fase 4 - Documentação
- [ ] Coleta de métricas
- [ ] Screenshots/diagramas
- [ ] Redação do artigo
- [ ] Revisão final

---

## 9. Estrutura do Artigo (Deliverable)

### Estrutura Obrigatória
1. **Título**
2. **Resumo** (150-250 palavras)
3. **Introdução**
   - Contexto
   - Motivação
   - Objetivos
4. **Metodologia**
   - Arquitetura escolhida
   - Tecnologias utilizadas
   - Conceitos aplicados
5. **Resultados**
   - Prints da aplicação
   - Testes de concorrência
   - Métricas de performance
   - Diagramas de arquitetura
6. **Conclusão**
   - Objetivos alcançados
   - Desafios enfrentados
   - Trabalhos futuros
7. **Referências**

### Diagramas Necessários
- Arquitetura geral (cliente-servidor)
- Diagrama de threads
- Fluxo de mensagens
- Protocolo de comunicação
- Diagrama de classes (opcional)

---

## 10. Métricas de Sucesso

### Técnicas
- ✅ Suportar 5+ clientes simultâneos
- ✅ Latência < 100ms
- ✅ 0 deadlocks em testes de 10 minutos
- ✅ 100% de mensagens entregues em condições normais

### Acadêmicas
- ✅ Demonstrar claramente arquitetura distribuída
- ✅ Aplicar 3+ conceitos de concorrência
- ✅ Documentação completa e clara
- ✅ Código reproduzível e testado

---

## 11. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Callback hell / Promises complexas | Média | Médio | Usar async/await, ESLint, code review |
| Race conditions em event loop | Alta | Médio | Testes extensivos, usar EventEmitter corretamente |
| Bloqueio do event loop | Média | Alto | Mover operações CPU-bound para Worker Threads |
| Complexidade excessiva | Média | Médio | MVP primeiro, features incrementais |
| Tempo insuficiente | Alta | Alto | Priorizar RF de alta prioridade |
| Gerenciamento de Worker Threads | Média | Médio | Documentação clara, pool de workers fixo |

---

## 12. Entregáveis Finais

### Código
- [ ] Repositório GitHub público ou .zip
- [ ] README.md completo
- [ ] Código comentado (JSDoc)
- [x] package.json com dependências
- [x] .env.example para configurações
- [x] Scripts npm (start, test, dev)

### Documentação
- [ ] Artigo em PDF (formato ABNT ou IEEE)
- [ ] Mínimo 8 páginas, máximo 15
- [ ] Diagramas em alta resolução
- [ ] Screenshots da aplicação funcionando

### Testes
- [x] Script de teste de carga
- [ ] Evidências de múltiplos clientes
- [ ] Logs de execução

---

## 13. Checklist de Avaliação

### Arquitetura Distribuída (4 pts)
- [x] Implementação cliente-servidor funcional (1.0)
- [x] Sistema de salas distribuído (1.0)
- [x] Protocolo de comunicação estruturado (0.5)
- [ ] Múltiplos clientes simultâneos (0.5)
- [x] Gerenciamento de conexões (0.5)
- [ ] Documentação da arquitetura (0.5)

### Concorrência/Paralelismo (2 pts)
- [ ] Threads para múltiplas conexões (0.5)
- [ ] Sincronização adequada (locks/semáforos) (0.5)
- [ ] Processamento paralelo (compressão/broadcast) (0.5)
- [ ] Comunicação inter-threads (queues) (0.3)
- [ ] Thread assíncrona (logs/heartbeat) (0.2)

### Documento/Artigo (4 pts)
- [ ] Estrutura completa conforme solicitado (1.0)
- [ ] Diagramas de arquitetura claros (1.0)
- [ ] Resultados bem documentados (1.0)
- [ ] Metodologia detalhada (0.5)
- [ ] Formatação acadêmica adequada (0.5)
