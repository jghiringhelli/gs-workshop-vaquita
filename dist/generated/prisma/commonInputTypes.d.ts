import * as $Enums from "./enums.js";
import type * as Prisma from "./internal/prismaNamespace.js";
export type IntFilter<$PrismaModel = never> = {
    equals?: number | Prisma.IntFieldRefInput<$PrismaModel>;
    in?: number[];
    notIn?: number[];
    lt?: number | Prisma.IntFieldRefInput<$PrismaModel>;
    lte?: number | Prisma.IntFieldRefInput<$PrismaModel>;
    gt?: number | Prisma.IntFieldRefInput<$PrismaModel>;
    gte?: number | Prisma.IntFieldRefInput<$PrismaModel>;
    not?: Prisma.NestedIntFilter<$PrismaModel> | number;
};
export type StringFilter<$PrismaModel = never> = {
    equals?: string | Prisma.StringFieldRefInput<$PrismaModel>;
    in?: string[];
    notIn?: string[];
    lt?: string | Prisma.StringFieldRefInput<$PrismaModel>;
    lte?: string | Prisma.StringFieldRefInput<$PrismaModel>;
    gt?: string | Prisma.StringFieldRefInput<$PrismaModel>;
    gte?: string | Prisma.StringFieldRefInput<$PrismaModel>;
    contains?: string | Prisma.StringFieldRefInput<$PrismaModel>;
    startsWith?: string | Prisma.StringFieldRefInput<$PrismaModel>;
    endsWith?: string | Prisma.StringFieldRefInput<$PrismaModel>;
    not?: Prisma.NestedStringFilter<$PrismaModel> | string;
};
export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | Prisma.IntFieldRefInput<$PrismaModel>;
    in?: number[];
    notIn?: number[];
    lt?: number | Prisma.IntFieldRefInput<$PrismaModel>;
    lte?: number | Prisma.IntFieldRefInput<$PrismaModel>;
    gt?: number | Prisma.IntFieldRefInput<$PrismaModel>;
    gte?: number | Prisma.IntFieldRefInput<$PrismaModel>;
    not?: Prisma.NestedIntWithAggregatesFilter<$PrismaModel> | number;
    _count?: Prisma.NestedIntFilter<$PrismaModel>;
    _avg?: Prisma.NestedFloatFilter<$PrismaModel>;
    _sum?: Prisma.NestedIntFilter<$PrismaModel>;
    _min?: Prisma.NestedIntFilter<$PrismaModel>;
    _max?: Prisma.NestedIntFilter<$PrismaModel>;
};
export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | Prisma.StringFieldRefInput<$PrismaModel>;
    in?: string[];
    notIn?: string[];
    lt?: string | Prisma.StringFieldRefInput<$PrismaModel>;
    lte?: string | Prisma.StringFieldRefInput<$PrismaModel>;
    gt?: string | Prisma.StringFieldRefInput<$PrismaModel>;
    gte?: string | Prisma.StringFieldRefInput<$PrismaModel>;
    contains?: string | Prisma.StringFieldRefInput<$PrismaModel>;
    startsWith?: string | Prisma.StringFieldRefInput<$PrismaModel>;
    endsWith?: string | Prisma.StringFieldRefInput<$PrismaModel>;
    not?: Prisma.NestedStringWithAggregatesFilter<$PrismaModel> | string;
    _count?: Prisma.NestedIntFilter<$PrismaModel>;
    _min?: Prisma.NestedStringFilter<$PrismaModel>;
    _max?: Prisma.NestedStringFilter<$PrismaModel>;
};
export type EnumTandaStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.TandaStatus | Prisma.EnumTandaStatusFieldRefInput<$PrismaModel>;
    in?: $Enums.TandaStatus[];
    notIn?: $Enums.TandaStatus[];
    not?: Prisma.NestedEnumTandaStatusFilter<$PrismaModel> | $Enums.TandaStatus;
};
export type EnumTandaStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TandaStatus | Prisma.EnumTandaStatusFieldRefInput<$PrismaModel>;
    in?: $Enums.TandaStatus[];
    notIn?: $Enums.TandaStatus[];
    not?: Prisma.NestedEnumTandaStatusWithAggregatesFilter<$PrismaModel> | $Enums.TandaStatus;
    _count?: Prisma.NestedIntFilter<$PrismaModel>;
    _min?: Prisma.NestedEnumTandaStatusFilter<$PrismaModel>;
    _max?: Prisma.NestedEnumTandaStatusFilter<$PrismaModel>;
};
export type EnumParticipantRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.ParticipantRole | Prisma.EnumParticipantRoleFieldRefInput<$PrismaModel>;
    in?: $Enums.ParticipantRole[];
    notIn?: $Enums.ParticipantRole[];
    not?: Prisma.NestedEnumParticipantRoleFilter<$PrismaModel> | $Enums.ParticipantRole;
};
export type EnumParticipantRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ParticipantRole | Prisma.EnumParticipantRoleFieldRefInput<$PrismaModel>;
    in?: $Enums.ParticipantRole[];
    notIn?: $Enums.ParticipantRole[];
    not?: Prisma.NestedEnumParticipantRoleWithAggregatesFilter<$PrismaModel> | $Enums.ParticipantRole;
    _count?: Prisma.NestedIntFilter<$PrismaModel>;
    _min?: Prisma.NestedEnumParticipantRoleFilter<$PrismaModel>;
    _max?: Prisma.NestedEnumParticipantRoleFilter<$PrismaModel>;
};
export type EnumContributionStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.ContributionStatus | Prisma.EnumContributionStatusFieldRefInput<$PrismaModel>;
    in?: $Enums.ContributionStatus[];
    notIn?: $Enums.ContributionStatus[];
    not?: Prisma.NestedEnumContributionStatusFilter<$PrismaModel> | $Enums.ContributionStatus;
};
export type EnumContributionStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ContributionStatus | Prisma.EnumContributionStatusFieldRefInput<$PrismaModel>;
    in?: $Enums.ContributionStatus[];
    notIn?: $Enums.ContributionStatus[];
    not?: Prisma.NestedEnumContributionStatusWithAggregatesFilter<$PrismaModel> | $Enums.ContributionStatus;
    _count?: Prisma.NestedIntFilter<$PrismaModel>;
    _min?: Prisma.NestedEnumContributionStatusFilter<$PrismaModel>;
    _max?: Prisma.NestedEnumContributionStatusFilter<$PrismaModel>;
};
export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | Prisma.IntFieldRefInput<$PrismaModel>;
    in?: number[];
    notIn?: number[];
    lt?: number | Prisma.IntFieldRefInput<$PrismaModel>;
    lte?: number | Prisma.IntFieldRefInput<$PrismaModel>;
    gt?: number | Prisma.IntFieldRefInput<$PrismaModel>;
    gte?: number | Prisma.IntFieldRefInput<$PrismaModel>;
    not?: Prisma.NestedIntFilter<$PrismaModel> | number;
};
export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | Prisma.StringFieldRefInput<$PrismaModel>;
    in?: string[];
    notIn?: string[];
    lt?: string | Prisma.StringFieldRefInput<$PrismaModel>;
    lte?: string | Prisma.StringFieldRefInput<$PrismaModel>;
    gt?: string | Prisma.StringFieldRefInput<$PrismaModel>;
    gte?: string | Prisma.StringFieldRefInput<$PrismaModel>;
    contains?: string | Prisma.StringFieldRefInput<$PrismaModel>;
    startsWith?: string | Prisma.StringFieldRefInput<$PrismaModel>;
    endsWith?: string | Prisma.StringFieldRefInput<$PrismaModel>;
    not?: Prisma.NestedStringFilter<$PrismaModel> | string;
};
export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | Prisma.IntFieldRefInput<$PrismaModel>;
    in?: number[];
    notIn?: number[];
    lt?: number | Prisma.IntFieldRefInput<$PrismaModel>;
    lte?: number | Prisma.IntFieldRefInput<$PrismaModel>;
    gt?: number | Prisma.IntFieldRefInput<$PrismaModel>;
    gte?: number | Prisma.IntFieldRefInput<$PrismaModel>;
    not?: Prisma.NestedIntWithAggregatesFilter<$PrismaModel> | number;
    _count?: Prisma.NestedIntFilter<$PrismaModel>;
    _avg?: Prisma.NestedFloatFilter<$PrismaModel>;
    _sum?: Prisma.NestedIntFilter<$PrismaModel>;
    _min?: Prisma.NestedIntFilter<$PrismaModel>;
    _max?: Prisma.NestedIntFilter<$PrismaModel>;
};
export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | Prisma.FloatFieldRefInput<$PrismaModel>;
    in?: number[];
    notIn?: number[];
    lt?: number | Prisma.FloatFieldRefInput<$PrismaModel>;
    lte?: number | Prisma.FloatFieldRefInput<$PrismaModel>;
    gt?: number | Prisma.FloatFieldRefInput<$PrismaModel>;
    gte?: number | Prisma.FloatFieldRefInput<$PrismaModel>;
    not?: Prisma.NestedFloatFilter<$PrismaModel> | number;
};
export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | Prisma.StringFieldRefInput<$PrismaModel>;
    in?: string[];
    notIn?: string[];
    lt?: string | Prisma.StringFieldRefInput<$PrismaModel>;
    lte?: string | Prisma.StringFieldRefInput<$PrismaModel>;
    gt?: string | Prisma.StringFieldRefInput<$PrismaModel>;
    gte?: string | Prisma.StringFieldRefInput<$PrismaModel>;
    contains?: string | Prisma.StringFieldRefInput<$PrismaModel>;
    startsWith?: string | Prisma.StringFieldRefInput<$PrismaModel>;
    endsWith?: string | Prisma.StringFieldRefInput<$PrismaModel>;
    not?: Prisma.NestedStringWithAggregatesFilter<$PrismaModel> | string;
    _count?: Prisma.NestedIntFilter<$PrismaModel>;
    _min?: Prisma.NestedStringFilter<$PrismaModel>;
    _max?: Prisma.NestedStringFilter<$PrismaModel>;
};
export type NestedEnumTandaStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.TandaStatus | Prisma.EnumTandaStatusFieldRefInput<$PrismaModel>;
    in?: $Enums.TandaStatus[];
    notIn?: $Enums.TandaStatus[];
    not?: Prisma.NestedEnumTandaStatusFilter<$PrismaModel> | $Enums.TandaStatus;
};
export type NestedEnumTandaStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TandaStatus | Prisma.EnumTandaStatusFieldRefInput<$PrismaModel>;
    in?: $Enums.TandaStatus[];
    notIn?: $Enums.TandaStatus[];
    not?: Prisma.NestedEnumTandaStatusWithAggregatesFilter<$PrismaModel> | $Enums.TandaStatus;
    _count?: Prisma.NestedIntFilter<$PrismaModel>;
    _min?: Prisma.NestedEnumTandaStatusFilter<$PrismaModel>;
    _max?: Prisma.NestedEnumTandaStatusFilter<$PrismaModel>;
};
export type NestedEnumParticipantRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.ParticipantRole | Prisma.EnumParticipantRoleFieldRefInput<$PrismaModel>;
    in?: $Enums.ParticipantRole[];
    notIn?: $Enums.ParticipantRole[];
    not?: Prisma.NestedEnumParticipantRoleFilter<$PrismaModel> | $Enums.ParticipantRole;
};
export type NestedEnumParticipantRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ParticipantRole | Prisma.EnumParticipantRoleFieldRefInput<$PrismaModel>;
    in?: $Enums.ParticipantRole[];
    notIn?: $Enums.ParticipantRole[];
    not?: Prisma.NestedEnumParticipantRoleWithAggregatesFilter<$PrismaModel> | $Enums.ParticipantRole;
    _count?: Prisma.NestedIntFilter<$PrismaModel>;
    _min?: Prisma.NestedEnumParticipantRoleFilter<$PrismaModel>;
    _max?: Prisma.NestedEnumParticipantRoleFilter<$PrismaModel>;
};
export type NestedEnumContributionStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.ContributionStatus | Prisma.EnumContributionStatusFieldRefInput<$PrismaModel>;
    in?: $Enums.ContributionStatus[];
    notIn?: $Enums.ContributionStatus[];
    not?: Prisma.NestedEnumContributionStatusFilter<$PrismaModel> | $Enums.ContributionStatus;
};
export type NestedEnumContributionStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ContributionStatus | Prisma.EnumContributionStatusFieldRefInput<$PrismaModel>;
    in?: $Enums.ContributionStatus[];
    notIn?: $Enums.ContributionStatus[];
    not?: Prisma.NestedEnumContributionStatusWithAggregatesFilter<$PrismaModel> | $Enums.ContributionStatus;
    _count?: Prisma.NestedIntFilter<$PrismaModel>;
    _min?: Prisma.NestedEnumContributionStatusFilter<$PrismaModel>;
    _max?: Prisma.NestedEnumContributionStatusFilter<$PrismaModel>;
};
//# sourceMappingURL=commonInputTypes.d.ts.map