import { describe, it, expect, vi, beforeEach } from "vitest";
import app from "../app";
import {
  mockOrganizer,
  mockTandaForming,
  mockTandaActive,
  mockTandaWithDetails,
  mockTandaActiveWithDetails,
  mockParticipantOrganizer,
  mockParticipantMember1,
  mockParticipantsWithUsers,
  mockContribution,
  createTandaPayload,
  joinPayload,
  organizerPayload,
  nonOrganizerPayload,
  contributionPayload,
} from "./__mock__/tandaRoutesMockData";

// --- Module mocks ---
// Repositories mocked at the boundary so tests cover route → service logic only.

vi.mock("../repositories/tanda.repository", () => ({
  tandaRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findByUserId: vi.fn(),
    update: vi.fn(),
    addParticipant: vi.fn(),
    getParticipants: vi.fn(),
    getParticipantCount: vi.fn(),
    findParticipant: vi.fn(),
    findParticipantById: vi.fn(),
    updateParticipant: vi.fn(),
    createContribution: vi.fn(),
    findContributionByRound: vi.fn(),
    getContributionsByRound: vi.fn(),
    getContributionHistory: vi.fn(),
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

import { tandaRepository } from "../repositories/tanda.repository";
import { userRepository } from "../repositories/user.repository";

// Helpers
function post(path: string, body: unknown): Promise<Response> {
  return app.request(path, {
    method: "POST",
    body: JSON.stringify(body),
    headers: new Headers({ "Content-Type": "application/json" }),
  });
}

function get(path: string): Promise<Response> {
  return app.request(path, { method: "GET" });
}

beforeEach(() => {
  vi.mocked(tandaRepository.create).mockReset();
  vi.mocked(tandaRepository.findById).mockReset();
  vi.mocked(tandaRepository.findByUserId).mockReset();
  vi.mocked(tandaRepository.update).mockReset();
  vi.mocked(tandaRepository.addParticipant).mockReset();
  vi.mocked(tandaRepository.getParticipants).mockReset();
  vi.mocked(tandaRepository.getParticipantCount).mockReset();
  vi.mocked(tandaRepository.findParticipant).mockReset();
  vi.mocked(tandaRepository.findParticipantById).mockReset();
  vi.mocked(tandaRepository.updateParticipant).mockReset();
  vi.mocked(tandaRepository.createContribution).mockReset();
  vi.mocked(tandaRepository.findContributionByRound).mockReset();
  vi.mocked(tandaRepository.getContributionsByRound).mockReset();
  vi.mocked(tandaRepository.getContributionHistory).mockReset();
  vi.mocked(userRepository.findById).mockReset();
});

// --- POST /api/tandas ---
describe("POST /api/tandas", () => {
  it("creates a tanda and auto-adds organizer as participant", async () => {
    vi.mocked(userRepository.findById).mockResolvedValueOnce(mockOrganizer);
    vi.mocked(tandaRepository.create).mockResolvedValueOnce(mockTandaForming);
    vi.mocked(tandaRepository.addParticipant).mockResolvedValueOnce(mockParticipantOrganizer);

    const res = await post("/api/tandas", createTandaPayload);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.id).toBe(mockTandaForming.id);
    expect(tandaRepository.addParticipant).toHaveBeenCalledOnce();
  });

  it("returns 422 for missing fields", async () => {
    const res = await post("/api/tandas", { name: "Missing fields" });
    expect(res.status).toBe(422);
  });
});

// --- GET /api/tandas ---
describe("GET /api/tandas", () => {
  it("returns tandas for a user", async () => {
    vi.mocked(tandaRepository.findByUserId).mockResolvedValueOnce([mockTandaForming]);

    const res = await get("/api/tandas?userId=1");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveLength(1);
  });

  it("returns 400 when userId is missing", async () => {
    const res = await get("/api/tandas");
    expect(res.status).toBe(400);
  });
});

// --- GET /api/tandas/:id ---
describe("GET /api/tandas/:id", () => {
  it("returns tanda details", async () => {
    vi.mocked(tandaRepository.findById).mockResolvedValueOnce(mockTandaWithDetails);

    const res = await get("/api/tandas/1");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.id).toBe(1);
  });

  it("returns 404 for unknown tanda", async () => {
    vi.mocked(tandaRepository.findById).mockResolvedValueOnce(null);

    const res = await get("/api/tandas/999");
    expect(res.status).toBe(404);
  });
});

// --- POST /api/tandas/:id/join ---
describe("POST /api/tandas/:id/join", () => {
  it("allows a user to join a forming tanda", async () => {
    vi.mocked(tandaRepository.findById).mockResolvedValueOnce(mockTandaWithDetails);
    vi.mocked(tandaRepository.getParticipantCount).mockResolvedValueOnce(1);
    vi.mocked(userRepository.findById).mockResolvedValueOnce(mockOrganizer);
    vi.mocked(tandaRepository.findParticipant).mockResolvedValueOnce(null);
    vi.mocked(tandaRepository.addParticipant).mockResolvedValueOnce(mockParticipantMember1);

    const res = await post("/api/tandas/1/join", joinPayload);
    expect(res.status).toBe(201);
  });

  it("returns 409 if user already joined", async () => {
    vi.mocked(tandaRepository.findById).mockResolvedValueOnce(mockTandaWithDetails);
    vi.mocked(tandaRepository.getParticipantCount).mockResolvedValueOnce(2);
    vi.mocked(userRepository.findById).mockResolvedValueOnce(mockOrganizer);
    vi.mocked(tandaRepository.findParticipant).mockResolvedValueOnce(mockParticipantOrganizer);

    const res = await post("/api/tandas/1/join", joinPayload);
    expect(res.status).toBe(409);
  });

  it("returns 400 if tanda is not in forming status", async () => {
    vi.mocked(tandaRepository.findById).mockResolvedValueOnce(mockTandaActiveWithDetails);

    const res = await post("/api/tandas/1/join", joinPayload);
    expect(res.status).toBe(400);
  });
});

// --- POST /api/tandas/:id/start ---
describe("POST /api/tandas/:id/start", () => {
  it("starts the tanda and sets status to active", async () => {
    vi.mocked(tandaRepository.findById).mockResolvedValueOnce(mockTandaWithDetails);
    vi.mocked(tandaRepository.getParticipants).mockResolvedValueOnce(mockParticipantsWithUsers);
    vi.mocked(tandaRepository.updateParticipant).mockResolvedValue(mockParticipantOrganizer);
    vi.mocked(tandaRepository.update).mockResolvedValueOnce(mockTandaActive);

    const res = await post("/api/tandas/1/start", organizerPayload);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("active");
  });

  it("returns 403 if requester is not the organizer", async () => {
    vi.mocked(tandaRepository.findById).mockResolvedValueOnce(mockTandaWithDetails);

    const res = await post("/api/tandas/1/start", nonOrganizerPayload);
    expect(res.status).toBe(403);
  });

  it("returns 400 if too few participants", async () => {
    vi.mocked(tandaRepository.findById).mockResolvedValueOnce(mockTandaWithDetails);
    // Only 1 participant — below minimum of 3
    vi.mocked(tandaRepository.getParticipants).mockResolvedValueOnce([mockParticipantOrganizer]);

    const res = await post("/api/tandas/1/start", organizerPayload);
    expect(res.status).toBe(400);
  });
});

// --- POST /api/tandas/:id/cancel ---
describe("POST /api/tandas/:id/cancel", () => {
  it("cancels the tanda", async () => {
    vi.mocked(tandaRepository.findById).mockResolvedValueOnce(mockTandaWithDetails);
    vi.mocked(tandaRepository.update).mockResolvedValueOnce({ ...mockTandaForming, status: "cancelled" });

    const res = await post("/api/tandas/1/cancel", organizerPayload);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("cancelled");
  });

  it("returns 403 if requester is not the organizer", async () => {
    vi.mocked(tandaRepository.findById).mockResolvedValueOnce(mockTandaWithDetails);

    const res = await post("/api/tandas/1/cancel", nonOrganizerPayload);
    expect(res.status).toBe(403);
  });
});

// --- GET /api/tandas/:id/participants ---
describe("GET /api/tandas/:id/participants", () => {
  it("lists participants", async () => {
    vi.mocked(tandaRepository.findById).mockResolvedValueOnce(mockTandaWithDetails);
    vi.mocked(tandaRepository.getParticipants).mockResolvedValueOnce(mockParticipantsWithUsers);

    const res = await get("/api/tandas/1/participants");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveLength(3);
  });
});

// --- POST /api/tandas/:id/contributions ---
describe("POST /api/tandas/:id/contributions", () => {
  it("records a contribution for the current round", async () => {
    vi.mocked(tandaRepository.findById).mockResolvedValueOnce(mockTandaActiveWithDetails);
    vi.mocked(tandaRepository.findParticipantById).mockResolvedValueOnce(mockParticipantOrganizer);
    vi.mocked(tandaRepository.findContributionByRound).mockResolvedValueOnce(null);
    vi.mocked(tandaRepository.createContribution).mockResolvedValueOnce(mockContribution);

    const res = await post("/api/tandas/1/contributions", contributionPayload);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.status).toBe("paid");
  });

  it("returns 400 if tanda is not active", async () => {
    vi.mocked(tandaRepository.findById).mockResolvedValueOnce(mockTandaWithDetails); // forming

    const res = await post("/api/tandas/1/contributions", contributionPayload);
    expect(res.status).toBe(400);
  });

  it("returns 409 on duplicate contribution for same round", async () => {
    vi.mocked(tandaRepository.findById).mockResolvedValueOnce(mockTandaActiveWithDetails);
    vi.mocked(tandaRepository.findParticipantById).mockResolvedValueOnce(mockParticipantOrganizer);
    vi.mocked(tandaRepository.findContributionByRound).mockResolvedValueOnce(mockContribution);

    const res = await post("/api/tandas/1/contributions", contributionPayload);
    expect(res.status).toBe(409);
  });
});

