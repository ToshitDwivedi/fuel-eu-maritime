# FuelEU Maritime Compliance Platform

**GitHub Repository:**
https://github.com/ToshitDwivedi/fuel-eu-maritime

This project is a **full-stack implementation of the FuelEU Maritime compliance module** based on **Regulation (EU) 2023/1805**. It implements a structured platform for managing maritime route emissions, calculating compliance balance (CB), and supporting regulatory mechanisms such as **banking (Article 20)** and **pooling (Article 21)**.

The implementation demonstrates **clean architecture, domain modeling, and AI-assisted development workflow** as required in the assignment.

---

# Project Overview

The platform enables maritime operators to:

• Track vessel routes and their emissions metrics
• Compare route GHG intensity against EU regulatory targets
• Bank surplus compliance balance for future use (Article 20)
• Pool compliance balances across vessels with allocation rules (Article 21)

The frontend dashboard contains four modules:

1. Routes
2. Compare
3. Banking
4. Pooling

---

# Technology Stack

| Layer      | Technology                           |
| ---------- | ------------------------------------ |
| Frontend   | React, TypeScript, TailwindCSS, Vite |
| Backend    | Node.js, Express, TypeScript         |
| Database   | PostgreSQL                           |
| Testing    | Jest, Supertest                      |
| Validation | Zod                                  |
| Linting    | ESLint, Prettier                     |

---

# Architecture

The project follows **Hexagonal Architecture (Ports & Adapters)** which separates:

• Domain logic
• Application use cases
• Infrastructure frameworks

Frameworks such as React and Express exist only in **adapters**, while the **core domain remains framework-independent**.

Architecture flow:

Inbound Adapter (UI / HTTP)
↓
Ports (Interfaces)
↓
Core Domain (Entities + Use Cases)
↓
Ports (Interfaces)
↓
Outbound Adapter (Database / API)

This design ensures:

• maintainability
• testability
• clear separation of concerns

---

# Project Structure

```
fuel-eu-maritime

frontend/
  src/
    core/
      domain/
      application/
      ports/
    adapters/
      ui/
      infrastructure/
    shared/

backend/
  src/
    core/
      domain/
      application/
      ports/
    adapters/
      inbound/http/
      outbound/postgres/
    infrastructure/
      db/
      server/

AGENT_WORKFLOW.md
REFLECTION.md
README.md
```

---

# Setup Instructions

## 1. Clone the Repository

```
git clone https://github.com/ToshitDwivedi/fuel-eu-maritime.git
cd fuel-eu-maritime
```

---

# Backend Setup

```
cd backend
cp .env.example .env
```

Edit `.env`:

```
DATABASE_URL=postgresql://user:password@localhost:5432/fueleu
PORT=3000
```

Install dependencies:

```
npm install
```

Run database migrations:

```
npm run migrate
```

Seed the sample dataset:

```
npm run seed
```

Start the backend server:

```
npm run dev
```

Backend server runs at:

```
http://localhost:3000
```

---

# Frontend Setup

```
cd frontend
cp .env.example .env
```

Set API URL:

```
VITE_API_URL=http://localhost:3000/api
```

Install dependencies:

```
npm install
```

Run frontend development server:

```
npm run dev
```

Frontend runs at:

```
http://localhost:5173
```

---

# Running Tests

## Backend Tests

```
cd backend
npm run test
```

Tests include:

• Unit tests for domain use cases
• Integration tests for API endpoints using Supertest

## Frontend

```
npm run lint
npm run build
```

---

# API Endpoints

Base URL:

```
http://localhost:3000/api
```

## Routes

GET `/routes`
Returns list of routes with optional filters.

POST `/routes/:id/baseline`
Sets a route as the comparison baseline.

GET `/routes/comparison`
Returns comparison data with percent difference and compliance status.

---

## Compliance

GET `/compliance/cb?shipId&year`
Computes compliance balance.

GET `/compliance/adjusted-cb?shipId&year`
Returns compliance balance after bank adjustments.

---

## Banking

GET `/banking/records?shipId&year`
Returns banked compliance records.

POST `/banking/bank`
Banks positive compliance surplus.

POST `/banking/apply`
Applies banked surplus to offset deficit.

---

## Pooling

POST `/pools`

Creates a compliance pool among ships following rules:

• total adjusted CB must be ≥ 0
• deficit ships cannot exit worse
• surplus ships cannot become negative

Allocation uses a greedy algorithm distributing surplus to deficit members.

---

# Core Calculation Formulas

Target Intensity (2025)

```
89.3368 gCO₂e / MJ
```

Energy in Scope

```
fuelConsumption × 41,000 MJ/t
```

Compliance Balance

```
(Target − Actual) × Energy
```

Percent Difference

```
((comparison / baseline) − 1) × 100
```

Positive CB → Surplus
Negative CB → Deficit

---

# Seed Dataset

| Route | Vessel      | Fuel | Year | Intensity |
| ----- | ----------- | ---- | ---- | --------- |
| R001  | Container   | HFO  | 2024 | 91.0      |
| R002  | BulkCarrier | LNG  | 2024 | 88.0      |
| R003  | Tanker      | MGO  | 2024 | 93.5      |
| R004  | RoRo        | HFO  | 2025 | 89.2      |
| R005  | Container   | LNG  | 2025 | 90.5      |

Route **R001** is set as baseline by default.

---

# AI-Assisted Development

AI tools were used to assist development for:

• scaffolding project structure
• designing hexagonal architecture
• generating boilerplate code
• suggesting tests and refactoring

Full workflow documentation is included in:

```
AGENT_WORKFLOW.md
```

A reflection on AI usage and learning outcomes is included in:

```
REFLECTION.md
```

---

# Reference

FuelEU Maritime Regulation
Regulation (EU) 2023/1805

Relevant sections:

• Annex IV
• Article 20 — Banking
• Article 21 — Pooling

---

# Submission Notes

This repository is submitted as part of the **Full-Stack Developer Technical Assignment**.

The submission includes:

• frontend dashboard implementation
• backend API services
• hexagonal architecture
• database schema and seed data
• unit and integration tests
• AI workflow documentation

GitHub Repository:

https://github.com/ToshitDwivedi/fuel-eu-maritime
