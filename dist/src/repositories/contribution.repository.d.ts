export declare const createContribution: (tandaId: number, participantId: number, round: number, amount: number) => Promise<{
    id: number;
    tandaId: number;
    participantId: number;
    round: number;
    amount: number;
    status: string;
}>;
export declare const markContributionLate: (contributionId: number) => Promise<{
    id: number;
    tandaId: number;
    participantId: number;
    round: number;
    amount: number;
    status: string;
}>;
export declare const getContributionsForRound: (tandaId: number, round: number) => Promise<{
    id: number;
    tandaId: number;
    participantId: number;
    round: number;
    amount: number;
    status: string;
}[]>;
//# sourceMappingURL=contribution.repository.d.ts.map