import { describe, it, expect, vi, beforeEach } from "vitest";
import app from "../app";
import {
  mockUser,
  mockSecondUser,
  mockPool,
  mockPoolMember,
  mockPoolWithDetails,
  mockContribution,
  createPoolPayload,
  invitePayload,
  contributePayload,
} from "./__mock__/poolRoutesMockData";

// --- Module mocks ---
// Repositories are mocked at the layer boundary so tests cover route → service logic
// without touching the database.

vi.mock("../repositories/pool.repository", () => ({
  poolRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    addMember: vi.fn(),
    findMember: vi.fn(),
    createContribution: vi.fn(),
    getTotalContributions: vi.fn(),
    getTotalApprovedWithdrawals: vi.fn(),
  },
}));

vi.mock("../repositories/user.repository", () => ({
  userRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findByEmail: vi.fn(),
    findAll: vi.fn(),
  },
}));

import { poolRepository } from "../repositories/pool.repository";
import { userRepository } from "../repositories/user.repository";

// Helper: POST JSON request
function post(path: string, body: unknown): Promise<Response> {
  return app.request(path, {
    method: "POST",
    body: JSON.stringify(body),
    headers: new Headers({ "Content-Type": "application/json" }),
  });
}

// Helper: GET request
function get(path: string): Promise<Response> {
  return app.request(path, { method: "GET" });
}

// -------------------------------------------------------------------
// POST /api/pools
// -------------------------------------------------------------------
describe("POST /api/pools", () => {
  beforeEach(() => {
    vi.mocked(userRepository.findById).mockReset();
    vi.mocked(poolRepository.create).mockReset();
    vi.mocked(poolRepository.addMember).mockReset();
    vi.mocked(poolRepository.findById).mockReset();
    vi.mocked(poolRepository.getTotalContributions).mockReset();
  });

  it("happy path — creates pool, auto-adds organizer as member, returns 201", async () => {
    vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
    vi.mocked(poolRepository.create).mockResolvedValue(mockPool);
    vi.mocked(poolRepository.addMember).mockResolvedValue(mockPoolMember);
    vi.mocked(poolRepository.findById).mockResolvedValue(mockPoolWithDetails);
    vi.mocked(poolRepository.getTotalContributions).mockResolvedValue(0);

    const res = await post("/api/pools", createPoolPayload);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toMatchObject({ name: "Emergency Fund", status: "open" });
    expect(vi.mocked(poolRepository.addMember)).toHaveBeenCalledWith({
      poolId: mockPool.id,
      userId: createPoolPayload.organizerId,
    });
  });

  it("404 — unknown organizerId returns Not Found", async () => {
    vi.mocked(userRepository.findById).mockResolvedValue(null);

    const res = await post("/api/pools", createPoolPayload);
    expect(res.status).toBe(404);
  });

  it("422 — missing targetAmount returns Validation Failed", async () => {
    const res = await post("/api/pools", { name: "Test", organizerId: 1 });
    const body = await res.json();
    expect(res.status).toBe(422);
    expect(body).toHaveProperty("error", "Validation failed");
  });
});

// -------------------------------------------------------------------
// GET /api/pools/:id
// -------------------------------------------------------------------
describe("GET /api/pools/:id", () => {
  beforeEach(() => {
    vi.mocked(poolRepository.findById).mockReset();
    vi.mocked(poolRepository.getTotalContributions).mockReset();
  });

  it("happy path — returns pool with members and totalContributions", async () => {
    vi.mocked(poolRepository.findById).mockResolvedValue(mockPoolWithDetails);
    vi.mocked(poolRepository.getTotalContributions).mockResolvedValue(50000);

    const res = await get("/api/pools/1");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ id: 1, name: "Emergency Fund", totalContributions: 50000 });
    expect(body.members).toHaveLength(1);
  });

  it("404 — unknown pool ID returns Not Found", async () => {
    vi.mocked(poolRepository.findById).mockResolvedValue(null);

    const res = await get("/api/pools/999");
    expect(res.status).toBe(404);
  });
});

// -------------------------------------------------------------------
// POST /api/pools/:id/invite
// -------------------------------------------------------------------
describe("POST /api/pools/:id/invite", () => {
  beforeEach(() => {
    vi.mocked(poolRepository.findById).mockReset();
    vi.mocked(userRepository.findById).mockReset();
    vi.mocked(poolRepository.findMember).mockReset();
    vi.mocked(poolRepository.addMember).mockReset();
  });

  it("happy path — organiser invites a new member, returns 201", async () => {
    vi.mocked(poolRepository.findById).mockResolvedValue(mockPoolWithDetails);
    vi.mocked(userRepository.findById).mockResolvedValue(mockSecondUser);
    vi.mocked(poolRepository.findMember).mockResolvedValue(null); // not yet a member
    vi.mocked(poolRepository.addMember).mockResolvedValue({
      id: 2,
      poolId: 1,
      userId: 2,
      createdAt: new Date(),
    });

    const res = await post("/api/pools/1/invite", invitePayload);
    expect(res.status).toBe(201);
  });

  it("403 — non-organiser cannot invite members", async () => {
    vi.mocked(poolRepository.findById).mockResolvedValue(mockPoolWithDetails);

    const res = await post("/api/pools/1/invite", {
      userId: 2,
      requesterId: 99, // not the organizer
    });
    expect(res.status).toBe(403);
  });

  it("409 — inviting an existing member returns Conflict", async () => {
    vi.mocked(poolRepository.findById).mockResolvedValue(mockPoolWithDetails);
    vi.mocked(userRepository.findById).mockResolvedValue(mockSecondUser);
    vi.mocked(poolRepository.findMember).mockResolvedValue(mockPoolMember); // already a member

    const res = await post("/api/pools/1/invite", invitePayload);
    expect(res.status).toBe(409);
  });
});

