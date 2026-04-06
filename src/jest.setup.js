// Jest setup file
/* global describe, test, expect, beforeEach */

// Mock Base44 SDK for tests
jest.mock('@/api/base44Client', () => ({
  base44: {
    entities: {
      Transaction: {
        create: jest.fn(),
        list: jest.fn(),
        filter: jest.fn(),
      },
      Penalty: {
        create: jest.fn(),
        list: jest.fn(),
      },
      Dispute: {
        create: jest.fn(),
        update: jest.fn(),
      },
      CrossBorderPayout: {
        create: jest.fn(),
      },
    },
  },
}));