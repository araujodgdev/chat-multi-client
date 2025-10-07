# Chat Multi Client


## Equipe

 - Douglas Cabral Pereira de Araújo 
 - Lucas Mateus Alves Luna

Sistema de chat distribuído em Node.js/TypeScript que demonstra arquitetura cliente-servidor com suporte a múltiplos usuários, salas, presença e transferência de arquivos via WebSocket. O projeto serve como base para o artigo acadêmico e comprova o uso de concorrência (event loop assíncrono), paralelismo (Worker Threads/Cluster) e sincronização via filas de mensagens.

## ✨ Principais Recursos
- **Servidor WebSocket** com heartbeat, detecção de desconexões e broadcast assíncrono.
- **Salas públicas e privadas** controladas pelo `RoomManager`, com mensagens isoladas por sala.
- **Presença em tempo real** (status on-line/ausente) distribuída para todos os clientes conectados.
- **Cliente CLI** com reconexão automática, comandos /join, /leave, /rooms e `/sendfile`.
- **Pipeline de arquivos** (cliente) que envia chunks base64 com checksum por chunk.
- **Cluster/Workers** preparados para paralelizar compressão e logging sem bloquear o event loop.
- **Infra auxiliar**: logger Winston, configuração via `.env`, testes Artillery e placeholders Jest.

## 📦 Estrutura do Projeto
```
src/
├── client/
│   ├── connection.ts      # Cliente WebSocket, heartbeat, reconexão
│   ├── file-transfer.ts   # Envio de arquivos em streaming
│   ├── index.ts           # Bootstrap CLI
│   └── ui/cli.ts          # Interface de linha de comando
├── server/
│   ├── index.ts           # Servidor HTTP + WebSocket
│   ├── connection-manager.ts
│   ├── room-manager.ts
│   ├── message-broker.ts
│   ├── file-processor.ts  # Pool Worker Threads
│   ├── cluster-manager.ts # Inicialização via Cluster API
│   └── workers/
├── shared/                # Protocolo, tipos e config compartilhados
└── tests/                 # Placeholders de testes unitários/de carga
```

## 🚀 Como Executar
Requisitos: **Node.js ≥ 18.18**, npm.

```bash
# Instalar dependências
npm install

# Compilar TypeScript para dist/
npm run build

# Iniciar servidor (porta padrão 9090)
npm run start:server

# Iniciar cliente CLI (fecha com /quit)
npm run start:client -- --nickname alice
```

### Desenvolvimento interativo
```bash
# Servidor com reload automático (tsx watch)
npm run dev:server

# Cliente CLI executado direto de src/
npm run dev:client

# Cliente CLI com watch (reexecuta a cada alteração)
npm run dev:client:watch
```

## 🧪 Testes
```bash
# (placeholder) Executa Jest com ts-jest
npm test

# Teste de carga websocket (Artillery)
npm run test:load
```

## ⚙️ Configuração via .env
Copie `.env.example` para `.env` e ajuste conforme necessário.

| Variável                | Descrição                                     | Padrão |
|-------------------------|-----------------------------------------------|--------|
| `SERVER_HOST`           | Host HTTP/WebSocket                           | `0.0.0.0` |
| `SERVER_PORT`           | Porta do servidor                             | `9090` |
| `MAX_CONNECTIONS`       | Limite de sessões simultâneas                 | `100` |
| `HEARTBEAT_INTERVAL`    | Intervalo de heartbeat (ms)                   | `30000` |
| `HEARTBEAT_TIMEOUT`     | Timeout antes de derrubar cliente (ms)       | `45000` |
| `COMPRESSION_WORKERS`   | Workers para compressão de arquivos          | `2` |
| `LOG_FILE` / `LOG_LEVEL`| Destino e nível de log (Winston)              | `./logs/chat.log` / `info` |

## 🧱 Arquitetura & Conceitos
- **Cliente-Servidor (WebSocket over HTTP)**: todos os clientes conversam com o servidor central.
- **Concorrência**: uso intensivo do event loop e do `MessageBroker` para broadcast assíncrono.
- **Paralelismo**: `file-processor` cria um pool de Worker Threads para compressão; `cluster-manager` permite múltiplos processos por CPU.
- **Sincronização**: filas internas e `Promise.all` garantem entrega consistente sem race conditions.
- **Protocolo**: mensagens JSON padronizadas (types `MESSAGE`, `JOIN`, `LEAVE`, `FILE`, `HEARTBEAT`, `PRESENCE`, etc.) validadas em `shared/protocol.ts`.

## 🧭 Próximos Passos (roadmap resumido)
- Concluir pipeline completo de transferência de arquivos (persistência e download lato servidor).
- Implementar interface TUI (blessed) e dashboards de métricas.
- Adicionar testes automatizados robustos (unitários, integração, concorrência).
- Documentar com README abrangente e preparar artigo PDF com diagramas e resultados.

## 📝 Licença
Projeto acadêmico; adaptar conforme necessidade do curso ou instituição.
