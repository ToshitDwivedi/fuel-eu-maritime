import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import type { Repositories } from './app';

// TODO: Replace with real Postgres repository implementations
const notImplemented = (name: string) => () => {
  throw new Error(`${name} not implemented — add Postgres adapter`);
};

const repos: Repositories = {
  routeRepo: {
    findAll: notImplemented('routeRepo.findAll'),
    findById: notImplemented('routeRepo.findById'),
    findBaseline: notImplemented('routeRepo.findBaseline'),
    setBaseline: notImplemented('routeRepo.setBaseline'),
    findComparison: notImplemented('routeRepo.findComparison'),
  },
  complianceRepo: {
    saveCB: notImplemented('complianceRepo.saveCB'),
    findCB: notImplemented('complianceRepo.findCB'),
  },
  bankRepo: {
    save: notImplemented('bankRepo.save'),
    findByShip: notImplemented('bankRepo.findByShip'),
    findAvailable: notImplemented('bankRepo.findAvailable'),
    markApplied: notImplemented('bankRepo.markApplied'),
  },
  poolRepo: {
    createPool: notImplemented('poolRepo.createPool'),
    addMembers: notImplemented('poolRepo.addMembers'),
  },
};

const PORT = Number(process.env['PORT']) || 3000;
const app = createApp(repos);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
