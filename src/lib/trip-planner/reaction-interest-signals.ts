import { prisma } from "@/lib/prisma";

const REACTION_WEIGHTS = {
  LIKE: 1,
  WOW: 2,
  LOVE: 3,
} as const;

const MAX_PLACE_SIGNALS = 8;
const MAX_SAVED_PLACE_SIGNALS = 8;

type ReactionType =
  keyof typeof REACTION_WEIGHTS;

export type TripPlaceInterestSignal = {
  placeId: string;
  placeName: string;
  provinceName: string;
  score: number;
  reactionCount: number;
  primaryReactionCount: number;
};

export type TripMonthInterestSignal = {
  month: number;
  score: number;
  reactionCount: number;
};

export type TripSavedPlaceInterestSignal = {
  placeId: string;
  placeName: string;
  provinceName: string;
  saveCount: number;
  primarySaveCount: number;
};

export type TripSavedMonthInterestSignal = {
  month: number;
  saveCount: number;
};

export type TripReactionInterestSignals = {
  reactionCount: number;
  signalPostCount: number;
  weightedReactionScore: number;
  reactionSummary: {
    LIKE: number;
    LOVE: number;
    WOW: number;
  };
  saveCount: number;
  savedSignalPostCount: number;
  topPlaces: TripPlaceInterestSignal[];
  preferredMonths: TripMonthInterestSignal[];
  topSavedPlaces: TripSavedPlaceInterestSignal[];
  savedPreferredMonths: TripSavedMonthInterestSignal[];
  promptContext: string | null;
};

type PlaceAccumulator =
  TripPlaceInterestSignal;

type MonthAccumulator =
  TripMonthInterestSignal;

type SavedPlaceAccumulator =
  TripSavedPlaceInterestSignal;

type SavedMonthAccumulator =
  TripSavedMonthInterestSignal;

function getReactionWeight(
  type: ReactionType,
): number {
  return REACTION_WEIGHTS[type];
}

function buildPromptContext(
  topPlaces: TripPlaceInterestSignal[],
  preferredMonths: TripMonthInterestSignal[],
  topSavedPlaces: TripSavedPlaceInterestSignal[],
  savedPreferredMonths: TripSavedMonthInterestSignal[],
): string | null {
  const parts: string[] = [];

  if (topPlaces.length > 0) {
    const placeText = topPlaces
      .slice(0, 5)
      .map(
        (place) =>
          `${place.placeName} (${place.provinceName}, điểm reaction ${place.score})`,
      )
      .join(", ");

    parts.push(
      `Địa điểm có tín hiệu reaction: ${placeText}.`,
    );
  }

  if (topSavedPlaces.length > 0) {
    const savedPlaceText =
      topSavedPlaces
        .slice(0, 5)
        .map(
          (place) =>
            `${place.placeName} (${place.provinceName}, ${place.saveCount} bài đã lưu)`,
        )
        .join(", ");

    parts.push(
      `Địa điểm có tín hiệu lưu bài: ${savedPlaceText}.`,
    );
  }

  if (preferredMonths.length > 0) {
    const monthText = preferredMonths
      .slice(0, 4)
      .map(
        (monthSignal) =>
          `tháng ${monthSignal.month} (điểm reaction ${monthSignal.score})`,
      )
      .join(", ");

    parts.push(
      `Thời điểm có tín hiệu reaction: ${monthText}.`,
    );
  }

  if (savedPreferredMonths.length > 0) {
    const savedMonthText =
      savedPreferredMonths
        .slice(0, 4)
        .map(
          (monthSignal) =>
            `tháng ${monthSignal.month} (${monthSignal.saveCount} bài đã lưu)`,
        )
        .join(", ");

    parts.push(
      `Thời điểm có tín hiệu lưu bài: ${savedMonthText}.`,
    );
  }

  if (parts.length === 0) {
    return null;
  }

  return [
    "Tín hiệu cá nhân hóa được tách riêng giữa reaction và bài viết đã lưu trên VTripPlanner.",
    "Reaction dùng LIKE = 1 điểm, WOW = 2 điểm, LOVE = 3 điểm.",
    "Bài viết đã lưu thể hiện ý định muốn xem lại và được xử lý như một tín hiệu riêng; Trip Planner áp dụng mức trần khi cộng điểm save để tránh bookmark áp đảo các yếu tố khác.",
    ...parts,
    "Chỉ dùng các tín hiệu này để ưu tiên gợi ý phù hợp; không loại bỏ các lựa chọn khác chỉ vì người dùng chưa từng reaction hoặc lưu bài.",
  ].join(" ");
}

