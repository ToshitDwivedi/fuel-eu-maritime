# FuelEU Maritime — Compliance Platform

A full-stack implementation of the **Fuel EU Maritime compliance module** (Regulation (EU) 2023/1805) covering route management, GHG compliance-balance calculation, banking (Article 20), and pooling (Article 21).

---

## Project Overview

This platform enables maritime operators to:
- **Track vessel routes** and their GHG intensity metrics
- **Compare routes** against EU compliance baselines with visual charts
- **Bank surplus** compliance balance for future use (Article 20)
- **Pool compliance** across fleet members with greedy allocation (Article 21)

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, TailwindCSS v4, Chart.js, Vite 8 |
| Backend | Node.js, Express 5, TypeScript (strict) |
| Database | PostgreSQL 15 (node-postgres) |
| Testing | Jest 30, ts-jest, Supertest |
| Linting | ESLint (strict TS), Prettier |
| Validation | Zod |

---

## Architecture — Hexagonal (Ports & Adapters)

Both frontend and backend follow a **hexagonal / clean architecture** with strict dependency inversion. Frameworks live only in adapters and infrastructure — the core never imports them.

```
                    ┌───────────────────────────────────┐
                    │          ADAPTERS (outer)         │
                    │                                   │
                    │  ┌─────── Inbound ─────────────┐  │
                    │  │  Express Routers (HTTP)     │  │
                    │  │  React Components (UI)      │  │
                    │  └────────────┬────────────────┘  │
                    │               │  calls            │
                    │  ┌────────────▼─────────────────┐ │
                    │  │      PORTS (interfaces)      │ │
                    │  │  IRouteRepository            │ │
                    │  │  IComplianceRepository       │ │
                    │  │  IBankRepository             │ │
                    │  │  IPoolRepository             │ │
                    │  │  IApiClient                  │ │
                    │  └────────────┬─────────────────┘ │
                    │               │  implemented by   │
                    │  ┌────────────▼────────────────┐  │
                    │  │      CORE (domain)          │  │
                    │  │  Entities: Route, CB, Bank, │  │
                    │  │           Pool, PoolMember  │  │
                    │  │  Use-Cases: ComputeCB,      │  │
                    │  │    BankSurplus, ApplyBanked,│  │
                    │  │    CreatePool               │  │
                    │  └─────────────────────────────┘  │
                    │               │  implemented by   │
                    │  ┌─ Outbound ─▼─────────────────┐ │
                    │  │  PostgreSQL Repositories     │ │
                    │  │  Fetch-based ApiClient       │ │
                    │  └──────────────────────────────┘ │
                    └───────────────────────────────────┘

    Flow: Inbound Adapter → Port Interface → Core Use-Case → Port Interface → Outbound Adapter
```

### Backend Structure

```
backend/src/
  core/
    domain/          ← Pure data interfaces (Route, ComplianceBalance, BankEntry, Pool)
    application/     ← Use-cases (ComputeCB, BankSurplus, ApplyBanked, CreatePool)
    ports/
      inbound/       ← Interfaces exposed by use-cases
      outbound/      ← Repository interfaces (IRouteRepo, IComplianceRepo, IBankRepo, IPoolRepo)
  adapters/
    inbound/http/    ← Express routers (routes, compliance, banking, pools)
    outbound/postgres/ ← DB repositories implementing outbound ports
  infrastructure/
    db/              ← Migrations, pg pool config, seed data
    server/          ← Express app factory, entry point
```

### Frontend Structure

```
frontend/src/
  core/
    domain/          ← Route, ComplianceBalance, BankEntry, Pool (mirrored from backend)
    application/     ← Pure functions: computePercentDiff, isCompliant, validatePool
    ports/           ← IApiClient interface (outbound port for API communication)
  adapters/
    ui/              ← React components: RoutesTab, CompareTab, BankingTab, PoolingTab
    infrastructure/  ← Fetch-based ApiClient implementing IApiClient
  shared/            ← Constants (TARGET_INTENSITY, MJ_PER_TONNE)
```

---

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | >= 20 |
| PostgreSQL | >= 15 |
| npm or pnpm | Latest |

---

