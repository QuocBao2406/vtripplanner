
import { Building2, CircleCheck, CirclePause, Clock3 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PartnerApplicationForm } from "@/components/partner/partner-application-form";
import {
  AppRole,
  PartnerApprovalStatus,
} from "@/generated/prisma/enums";
import { getCurrentAuthorization } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Đăng ký đối tác | VTripPlanner",
  description: "Gửi hồ sơ đăng ký trở thành đối tác VTripPlanner.",
};

export const dynamic = "force-dynamic";

function formatDate(value: Date | null): string {
  if (!value) {
    return "Chưa có";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(value);
}

export default async function PartnerApplicationPage() {
  const authorization = await getCurrentAuthorization();

  if (authorization.status === "anonymous") {
    redirect(
      `/dang-nhap?message=${encodeURIComponent(
        "Vui lòng đăng nhập để đăng ký trở thành đối tác.",
      )}`,
    );
  }

  if (authorization.status === "inactive") {
    redirect("/khong-co-quyen?reason=inactive");
  }

  const { access } = authorization;

  if (access.roles.includes(AppRole.ADMIN)) {
    redirect("/quan-tri/doi-tac");
  }

  const [applicationUser, partner] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: access.applicationUserId,
      },
      select: {
        email: true,
        profile: {
          select: {
            fullName: true,
            displayName: true,
            phone: true,
          },
        },
      },
    }),
    prisma.partner.findUnique({
      where: {
        ownerUserId: access.applicationUserId,
      },
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        phone: true,
        email: true,
        websiteUrl: true,
        taxCode: true,
        businessLicenseUrl: true,
        approvalStatus: true,
        rejectionReason: true,
        submittedAt: true,
        reviewedAt: true,
        deletedAt: true,
      },
    }),
  ]);

  if (!applicationUser) {
    redirect("/khong-co-quyen?reason=inactive");
  }

  const effectivePartner =
    partner && !partner.deletedAt ? partner : null;

  if (
    effectivePartner?.approvalStatus ===
    PartnerApprovalStatus.APPROVED
  ) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 sm:px-6">
        <section className="mx-auto max-w-2xl rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <CircleCheck aria-hidden="true" className="size-6" />
          </span>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
            Đã được phê duyệt
          </p>
          <h1 className="mt-2 text-2xl font-black">
            {effectivePartner.name}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Hồ sơ Partner đã được ADMIN phê duyệt. Tài khoản có thể truy cập
            Trung tâm đối tác và các chức năng dành riêng cho Partner.
          </p>
          <p className="mt-3 text-xs text-slate-400">
            Duyệt lúc: {formatDate(effectivePartner.reviewedAt)}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/doi-tac"
              className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800"
            >
              Mở Trung tâm đối tác
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Về trang chủ
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (
    effectivePartner?.approvalStatus ===
    PartnerApprovalStatus.SUSPENDED
  ) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 sm:px-6">
        <section className="mx-auto max-w-2xl rounded-3xl border border-amber-200 bg-white p-6 shadow-sm sm:p-8">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <CirclePause aria-hidden="true" className="size-6" />
          </span>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
            Hồ sơ đang tạm ngưng
          </p>
          <h1 className="mt-2 text-2xl font-black">
            {effectivePartner.name}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Quyền Partner đang bị tạm ngưng. Hồ sơ không thể gửi lại từ màn
            hình này cho tới khi ADMIN xử lý trạng thái.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            ← Về trang chủ
          </Link>
        </section>
      </main>
    );
  }

  const isPending =
    effectivePartner?.approvalStatus ===
    PartnerApprovalStatus.PENDING;
  const isRejected =
    effectivePartner?.approvalStatus ===
    PartnerApprovalStatus.REJECTED;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="text-lg font-black tracking-tight">
            VTripPlanner
          </Link>
          <Link
            href="/"
            className="text-sm font-semibold text-slate-500 transition hover:text-emerald-700"
          >
            ← Trang chủ
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="self-start rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <Building2 aria-hidden="true" className="size-5" />
            </span>

            <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-sky-700">
              Partner Application
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight">
              Đăng ký trở thành đối tác
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Gửi thông tin doanh nghiệp hoặc dịch vụ của bạn. ADMIN sẽ xét
              duyệt trước khi tài khoản được cấp quyền Partner.
            </p>

            {isPending ? (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-center gap-2 text-amber-800">
                  <Clock3 aria-hidden="true" className="size-4" />
                  <span className="text-sm font-bold">Đang chờ duyệt</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-amber-700">
                  Gửi lúc {formatDate(effectivePartner?.submittedAt ?? null)}.
                  Bạn vẫn có thể cập nhật hồ sơ trong thời gian chờ.
                </p>
              </div>
            ) : null}

            {isRejected ? (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-bold text-red-800">
                  Hồ sơ cần chỉnh sửa
                </p>
                <p className="mt-2 text-xs leading-5 text-red-700">
                  {effectivePartner?.rejectionReason ||
                    "ADMIN chưa cung cấp lý do cụ thể."}
                </p>
                <p className="mt-2 text-xs text-red-500">
                  Bạn có thể chỉnh sửa và gửi lại hồ sơ.
                </p>
              </div>
            ) : null}
          </aside>

          <PartnerApplicationForm
            initialApplication={{
              name:
                effectivePartner?.name ??
                applicationUser.profile?.fullName ??
                applicationUser.profile?.displayName ??
                "",
              type: effectivePartner?.type ?? "TRAVEL_SERVICE",
              description: effectivePartner?.description ?? "",
              phone:
                effectivePartner?.phone ??
                applicationUser.profile?.phone ??
                "",
              email:
                effectivePartner?.email ??
                applicationUser.email ??
                access.authUser.email ??
                "",
              websiteUrl: effectivePartner?.websiteUrl ?? "",
              taxCode: effectivePartner?.taxCode ?? "",
              businessLicenseUrl:
                effectivePartner?.businessLicenseUrl ?? "",
              status:
                effectivePartner?.approvalStatus ??
                PartnerApprovalStatus.NOT_APPLIED,
            }}
          />
        </div>
      </div>
    </main>
  );
}
