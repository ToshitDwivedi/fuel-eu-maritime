# FuelEU Maritime — Compliance Platform

A full-stack implementation of the **Fuel EU Maritime compliance module** (Regulation (EU) 2023/1805) covering route management, compliance-balance calculation, banking (Article 20), and pooling (Article 21).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, TailwindCSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (node-postgres) |
| Testing | Jest, ts-jest, Supertest |
| Linting | ESLint (strict TS), Prettier |
| Validation | Zod |

## Architecture — Hexagonal (Ports & Adapters)

Both frontend and backend follow a hexagonal architecture with strict dependency inversion: **core → ports → adapters**. Frameworks live only in adapters/infrastructure.

### Backend structure

```
backend/src/
  core/
    domain/           ← entities, value objects (no framework imports)
    application/      ← use-cases only
    ports/
      inbound/        ← interfaces exposed by use-cases
      outbound/       ← interfaces adapters must implement
  adapters/
    inbound/http/     ← Express route handlers
    outbound/postgres/← DB repositories implementing outbound ports
  infrastructure/
    db/               ← migrations, pool config, seed
    server/           ← Express app setup
```

### Frontend structure (planned)

```
frontend/src/
  core/
    domain/           ← entities, types
    application/      ← use-cases
    ports/            ← interfaces
  adapters/
    ui/               ← React components and hooks
    infrastructure/   ← API clients
  shared/
```

## Features

| Tab | Description |
|-----|-------------|
| **Routes** | View all routes, set baseline, filter by vessel/fuel/year |
| **Compare** | Baseline vs comparison GHG intensity with compliance flags |
| **Banking** | Bank positive CB, apply banked surplus (Article 20) |
| **Pooling** | Create pools, greedy allocation with validation (Article 21) |

## Core Formulas

- **Target Intensity (2025):** 89.3368 gCO2e/MJ (2% below 91.16)
- **Energy in scope (MJ):** fuelConsumption x 41,000 MJ/t
- **Compliance Balance:** (Target - Actual) x Energy in scope
- Positive CB = Surplus, Negative CB = Deficit

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/routes` | List all routes |
| POST | `/routes/:id/baseline` | Set route as baseline |
| GET | `/routes/comparison` | Baseline vs comparison data |
| GET | `/compliance/cb?shipId&year` | Compute compliance balance |
| GET | `/compliance/adjusted-cb?shipId&year` | CB after bank applications |
| GET | `/banking/records?shipId&year` | Bank records |
| POST | `/banking/bank` | Bank positive CB |
| POST | `/banking/apply` | Apply banked surplus |
| POST | `/pools` | Create pool with members |

## Setup & Run

### Prerequisites

- Node.js >= 18
- PostgreSQL >= 14
- npm

### Backend

```bash
cd backend
cp .env.example .env        # edit DATABASE_URL and PORT
npm install
npm run migrate              # run database migrations
npm run seed                 # seed sample data
npm run dev                  # start dev server
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Running Tests

```bash
cd backend
npm run test
```

## Seed Data

| routeId | vesselType | fuelType | year | ghgIntensity | fuelConsumption (t) | distance (km) | totalEmissions (t) |
|---------|-----------|----------|------|-------------|-------------------|--------------|-------------------|
| R001 | Container | HFO | 2024 | 91.0 | 5000 | 12000 | 4500 |
| R002 | BulkCarrier | LNG | 2024 | 88.0 | 4800 | 11500 | 4200 |
| R003 | Tanker | MGO | 2024 | 93.5 | 5100 | 12500 | 4700 |
| R004 | RoRo | HFO | 2025 | 89.2 | 4900 | 11800 | 4300 |
| R005 | Container | LNG | 2025 | 90.5 | 4950 | 11900 | 4400 |

## Reference

All constants, CB formula, and banking/pooling rules follow **Fuel EU Maritime Regulation (EU) 2023/1805**, Annex IV and Articles 20-21.
