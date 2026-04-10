import type * as runtime from "@prisma/client/runtime/client";
import type * as $Enums from "../enums.js";
import type * as Prisma from "../internal/prismaNamespace.js";
/**
 * Model Tanda
 *
 */
export type TandaModel = runtime.Types.Result.DefaultSelection<Prisma.$TandaPayload>;
export type AggregateTanda = {
    _count: TandaCountAggregateOutputType | null;
    _avg: TandaAvgAggregateOutputType | null;
    _sum: TandaSumAggregateOutputType | null;
    _min: TandaMinAggregateOutputType | null;
    _max: TandaMaxAggregateOutputType | null;
};
export type TandaAvgAggregateOutputType = {
    id: number | null;
    organizerId: number | null;
    contributionAmount: number | null;
    currentRound: number | null;
    totalRounds: number | null;
};
export type TandaSumAggregateOutputType = {
    id: number | null;
    organizerId: number | null;
    contributionAmount: number | null;
    currentRound: number | null;
    totalRounds: number | null;
};
export type TandaMinAggregateOutputType = {
    id: number | null;
    name: string | null;
    organizerId: number | null;
    contributionAmount: number | null;
    status: $Enums.TandaStatus | null;
    currentRound: number | null;
    totalRounds: number | null;
};
export type TandaMaxAggregateOutputType = {
    id: number | null;
    name: string | null;
    organizerId: number | null;
    contributionAmount: number | null;
    status: $Enums.TandaStatus | null;
    currentRound: number | null;
    totalRounds: number | null;
};
export type TandaCountAggregateOutputType = {
    id: number;
    name: number;
    organizerId: number;
    contributionAmount: number;
    status: number;
    currentRound: number;
    totalRounds: number;
    _all: number;
};
export type TandaAvgAggregateInputType = {
    id?: true;
    organizerId?: true;
    contributionAmount?: true;
    currentRound?: true;
    totalRounds?: true;
};
export type TandaSumAggregateInputType = {
    id?: true;
    organizerId?: true;
    contributionAmount?: true;
    currentRound?: true;
    totalRounds?: true;
};
export type TandaMinAggregateInputType = {
    id?: true;
    name?: true;
    organizerId?: true;
    contributionAmount?: true;
    status?: true;
    currentRound?: true;
    totalRounds?: true;
};
export type TandaMaxAggregateInputType = {
    id?: true;
    name?: true;
    organizerId?: true;
    contributionAmount?: true;
    status?: true;
    currentRound?: true;
    totalRounds?: true;
};
export type TandaCountAggregateInputType = {
    id?: true;
    name?: true;
    organizerId?: true;
    contributionAmount?: true;
    status?: true;
    currentRound?: true;
    totalRounds?: true;
    _all?: true;
};
export type TandaAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which Tanda to aggregate.
     */
    where?: Prisma.TandaWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Tandas to fetch.
     */
    orderBy?: Prisma.TandaOrderByWithRelationInput | Prisma.TandaOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the start position
     */
    cursor?: Prisma.TandaWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Tandas from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Tandas.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Count returned Tandas
    **/
    _count?: true | TandaCountAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to average
    **/
    _avg?: TandaAvgAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to sum
    **/
    _sum?: TandaSumAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to find the minimum value
    **/
    _min?: TandaMinAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to find the maximum value
    **/
    _max?: TandaMaxAggregateInputType;
};
export type GetTandaAggregateType<T extends TandaAggregateArgs> = {
    [P in keyof T & keyof AggregateTanda]: P extends '_count' | 'count' ? T[P] extends true ? number : Prisma.GetScalarType<T[P], AggregateTanda[P]> : Prisma.GetScalarType<T[P], AggregateTanda[P]>;
};
export type TandaGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.TandaWhereInput;
    orderBy?: Prisma.TandaOrderByWithAggregationInput | Prisma.TandaOrderByWithAggregationInput[];
    by: Prisma.TandaScalarFieldEnum[] | Prisma.TandaScalarFieldEnum;
    having?: Prisma.TandaScalarWhereWithAggregatesInput;
    take?: number;
    skip?: number;
    _count?: TandaCountAggregateInputType | true;
    _avg?: TandaAvgAggregateInputType;
    _sum?: TandaSumAggregateInputType;
    _min?: TandaMinAggregateInputType;
    _max?: TandaMaxAggregateInputType;
};
export type TandaGroupByOutputType = {
    id: number;
    name: string;
    organizerId: number;
    contributionAmount: number;
    status: $Enums.TandaStatus;
    currentRound: number;
    totalRounds: number;
    _count: TandaCountAggregateOutputType | null;
    _avg: TandaAvgAggregateOutputType | null;
    _sum: TandaSumAggregateOutputType | null;
    _min: TandaMinAggregateOutputType | null;
    _max: TandaMaxAggregateOutputType | null;
};
export type GetTandaGroupByPayload<T extends TandaGroupByArgs> = Prisma.PrismaPromise<Array<Prisma.PickEnumerable<TandaGroupByOutputType, T['by']> & {
    [P in ((keyof T) & (keyof TandaGroupByOutputType))]: P extends '_count' ? T[P] extends boolean ? number : Prisma.GetScalarType<T[P], TandaGroupByOutputType[P]> : Prisma.GetScalarType<T[P], TandaGroupByOutputType[P]>;
}>>;
export type TandaWhereInput = {
    AND?: Prisma.TandaWhereInput | Prisma.TandaWhereInput[];
    OR?: Prisma.TandaWhereInput[];
    NOT?: Prisma.TandaWhereInput | Prisma.TandaWhereInput[];
    id?: Prisma.IntFilter<"Tanda"> | number;
    name?: Prisma.StringFilter<"Tanda"> | string;
    organizerId?: Prisma.IntFilter<"Tanda"> | number;
    contributionAmount?: Prisma.IntFilter<"Tanda"> | number;
    status?: Prisma.EnumTandaStatusFilter<"Tanda"> | $Enums.TandaStatus;
    currentRound?: Prisma.IntFilter<"Tanda"> | number;
    totalRounds?: Prisma.IntFilter<"Tanda"> | number;
    organizer?: Prisma.XOR<Prisma.UserScalarRelationFilter, Prisma.UserWhereInput>;
    participants?: Prisma.ParticipantListRelationFilter;
    contributions?: Prisma.ContributionListRelationFilter;
};
export type TandaOrderByWithRelationInput = {
    id?: Prisma.SortOrder;
    name?: Prisma.SortOrder;
    organizerId?: Prisma.SortOrder;
    contributionAmount?: Prisma.SortOrder;
    status?: Prisma.SortOrder;
    currentRound?: Prisma.SortOrder;
    totalRounds?: Prisma.SortOrder;
    organizer?: Prisma.UserOrderByWithRelationInput;
    participants?: Prisma.ParticipantOrderByRelationAggregateInput;
    contributions?: Prisma.ContributionOrderByRelationAggregateInput;
};
export type TandaWhereUniqueInput = Prisma.AtLeast<{
    id?: number;
    AND?: Prisma.TandaWhereInput | Prisma.TandaWhereInput[];
    OR?: Prisma.TandaWhereInput[];
    NOT?: Prisma.TandaWhereInput | Prisma.TandaWhereInput[];
    name?: Prisma.StringFilter<"Tanda"> | string;
    organizerId?: Prisma.IntFilter<"Tanda"> | number;
    contributionAmount?: Prisma.IntFilter<"Tanda"> | number;
    status?: Prisma.EnumTandaStatusFilter<"Tanda"> | $Enums.TandaStatus;
    currentRound?: Prisma.IntFilter<"Tanda"> | number;
    totalRounds?: Prisma.IntFilter<"Tanda"> | number;
    organizer?: Prisma.XOR<Prisma.UserScalarRelationFilter, Prisma.UserWhereInput>;
    participants?: Prisma.ParticipantListRelationFilter;
    contributions?: Prisma.ContributionListRelationFilter;
}, "id">;
export type TandaOrderByWithAggregationInput = {
    id?: Prisma.SortOrder;
    name?: Prisma.SortOrder;
    organizerId?: Prisma.SortOrder;
    contributionAmount?: Prisma.SortOrder;
    status?: Prisma.SortOrder;
    currentRound?: Prisma.SortOrder;
    totalRounds?: Prisma.SortOrder;
    _count?: Prisma.TandaCountOrderByAggregateInput;
    _avg?: Prisma.TandaAvgOrderByAggregateInput;
    _max?: Prisma.TandaMaxOrderByAggregateInput;
    _min?: Prisma.TandaMinOrderByAggregateInput;
    _sum?: Prisma.TandaSumOrderByAggregateInput;
};
export type TandaScalarWhereWithAggregatesInput = {
    AND?: Prisma.TandaScalarWhereWithAggregatesInput | Prisma.TandaScalarWhereWithAggregatesInput[];
    OR?: Prisma.TandaScalarWhereWithAggregatesInput[];
    NOT?: Prisma.TandaScalarWhereWithAggregatesInput | Prisma.TandaScalarWhereWithAggregatesInput[];
    id?: Prisma.IntWithAggregatesFilter<"Tanda"> | number;
    name?: Prisma.StringWithAggregatesFilter<"Tanda"> | string;
    organizerId?: Prisma.IntWithAggregatesFilter<"Tanda"> | number;
    contributionAmount?: Prisma.IntWithAggregatesFilter<"Tanda"> | number;
    status?: Prisma.EnumTandaStatusWithAggregatesFilter<"Tanda"> | $Enums.TandaStatus;
    currentRound?: Prisma.IntWithAggregatesFilter<"Tanda"> | number;
    totalRounds?: Prisma.IntWithAggregatesFilter<"Tanda"> | number;
};
export type TandaCreateInput = {
    name: string;
    contributionAmount: number;
    status?: $Enums.TandaStatus;
    currentRound?: number;
    totalRounds: number;
    organizer: Prisma.UserCreateNestedOneWithoutOrganizedTandasInput;
    participants?: Prisma.ParticipantCreateNestedManyWithoutTandaInput;
    contributions?: Prisma.ContributionCreateNestedManyWithoutTandaInput;
};
export type TandaUncheckedCreateInput = {
    id?: number;
    name: string;
    organizerId: number;
    contributionAmount: number;
    status?: $Enums.TandaStatus;
    currentRound?: number;
    totalRounds: number;
    participants?: Prisma.ParticipantUncheckedCreateNestedManyWithoutTandaInput;
    contributions?: Prisma.ContributionUncheckedCreateNestedManyWithoutTandaInput;
};
export type TandaUpdateInput = {
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    contributionAmount?: Prisma.IntFieldUpdateOperationsInput | number;
    status?: Prisma.EnumTandaStatusFieldUpdateOperationsInput | $Enums.TandaStatus;
    currentRound?: Prisma.IntFieldUpdateOperationsInput | number;
    totalRounds?: Prisma.IntFieldUpdateOperationsInput | number;
    organizer?: Prisma.UserUpdateOneRequiredWithoutOrganizedTandasNestedInput;
    participants?: Prisma.ParticipantUpdateManyWithoutTandaNestedInput;
    contributions?: Prisma.ContributionUpdateManyWithoutTandaNestedInput;
};
export type TandaUncheckedUpdateInput = {
    id?: Prisma.IntFieldUpdateOperationsInput | number;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    organizerId?: Prisma.IntFieldUpdateOperationsInput | number;
    contributionAmount?: Prisma.IntFieldUpdateOperationsInput | number;
    status?: Prisma.EnumTandaStatusFieldUpdateOperationsInput | $Enums.TandaStatus;
    currentRound?: Prisma.IntFieldUpdateOperationsInput | number;
    totalRounds?: Prisma.IntFieldUpdateOperationsInput | number;
    participants?: Prisma.ParticipantUncheckedUpdateManyWithoutTandaNestedInput;
    contributions?: Prisma.ContributionUncheckedUpdateManyWithoutTandaNestedInput;
};
export type TandaCreateManyInput = {
    id?: number;
    name: string;
    organizerId: number;
    contributionAmount: number;
    status?: $Enums.TandaStatus;
    currentRound?: number;
    totalRounds: number;
};
export type TandaUpdateManyMutationInput = {
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    contributionAmount?: Prisma.IntFieldUpdateOperationsInput | number;
    status?: Prisma.EnumTandaStatusFieldUpdateOperationsInput | $Enums.TandaStatus;
    currentRound?: Prisma.IntFieldUpdateOperationsInput | number;
    totalRounds?: Prisma.IntFieldUpdateOperationsInput | number;
};
export type TandaUncheckedUpdateManyInput = {
    id?: Prisma.IntFieldUpdateOperationsInput | number;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    organizerId?: Prisma.IntFieldUpdateOperationsInput | number;
    contributionAmount?: Prisma.IntFieldUpdateOperationsInput | number;
    status?: Prisma.EnumTandaStatusFieldUpdateOperationsInput | $Enums.TandaStatus;
    currentRound?: Prisma.IntFieldUpdateOperationsInput | number;
    totalRounds?: Prisma.IntFieldUpdateOperationsInput | number;
};
export type TandaListRelationFilter = {
    every?: Prisma.TandaWhereInput;
    some?: Prisma.TandaWhereInput;
    none?: Prisma.TandaWhereInput;
};
export type TandaOrderByRelationAggregateInput = {
    _count?: Prisma.SortOrder;
};
export type TandaCountOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    name?: Prisma.SortOrder;
    organizerId?: Prisma.SortOrder;
    contributionAmount?: Prisma.SortOrder;
    status?: Prisma.SortOrder;
    currentRound?: Prisma.SortOrder;
    totalRounds?: Prisma.SortOrder;
};
export type TandaAvgOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    organizerId?: Prisma.SortOrder;
    contributionAmount?: Prisma.SortOrder;
    currentRound?: Prisma.SortOrder;
    totalRounds?: Prisma.SortOrder;
};
export type TandaMaxOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    name?: Prisma.SortOrder;
    organizerId?: Prisma.SortOrder;
    contributionAmount?: Prisma.SortOrder;
    status?: Prisma.SortOrder;
    currentRound?: Prisma.SortOrder;
    totalRounds?: Prisma.SortOrder;
};
export type TandaMinOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    name?: Prisma.SortOrder;
    organizerId?: Prisma.SortOrder;
    contributionAmount?: Prisma.SortOrder;
    status?: Prisma.SortOrder;
    currentRound?: Prisma.SortOrder;
    totalRounds?: Prisma.SortOrder;
};
export type TandaSumOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    organizerId?: Prisma.SortOrder;
    contributionAmount?: Prisma.SortOrder;
    currentRound?: Prisma.SortOrder;
    totalRounds?: Prisma.SortOrder;
};
export type TandaScalarRelationFilter = {
    is?: Prisma.TandaWhereInput;
    isNot?: Prisma.TandaWhereInput;
};
export type TandaCreateNestedManyWithoutOrganizerInput = {
    create?: Prisma.XOR<Prisma.TandaCreateWithoutOrganizerInput, Prisma.TandaUncheckedCreateWithoutOrganizerInput> | Prisma.TandaCreateWithoutOrganizerInput[] | Prisma.TandaUncheckedCreateWithoutOrganizerInput[];
    connectOrCreate?: Prisma.TandaCreateOrConnectWithoutOrganizerInput | Prisma.TandaCreateOrConnectWithoutOrganizerInput[];
    createMany?: Prisma.TandaCreateManyOrganizerInputEnvelope;
    connect?: Prisma.TandaWhereUniqueInput | Prisma.TandaWhereUniqueInput[];
};
export type TandaUncheckedCreateNestedManyWithoutOrganizerInput = {
    create?: Prisma.XOR<Prisma.TandaCreateWithoutOrganizerInput, Prisma.TandaUncheckedCreateWithoutOrganizerInput> | Prisma.TandaCreateWithoutOrganizerInput[] | Prisma.TandaUncheckedCreateWithoutOrganizerInput[];
    connectOrCreate?: Prisma.TandaCreateOrConnectWithoutOrganizerInput | Prisma.TandaCreateOrConnectWithoutOrganizerInput[];
    createMany?: Prisma.TandaCreateManyOrganizerInputEnvelope;
    connect?: Prisma.TandaWhereUniqueInput | Prisma.TandaWhereUniqueInput[];
};
export type TandaUpdateManyWithoutOrganizerNestedInput = {
    create?: Prisma.XOR<Prisma.TandaCreateWithoutOrganizerInput, Prisma.TandaUncheckedCreateWithoutOrganizerInput> | Prisma.TandaCreateWithoutOrganizerInput[] | Prisma.TandaUncheckedCreateWithoutOrganizerInput[];
    connectOrCreate?: Prisma.TandaCreateOrConnectWithoutOrganizerInput | Prisma.TandaCreateOrConnectWithoutOrganizerInput[];
    upsert?: Prisma.TandaUpsertWithWhereUniqueWithoutOrganizerInput | Prisma.TandaUpsertWithWhereUniqueWithoutOrganizerInput[];
    createMany?: Prisma.TandaCreateManyOrganizerInputEnvelope;
    set?: Prisma.TandaWhereUniqueInput | Prisma.TandaWhereUniqueInput[];
    disconnect?: Prisma.TandaWhereUniqueInput | Prisma.TandaWhereUniqueInput[];
    delete?: Prisma.TandaWhereUniqueInput | Prisma.TandaWhereUniqueInput[];
    connect?: Prisma.TandaWhereUniqueInput | Prisma.TandaWhereUniqueInput[];
    update?: Prisma.TandaUpdateWithWhereUniqueWithoutOrganizerInput | Prisma.TandaUpdateWithWhereUniqueWithoutOrganizerInput[];
    updateMany?: Prisma.TandaUpdateManyWithWhereWithoutOrganizerInput | Prisma.TandaUpdateManyWithWhereWithoutOrganizerInput[];
    deleteMany?: Prisma.TandaScalarWhereInput | Prisma.TandaScalarWhereInput[];
};
export type TandaUncheckedUpdateManyWithoutOrganizerNestedInput = {
    create?: Prisma.XOR<Prisma.TandaCreateWithoutOrganizerInput, Prisma.TandaUncheckedCreateWithoutOrganizerInput> | Prisma.TandaCreateWithoutOrganizerInput[] | Prisma.TandaUncheckedCreateWithoutOrganizerInput[];
    connectOrCreate?: Prisma.TandaCreateOrConnectWithoutOrganizerInput | Prisma.TandaCreateOrConnectWithoutOrganizerInput[];
    upsert?: Prisma.TandaUpsertWithWhereUniqueWithoutOrganizerInput | Prisma.TandaUpsertWithWhereUniqueWithoutOrganizerInput[];
    createMany?: Prisma.TandaCreateManyOrganizerInputEnvelope;
    set?: Prisma.TandaWhereUniqueInput | Prisma.TandaWhereUniqueInput[];
    disconnect?: Prisma.TandaWhereUniqueInput | Prisma.TandaWhereUniqueInput[];
    delete?: Prisma.TandaWhereUniqueInput | Prisma.TandaWhereUniqueInput[];
    connect?: Prisma.TandaWhereUniqueInput | Prisma.TandaWhereUniqueInput[];
    update?: Prisma.TandaUpdateWithWhereUniqueWithoutOrganizerInput | Prisma.TandaUpdateWithWhereUniqueWithoutOrganizerInput[];
    updateMany?: Prisma.TandaUpdateManyWithWhereWithoutOrganizerInput | Prisma.TandaUpdateManyWithWhereWithoutOrganizerInput[];
    deleteMany?: Prisma.TandaScalarWhereInput | Prisma.TandaScalarWhereInput[];
};
export type EnumTandaStatusFieldUpdateOperationsInput = {
    set?: $Enums.TandaStatus;
};
export type TandaCreateNestedOneWithoutParticipantsInput = {
    create?: Prisma.XOR<Prisma.TandaCreateWithoutParticipantsInput, Prisma.TandaUncheckedCreateWithoutParticipantsInput>;
    connectOrCreate?: Prisma.TandaCreateOrConnectWithoutParticipantsInput;
    connect?: Prisma.TandaWhereUniqueInput;
};
export type TandaUpdateOneRequiredWithoutParticipantsNestedInput = {
    create?: Prisma.XOR<Prisma.TandaCreateWithoutParticipantsInput, Prisma.TandaUncheckedCreateWithoutParticipantsInput>;
    connectOrCreate?: Prisma.TandaCreateOrConnectWithoutParticipantsInput;
    upsert?: Prisma.TandaUpsertWithoutParticipantsInput;
    connect?: Prisma.TandaWhereUniqueInput;
    update?: Prisma.XOR<Prisma.XOR<Prisma.TandaUpdateToOneWithWhereWithoutParticipantsInput, Prisma.TandaUpdateWithoutParticipantsInput>, Prisma.TandaUncheckedUpdateWithoutParticipantsInput>;
};
export type TandaCreateNestedOneWithoutContributionsInput = {
    create?: Prisma.XOR<Prisma.TandaCreateWithoutContributionsInput, Prisma.TandaUncheckedCreateWithoutContributionsInput>;
    connectOrCreate?: Prisma.TandaCreateOrConnectWithoutContributionsInput;
    connect?: Prisma.TandaWhereUniqueInput;
};
export type TandaUpdateOneRequiredWithoutContributionsNestedInput = {
    create?: Prisma.XOR<Prisma.TandaCreateWithoutContributionsInput, Prisma.TandaUncheckedCreateWithoutContributionsInput>;
    connectOrCreate?: Prisma.TandaCreateOrConnectWithoutContributionsInput;
    upsert?: Prisma.TandaUpsertWithoutContributionsInput;
    connect?: Prisma.TandaWhereUniqueInput;
    update?: Prisma.XOR<Prisma.XOR<Prisma.TandaUpdateToOneWithWhereWithoutContributionsInput, Prisma.TandaUpdateWithoutContributionsInput>, Prisma.TandaUncheckedUpdateWithoutContributionsInput>;
};
export type TandaCreateWithoutOrganizerInput = {
    name: string;
    contributionAmount: number;
    status?: $Enums.TandaStatus;
    currentRound?: number;
    totalRounds: number;
    participants?: Prisma.ParticipantCreateNestedManyWithoutTandaInput;
    contributions?: Prisma.ContributionCreateNestedManyWithoutTandaInput;
};
export type TandaUncheckedCreateWithoutOrganizerInput = {
    id?: number;
    name: string;
    contributionAmount: number;
    status?: $Enums.TandaStatus;
    currentRound?: number;
    totalRounds: number;
    participants?: Prisma.ParticipantUncheckedCreateNestedManyWithoutTandaInput;
    contributions?: Prisma.ContributionUncheckedCreateNestedManyWithoutTandaInput;
};
export type TandaCreateOrConnectWithoutOrganizerInput = {
    where: Prisma.TandaWhereUniqueInput;
    create: Prisma.XOR<Prisma.TandaCreateWithoutOrganizerInput, Prisma.TandaUncheckedCreateWithoutOrganizerInput>;
};
export type TandaCreateManyOrganizerInputEnvelope = {
    data: Prisma.TandaCreateManyOrganizerInput | Prisma.TandaCreateManyOrganizerInput[];
};
export type TandaUpsertWithWhereUniqueWithoutOrganizerInput = {
    where: Prisma.TandaWhereUniqueInput;
    update: Prisma.XOR<Prisma.TandaUpdateWithoutOrganizerInput, Prisma.TandaUncheckedUpdateWithoutOrganizerInput>;
    create: Prisma.XOR<Prisma.TandaCreateWithoutOrganizerInput, Prisma.TandaUncheckedCreateWithoutOrganizerInput>;
};
export type TandaUpdateWithWhereUniqueWithoutOrganizerInput = {
    where: Prisma.TandaWhereUniqueInput;
    data: Prisma.XOR<Prisma.TandaUpdateWithoutOrganizerInput, Prisma.TandaUncheckedUpdateWithoutOrganizerInput>;
};
export type TandaUpdateManyWithWhereWithoutOrganizerInput = {
    where: Prisma.TandaScalarWhereInput;
    data: Prisma.XOR<Prisma.TandaUpdateManyMutationInput, Prisma.TandaUncheckedUpdateManyWithoutOrganizerInput>;
};
export type TandaScalarWhereInput = {
    AND?: Prisma.TandaScalarWhereInput | Prisma.TandaScalarWhereInput[];
    OR?: Prisma.TandaScalarWhereInput[];
    NOT?: Prisma.TandaScalarWhereInput | Prisma.TandaScalarWhereInput[];
    id?: Prisma.IntFilter<"Tanda"> | number;
    name?: Prisma.StringFilter<"Tanda"> | string;
    organizerId?: Prisma.IntFilter<"Tanda"> | number;
    contributionAmount?: Prisma.IntFilter<"Tanda"> | number;
    status?: Prisma.EnumTandaStatusFilter<"Tanda"> | $Enums.TandaStatus;
    currentRound?: Prisma.IntFilter<"Tanda"> | number;
    totalRounds?: Prisma.IntFilter<"Tanda"> | number;
};
export type TandaCreateWithoutParticipantsInput = {
    name: string;
    contributionAmount: number;
    status?: $Enums.TandaStatus;
    currentRound?: number;
    totalRounds: number;
    organizer: Prisma.UserCreateNestedOneWithoutOrganizedTandasInput;
    contributions?: Prisma.ContributionCreateNestedManyWithoutTandaInput;
};
export type TandaUncheckedCreateWithoutParticipantsInput = {
    id?: number;
    name: string;
    organizerId: number;
    contributionAmount: number;
    status?: $Enums.TandaStatus;
    currentRound?: number;
    totalRounds: number;
    contributions?: Prisma.ContributionUncheckedCreateNestedManyWithoutTandaInput;
};
export type TandaCreateOrConnectWithoutParticipantsInput = {
    where: Prisma.TandaWhereUniqueInput;
    create: Prisma.XOR<Prisma.TandaCreateWithoutParticipantsInput, Prisma.TandaUncheckedCreateWithoutParticipantsInput>;
};
export type TandaUpsertWithoutParticipantsInput = {
    update: Prisma.XOR<Prisma.TandaUpdateWithoutParticipantsInput, Prisma.TandaUncheckedUpdateWithoutParticipantsInput>;
    create: Prisma.XOR<Prisma.TandaCreateWithoutParticipantsInput, Prisma.TandaUncheckedCreateWithoutParticipantsInput>;
    where?: Prisma.TandaWhereInput;
};
export type TandaUpdateToOneWithWhereWithoutParticipantsInput = {
    where?: Prisma.TandaWhereInput;
    data: Prisma.XOR<Prisma.TandaUpdateWithoutParticipantsInput, Prisma.TandaUncheckedUpdateWithoutParticipantsInput>;
};
export type TandaUpdateWithoutParticipantsInput = {
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    contributionAmount?: Prisma.IntFieldUpdateOperationsInput | number;
    status?: Prisma.EnumTandaStatusFieldUpdateOperationsInput | $Enums.TandaStatus;
    currentRound?: Prisma.IntFieldUpdateOperationsInput | number;
    totalRounds?: Prisma.IntFieldUpdateOperationsInput | number;
    organizer?: Prisma.UserUpdateOneRequiredWithoutOrganizedTandasNestedInput;
    contributions?: Prisma.ContributionUpdateManyWithoutTandaNestedInput;
};
export type TandaUncheckedUpdateWithoutParticipantsInput = {
    id?: Prisma.IntFieldUpdateOperationsInput | number;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    organizerId?: Prisma.IntFieldUpdateOperationsInput | number;
    contributionAmount?: Prisma.IntFieldUpdateOperationsInput | number;
    status?: Prisma.EnumTandaStatusFieldUpdateOperationsInput | $Enums.TandaStatus;
    currentRound?: Prisma.IntFieldUpdateOperationsInput | number;
    totalRounds?: Prisma.IntFieldUpdateOperationsInput | number;
    contributions?: Prisma.ContributionUncheckedUpdateManyWithoutTandaNestedInput;
};
export type TandaCreateWithoutContributionsInput = {
    name: string;
    contributionAmount: number;
    status?: $Enums.TandaStatus;
    currentRound?: number;
    totalRounds: number;
    organizer: Prisma.UserCreateNestedOneWithoutOrganizedTandasInput;
    participants?: Prisma.ParticipantCreateNestedManyWithoutTandaInput;
};
export type TandaUncheckedCreateWithoutContributionsInput = {
    id?: number;
    name: string;
    organizerId: number;
    contributionAmount: number;
    status?: $Enums.TandaStatus;
    currentRound?: number;
    totalRounds: number;
    participants?: Prisma.ParticipantUncheckedCreateNestedManyWithoutTandaInput;
};
export type TandaCreateOrConnectWithoutContributionsInput = {
    where: Prisma.TandaWhereUniqueInput;
    create: Prisma.XOR<Prisma.TandaCreateWithoutContributionsInput, Prisma.TandaUncheckedCreateWithoutContributionsInput>;
};
export type TandaUpsertWithoutContributionsInput = {
    update: Prisma.XOR<Prisma.TandaUpdateWithoutContributionsInput, Prisma.TandaUncheckedUpdateWithoutContributionsInput>;
    create: Prisma.XOR<Prisma.TandaCreateWithoutContributionsInput, Prisma.TandaUncheckedCreateWithoutContributionsInput>;
    where?: Prisma.TandaWhereInput;
};
export type TandaUpdateToOneWithWhereWithoutContributionsInput = {
    where?: Prisma.TandaWhereInput;
    data: Prisma.XOR<Prisma.TandaUpdateWithoutContributionsInput, Prisma.TandaUncheckedUpdateWithoutContributionsInput>;
};
export type TandaUpdateWithoutContributionsInput = {
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    contributionAmount?: Prisma.IntFieldUpdateOperationsInput | number;
    status?: Prisma.EnumTandaStatusFieldUpdateOperationsInput | $Enums.TandaStatus;
    currentRound?: Prisma.IntFieldUpdateOperationsInput | number;
    totalRounds?: Prisma.IntFieldUpdateOperationsInput | number;
    organizer?: Prisma.UserUpdateOneRequiredWithoutOrganizedTandasNestedInput;
    participants?: Prisma.ParticipantUpdateManyWithoutTandaNestedInput;
};
export type TandaUncheckedUpdateWithoutContributionsInput = {
    id?: Prisma.IntFieldUpdateOperationsInput | number;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    organizerId?: Prisma.IntFieldUpdateOperationsInput | number;
    contributionAmount?: Prisma.IntFieldUpdateOperationsInput | number;
    status?: Prisma.EnumTandaStatusFieldUpdateOperationsInput | $Enums.TandaStatus;
    currentRound?: Prisma.IntFieldUpdateOperationsInput | number;
    totalRounds?: Prisma.IntFieldUpdateOperationsInput | number;
    participants?: Prisma.ParticipantUncheckedUpdateManyWithoutTandaNestedInput;
};
export type TandaCreateManyOrganizerInput = {
    id?: number;
    name: string;
    contributionAmount: number;
    status?: $Enums.TandaStatus;
    currentRound?: number;
    totalRounds: number;
};
export type TandaUpdateWithoutOrganizerInput = {
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    contributionAmount?: Prisma.IntFieldUpdateOperationsInput | number;
    status?: Prisma.EnumTandaStatusFieldUpdateOperationsInput | $Enums.TandaStatus;
    currentRound?: Prisma.IntFieldUpdateOperationsInput | number;
    totalRounds?: Prisma.IntFieldUpdateOperationsInput | number;
    participants?: Prisma.ParticipantUpdateManyWithoutTandaNestedInput;
    contributions?: Prisma.ContributionUpdateManyWithoutTandaNestedInput;
};
export type TandaUncheckedUpdateWithoutOrganizerInput = {
    id?: Prisma.IntFieldUpdateOperationsInput | number;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    contributionAmount?: Prisma.IntFieldUpdateOperationsInput | number;
    status?: Prisma.EnumTandaStatusFieldUpdateOperationsInput | $Enums.TandaStatus;
    currentRound?: Prisma.IntFieldUpdateOperationsInput | number;
    totalRounds?: Prisma.IntFieldUpdateOperationsInput | number;
    participants?: Prisma.ParticipantUncheckedUpdateManyWithoutTandaNestedInput;
    contributions?: Prisma.ContributionUncheckedUpdateManyWithoutTandaNestedInput;
};
export type TandaUncheckedUpdateManyWithoutOrganizerInput = {
    id?: Prisma.IntFieldUpdateOperationsInput | number;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    contributionAmount?: Prisma.IntFieldUpdateOperationsInput | number;
    status?: Prisma.EnumTandaStatusFieldUpdateOperationsInput | $Enums.TandaStatus;
    currentRound?: Prisma.IntFieldUpdateOperationsInput | number;
    totalRounds?: Prisma.IntFieldUpdateOperationsInput | number;
};
/**
 * Count Type TandaCountOutputType
 */