// -------------------------------------------------------------------
// POST /api/pools/:id/contributions
// -------------------------------------------------------------------
describe("POST /api/pools/:id/contributions", () => {
  beforeEach(() => {
    vi.mocked(poolRepository.findById).mockReset();
    vi.mocked(poolRepository.findMember).mockReset();
    vi.mocked(poolRepository.createContribution).mockReset();
    vi.mocked(poolRepository.getTotalContributions).mockReset();
    vi.mocked(poolRepository.update).mockReset();
  });

  it("happy path — member contributes and gets 201 back", async () => {
    vi.mocked(poolRepository.findById).mockResolvedValue(mockPoolWithDetails);
    vi.mocked(poolRepository.findMember).mockResolvedValue(mockPoolMember);
    vi.mocked(poolRepository.createContribution).mockResolvedValue(mockContribution);
    vi.mocked(poolRepository.getTotalContributions).mockResolvedValue(50000); // below target

    const res = await post("/api/pools/1/contributions", contributePayload);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toMatchObject({ amountCents: 50000, poolId: 1 });
  });

  it("auto-funds pool when totalContributions reaches targetAmount", async () => {
    vi.mocked(poolRepository.findById).mockResolvedValue(mockPoolWithDetails); // target = 100000
    vi.mocked(poolRepository.findMember).mockResolvedValue(mockPoolMember);
    vi.mocked(poolRepository.createContribution).mockResolvedValue(mockContribution);
    vi.mocked(poolRepository.getTotalContributions).mockResolvedValue(100000); // exactly at target

    await post("/api/pools/1/contributions", contributePayload);

    expect(vi.mocked(poolRepository.update)).toHaveBeenCalledWith(1, { status: "funded" });
  });

  it("400 — contributing to a funded pool is rejected", async () => {
    const fundedPool = { ...mockPoolWithDetails, status: "funded" };
    vi.mocked(poolRepository.findById).mockResolvedValue(fundedPool);

    const res = await post("/api/pools/1/contributions", contributePayload);
    expect(res.status).toBe(400);
  });

  it("403 — non-member cannot contribute", async () => {
    vi.mocked(poolRepository.findById).mockResolvedValue(mockPoolWithDetails);
    vi.mocked(poolRepository.findMember).mockResolvedValue(null); // not a member

    const res = await post("/api/pools/1/contributions", contributePayload);
    expect(res.status).toBe(403);
  });
});

// -------------------------------------------------------------------
// GET /api/pools/:id/balance
// -------------------------------------------------------------------
describe("GET /api/pools/:id/balance", () => {
  beforeEach(() => {
    vi.mocked(poolRepository.findById).mockReset();
    vi.mocked(poolRepository.getTotalContributions).mockReset();
    vi.mocked(poolRepository.getTotalApprovedWithdrawals).mockReset();
  });

  it("happy path — returns balance, totalContributions, totalWithdrawals", async () => {
    vi.mocked(poolRepository.findById).mockResolvedValue(mockPoolWithDetails);
    vi.mocked(poolRepository.getTotalContributions).mockResolvedValue(75000);
    vi.mocked(poolRepository.getTotalApprovedWithdrawals).mockResolvedValue(25000);

    const res = await get("/api/pools/1/balance");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      balance: 50000,
      totalContributions: 75000,
      totalWithdrawals: 25000,
      currency: "MXN",
    });
  });

  it("404 — unknown pool returns Not Found", async () => {
    vi.mocked(poolRepository.findById).mockResolvedValue(null);

    const res = await get("/api/pools/999/balance");
    expect(res.status).toBe(404);
  });
});

// -------------------------------------------------------------------
// GET /api/pools/:id/preview
// -------------------------------------------------------------------
describe("GET /api/pools/:id/preview", () => {
  beforeEach(() => {
    vi.mocked(poolRepository.findById).mockReset();
    vi.mocked(poolRepository.getTotalContributions).mockReset();
  });

  it("happy path — returns public summary with percentFunded", async () => {
    vi.mocked(poolRepository.findById).mockResolvedValue(mockPoolWithDetails);
    vi.mocked(poolRepository.getTotalContributions).mockResolvedValue(50000);

    const res = await get("/api/pools/1/preview");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      id: 1,
      name: "Emergency Fund",
      status: "open",
      totalContributions: 50000,
      targetAmount: 100000,
      memberCount: 1,
      percentFunded: 50,
    });
  });

  it("404 — unknown pool returns Not Found", async () => {
    vi.mocked(poolRepository.findById).mockResolvedValue(null);

    const res = await get("/api/pools/999/preview");
    expect(res.status).toBe(404);
  });
});
