import * as runtime from "@prisma/client/runtime/index-browser";
export type * from '../models.js';
export type * from './prismaNamespace.js';
export declare const Decimal: any;
export declare const NullTypes: {
    DbNull: (new (secret: never) => typeof runtime.DbNull);
    JsonNull: (new (secret: never) => typeof runtime.JsonNull);
    AnyNull: (new (secret: never) => typeof runtime.AnyNull);
};
/**
 * Helper for filtering JSON entries that have `null` on the database (empty on the db)
 *
 * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
 */
export declare const DbNull: any;
/**
 * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
 *
 * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
 */
export declare const JsonNull: any;
/**
 * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
 *
 * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
 */
export declare const AnyNull: any;
export declare const ModelName: {
    readonly User: "User";
    readonly Tanda: "Tanda";
    readonly Participant: "Participant";
    readonly Contribution: "Contribution";
};
export type ModelName = (typeof ModelName)[keyof typeof ModelName];
export declare const TransactionIsolationLevel: any;
export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel];
export declare const UserScalarFieldEnum: {
    readonly id: "id";
    readonly email: "email";
    readonly name: "name";
};
export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum];
export declare const TandaScalarFieldEnum: {
    readonly id: "id";
    readonly name: "name";
    readonly organizerId: "organizerId";
    readonly contributionAmount: "contributionAmount";
    readonly status: "status";
    readonly currentRound: "currentRound";
    readonly totalRounds: "totalRounds";
};
export type TandaScalarFieldEnum = (typeof TandaScalarFieldEnum)[keyof typeof TandaScalarFieldEnum];
export declare const ParticipantScalarFieldEnum: {
    readonly id: "id";
    readonly userId: "userId";
    readonly tandaId: "tandaId";
    readonly role: "role";
    readonly rotationPosition: "rotationPosition";
};
export type ParticipantScalarFieldEnum = (typeof ParticipantScalarFieldEnum)[keyof typeof ParticipantScalarFieldEnum];
export declare const ContributionScalarFieldEnum: {
    readonly id: "id";
    readonly tandaId: "tandaId";
    readonly participantId: "participantId";
    readonly round: "round";
    readonly amount: "amount";
    readonly status: "status";
};
export type ContributionScalarFieldEnum = (typeof ContributionScalarFieldEnum)[keyof typeof ContributionScalarFieldEnum];
export declare const SortOrder: {
    readonly asc: "asc";
    readonly desc: "desc";
};
export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder];
//# sourceMappingURL=prismaNamespaceBrowser.d.ts.map