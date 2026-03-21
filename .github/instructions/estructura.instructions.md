---
applyTo: '**'
---
# ImpactoPool - Estructura del Proyecto

Respeta esta estructura de proyecto al agregar o modificar archivos. Está diseñada específicamente para ImpactoPool, una plataforma de donaciones descentralizada con gestión blockchain.

## Estructura MVP - Hackathon (3 Tracks Simultáneamente)

```
impactopool/
├── package.json                          # Dependencias npm y scripts
├── server.js                             # Punto de entrada principal
├── .env.example                          # Variables de entorno (template)
│
├── TRACK_SETUP.md                        # Guía de setup por track
│
├── config/
│   ├── blockchain.config.js              # Configuración Avalanche (RPC, contratos)
│   ├── x402.config.js                    # Configuración x402 (pagos on-chain)
│   ├── fiserv.config.js                  # Configuración Fiserv/Clover POS
│   └── constants.js                      # Constantes (70/30 split, 5% rewards)
│
├── public/                               # Frontend Web (Avalanche + x402)
│   ├── index.html                        # Landing page + formulario donador
│   ├── css/style.css                     # Estilos básicos
│   └── js/
│       ├── app.js                        # Lógica principal frontend
│       ├── blockchain-integration.js     # Web3.js para interacción contratos
│       └── x402-client.js                # Cliente x402 para pagos on-chain
│
├── src/                                  # Backend Node.js
│   ├── middleware/
│   │   └── auth.middleware.js            # Autenticación básica
│   │
│   ├── models/
│   │   ├── User.model.js                 # Usuarios (donadores, asociaciones)
│   │   ├── Donation.model.js             # Registro donaciones
│   │   └── Association.model.js          # Datos asociaciones
│   │
│   ├── routes/
│   │   ├── donations.routes.js           # POST /donate, GET /donation/:id
│   │   ├── users.routes.js               # Auth, perfil
│   │   └── x402.routes.js                # POST /api/pay (x402 payment protocol)
│   │
│   └── services/
│       ├── donation.service.js           # Lógica 70/30 split
│       ├── blockchain.service.js         # Interacción smart contracts
│       └── x402-payment.service.js       # x402 HTTP payment protocol handler
│
├── src/blockchain/                       # Smart Contracts - Track Avalanche
│   ├── contracts/
│   │   ├── ImpactoPool.sol               # Contrato principal (70/30 split)
│   │   ├── DonationVault.sol             # Vault para 30% en blockchain
│   │   ├── AutonomousAgent.sol           # ERC-8004 Agente autónomo
│   │   └── X402PaymentHandler.sol        # Contrato para x402 protocol
│   │
│   └── scripts/
│       └── deploy.js                     # Deploy a Avalanche
│
├── fiserv/                               # Track Fiserv + Clover POS
│   ├── build.gradle                      # Configuración Gradle (Kotlin)
│   ├── settings.gradle
│   │
│   ├── app/
│   │   ├── src/main/kotlin/
│   │   │   └── com/impactopool/
│   │   │       ├── MainActivity.kt       # Interfaz principal Clover
│   │   │       ├── DonationActivity.kt   # Actividad recibir donación
│   │   │       ├── FiservPayment.kt      # Integración Fiserv Payment Rails
│   │   │       └── SyncToBlockchain.kt   # Sincroniza con Avalanche
│   │   │
│   │   └── src/main/res/
│   │       ├── layout/
│   │       ├── values/
│   │       └── AndroidManifest.xml
│   │
│   └── Tests/
│       └── clover-integration.test.kt    # Tests Kotlin
│
└── Tests/
    └── integration/
        ├── donation-flow.test.js         # Test flujo Avalanche
        ├── x402-payment.test.js          # Test x402 protocol
        └── fiserv-sync.test.js           # Test sincronización Fiserv→Blockchain
```

## Cumplimiento de Tracks

### Track Avalanche ✅
- Avalanche Blockchain: `/src/blockchain/contracts/` + `blockchain.service.js`
- ERC-8004: `/src/blockchain/contracts/AutonomousAgent.sol`
- x402 HTTP Payment Protocol: `/src/blockchain/contracts/X402PaymentHandler.sol` + `x402-payment.service.js`

### Track Fiserv ✅
- Clover POS: `/fiserv/app/` (Android Kotlin)
- Fiserv Payment Rails: `FiservPayment.kt`
- Integración: `SyncToBlockchain.kt` conecta Clover con Avalanche

### Track Best Projects (PL_Genesis) ✅
- Categoría: **Crypto**
- Implementación: Uso de Avalanche + x402 + ERC-8004

## Estructura Expandida (Post-Hackathon)

Cuando necesites escalar, agrega:

- `src/models/`: `Transaction.model.js`, `Reward.model.js`, `BlockchainEvent.model.js`
- `src/routes/`: `associations.routes.js`, `transactions.routes.js`, `rewards.routes.js`
- `src/services/`: `reward.service.js`, `notification.service.js`, `transparency.service.js`
- `src/utils/`: `validators.js`, `helpers.js`, `logger.js`
- `src/blockchain/contracts/`: `RewardToken.sol`, `AssociationRegistry.sol`
- `src/blockchain/test/`: Tests unitarios de smart contracts (Hardhat/Truffle)
- `fiserv/app/src/main/kotlin/`: Más actividades y servicios
- `Tests/`: `unit/`, `e2e/`, más cobertura

## Reglas Importantes

1. **Enfoque Hackathon:** Mantén SOLO lo esencial. Agrega features después del MVP.
2. **3 Tracks simultáneamente:**
   - **Avalanche:** Node.js backend + Solidity contracts
   - **Fiserv:** Kotlin + Gradle + Android manifest
   - **Sincronización:** `SyncToBlockchain.kt` conecta Clover → Avalanche
3. **Smart Contracts:** Solidity en `/src/blockchain/contracts/`
4. **Apps Android:** Kotlin en `/fiserv/app/src/main/kotlin/`
5. **Configuración sensible:** APIs, RPC URLs, credenciales Clover/Fiserv en `.env` (nunca hardcodeados ni en archivos de configuración)
6. **Tests:** 
   - Flujo Avalanche: `/Tests/integration/donation-flow.test.js`
   - x402 Protocol: `/Tests/integration/x402-payment.test.js`
   - Fiserv Sync: `/Tests/integration/fiserv-sync.test.js`
7. **Convención de nombres:**
   - Servicios: `*.service.js`
   - Modelos: `*.model.js`
   - Rutas: `*.routes.js`
   - Middlewares: `*.middleware.js`
   - Kotlin Activities: `*Activity.kt`
   - Kotlin Services: `*Service.kt`