// --- GET /api/tandas/:id/rounds/:round ---
describe("GET /api/tandas/:id/rounds/:round", () => {
  it("returns round summary", async () => {
    const activeDetailsWithRotation = {
      ...mockTandaActiveWithDetails,
      participants: mockParticipantsWithUsers.map((p, i) => ({
        ...p,
        rotationPosition: i + 1,
      })),
    };
    vi.mocked(tandaRepository.findById).mockResolvedValueOnce(activeDetailsWithRotation);
    vi.mocked(tandaRepository.getContributionsByRound).mockResolvedValueOnce([]);
    vi.mocked(tandaRepository.getParticipants).mockResolvedValueOnce(
      activeDetailsWithRotation.participants
    );

    const res = await get("/api/tandas/1/rounds/1");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.round).toBe(1);
    expect(body).toHaveProperty("totalCollected");
    expect(body).toHaveProperty("recipient");
  });
});

// --- POST /api/tandas/:id/advance ---
describe("POST /api/tandas/:id/advance", () => {
  it("advances to next round", async () => {
    const activeTandaRound1 = { ...mockTandaActiveWithDetails };
    vi.mocked(tandaRepository.findById).mockResolvedValueOnce(activeTandaRound1);
    vi.mocked(tandaRepository.getParticipants).mockResolvedValueOnce(mockParticipantsWithUsers);
    vi.mocked(tandaRepository.getContributionsByRound).mockResolvedValueOnce([mockContribution]);
    vi.mocked(tandaRepository.getContributionHistory).mockResolvedValue([]);
    vi.mocked(tandaRepository.update).mockResolvedValueOnce({ ...mockTandaActive, currentRound: 2 });

    const res = await post("/api/tandas/1/advance", organizerPayload);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.currentRound).toBe(2);
  });

  it("returns 403 if requester is not the organizer", async () => {
    vi.mocked(tandaRepository.findById).mockResolvedValueOnce(mockTandaActiveWithDetails);

    const res = await post("/api/tandas/1/advance", nonOrganizerPayload);
    expect(res.status).toBe(403);
  });

  it("completes tanda after last round", async () => {
    // currentRound === totalRounds → should complete
    const lastRound = { ...mockTandaActiveWithDetails, currentRound: 3, totalRounds: 3 };
    vi.mocked(tandaRepository.findById).mockResolvedValueOnce(lastRound);
    vi.mocked(tandaRepository.getParticipants).mockResolvedValueOnce(mockParticipantsWithUsers);
    vi.mocked(tandaRepository.getContributionsByRound).mockResolvedValueOnce([mockContribution]);
    vi.mocked(tandaRepository.getContributionHistory).mockResolvedValue([]);
    vi.mocked(tandaRepository.update).mockResolvedValueOnce({ ...mockTandaActive, status: "completed" });

    const res = await post("/api/tandas/1/advance", organizerPayload);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("completed");
  });
});

// --- GET /api/tandas/:id/participants/:pid/history ---
describe("GET /api/tandas/:id/participants/:pid/history", () => {
  it("returns contribution history for a participant", async () => {
    vi.mocked(tandaRepository.findById).mockResolvedValueOnce(mockTandaActiveWithDetails);
    vi.mocked(tandaRepository.findParticipantById).mockResolvedValueOnce(mockParticipantOrganizer);
    vi.mocked(tandaRepository.getContributionHistory).mockResolvedValueOnce([mockContribution]);

    const res = await get("/api/tandas/1/participants/1/history");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].status).toBe("paid");
  });

  it("returns 404 for participant not in this tanda", async () => {
    vi.mocked(tandaRepository.findById).mockResolvedValueOnce(mockTandaActiveWithDetails);
    vi.mocked(tandaRepository.findParticipantById).mockResolvedValueOnce({
      ...mockParticipantOrganizer,
      tandaId: 999, // different tanda
    });

    const res = await get("/api/tandas/1/participants/1/history");
    expect(res.status).toBe(404);
  });
});
