# ImpactoPool

**Plataforma descentralizada de donaciones con transparencia blockchain en Avalanche**

> Aleph Hackathon 2026 — Track Avalanche | Track Best Projects (PL_Genesis - Crypto)

---

## ¿Qué es ImpactoPool?

ImpactoPool es una plataforma que actúa como intermediario transparente entre donadores y asociaciones benéficas. A diferencia de los sistemas tradicionales donde no sabés a dónde fue tu plata, ImpactoPool registra cada donación en la blockchain de Avalanche, garantizando trazabilidad total.

La plataforma divide automáticamente cada donación: **70% va directo a la asociación** y **30% se deposita en un vault on-chain que genera rendimiento**. Cuando ese rendimiento alcanza el umbral del 5%, se devuelve al donador como incentivo por haber donado. El capital original sigue en el vault trabajando para la asociación.

---

## El Problema

- Las donaciones tradicionales no tienen transparencia real — no sabés si tu dinero llegó
- No hay incentivos para seguir donando
- Los intermediarios cobran comisiones opacas
- No existe un registro público e inmutable de las donaciones

## La Solución

ImpactoPool usa blockchain como fuente de verdad. Cada donación se ejecuta mediante smart contracts en Avalanche, haciendo imposible alterar los registros. El sistema de rewards incentiva la donación recurrente, y la identidad verificable (ERC-8004) genera confianza en la plataforma.

---

## ¿Cómo Funciona?

```
Donador dona 100 USDC
        │
        ▼
  ┌──────────────┐
  │  ImpactoPool  │  ← Smart Contract en Avalanche
  │   (70 / 30)   │
  └──────┬────────┘
         │
   ┌─────┴──────┐
   │             │
   ▼             ▼
70 USDC       30 USDC
   │             │
   ▼             ▼
Asociación   DonationVault
(inmediato)   (on-chain)
                 │
                 ▼
          Genera rendimiento
            con el tiempo
                 │
                 ▼
        Alcanza umbral del 5%
         (5% de 30 = 1.5 USDC)
                 │
                 ▼
        1.5 USDC → Donador
           (reward)

  Los 30 USDC originales siguen
  en el vault generando valor
  para la asociación.
```

### El Ciclo Completo

1. **Donación** — El donador elige una asociación verificada y dona en USDC
2. **Split automático** — El smart contract divide: 70% asociación / 30% vault
3. **Acreditación inmediata** — La asociación recibe su 70% al instante
4. **Vault on-chain** — El 30% se deposita en el DonationVault en Avalanche
5. **Generación de rendimiento** — El vault genera intereses con el tiempo
6. **Reward al donador** — Cuando el rendimiento acumulado alcanza el 5% del monto depositado, se devuelve automáticamente al donador como incentivo
7. **Capital permanente** — Los fondos originales del vault siguen generando valor para la asociación

---

## Tecnologías del Hackathon

### Track Avalanche — Cumplimiento

| Requisito | Implementación | Estado |
|-----------|---------------|--------|
| **Avalanche Blockchain** | 5 smart contracts en Solidity desplegados en Fuji Testnet (C-Chain). Split 70/30 on-chain, vault de inversión, tokens USDC. | ✅ |
| **ERC-8004** | `AgentRegistry.sol` — Registro de identidad NFT (ERC-721) para la plataforma como agente autónomo verificable. `ReputationRegistry.sol` — Sistema de feedback on-chain con scores, tags y revocación. | ✅ |
| **x402 HTTP Payment Protocol** | Middleware oficial de Coinbase (`@x402/express`) protege endpoints de transparencia con micropagos de $0.01 USDC en Avalanche Fuji. | ✅ |

### Track Best Projects (PL_Genesis) — Categoría Crypto

ImpactoPool cumple con la categoría **Crypto** al implementar donaciones descentralizadas, transparencia blockchain, e incentivos tokenizados en Avalanche.

---

## Arquitectura