export type TandaCountOutputType = {
    participants: number;
    contributions: number;
};
export type TandaCountOutputTypeSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    participants?: boolean | TandaCountOutputTypeCountParticipantsArgs;
    contributions?: boolean | TandaCountOutputTypeCountContributionsArgs;
};
/**
 * TandaCountOutputType without action
 */
export type TandaCountOutputTypeDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TandaCountOutputType
     */
    select?: Prisma.TandaCountOutputTypeSelect<ExtArgs> | null;
};
/**
 * TandaCountOutputType without action
 */
export type TandaCountOutputTypeCountParticipantsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.ParticipantWhereInput;
};
/**
 * TandaCountOutputType without action
 */
export type TandaCountOutputTypeCountContributionsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.ContributionWhereInput;
};
export type TandaSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    name?: boolean;
    organizerId?: boolean;
    contributionAmount?: boolean;
    status?: boolean;
    currentRound?: boolean;
    totalRounds?: boolean;
    organizer?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    participants?: boolean | Prisma.Tanda$participantsArgs<ExtArgs>;
    contributions?: boolean | Prisma.Tanda$contributionsArgs<ExtArgs>;
    _count?: boolean | Prisma.TandaCountOutputTypeDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["tanda"]>;
export type TandaSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    name?: boolean;
    organizerId?: boolean;
    contributionAmount?: boolean;
    status?: boolean;
    currentRound?: boolean;
    totalRounds?: boolean;
    organizer?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["tanda"]>;
