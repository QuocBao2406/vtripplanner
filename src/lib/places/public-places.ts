import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const PLACE_IMAGE_BUCKET = "place-images";
const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 24;

export type PublicPlaceFilters = {
  query?: string;
  province?: string;
  category?: string;
  month?: number;
  page: number;
  pageSize?: number;
};

export type PublicPlaceCard = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  addressLine: string;
  ward: string | null;
  provinceName: string;
  provinceSlug: string;
  categoryName: string;
  categorySlug: string;
  bestVisitMonths: number[];
  seasonNote: string | null;
  coverImageUrl: string | null;
  coverImageAlt: string;
  minimumPrice: {
    label: string;
    amount: number;
    currency: string;
    unit: string;
  } | null;
  averageRating: number | null;
  reviewCount: number;
};

export type PublicPlaceCatalog = {
  places: PublicPlaceCard[];
  total: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
};

export type PublicPlaceFilterOptions = {
  provinces: Array<{
    name: string;
    slug: string;
  }>;
  categories: Array<{
    name: string;
    slug: string;
  }>;
};

function clampPageSize(value: number | undefined): number {
  if (!value || !Number.isInteger(value)) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(Math.max(value, 1), MAX_PAGE_SIZE);
}

function normalizeText(value: string | undefined): string | undefined {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : undefined;
}

function getPublicStorageUrl(storagePath: string): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");

  if (!supabaseUrl) {
    return null;
  }

  const encodedPath = storagePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${supabaseUrl}/storage/v1/object/public/${PLACE_IMAGE_BUCKET}/${encodedPath}`;
}

function calculateAverageRating(ratings: number[]): number | null {
  if (ratings.length === 0) {
    return null;
  }

  const totalRating = ratings.reduce((total, rating) => total + rating, 0);

  return Math.round((totalRating / ratings.length) * 10) / 10;
}

function createPublicPlaceWhere(
  filters: PublicPlaceFilters,
): Prisma.PlaceWhereInput {
  const query = normalizeText(filters.query);
  const province = normalizeText(filters.province);
  const category = normalizeText(filters.category);

  const where: Prisma.PlaceWhereInput = {
    isActive: true,
    deletedAt: null,
    verificationStatus: "VERIFIED",
  };

  if (query) {
    where.OR = [
      {
        name: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        shortDescription: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        addressLine: {
          contains: query,
          mode: "insensitive",
        },
      },
    ];
  }

  if (province) {
    where.province = {
      slug: province,
      isActive: true,
    };
  }

  if (category) {
    where.category = {
      slug: category,
      isActive: true,
    };
  }

  if (
    filters.month !== undefined &&
    Number.isInteger(filters.month) &&
    filters.month >= 1 &&
    filters.month <= 12
  ) {
    where.bestVisitMonths = {
      has: filters.month,
    };
  }

  return where;
}

export async function getPublicPlaceFilterOptions(): Promise<PublicPlaceFilterOptions> {
  const [provinces, categories] = await Promise.all([
    prisma.province.findMany({
      where: {
        isActive: true,
        places: {
          some: {
            isActive: true,
            deletedAt: null,
            verificationStatus: "VERIFIED",
          },
        },
      },
      orderBy: {
        name: "asc",
      },
      select: {
        name: true,
        slug: true,
      },
    }),
    prisma.placeCategory.findMany({
      where: {
        isActive: true,
        places: {
          some: {
            isActive: true,
            deletedAt: null,
            verificationStatus: "VERIFIED",
          },
        },
      },
      orderBy: {
        name: "asc",
      },
      select: {
        name: true,
        slug: true,
      },
    }),
  ]);

  return {
    provinces,
    categories,
  };
}

export async function getPublicPlaceCatalog(
  filters: PublicPlaceFilters,
): Promise<PublicPlaceCatalog> {
  const pageSize = clampPageSize(filters.pageSize);
  const requestedPage = Number.isInteger(filters.page)
    ? Math.max(filters.page, 1)
    : 1;
  const where = createPublicPlaceWhere(filters);

  const total = await prisma.place.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(requestedPage, totalPages);

  const rows = await prisma.place.findMany({
    where,
    orderBy: [
      {
        province: {
          name: "asc",
        },
      },
      {
        name: "asc",
      },
    ],
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      name: true,
      slug: true,
      shortDescription: true,
      addressLine: true,
      ward: true,
      bestVisitMonths: true,
      seasonNote: true,
      province: {
        select: {
          name: true,
          slug: true,
        },
      },
      category: {
        select: {
          name: true,
          slug: true,
        },
      },
      images: {
        orderBy: [
          {
            isCover: "desc",
          },
          {
            sortOrder: "asc",
          },
        ],
        take: 1,
        select: {
          storagePath: true,
          altText: true,
        },
      },
      prices: {
        where: {
          isActive: true,
        },
        orderBy: {
          amount: "asc",
        },
        take: 1,
        select: {
          label: true,
          amount: true,
          currency: true,
          unit: true,
        },
      },
      reviews: {
        where: {
          status: "PUBLISHED",
        },
        select: {
          rating: true,
        },
      },
    },
  });

  const places = rows.map<PublicPlaceCard>((place) => {
    const coverImage = place.images[0];
    const minimumPrice = place.prices[0];
    const ratings = place.reviews.map((review) => review.rating);

    return {
      id: place.id,
      name: place.name,
      slug: place.slug,
      shortDescription: place.shortDescription,
      addressLine: place.addressLine,
      ward: place.ward,
      provinceName: place.province.name,
      provinceSlug: place.province.slug,
      categoryName: place.category.name,
      categorySlug: place.category.slug,
      bestVisitMonths: place.bestVisitMonths,
      seasonNote: place.seasonNote,
      coverImageUrl: coverImage
        ? getPublicStorageUrl(coverImage.storagePath)
        : null,
      coverImageAlt: coverImage?.altText ?? `Ảnh minh họa ${place.name}`,
      minimumPrice: minimumPrice
        ? {
            label: minimumPrice.label,
            amount: minimumPrice.amount.toNumber(),
            currency: minimumPrice.currency,
            unit: minimumPrice.unit,
          }
        : null,
      averageRating: calculateAverageRating(ratings),
      reviewCount: ratings.length,
    };
  });

  return {
    places,
    total,
    currentPage,
    totalPages,
    pageSize,
  };
}