```
┌──────────────────┐     ┌──────────────────┐     ┌─────────────────────────┐
│     Frontend      │     │     Backend       │     │    Avalanche Fuji       │
│                   │     │                   │     │                         │
│  HTML / CSS / JS  │────►│  Express.js       │────►│  ImpactoPool.sol        │
│  ethers.js        │     │  MongoDB Atlas    │     │  DonationVault.sol      │
│  x402 Client      │     │  JWT Auth         │     │  AgentRegistry.sol      │
│                   │     │  x402 Middleware   │     │  ReputationRegistry.sol │
│                   │     │                   │     │  MockUSDC.sol           │
└──────────────────┘     └──────────────────┘     └─────────────────────────┘
```

### Frontend (`/public`)
- Landing page con formulario de donación
- Conexión a MetaMask / Core Wallet
- Panel de transparencia protegido por x402
- Sistema de feedback ERC-8004

### Backend (`/src`)
- API REST con Express.js
- Autenticación JWT (registro, login, perfil)
- Servicio de donaciones con split 70/30
- Interacción con smart contracts via ethers.js
- Base de datos MongoDB Atlas

### Blockchain (`/src/blockchain`)
- Smart contracts en Solidity 0.8.27
- OpenZeppelin 5.6.1 (ERC-721, ERC-20, Ownable, ReentrancyGuard)
- Deploy con Hardhat en Avalanche Fuji (Chain ID 43113)

---

## Smart Contracts

| Contrato | Función | Descripción |
|----------|---------|-------------|
| **ImpactoPool.sol** | Core | Recibe donaciones en USDC, ejecuta split 70/30, transfiere a asociación y vault. Gestiona asociaciones verificadas. Protegido con `nonReentrant`. |
| **DonationVault.sol** | Vault | Almacena el 30% de cada donación. Registra balances por donador. Distribuye el 5% de rendimiento cuando alcanza el umbral. |
| **AgentRegistry.sol** | ERC-8004 Identity | Registro de agentes como NFTs (ERC-721). La plataforma se registra como agente verificable con metadata on-chain y wallet asociada. |
| **ReputationRegistry.sol** | ERC-8004 Reputation | Sistema de feedback on-chain. Los usuarios dejan reviews con score, tags y URI. Calcula reputación agregada. Permite revocación. |
| **MockUSDC.sol** | Testing | Token ERC-20 con 6 decimales (simula USDC). Función `faucet()` para testing en Fuji. |

---

## API Endpoints

### Autenticación

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/users/register` | No | Registro (name, email, password, walletAddress) |
| POST | `/api/users/login` | No | Login (email, password) → JWT token |
| GET | `/api/users/me` | Sí | Perfil del usuario autenticado |

### Donaciones

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/donations` | Sí | Crear donación (associationId, amount) → split 70/30 |
| GET | `/api/donations/:id` | Sí | Detalle de una donación |
| GET | `/api/donations/donor/me` | Sí | Mis donaciones como donador |
| GET | `/api/donations/association/:id` | Sí | Donaciones recibidas por asociación |

### x402 — Protegidos con Micropago ($0.01 USDC)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/premium-data` | x402 | Estadísticas de la plataforma |
| GET | `/api/donations/transparency` | x402 | Datos de transparencia: split, vault, donaciones recientes |
| GET | `/api/x402/info` | No | Metadata del protocolo x402 y endpoints protegidos |

### Sistema

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/health` | No | Health check del servidor |

---

## Instalación

### Requisitos

- Node.js >= 18
- MongoDB (local o Atlas)
- MetaMask o Core Wallet

### Setup

```bash
# 1. Clonar repositorio
git clone <repo-url>
cd ImpactPool

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores (MongoDB URI, private key, etc.)

# 4. Compilar smart contracts
npm run compile

# 5. Deploy a Fuji Testnet (requiere AVAX de faucet)
npm run deploy
# Copiar las direcciones de contratos al .env