export type TandaSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    name?: boolean;
    organizerId?: boolean;
    contributionAmount?: boolean;
    status?: boolean;
    currentRound?: boolean;
    totalRounds?: boolean;
    organizer?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["tanda"]>;
export type TandaSelectScalar = {
    id?: boolean;
    name?: boolean;
    organizerId?: boolean;
    contributionAmount?: boolean;
    status?: boolean;
    currentRound?: boolean;
    totalRounds?: boolean;
};
export type TandaOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "name" | "organizerId" | "contributionAmount" | "status" | "currentRound" | "totalRounds", ExtArgs["result"]["tanda"]>;
export type TandaInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    organizer?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    participants?: boolean | Prisma.Tanda$participantsArgs<ExtArgs>;
    contributions?: boolean | Prisma.Tanda$contributionsArgs<ExtArgs>;
    _count?: boolean | Prisma.TandaCountOutputTypeDefaultArgs<ExtArgs>;
};
export type TandaIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    organizer?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
};
export type TandaIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    organizer?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
};
export type $TandaPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "Tanda";
    objects: {
        organizer: Prisma.$UserPayload<ExtArgs>;
        participants: Prisma.$ParticipantPayload<ExtArgs>[];
        contributions: Prisma.$ContributionPayload<ExtArgs>[];
    };
    scalars: runtime.Types.Extensions.GetPayloadResult<{
        id: number;
        name: string;
        organizerId: number;
        contributionAmount: number;
        status: $Enums.TandaStatus;
        currentRound: number;
        totalRounds: number;
    }, ExtArgs["result"]["tanda"]>;
    composites: {};
};
export type TandaGetPayload<S extends boolean | null | undefined | TandaDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$TandaPayload, S>;
export type TandaCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = Omit<TandaFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
    select?: TandaCountAggregateInputType | true;
};
export interface TandaDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: {
        types: Prisma.TypeMap<ExtArgs>['model']['Tanda'];
        meta: {
            name: 'Tanda';
        };
    };
    /**
     * Find zero or one Tanda that matches the filter.
     * @param {TandaFindUniqueArgs} args - Arguments to find a Tanda
     * @example
     * // Get one Tanda
     * const tanda = await prisma.tanda.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TandaFindUniqueArgs>(args: Prisma.SelectSubset<T, TandaFindUniqueArgs<ExtArgs>>): Prisma.Prisma__TandaClient<runtime.Types.Result.GetResult<Prisma.$TandaPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    /**
     * Find one Tanda that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TandaFindUniqueOrThrowArgs} args - Arguments to find a Tanda
     * @example
     * // Get one Tanda
     * const tanda = await prisma.tanda.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TandaFindUniqueOrThrowArgs>(args: Prisma.SelectSubset<T, TandaFindUniqueOrThrowArgs<ExtArgs>>): Prisma.Prisma__TandaClient<runtime.Types.Result.GetResult<Prisma.$TandaPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Find the first Tanda that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TandaFindFirstArgs} args - Arguments to find a Tanda
     * @example
     * // Get one Tanda
     * const tanda = await prisma.tanda.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TandaFindFirstArgs>(args?: Prisma.SelectSubset<T, TandaFindFirstArgs<ExtArgs>>): Prisma.Prisma__TandaClient<runtime.Types.Result.GetResult<Prisma.$TandaPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    /**
     * Find the first Tanda that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TandaFindFirstOrThrowArgs} args - Arguments to find a Tanda
     * @example
     * // Get one Tanda
     * const tanda = await prisma.tanda.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TandaFindFirstOrThrowArgs>(args?: Prisma.SelectSubset<T, TandaFindFirstOrThrowArgs<ExtArgs>>): Prisma.Prisma__TandaClient<runtime.Types.Result.GetResult<Prisma.$TandaPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Find zero or more Tandas that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TandaFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Tandas
     * const tandas = await prisma.tanda.findMany()
     *
     * // Get first 10 Tandas
     * const tandas = await prisma.tanda.findMany({ take: 10 })
     *
     * // Only select the `id`
     * const tandaWithIdOnly = await prisma.tanda.findMany({ select: { id: true } })
     *
     */
    findMany<T extends TandaFindManyArgs>(args?: Prisma.SelectSubset<T, TandaFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$TandaPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>;
    /**
     * Create a Tanda.
     * @param {TandaCreateArgs} args - Arguments to create a Tanda.
     * @example
     * // Create one Tanda
     * const Tanda = await prisma.tanda.create({
     *   data: {
     *     // ... data to create a Tanda
     *   }
     * })
     *
     */
    create<T extends TandaCreateArgs>(args: Prisma.SelectSubset<T, TandaCreateArgs<ExtArgs>>): Prisma.Prisma__TandaClient<runtime.Types.Result.GetResult<Prisma.$TandaPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Create many Tandas.
     * @param {TandaCreateManyArgs} args - Arguments to create many Tandas.
     * @example
     * // Create many Tandas
     * const tanda = await prisma.tanda.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     */
    createMany<T extends TandaCreateManyArgs>(args?: Prisma.SelectSubset<T, TandaCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    /**
     * Create many Tandas and returns the data saved in the database.
     * @param {TandaCreateManyAndReturnArgs} args - Arguments to create many Tandas.
     * @example
     * // Create many Tandas
     * const tanda = await prisma.tanda.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     * // Create many Tandas and only return the `id`
     * const tandaWithIdOnly = await prisma.tanda.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     *
     */
    createManyAndReturn<T extends TandaCreateManyAndReturnArgs>(args?: Prisma.SelectSubset<T, TandaCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$TandaPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>;
    /**
     * Delete a Tanda.
     * @param {TandaDeleteArgs} args - Arguments to delete one Tanda.
     * @example
     * // Delete one Tanda
     * const Tanda = await prisma.tanda.delete({
     *   where: {
     *     // ... filter to delete one Tanda
     *   }
     * })
     *
     */
    delete<T extends TandaDeleteArgs>(args: Prisma.SelectSubset<T, TandaDeleteArgs<ExtArgs>>): Prisma.Prisma__TandaClient<runtime.Types.Result.GetResult<Prisma.$TandaPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Update one Tanda.
     * @param {TandaUpdateArgs} args - Arguments to update one Tanda.
     * @example
     * // Update one Tanda
     * const tanda = await prisma.tanda.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     *
     */
    update<T extends TandaUpdateArgs>(args: Prisma.SelectSubset<T, TandaUpdateArgs<ExtArgs>>): Prisma.Prisma__TandaClient<runtime.Types.Result.GetResult<Prisma.$TandaPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Delete zero or more Tandas.
     * @param {TandaDeleteManyArgs} args - Arguments to filter Tandas to delete.
     * @example
     * // Delete a few Tandas
     * const { count } = await prisma.tanda.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     *
     */
    deleteMany<T extends TandaDeleteManyArgs>(args?: Prisma.SelectSubset<T, TandaDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    /**
     * Update zero or more Tandas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TandaUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Tandas
     * const tanda = await prisma.tanda.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     *
     */
    updateMany<T extends TandaUpdateManyArgs>(args: Prisma.SelectSubset<T, TandaUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    /**
     * Update zero or more Tandas and returns the data updated in the database.
     * @param {TandaUpdateManyAndReturnArgs} args - Arguments to update many Tandas.
     * @example
     * // Update many Tandas
     * const tanda = await prisma.tanda.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     * // Update zero or more Tandas and only return the `id`
     * const tandaWithIdOnly = await prisma.tanda.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     *
     */
    updateManyAndReturn<T extends TandaUpdateManyAndReturnArgs>(args: Prisma.SelectSubset<T, TandaUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$TandaPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>;
    /**
     * Create or update one Tanda.
     * @param {TandaUpsertArgs} args - Arguments to update or create a Tanda.
     * @example
     * // Update or create a Tanda
     * const tanda = await prisma.tanda.upsert({
     *   create: {
     *     // ... data to create a Tanda
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Tanda we want to update
     *   }
     * })
     */
    upsert<T extends TandaUpsertArgs>(args: Prisma.SelectSubset<T, TandaUpsertArgs<ExtArgs>>): Prisma.Prisma__TandaClient<runtime.Types.Result.GetResult<Prisma.$TandaPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Count the number of Tandas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TandaCountArgs} args - Arguments to filter Tandas to count.
     * @example
     * // Count the number of Tandas
     * const count = await prisma.tanda.count({
     *   where: {
     *     // ... the filter for the Tandas we want to count
     *   }
     * })
    **/
    count<T extends TandaCountArgs>(args?: Prisma.Subset<T, TandaCountArgs>): Prisma.PrismaPromise<T extends runtime.Types.Utils.Record<'select', any> ? T['select'] extends true ? number : Prisma.GetScalarType<T['select'], TandaCountAggregateOutputType> : number>;
    /**
     * Allows you to perform aggregations operations on a Tanda.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TandaAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TandaAggregateArgs>(args: Prisma.Subset<T, TandaAggregateArgs>): Prisma.PrismaPromise<GetTandaAggregateType<T>>;
    /**
     * Group by Tanda.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TandaGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     *
    **/
    groupBy<T extends TandaGroupByArgs, HasSelectOrTake extends Prisma.Or<Prisma.Extends<'skip', Prisma.Keys<T>>, Prisma.Extends<'take', Prisma.Keys<T>>>, OrderByArg extends Prisma.True extends HasSelectOrTake ? {
        orderBy: TandaGroupByArgs['orderBy'];
    } : {
        orderBy?: TandaGroupByArgs['orderBy'];
    }, OrderFields extends Prisma.ExcludeUnderscoreKeys<Prisma.Keys<Prisma.MaybeTupleToUnion<T['orderBy']>>>, ByFields extends Prisma.MaybeTupleToUnion<T['by']>, ByValid extends Prisma.Has<ByFields, OrderFields>, HavingFields extends Prisma.GetHavingFields<T['having']>, HavingValid extends Prisma.Has<ByFields, HavingFields>, ByEmpty extends T['by'] extends never[] ? Prisma.True : Prisma.False, InputErrors extends ByEmpty extends Prisma.True ? `Error: "by" must not be empty.` : HavingValid extends Prisma.False ? {
        [P in HavingFields]: P extends ByFields ? never : P extends string ? `Error: Field "${P}" used in "having" needs to be provided in "by".` : [
            Error,
            'Field ',
            P,
            ` in "having" needs to be provided in "by"`
        ];
    }[HavingFields] : 'take' extends Prisma.Keys<T> ? 'orderBy' extends Prisma.Keys<T> ? ByValid extends Prisma.True ? {} : {
        [P in OrderFields]: P extends ByFields ? never : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
    }[OrderFields] : 'Error: If you provide "take", you also need to provide "orderBy"' : 'skip' extends Prisma.Keys<T> ? 'orderBy' extends Prisma.Keys<T> ? ByValid extends Prisma.True ? {} : {
        [P in OrderFields]: P extends ByFields ? never : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
    }[OrderFields] : 'Error: If you provide "skip", you also need to provide "orderBy"' : ByValid extends Prisma.True ? {} : {
        [P in OrderFields]: P extends ByFields ? never : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
    }[OrderFields]>(args: Prisma.SubsetIntersection<T, TandaGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTandaGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>;
    /**
     * Fields of the Tanda model
     */
    readonly fields: TandaFieldRefs;
}
/**
 * The delegate class that acts as a "Promise-like" for Tanda.
 * Why is this prefixed with `Prisma__`?
 * Because we want to prevent naming conflicts as mentioned in
 * https://github.com/prisma/prisma-client-js/issues/707
 */
export interface Prisma__TandaClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise";
    organizer<T extends Prisma.UserDefaultArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.UserDefaultArgs<ExtArgs>>): Prisma.Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>;
    participants<T extends Prisma.Tanda$participantsArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.Tanda$participantsArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$ParticipantPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>;
    contributions<T extends Prisma.Tanda$contributionsArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.Tanda$contributionsArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$ContributionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>;
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>;
}
/**
 * Fields of the Tanda model
 */
export interface TandaFieldRefs {
    readonly id: Prisma.FieldRef<"Tanda", 'Int'>;
    readonly name: Prisma.FieldRef<"Tanda", 'String'>;
    readonly organizerId: Prisma.FieldRef<"Tanda", 'Int'>;
    readonly contributionAmount: Prisma.FieldRef<"Tanda", 'Int'>;
    readonly status: Prisma.FieldRef<"Tanda", 'TandaStatus'>;
    readonly currentRound: Prisma.FieldRef<"Tanda", 'Int'>;
    readonly totalRounds: Prisma.FieldRef<"Tanda", 'Int'>;
}
/**
 * Tanda findUnique
 */
export type TandaFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tanda
     */
    select?: Prisma.TandaSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the Tanda
     */
    omit?: Prisma.TandaOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.TandaInclude<ExtArgs> | null;
    /**
     * Filter, which Tanda to fetch.
     */
    where: Prisma.TandaWhereUniqueInput;
};
/**
 * Tanda findUniqueOrThrow
 */
export type TandaFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tanda
     */
    select?: Prisma.TandaSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the Tanda
     */
    omit?: Prisma.TandaOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.TandaInclude<ExtArgs> | null;
    /**
     * Filter, which Tanda to fetch.
     */
    where: Prisma.TandaWhereUniqueInput;
};
/**
 * Tanda findFirst
 */
export type TandaFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tanda
     */
    select?: Prisma.TandaSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the Tanda
     */
    omit?: Prisma.TandaOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.TandaInclude<ExtArgs> | null;
    /**
     * Filter, which Tanda to fetch.
     */
    where?: Prisma.TandaWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Tandas to fetch.
     */
    orderBy?: Prisma.TandaOrderByWithRelationInput | Prisma.TandaOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for searching for Tandas.
     */
    cursor?: Prisma.TandaWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Tandas from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Tandas.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of Tandas.
     */
    distinct?: Prisma.TandaScalarFieldEnum | Prisma.TandaScalarFieldEnum[];
};
/**
 * Tanda findFirstOrThrow
 */
