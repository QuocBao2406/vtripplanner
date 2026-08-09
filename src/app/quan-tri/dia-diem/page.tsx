
import type { Metadata } from "next";
import Link from "next/link";

import { AdminPlaceManager } from "@/components/admin/admin-place-manager";
import { AppRole } from "@/generated/prisma/enums";
import { requireRole } from "@/lib/auth/authorization";
import { getPublicPlaceImageUrl } from "@/lib/place-media/public-url";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Quản lý địa điểm | VTripPlanner",
  description: "Tạo và quản lý Place/POI trong VTripPlanner.",
};

export const dynamic = "force-dynamic";

export default async function AdminPlacePage() {
  await requireRole([AppRole.ADMIN]);

  const [places, categories, provinces] = await Promise.all([
    prisma.place.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: [
        {
          updatedAt: "desc",
        },
        {
          name: "asc",
        },
      ],
      take: 100,
      select: {
        id: true,
        name: true,
        slug: true,
        categoryId: true,
        provinceId: true,
        districtId: true,
        shortDescription: true,
        description: true,
        addressLine: true,
        ward: true,
        latitude: true,
        longitude: true,
        phone: true,
        email: true,
        websiteUrl: true,
        verificationStatus: true,
        isActive: true,
        updatedAt: true,
        category: {
          select: {
            name: true,
          },
        },
        province: {
          select: {
            name: true,
          },
        },
        district: {
          select: {
            name: true,
          },
        },
        partner: {
          select: {
            name: true,
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
          take: 8,
          select: {
            id: true,
            storagePath: true,
            altText: true,
            isCover: true,
            sortOrder: true,
          },
        },
      },
    }),
    prisma.placeCategory.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    }),
    prisma.province.findMany({
      orderBy: [
        {
          isActive: "desc",
        },
        {
          name: "asc",
        },
      ],
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        districts: {
          where: {
            isActive: true,
          },
          orderBy: {
            name: "asc",
          },
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
  ]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="font-black tracking-tight">
            VTripPlanner
          </Link>
          <span className="text-sm font-semibold text-slate-300">
            ADMIN · Địa điểm
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
          <Link
            href="/quan-tri"
            className="text-slate-500 transition hover:text-violet-700"
          >
            ← Dashboard
          </Link>
          <span className="text-slate-300">/</span>
          <Link
            href="/quan-tri/khu-vuc"
            className="text-violet-700 transition hover:text-violet-900"
          >
            Quản lý khu vực
          </Link>
        </div>

        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">
            Place / POI Management
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
            Địa điểm & dịch vụ
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            ADMIN có thể thêm địa điểm tham quan, nhà hàng, khách sạn hoặc
            dịch vụ vào dữ liệu VTripPlanner. Place do ADMIN nhập được xác minh
            ngay; Place do Partner gửi sau này sẽ đi qua luồng duyệt riêng.
          </p>
        </div>

        <AdminPlaceManager
          categories={categories}
          provinces={provinces}
          initialPlaces={places.map((place) => ({
            id: place.id,
            name: place.name,
            slug: place.slug,
            categoryId: place.categoryId,
            categoryName: place.category.name,
            provinceId: place.provinceId,
            provinceName: place.province.name,
            districtId: place.districtId ?? "",
            districtName: place.district?.name ?? "",
            shortDescription: place.shortDescription ?? "",
            description: place.description ?? "",
            addressLine: place.addressLine,
            ward: place.ward ?? "",
            latitude: place.latitude?.toString() ?? "",
            longitude: place.longitude?.toString() ?? "",
            phone: place.phone ?? "",
            email: place.email ?? "",
            websiteUrl: place.websiteUrl ?? "",
            verificationStatus: place.verificationStatus,
            isActive: place.isActive,
            partnerName: place.partner?.name ?? "",
            images: place.images.flatMap((image) => {
              const url = getPublicPlaceImageUrl(
                image.storagePath,
              );

              return url
                ? [
                    {
                      id: image.id,
                      url,
                      altText:
                        image.altText ??
                        `Ảnh ${place.name}`,
                      isCover: image.isCover,
                      sortOrder: image.sortOrder,
                    },
                  ]
                : [];
            }),
            updatedAt: place.updatedAt.toISOString(),
          }))}
        />
      </div>
    </main>
  );
}
