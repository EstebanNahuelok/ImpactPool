# Tareas Backend por Delegar

## P0 — Bloqueantes (sin esto no funciona el MVP)

| # | Tarea | Detalle |
|---|-------|---------|
| **1** | **CRUD de Asociaciones** | Crear `src/routes/associations.routes.js` con: `POST /api/associations` (crear), `GET /api/associations` (listar todas), `GET /api/associations/:id` (detalle). Usar el modelo `Association.model.js` que ya existe. Requiere auth. |
| **2** | **Verificación de asociaciones** | Endpoint `PATCH /api/associations/:id/verify` — solo role `admin`. Cambia `verified: true`. `ImpactoPool.sol` ya tiene `verifyAssociation()` en el contrato, hay que llamarlo también desde el service. |
| **3** | **Listar asociaciones verificadas (público)** | `GET /api/associations?verified=true` — el frontend necesita esto para llenar el dropdown `#select-association` en el formulario de donación. |

---

## P1 — Alta prioridad

| # | Tarea | Detalle |
|---|-------|---------|
| **4** | **Servicio de recompensas** | Crear `src/services/reward.service.js` — lógica para calcular y distribuir el 5% de rewards a donadores. `DonationVault.sol` ya tiene `distributeReward()`. Falta el service que lo orqueste. |
| **5** | **Endpoint de rewards** | `POST /api/rewards/distribute` (admin) y `GET /api/rewards/me` (donador ve sus rewards). |
| **6** | **Mejorar atomicidad de donaciones** | En `donation.service.js`: si la tx blockchain falla, la donación queda en MongoDB como `failed` pero no se revierte. Implementar rollback o retry. |
| **7** | **Retry/fallback en blockchain.service.js** | `blockchain.service.js` no tiene lógica de reintentos. Si el RPC falla, muere. Agregar retry (2-3 intentos) y opcionalmente un RPC de fallback. |

---

## P2 — Importante pero no bloqueante

| # | Tarea | Detalle |
|---|-------|---------|
| **8** | **Tests completos** | `donation-flow.test.js` solo testea auth y validación. Falta testear: crear donación real, verificar split 70/30, verificar que se guarda `txHash`. |
| **9** | **Deploy a Fuji testnet** | Obtener AVAX de faucet, configurar `.env` con private key real, ejecutar `npm run deploy`. Actualizar `.env` con las direcciones de contratos desplegados. |
| **10** | **Endpoint de estadísticas públicas** | `GET /api/stats` — total donado, cantidad de donaciones, asociaciones verificadas, etc. |

---

## Archivos a Crear

| Archivo | Convención |
|---------|-----------|
| `src/routes/associations.routes.js` | CRUD de asociaciones |
| `src/services/reward.service.js` | Lógica de rewards 5% |
| `src/routes/rewards.routes.js` | Endpoints de rewards (si se separa) |

---

## Archivos a Modificar

| Archivo | Qué cambiar |
|---------|------------|
| `server.js` | Montar `app.use('/api/associations', associationsRoutes)` y `app.use('/api/rewards', rewardsRoutes)` |
| `src/services/donation.service.js` | Agregar rollback/retry en fallo blockchain |
| `src/services/blockchain.service.js` | Agregar retry logic y RPC fallback |

---

## Resumen Ejecutivo para tu Compañero

### 🎯 Prioridad 1: Endpoints de Asociaciones (P0 - BLOQUEANTE)

Crear endpoints CRUD para asociaciones:
- `POST /api/associations` — crear asociación
- `GET /api/associations` — listar todas (incluyendo públicas)
- `GET /api/associations/:id` — detalle de una
- `PATCH /api/associations/:id/verify` — verificar (solo admin)
- `GET /api/associations?verified=true` — listar solo verificadas (para dropdown del frontend)

**Por qué**: Sin esto, el frontend no puede mostrar la lista de asociaciones donde donar.

El modelo `Association.model.js` ya existe, solo faltan las rutas y el service. 

---

### 🎯 Prioridad 2: Servicio de Recompensas (5% Rewards - P1)

Crear servicio que:
1. Calcule el 5% de ganancias del `DonationVault.sol` 
2. Distribunya a los donadores originales
3. Implemente endpoints:
   - `POST /api/rewards/distribute` (admin trigger) → llama `DonationVault.distributeReward()`
   - `GET /api/rewards/me` (autenticado) → muestra rewards del donador

**Por qué**: Los donadores necesitan ver sus incentivos. El contrato tiene la función lista, falta orquestarla desde backend.

---

### 🎯 Prioridad 3: Robustez y Testing (P1 + P2)

Tres cambios importantes:

1. **En `donation.service.js`**: Si la transacción blockchain falla, la donación no debería guardarse como exitosa. Implementar rollback/retry.

2. **En `blockchain.service.js`**: Agregar lógica de reintentos (2-3 intentos). Si RPC falla, intentar de nuevo. Opcionalmente, agregar RPC fallback.

3. **En tests**: Expandir `donation-flow.test.js` para testear flujo real de donación, split 70/30 correcto, y verificación de `txHash`.

---

## Checklist Rápido

- [ ] Task 1: Crear `associations.routes.js` con CRUD completo
- [ ] Task 2: Agregar verificación de asociaciones (admin-only)
- [ ] Task 3: Filtro `?verified=true` funcional
- [ ] Task 4: Crear `reward.service.js` con lógica de cálculo
- [ ] Task 5: Endpoints POST `/rewards/distribute` y GET `/rewards/me`
- [ ] Task 6: Mejorar `donation.service.js` con rollback/retry
- [ ] Task 7: Agregar retry logic a `blockchain.service.js`
- [ ] Task 8: Expandir tests de donación
- [ ] Task 9: Deploy a Fuji y actualizar `.env`
- [ ] Task 10: Crear endpoint `/api/stats` de estadísticas públicas

---

## Notas Técnicas

- El modelo `Association.model.js` ya tiene campo `verified` (boolean)
- `ImpactoPool.sol` contrato ya tiene `verifyAssociation()` 
- `DonationVault.sol` contrato ya tiene `distributeReward()`
- Las rutas necesitan middleware de auth para proteger ciertos endpoints
- Los endpoints públicos (listar, estadísticas) NO necesitan auth
- Los admin-only (verificar, distribuir rewards) SÍ necesitan verificar role `admin`

