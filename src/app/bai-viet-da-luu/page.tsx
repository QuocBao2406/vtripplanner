import Link from "next/link";
import { redirect } from "next/navigation";

import { SocialFeed } from "@/components/social/social-feed";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { getSavedSocialPosts } from "@/lib/social-feed/saved-posts";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bài viết đã lưu | VTripPlanner",
  description:
    "Xem lại những bài viết du lịch bạn đã lưu trên VTripPlanner.",
};

function getVietnamCurrentMonth(): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      month: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date()),
  );
}

export default async function SavedPostsPage() {
  const authUser = await getCurrentUser();

  if (!authUser) {
    const message = encodeURIComponent(
      "Vui lòng đăng nhập để xem bài viết đã lưu.",
    );

    redirect(
      `/dang-nhap?message=${message}`,
    );
  }

  const applicationUser =
    await prisma.user.findFirst({
      where: {
        id: authUser.id,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

  if (!applicationUser) {
    redirect(
      "/khong-co-quyen?reason=inactive",
    );
  }

  const posts =
    await getSavedSocialPosts(
      applicationUser.id,
    );

  const currentMonth =
    getVietnamCurrentMonth();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                VTripPlanner
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Bài viết đã lưu
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Những bài bạn đánh dấu để xem lại khi tìm cảm hứng hoặc chuẩn bị cho chuyến đi sau này.
              </p>
            </div>

            <Link
              href="/#cong-dong"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
            >
              ← Về cộng đồng
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {posts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
              🔖
            </div>
            <h2 className="mt-4 text-xl font-semibold">
              Bạn chưa lưu bài viết nào
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
              Khi gặp một bài du lịch muốn xem lại, hãy bấm “Lưu”. Bài gốc đã bị xóa sẽ không còn xuất hiện tại đây.
            </p>
            <Link
              href="/#cong-dong"
              className="mt-5 inline-flex rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Khám phá cộng đồng
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600">
                Đang hiển thị {posts.length} bài đã lưu gần nhất.
              </p>
              <Link
                href="/#cong-dong"
                className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
              >
                + Khám phá thêm
              </Link>
            </div>

            <SocialFeed
              currentMonth={currentMonth}
              posts={posts}
            />
          </div>
        )}
      </section>
    </main>
  );
}