export type TandaFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tanda
     */
    select?: Prisma.TandaSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the Tanda
     */
    omit?: Prisma.TandaOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.TandaInclude<ExtArgs> | null;
    /**
     * Filter, which Tanda to fetch.
     */
    where?: Prisma.TandaWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Tandas to fetch.
     */
    orderBy?: Prisma.TandaOrderByWithRelationInput | Prisma.TandaOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for searching for Tandas.
     */
    cursor?: Prisma.TandaWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Tandas from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Tandas.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of Tandas.
     */
    distinct?: Prisma.TandaScalarFieldEnum | Prisma.TandaScalarFieldEnum[];
};
/**
 * Tanda findMany
 */
export type TandaFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tanda
     */
    select?: Prisma.TandaSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the Tanda
     */
    omit?: Prisma.TandaOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.TandaInclude<ExtArgs> | null;
    /**
     * Filter, which Tandas to fetch.
     */
    where?: Prisma.TandaWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Tandas to fetch.
     */
    orderBy?: Prisma.TandaOrderByWithRelationInput | Prisma.TandaOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for listing Tandas.
     */
    cursor?: Prisma.TandaWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Tandas from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Tandas.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of Tandas.
     */
    distinct?: Prisma.TandaScalarFieldEnum | Prisma.TandaScalarFieldEnum[];
};
/**
 * Tanda create
 */