## Setup & Run Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/ToshitDwivedi/fuel-eu-maritime.git
cd fuel-eu-maritime
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env          # Edit DATABASE_URL and PORT
npm install                    # Install dependencies
npm run migrate                # Run database migrations (creates 5 tables)
npm run seed                   # Seed 5 sample routes (R001–R005)
npm run dev                    # Start dev server (default: http://localhost:3000)
```

### 3. Frontend Setup

```bash
cd frontend
cp .env.example .env          # Set VITE_API_URL (defaults to http://localhost:3000/api)
npm install                    # Install dependencies
npm run dev                    # Start Vite dev server (default: http://localhost:5173)
```

---

## How to Run Tests

### Backend Tests (Unit + Integration)

```bash
cd backend
npm run test                   # Runs all 49 tests (24 unit + 25 integration)
```

- **24 unit tests** across 4 use-case suites: ComputeCB (3), BankSurplus (6), ApplyBanked (7), CreatePool (8)
- **25 integration tests** via Supertest with in-memory repositories — no database required

### Frontend

```bash
cd frontend
npm run lint                   # ESLint check
npm run build                  # TypeScript type-check + production build
```

---

## API Endpoint Summary

All endpoints are prefixed with `/api`. Base URL: `http://localhost:3000`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check → `{ status: "ok" }` |
| `GET` | `/api/routes?vesselType&fuelType&year` | List all routes with optional filters |
| `POST` | `/api/routes/:id/baseline` | Set a route as the comparison baseline |
| `GET` | `/api/routes/comparison` | Baseline vs comparison data with `percentDiff` and `compliant` flags |
| `GET` | `/api/compliance/cb?shipId&year` | Compute compliance balance for a ship/year |
| `GET` | `/api/compliance/adjusted-cb?shipId&year` | CB adjusted after bank applications |
| `GET` | `/api/banking/records?shipId&year` | Retrieve bank entries for a ship/year |
| `POST` | `/api/banking/bank` | Bank positive CB surplus (body: `{ shipId, year, amount }`) |
| `POST` | `/api/banking/apply` | Apply banked surplus to offset deficit (body: `{ shipId, year, amount }`) |
| `POST` | `/api/pools` | Create compliance pool (body: `{ year, members: [{ shipId, cbBefore }] }`) |

---

## Core Formulas

| Formula | Expression |
|---------|-----------|
| Target Intensity (2025) | **89.3368 gCO₂e/MJ** (2% below 91.16) |
| Energy in Scope (MJ) | `fuelConsumption × 41,000 MJ/t` |
| Compliance Balance | `(Target − Actual) × Energy in Scope` |
| Percent Difference | `((comparison / baseline) − 1) × 100` |

- **Positive CB** → Surplus (can be banked)
- **Negative CB** → Deficit (must be offset via banking or pooling)

---

## Seed Data

| routeId | vesselType | fuelType | year | ghgIntensity | fuelConsumption (t) | distance (km) | totalEmissions (t) |
|---------|-----------|----------|------|-------------|-------------------|--------------|-------------------|
| R001 | Container | HFO | 2024 | 91.0 | 5000 | 12000 | 4500 |
| R002 | BulkCarrier | LNG | 2024 | 88.0 | 4800 | 11500 | 4200 |
| R003 | Tanker | MGO | 2024 | 93.5 | 5100 | 12500 | 4700 |
| R004 | RoRo | HFO | 2025 | 89.2 | 4900 | 11800 | 4300 |
| R005 | Container | LNG | 2025 | 90.5 | 4950 | 11900 | 4400 |

R001 is set as baseline by default.

---

## Screenshots

### [Routes Tab]
> Route listing with vessel/fuel/year filters and Set Baseline action. Baseline row highlighted in blue with badge.

### [Compare Tab]
> Comparison table with color-coded compliance status (green/red) and Chart.js bar chart with target reference line at 89.3368.

### [Banking Tab]
> Bank surplus / apply banked actions with KPI cards (cbBefore, applied, cbAfter) and bank records table.

### [Pooling Tab]
> Dynamic member editor with pool sum validation indicator, greedy allocation results, and Create Pool action.

---

## Reference

All constants, CB formula, and banking/pooling rules follow **Fuel EU Maritime Regulation (EU) 2023/1805**, Annex IV and Articles 20–21.
