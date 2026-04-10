export declare const advanceTandaRound: (tandaId: number) => Promise<{
    id: number;
    name: string;
    organizerId: number;
    contributionAmount: number;
    status: string;
    currentRound: number;
    totalRounds: number;
}>;
export declare const getTandaById: (tandaId: number) => Promise<{
    id: number;
    name: string;
    organizerId: number;
    contributionAmount: number;
    status: string;
    currentRound: number;
    totalRounds: number;
} | null>;
export declare const getAllTandas: () => Promise<{
    id: number;
    name: string;
    organizerId: number;
    contributionAmount: number;
    status: string;
    currentRound: number;
    totalRounds: number;
}[]>;
//# sourceMappingURL=tanda.repository.d.ts.map