export async function getReactionInterestSignals(
  userId: string,
): Promise<TripReactionInterestSignals> {
  const [
    reactions,
    savedPosts,
  ] = await Promise.all([
    prisma.travelPostReaction.findMany({
      where: {
        userId,
        post: {
          status: "PUBLISHED",
          deletedAt: null,
        },
      },
      select: {
        type: true,
        post: {
          select: {
            id: true,
            seasonMonths: true,
            places: {
              orderBy: [
                {
                  isPrimary: "desc",
                },
                {
                  sortOrder: "asc",
                },
              ],
              select: {
                isPrimary: true,
                place: {
                  select: {
                    id: true,
                    name: true,
                    province: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.travelPostSave.findMany({
      where: {
        userId,
        post: {
          status: "PUBLISHED",
          deletedAt: null,
        },
      },
      select: {
        post: {
          select: {
            id: true,
            seasonMonths: true,
            places: {
              orderBy: [
                {
                  isPrimary: "desc",
                },
                {
                  sortOrder: "asc",
                },
              ],
              select: {
                isPrimary: true,
                place: {
                  select: {
                    id: true,
                    name: true,
                    province: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const reactionSummary = {
    LIKE: 0,
    LOVE: 0,
    WOW: 0,
  };

  const places =
    new Map<string, PlaceAccumulator>();
  const months =
    new Map<number, MonthAccumulator>();
  const savedPlaces =
    new Map<string, SavedPlaceAccumulator>();
  const savedMonths =
    new Map<number, SavedMonthAccumulator>();

  let weightedReactionScore = 0;
  let signalPostCount = 0;
  let savedSignalPostCount = 0;

  for (const reaction of reactions) {
    const type =
      reaction.type as ReactionType;
    const weight =
      getReactionWeight(type);

    reactionSummary[type] += 1;
    weightedReactionScore += weight;

    const hasPlaceSignal =
      reaction.post.places.length > 0;
    const hasMonthSignal =
      reaction.post.seasonMonths.length > 0;

    if (
      hasPlaceSignal ||
      hasMonthSignal
    ) {
      signalPostCount += 1;
    }

    for (
      const placeLink of
      reaction.post.places
    ) {
      const place = placeLink.place;
      const existing =
        places.get(place.id);

      if (existing) {
        existing.score += weight;
        existing.reactionCount += 1;

        if (placeLink.isPrimary) {
          existing.primaryReactionCount += 1;
        }

        continue;
      }

      places.set(place.id, {
        placeId: place.id,
        placeName: place.name,
        provinceName:
          place.province.name,
        score: weight,
        reactionCount: 1,
        primaryReactionCount:
          placeLink.isPrimary ? 1 : 0,
      });
    }

    for (
      const month of
      reaction.post.seasonMonths
    ) {
      if (
        !Number.isInteger(month) ||
        month < 1 ||
        month > 12
      ) {
        continue;
      }

      const existing =
        months.get(month);

      if (existing) {
        existing.score += weight;
        existing.reactionCount += 1;
        continue;
      }

      months.set(month, {
        month,
        score: weight,
        reactionCount: 1,
      });
    }
  }

  for (const savedPost of savedPosts) {
    const hasPlaceSignal =
      savedPost.post.places.length > 0;
    const hasMonthSignal =
      savedPost.post.seasonMonths.length > 0;

    if (
      hasPlaceSignal ||
      hasMonthSignal
    ) {
      savedSignalPostCount += 1;
    }

    for (
      const placeLink of
      savedPost.post.places
    ) {
      const place = placeLink.place;
      const existing =
        savedPlaces.get(place.id);

      if (existing) {
        existing.saveCount += 1;

        if (placeLink.isPrimary) {
          existing.primarySaveCount += 1;
        }

        continue;
      }

      savedPlaces.set(place.id, {
        placeId: place.id,
        placeName: place.name,
        provinceName:
          place.province.name,
        saveCount: 1,
        primarySaveCount:
          placeLink.isPrimary ? 1 : 0,
      });
    }

    for (
      const month of
      savedPost.post.seasonMonths
    ) {
      if (
        !Number.isInteger(month) ||
        month < 1 ||
        month > 12
      ) {
        continue;
      }

      const existing =
        savedMonths.get(month);

      if (existing) {
        existing.saveCount += 1;
        continue;
      }

      savedMonths.set(month, {
        month,
        saveCount: 1,
      });
    }
  }

  const topPlaces = [...places.values()]
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.primaryReactionCount -
          left.primaryReactionCount ||
        right.reactionCount -
          left.reactionCount ||
        left.placeName.localeCompare(
          right.placeName,
          "vi",
        ),
    )
    .slice(0, MAX_PLACE_SIGNALS);

  const preferredMonths =
    [...months.values()].sort(
      (left, right) =>
        right.score - left.score ||
        right.reactionCount -
          left.reactionCount ||
        left.month - right.month,
    );

  const topSavedPlaces =
    [...savedPlaces.values()]
      .sort(
        (left, right) =>
          right.saveCount -
            left.saveCount ||
          right.primarySaveCount -
            left.primarySaveCount ||
          left.placeName.localeCompare(
            right.placeName,
            "vi",
          ),
      )
      .slice(
        0,
        MAX_SAVED_PLACE_SIGNALS,
      );

  const savedPreferredMonths =
    [...savedMonths.values()].sort(
      (left, right) =>
        right.saveCount -
          left.saveCount ||
        left.month - right.month,
    );

  return {
    reactionCount: reactions.length,
    signalPostCount,
    weightedReactionScore,
    reactionSummary,
    saveCount: savedPosts.length,
    savedSignalPostCount,
    topPlaces,
    preferredMonths,
    topSavedPlaces,
    savedPreferredMonths,
    promptContext: buildPromptContext(
      topPlaces,
      preferredMonths,
      topSavedPlaces,
      savedPreferredMonths,
    ),
  };
}