# 6. Levantar servidor
npm run dev
```

Abrir http://localhost:3000

### Obtener AVAX para testing

Faucet: https://faucet.avax.network/

---

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor con hot-reload (nodemon) |
| `npm start` | Servidor en producción |
| `npm test` | Correr tests (Jest) |
| `npm run test:integration` | Tests de integración |
| `npm run compile` | Compilar contratos Solidity (Hardhat) |
| `npm run deploy` | Deploy contratos a Avalanche Fuji |

---

## Variables de Entorno

```env
# Servidor
PORT=3000
NODE_ENV=development

# Base de datos
MONGODB_URI=mongodb://localhost:27017/impactopool

# Autenticación
JWT_SECRET=tu_jwt_secret
JWT_EXPIRES_IN=7d

# Avalanche
AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
AVALANCHE_CHAIN_ID=43113
DEPLOYER_PRIVATE_KEY=tu_private_key
DEPLOYER_ADDRESS=tu_wallet_address

# Contratos (completar después del deploy)
IMPACTOPOOL_CONTRACT_ADDRESS=
DONATION_VAULT_CONTRACT_ADDRESS=
AGENT_REGISTRY_CONTRACT_ADDRESS=
REPUTATION_REGISTRY_CONTRACT_ADDRESS=
USDC_TOKEN_ADDRESS=

# x402 Payment Protocol
X402_FACILITATOR_URL=https://facilitator.x402.org
X402_PAY_TO_ADDRESS=tu_wallet_address
```

---

## Stack Técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML5, CSS3, JavaScript, ethers.js v6 |
| Backend | Node.js, Express.js v4, Mongoose v8 |
| Base de datos | MongoDB Atlas |
| Blockchain | Solidity 0.8.27, Avalanche Fuji (C-Chain) |
| Smart Contracts | OpenZeppelin 5.6.1, Hardhat v2 |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Pagos on-chain | x402 Protocol (Coinbase — @x402/express v2.7) |
| Identidad | ERC-8004 (AgentRegistry + ReputationRegistry) |
| Testing | Jest v29, Supertest |

---

## Estructura del Proyecto

```
ImpactPool/
├── server.js                    # Entrada principal + x402 middleware
├── config/                      # Configuración
│   ├── blockchain.config.js     # Avalanche RPC, contratos
│   ├── x402.config.js           # x402 payment protocol
│   └── constants.js             # Split 70/30, rewards 5%
├── public/                      # Frontend
│   ├── index.html               # Landing + app
│   ├── css/style.css
│   └── js/
│       ├── app.js               # Lógica principal
│       ├── blockchain-integration.js  # Web3/ethers
│       └── x402-client.js       # Cliente x402
├── src/
│   ├── middleware/
│   │   └── auth.middleware.js   # JWT auth
│   ├── models/
│   │   ├── User.model.js
│   │   ├── Donation.model.js
│   │   └── Association.model.js
│   ├── routes/
│   │   ├── donations.routes.js
│   │   ├── users.routes.js
│   │   └── x402.routes.js
│   ├── services/
│   │   ├── donation.service.js  # Split 70/30
│   │   ├── blockchain.service.js
│   │   └── x402-payment.service.js
│   └── blockchain/
│       ├── contracts/
│       │   ├── ImpactoPool.sol
│       │   ├── DonationVault.sol
│       │   ├── AgentRegistry.sol
│       │   ├── ReputationRegistry.sol
│       │   └── MockUSDC.sol
│       └── scripts/
│           └── deploy.js
└── Tests/
    └── integration/
        ├── donation-flow.test.js
        ├── x402-payment.test.js
        └── fiserv-sync.test.js
```

---

## Equipo

|           Nombre               |          Rol            |
|--------------------------------|-------------------------|
| Emanuel Coletti                | Backend Developer       |
| Leoner Tomas Ezequiel Morales  | Frontend                |
| Christian Damian Bauer Abraham | Head of Pitch / Ideator |
| Esteban Ardaya                 | Backend Developer       |

---

## Licencia

MIT