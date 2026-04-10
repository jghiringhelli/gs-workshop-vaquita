import type Database from "better-sqlite3";
import { getConfig } from "../src/config";
import { createDatabase } from "../src/database/database";
import { TandaRepository } from "../src/repositories/tandaRepository";
import { UserRepository } from "../src/repositories/userRepository";
import { TandaService } from "../src/services/tandaService";
import { UserService } from "../src/services/userService";

const config = getConfig();
const db = createDatabase(config.databasePath);
const userRepository = new UserRepository(db);
const tandaRepository = new TandaRepository(db);
const userService = new UserService(userRepository);
const tandaService = new TandaService(userRepository, tandaRepository, config, createDeterministicRandom());

interface SeedUser {
  email: string;
  name: string;
}

const seedUsers: SeedUser[] = [
  { email: "ana@example.com", name: "Ana" },
  { email: "bruno@example.com", name: "Bruno" },
  { email: "carla@example.com", name: "Carla" },
  { email: "diego@example.com", name: "Diego" },
  { email: "elena@example.com", name: "Elena" },
  { email: "fernando@example.com", name: "Fernando" },
  { email: "gabriela@example.com", name: "Gabriela" },
  { email: "hector@example.com", name: "Hector" },
  { email: "irene@example.com", name: "Irene" },
  { email: "javier@example.com", name: "Javier" },
  { email: "karla@example.com", name: "Karla" },
  { email: "luis@example.com", name: "Luis" },
];

function createDeterministicRandom(): () => number {
  const values = [0.11, 0.72, 0.34, 0.58, 0.21, 0.93, 0.47, 0.66];
  let index = 0;

  return () => {
    const value = values[index % values.length];
    index += 1;
    return value;
  };
}

function resetDatabase(database: Database.Database): void {
  database.exec(`
    DELETE FROM contributions;
    DELETE FROM participants;
    DELETE FROM tandas;
    DELETE FROM users;
    DELETE FROM sqlite_sequence WHERE name IN ('contributions', 'participants', 'tandas', 'users');
  `);
}

function getUserIdByEmail(email: string): number {
  const user = userRepository.findByEmail(email);
  if (!user) {
    throw new Error(`Expected user for email ${email}.`);
  }

  return user.id;
}

function getParticipantIdByUserId(tandaId: number, userId: number): number {
  const participant = tandaRepository.findParticipantByUser(tandaId, userId);
  if (!participant) {
    throw new Error(`Expected participant ${userId} in tanda ${tandaId}.`);
  }

  return participant.id;
}

function seedUsersTable(): void {
  seedUsers.forEach((user) => {
    userService.createUser(user);
  });
}

function seedFormingTanda(): void {
  const tanda = tandaService.createTanda({
    name: "Tanda Barrio Centro",
    organizerId: getUserIdByEmail("ana@example.com"),
    contributionAmount: 1000,
  });

  ["bruno@example.com", "carla@example.com", "diego@example.com"].forEach((email) => {
    tandaService.joinTanda(tanda.id, getUserIdByEmail(email));
  });
}

function seedActiveTanda(): void {
  const tanda = tandaService.createTanda({
    name: "Tanda Oficina Norte",
    organizerId: getUserIdByEmail("elena@example.com"),
    contributionAmount: 1500,
  });

  ["fernando@example.com", "gabriela@example.com", "hector@example.com", "irene@example.com"].forEach((email) => {
    tandaService.joinTanda(tanda.id, getUserIdByEmail(email));
  });

  tandaService.startTanda(tanda.id, getUserIdByEmail("elena@example.com"));

  tandaService.recordContribution({
    tandaId: tanda.id,
    participantId: getParticipantIdByUserId(tanda.id, getUserIdByEmail("elena@example.com")),
    amount: 1500,
    isLate: false,
  });

  tandaService.recordContribution({
    tandaId: tanda.id,
    participantId: getParticipantIdByUserId(tanda.id, getUserIdByEmail("fernando@example.com")),
    amount: 1575,
    isLate: true,
  });

  tandaService.recordContribution({
    tandaId: tanda.id,
    participantId: getParticipantIdByUserId(tanda.id, getUserIdByEmail("gabriela@example.com")),
    amount: 1500,
    isLate: false,
  });

  tandaService.advanceTanda(tanda.id, getUserIdByEmail("elena@example.com"));

  tandaService.recordContribution({
    tandaId: tanda.id,
    participantId: getParticipantIdByUserId(tanda.id, getUserIdByEmail("hector@example.com")),
    amount: 1500,
    isLate: false,
  });
}

function seedCompletedTanda(): void {
  const tanda = tandaService.createTanda({
    name: "Tanda Vacaciones",
    organizerId: getUserIdByEmail("javier@example.com"),
    contributionAmount: 800,
  });

  ["karla@example.com", "luis@example.com", "ana@example.com"].forEach((email) => {
    tandaService.joinTanda(tanda.id, getUserIdByEmail(email));
  });

  tandaService.startTanda(tanda.id, getUserIdByEmail("javier@example.com"));

  for (let round = 1; round <= 4; round += 1) {
    const participants = tandaRepository.listParticipants(tanda.id);

    participants.forEach((participant, index) => {
      const isLate = round === 2 && index === 1;
      const shouldPay = !(round === 3 && participant.email === "ana@example.com");

      if (shouldPay) {
        tandaService.recordContribution({
          tandaId: tanda.id,
          participantId: participant.id,
          amount: 800 + (isLate ? 40 : 0),
          isLate,
        });
      }
    });

    tandaService.advanceTanda(tanda.id, getUserIdByEmail("javier@example.com"));
  }
}

function seedCancelledTanda(): void {
  const tanda = tandaService.createTanda({
    name: "Tanda Mercado Local",
    organizerId: getUserIdByEmail("bruno@example.com"),
    contributionAmount: 1200,
  });

  ["carla@example.com", "diego@example.com"].forEach((email) => {
    tandaService.joinTanda(tanda.id, getUserIdByEmail(email));
  });

  tandaService.cancelTanda(tanda.id, getUserIdByEmail("bruno@example.com"));
}

function printSummary(): void {
  const users = userRepository.list();
  const tandas = db
    .prepare(
      `
      SELECT
        t.id,
        t.name,
        t.status,
        t.current_round AS currentRound,
        t.total_rounds AS totalRounds,
        COUNT(p.id) AS participants
      FROM tandas t
      LEFT JOIN participants p ON p.tanda_id = t.id
      GROUP BY t.id
      ORDER BY t.id
      `,
    )
    .all() as Array<{
      id: number;
      name: string;
      status: string;
      currentRound: number;
      totalRounds: number;
      participants: number;
    }>;

  console.log(`Seed complete in ${config.databasePath}`);
  console.log(`Users: ${users.length}`);
  console.log(`Tandas: ${tandas.length}`);
  tandas.forEach((tanda) => {
    console.log(
      `- #${tanda.id} ${tanda.name} [${tanda.status}] participants=${tanda.participants} round=${tanda.currentRound}/${tanda.totalRounds}`,
    );
  });
}

function main(): void {
  try {
    resetDatabase(db);
    seedUsersTable();
    seedFormingTanda();
    seedActiveTanda();
    seedCompletedTanda();
    seedCancelledTanda();
    printSummary();
  } finally {
    db.close();
  }
}

main();