export type TandaCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tanda
     */
    select?: Prisma.TandaSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the Tanda
     */
    omit?: Prisma.TandaOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.TandaInclude<ExtArgs> | null;
    /**
     * The data needed to create a Tanda.
     */
    data: Prisma.XOR<Prisma.TandaCreateInput, Prisma.TandaUncheckedCreateInput>;
};
/**
 * Tanda createMany
 */
export type TandaCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to create many Tandas.
     */
    data: Prisma.TandaCreateManyInput | Prisma.TandaCreateManyInput[];
};
/**
 * Tanda createManyAndReturn
 */
export type TandaCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tanda
     */
    select?: Prisma.TandaSelectCreateManyAndReturn<ExtArgs> | null;
    /**
     * Omit specific fields from the Tanda
     */
    omit?: Prisma.TandaOmit<ExtArgs> | null;
    /**
     * The data used to create many Tandas.
     */
    data: Prisma.TandaCreateManyInput | Prisma.TandaCreateManyInput[];
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.TandaIncludeCreateManyAndReturn<ExtArgs> | null;
};
/**
 * Tanda update
 */
export type TandaUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tanda
     */
    select?: Prisma.TandaSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the Tanda
     */
    omit?: Prisma.TandaOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.TandaInclude<ExtArgs> | null;
    /**
     * The data needed to update a Tanda.
     */
    data: Prisma.XOR<Prisma.TandaUpdateInput, Prisma.TandaUncheckedUpdateInput>;
    /**
     * Choose, which Tanda to update.
     */
    where: Prisma.TandaWhereUniqueInput;
};
/**
 * Tanda updateMany
 */
