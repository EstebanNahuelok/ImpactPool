# ImpactoPool - Setup por Track

## Requisitos Previos

- Node.js >= 18
- MongoDB (local o Atlas)
- MetaMask o Core Wallet (para interactuar con Avalanche)

## Setup Rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# 3. Levantar servidor
npm run dev
```

Abrir http://localhost:3000

---

## Track Avalanche (Activo)

### Smart Contracts

```bash
# Compilar contratos
npm run compile

# Deploy a Fuji Testnet
# Asegurate de tener DEPLOYER_PRIVATE_KEY y AVALANCHE_RPC_URL en .env
npm run deploy
```

### Contratos desplegados:
1. **ImpactoPool.sol** - Split 70/30 de donaciones
2. **DonationVault.sol** - Vault para el 30% en blockchain
3. **AutonomousAgent.sol** - ERC-8004 agente autónomo
4. **X402PaymentHandler.sol** - Protocolo x402 HTTP payment

### Después del deploy:
Copiar las direcciones que imprime el script y pegarlas en `.env`:
```
IMPACTOPOOL_CONTRACT_ADDRESS=0x...
DONATION_VAULT_CONTRACT_ADDRESS=0x...
AUTONOMOUS_AGENT_CONTRACT_ADDRESS=0x...
X402_HANDLER_CONTRACT_ADDRESS=0x...
```

### Obtener AVAX de testnet:
- Faucet: https://faucet.avax.network/

---

## Track Best Projects - PL_Genesis (Activo)

Categoría: **Crypto**

El proyecto cumple automáticamente con este track al usar:
- Avalanche Blockchain
- x402 HTTP Payment Protocol
- ERC-8004 Agentes Autónomos

---

## Tests

```bash
# Correr todos los tests
npm test

# Solo tests de integración
npm run test:integration
```

---

## Estructura de API

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/users/register | Registro |
| POST | /api/users/login | Login |
| GET | /api/users/me | Perfil actual |
| POST | /api/donations | Crear donación |
| GET | /api/donations/:id | Ver donación |
| GET | /api/donations/donor/me | Mis donaciones |
| GET | /api/donations/association/:id | Donaciones por asociación |
| POST | /api/pay | Pago x402 |
| GET | /api/pay/status/:hash | Estado de pago x402 |
| GET | /api/health | Health check |
