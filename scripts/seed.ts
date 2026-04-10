import { getConfig } from "../src/config/env";
import { initializeSchema, resetSchemaData } from "../src/db/schema";
import { ParticipantRepository } from "../src/repositories/participant-repository";
import { TandaRepository } from "../src/repositories/tanda-repository";
import { UserRepository } from "../src/repositories/user-repository";
import { ContributionRepository } from "../src/repositories/contribution-repository";
import { TandaService } from "../src/services/tanda-service";
import { UserService } from "../src/services/user-service";

interface SeedUser {
  email: string;
  name: string;
}

function createServices(): {
  userService: UserService;
  tandaService: TandaService;
} {
  const config = getConfig();
  const userRepository = new UserRepository();
  const tandaRepository = new TandaRepository();
  const participantRepository = new ParticipantRepository();
  const contributionRepository = new ContributionRepository();

  return {
    userService: new UserService(userRepository),
    tandaService: new TandaService(
      tandaRepository,
      userRepository,
      participantRepository,
      contributionRepository,
      config
    ),
  };
}

async function main(): Promise<void> {
  initializeSchema();
  resetSchemaData();

  const { userService, tandaService } = createServices();

  const sampleUsers: SeedUser[] = [
    { email: "sofia.organizer@example.com", name: "Sofía Martínez" },
    { email: "diego.member@example.com", name: "Diego Ramírez" },
    { email: "carla.member@example.com", name: "Carla Gómez" },
    { email: "luis.member@example.com", name: "Luis Torres" },
    { email: "ana.member@example.com", name: "Ana Hernández" },
    { email: "miguel.member@example.com", name: "Miguel Pérez" },
  ];

  const users = sampleUsers.map((sampleUser) => userService.createUser(sampleUser));

  const organizer = users[0];
  const memberA = users[1];
  const memberB = users[2];
  const memberC = users[3];
  const memberD = users[4];
  const memberE = users[5];

  const tandaPrincipal = tandaService.createTanda({
    name: "Tanda Hogar 2026",
    organizerId: organizer.id,
    contributionAmount: 1500,
  });

  tandaService.joinTanda({ tandaId: tandaPrincipal.id, userId: memberA.id });
  tandaService.joinTanda({ tandaId: tandaPrincipal.id, userId: memberB.id });
  tandaService.joinTanda({ tandaId: tandaPrincipal.id, userId: memberC.id });

  tandaService.startTanda({
    tandaId: tandaPrincipal.id,
    organizerId: organizer.id,
  });

  const mainParticipants = tandaService.listParticipants(tandaPrincipal.id);
  const organizerParticipant = mainParticipants.find(
    (participant) => participant.userId === organizer.id
  );
  const memberAParticipant = mainParticipants.find(
    (participant) => participant.userId === memberA.id
  );
  const memberBParticipant = mainParticipants.find(
    (participant) => participant.userId === memberB.id
  );

  if (!organizerParticipant || !memberAParticipant || !memberBParticipant) {
    throw new Error("Seed participants for main tanda were not created correctly");
  }

  tandaService.recordContribution({
    tandaId: tandaPrincipal.id,
    participantId: organizerParticipant.id,
    actorUserId: organizer.id,
  });

  tandaService.recordContribution({
    tandaId: tandaPrincipal.id,
    participantId: memberAParticipant.id,
    actorUserId: memberA.id,
    isLate: true,
  });

  tandaService.recordContribution({
    tandaId: tandaPrincipal.id,
    participantId: memberBParticipant.id,
    actorUserId: memberB.id,
  });

  tandaService.advanceRound({
    tandaId: tandaPrincipal.id,
    organizerId: organizer.id,
  });

  const tandaForming = tandaService.createTanda({
    name: "Tanda Viaje Playa",
    organizerId: memberD.id,
    contributionAmount: 800,
  });

  tandaService.joinTanda({ tandaId: tandaForming.id, userId: memberE.id });

  const tandaCancelable = tandaService.createTanda({
    name: "Tanda Cancelada Demo",
    organizerId: memberA.id,
    contributionAmount: 500,
  });

  tandaService.joinTanda({ tandaId: tandaCancelable.id, userId: organizer.id });
  tandaService.joinTanda({ tandaId: tandaCancelable.id, userId: memberC.id });

  tandaService.cancelTanda({
    tandaId: tandaCancelable.id,
    organizerId: memberA.id,
  });

  const usersCreated = userService.listUsers();
  const organizerTandas = tandaService.listTandasForUser(organizer.id);

  console.log("Seed completed successfully");
  console.log(`Users created: ${usersCreated.length}`);
  console.log(`Organizer tandas count: ${organizerTandas.length}`);
  console.log(`Main active tanda id: ${tandaPrincipal.id}`);
  console.log(`Forming tanda id: ${tandaForming.id}`);
  console.log(`Cancelled tanda id: ${tandaCancelable.id}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown seed error";
  console.error(`Seed failed: ${message}`);
  process.exitCode = 1;
});