export type TandaUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to update Tandas.
     */
    data: Prisma.XOR<Prisma.TandaUpdateManyMutationInput, Prisma.TandaUncheckedUpdateManyInput>;
    /**
     * Filter which Tandas to update
     */
    where?: Prisma.TandaWhereInput;
    /**
     * Limit how many Tandas to update.
     */
    limit?: number;
};
/**
 * Tanda updateManyAndReturn
 */
export type TandaUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tanda
     */
    select?: Prisma.TandaSelectUpdateManyAndReturn<ExtArgs> | null;
    /**
     * Omit specific fields from the Tanda
     */
    omit?: Prisma.TandaOmit<ExtArgs> | null;
    /**
     * The data used to update Tandas.
     */
    data: Prisma.XOR<Prisma.TandaUpdateManyMutationInput, Prisma.TandaUncheckedUpdateManyInput>;
    /**
     * Filter which Tandas to update
     */
    where?: Prisma.TandaWhereInput;
    /**
     * Limit how many Tandas to update.
     */
    limit?: number;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.TandaIncludeUpdateManyAndReturn<ExtArgs> | null;
};
/**
 * Tanda upsert
 */
export type TandaUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tanda
     */
    select?: Prisma.TandaSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the Tanda
     */
    omit?: Prisma.TandaOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.TandaInclude<ExtArgs> | null;
    /**
     * The filter to search for the Tanda to update in case it exists.
     */
    where: Prisma.TandaWhereUniqueInput;
    /**
     * In case the Tanda found by the `where` argument doesn't exist, create a new Tanda with this data.
     */
    create: Prisma.XOR<Prisma.TandaCreateInput, Prisma.TandaUncheckedCreateInput>;
    /**
     * In case the Tanda was found with the provided `where` argument, update it with this data.
     */
    update: Prisma.XOR<Prisma.TandaUpdateInput, Prisma.TandaUncheckedUpdateInput>;
};
/**
 * Tanda delete
 */
