export declare const TandaStatus: {
    readonly FORMING: "FORMING";
    readonly ACTIVE: "ACTIVE";
    readonly COMPLETED: "COMPLETED";
    readonly CANCELLED: "CANCELLED";
};
export type TandaStatus = (typeof TandaStatus)[keyof typeof TandaStatus];
export declare const ParticipantRole: {
    readonly ORGANIZER: "ORGANIZER";
    readonly MEMBER: "MEMBER";
};
export type ParticipantRole = (typeof ParticipantRole)[keyof typeof ParticipantRole];
export declare const ContributionStatus: {
    readonly PENDING: "PENDING";
    readonly PAID: "PAID";
    readonly LATE: "LATE";
    readonly MISSED: "MISSED";
};
export type ContributionStatus = (typeof ContributionStatus)[keyof typeof ContributionStatus];
//# sourceMappingURL=enums.d.ts.map