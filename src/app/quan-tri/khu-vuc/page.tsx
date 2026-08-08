
import type { Metadata } from "next";
import Link from "next/link";

import { AdminProvinceManager } from "@/components/admin/admin-province-manager";
import { AppRole } from "@/generated/prisma/enums";
import { requireRole } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Quản lý khu vực | VTripPlanner",
  description: "Tạo và quản lý khu vực du lịch trong VTripPlanner.",
};

export const dynamic = "force-dynamic";

export default async function AdminProvincePage() {
  await requireRole([AppRole.ADMIN]);

  const provinces = await prisma.province.findMany({
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
      code: true,
      slug: true,
      isActive: true,
      updatedAt: true,
      _count: {
        select: {
          districts: true,
          places: true,
          trips: true,
        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="font-black tracking-tight">
            VTripPlanner
          </Link>
          <span className="text-sm font-semibold text-slate-300">
            ADMIN · Khu vực du lịch
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
          <Link
            href="/quan-tri"
            className="text-slate-500 transition hover:text-violet-700"
          >
            ← Dashboard
          </Link>
          <span className="text-slate-300">/</span>
          <Link
            href="/quan-tri/dia-diem"
            className="text-violet-700 transition hover:text-violet-900"
          >
            Quản lý địa điểm →
          </Link>
        </div>

        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">
            Destination Management
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
            Khu vực du lịch
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            ADMIN có thể tạo thêm điểm đến cấp tỉnh/thành như Vũng Tàu,
            Phan Thiết. Dữ liệu seed/import bằng code vẫn giữ nguyên và cùng
            sử dụng bảng Province này.
          </p>
        </div>

        <AdminProvinceManager
          initialProvinces={provinces.map((province) => ({
            id: province.id,
            name: province.name,
            code: province.code,
            slug: province.slug,
            isActive: province.isActive,
            updatedAt: province.updatedAt.toISOString(),
            districtCount: province._count.districts,
            placeCount: province._count.places,
            tripCount: province._count.trips,
          }))}
        />
      </div>
    </main>
  );
}