export type TandaDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tanda
     */
    select?: Prisma.TandaSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the Tanda
     */
    omit?: Prisma.TandaOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.TandaInclude<ExtArgs> | null;
    /**
     * Filter which Tanda to delete.
     */
    where: Prisma.TandaWhereUniqueInput;
};
/**
 * Tanda deleteMany
 */
export type TandaDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which Tandas to delete
     */
    where?: Prisma.TandaWhereInput;
    /**
     * Limit how many Tandas to delete.
     */
    limit?: number;
};
/**
 * Tanda.participants
 */
export type Tanda$participantsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Participant
     */
    select?: Prisma.ParticipantSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the Participant
     */
    omit?: Prisma.ParticipantOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.ParticipantInclude<ExtArgs> | null;
    where?: Prisma.ParticipantWhereInput;
    orderBy?: Prisma.ParticipantOrderByWithRelationInput | Prisma.ParticipantOrderByWithRelationInput[];
    cursor?: Prisma.ParticipantWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.ParticipantScalarFieldEnum | Prisma.ParticipantScalarFieldEnum[];
};
/**
 * Tanda.contributions
 */
export type Tanda$contributionsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Contribution
     */
    select?: Prisma.ContributionSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the Contribution
     */
    omit?: Prisma.ContributionOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.ContributionInclude<ExtArgs> | null;
    where?: Prisma.ContributionWhereInput;
    orderBy?: Prisma.ContributionOrderByWithRelationInput | Prisma.ContributionOrderByWithRelationInput[];
    cursor?: Prisma.ContributionWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.ContributionScalarFieldEnum | Prisma.ContributionScalarFieldEnum[];
};
/**
 * Tanda without action
 */
export type TandaDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tanda
     */
    select?: Prisma.TandaSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the Tanda
     */
    omit?: Prisma.TandaOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.TandaInclude<ExtArgs> | null;
};
//# sourceMappingURL=Tanda.d.ts.map