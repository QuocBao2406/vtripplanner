
"use client";

import type { LucideIcon } from "lucide-react";
import {
  Bookmark,
  Building2,
  ChevronDown,
  FileText,
  LogOut,
  MapPinned,
  ShieldCheck,
  Ticket,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import { signOutAction } from "@/app/auth/actions";

type HomeAccountMenuProps = {
  displayName: string;
  email: string;
  roleLabel: string;
  isAdmin: boolean;
  isPartner: boolean;
};

type MenuLinkProps = {
  href: string;
  icon: LucideIcon;
  label: string;
  onNavigate: () => void;
};

function MenuLink({
  href,
  icon: Icon,
  label,
  onNavigate,
}: MenuLinkProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="group flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition group-hover:bg-white group-hover:text-emerald-700">
        <Icon aria-hidden="true" className="size-4.5" />
      </span>
      <span className="min-w-0 flex-1">{label}</span>
    </Link>
  );
}

function ComingSoonItem() {
  return (
    <div
      aria-disabled="true"
      className="flex min-h-12 cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-400"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Ticket aria-hidden="true" className="size-4.5" />
      </span>
      <span className="min-w-0 flex-1">Voucher của tôi</span>
      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
        Sắp có
      </span>
    </div>
  );
}

export function HomeAccountMenu({
  displayName,
  email,
  roleLabel,
  isAdmin,
  isPartner,
}: HomeAccountMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const initial =
    Array.from(displayName.trim())[0]?.toLocaleUpperCase("vi-VN") ?? "U";

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (
        target instanceof Node &&
        rootRef.current &&
        !rootRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Mở menu tài khoản của ${displayName}`}
        onClick={() => {
          setIsOpen((current) => !current);
        }}
        className="flex min-h-10 max-w-[190px] items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-1.5 py-1.5 text-left text-white transition hover:bg-white/20 sm:max-w-[240px] sm:px-2.5"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-300 text-sm font-black text-emerald-950 shadow-sm">
          {initial}
        </span>

        <span className="hidden min-w-0 flex-1 sm:block">
          <span className="block truncate text-sm font-semibold">
            {displayName}
          </span>
          <span className="block truncate text-[10px] font-medium uppercase tracking-wide text-emerald-100/80">
            {roleLabel}
          </span>
        </span>

        <ChevronDown
          aria-hidden="true"
          className={`hidden size-4 shrink-0 transition sm:block ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="fixed inset-x-3 top-16 z-[60] max-h-[calc(100svh-5rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 text-slate-950 shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[360px]"
        >
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-base font-black text-white shadow-sm">
                {initial}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-950">
                  {displayName}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {email}
                </p>
                <span className="mt-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  {roleLabel}
                </span>
              </div>
            </div>

            <Link
              href="/tai-khoan"
              onClick={() => {
                setIsOpen(false);
              }}
              className="mt-3 flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
            >
              Xem hồ sơ cá nhân
            </Link>
          </div>

          <div className="mt-2">
            <MenuLink
              href="/tai-khoan"
              icon={UserRound}
              label="Hồ sơ cá nhân"
              onNavigate={() => {
                setIsOpen(false);
              }}
            />
            <MenuLink
              href="/chuyen-di-cua-toi"
              icon={MapPinned}
              label="Chuyến đi của tôi"
              onNavigate={() => {
                setIsOpen(false);
              }}
            />
            <MenuLink
              href="/bai-viet-cua-toi"
              icon={FileText}
              label="Bài viết của tôi"
              onNavigate={() => {
                setIsOpen(false);
              }}
            />
            <MenuLink
              href="/bai-viet-da-luu"
              icon={Bookmark}
              label="Bài viết đã lưu"
              onNavigate={() => {
                setIsOpen(false);
              }}
            />
            <ComingSoonItem />

            {!isAdmin && !isPartner ? (
              <MenuLink
                href="/dang-ky-doi-tac"
                icon={Building2}
                label="Đăng ký trở thành đối tác"
                onNavigate={() => {
                  setIsOpen(false);
                }}
              />
            ) : null}
          </div>

          {isAdmin || isPartner ? (
            <div className="mt-2 border-t border-slate-100 pt-2">
              {isAdmin ? (
                <MenuLink
                  href="/quan-tri"
                  icon={ShieldCheck}
                  label="Quản trị hệ thống"
                  onNavigate={() => {
                    setIsOpen(false);
                  }}
                />
              ) : null}

              {isPartner ? (
                <MenuLink
                  href="/doi-tac"
                  icon={Building2}
                  label="Trung tâm đối tác"
                  onNavigate={() => {
                    setIsOpen(false);
                  }}
                />
              ) : null}
            </div>
          ) : null}

          <div className="mt-2 border-t border-slate-100 pt-2">
            <form action={signOutAction}>
              <button
                type="submit"
                className="group flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-red-50 hover:text-red-700"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition group-hover:bg-white group-hover:text-red-600">
                  <LogOut aria-hidden="true" className="size-4.5" />
                </span>
                <span>Đăng xuất</span>
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
