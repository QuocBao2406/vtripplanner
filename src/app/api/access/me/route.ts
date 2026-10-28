import { NextResponse } from "next/server";

import { authorizeApi } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const authorization = await authorizeApi();

  if (!authorization.ok) {
    return authorization.response;
  }

  if (authorization.access.applicationUserId === "mock-admin-id") {
    return NextResponse.json({
      authenticated: true,
      applicationUserId: "mock-admin-id",
      roles: ["ADMIN", "USER"],
      email: "admin.vtripplanner@example.com",
      profile: {
        fullName: "Quản Trị Viên",
        displayName: "Admin VTrip",
        phone: "0901234567",
        dateOfBirth: "1990-01-01",
        city: "Hà Nội",
        bio: "Quản trị viên hệ thống VTripPlanner",
        avatarUrl: null,
      },
      partner: null,
    });
  }

  if (authorization.access.applicationUserId === "mock-partner-id") {
    return NextResponse.json({
      authenticated: true,
      applicationUserId: "mock-partner-id",
      roles: ["PARTNER", "USER"],
      email: "partner.vtripplanner@example.com",
      profile: {
        fullName: "Đại Diện Đối Tác",
        displayName: "Đối Tác VTrip",
        phone: "0987654321",
        dateOfBirth: "1992-05-15",
        city: "Đà Nẵng",
        bio: "Đối tác liên kết dịch vụ nghỉ dưỡng",
        avatarUrl: null,
      },
      partner: {
        id: "partner-mock-1",
        name: "Khu Nghỉ Dưỡng & Khách Sạn Mẫu",
        type: "RESORT",
        approvalStatus: "APPROVED",
        rejectionReason: null,
        phone: "0987654321",
        email: "partner.vtripplanner@example.com",
      },
    });
  }

  if (authorization.access.applicationUserId === "mock-user-id") {
    return NextResponse.json({
      authenticated: true,
      applicationUserId: "mock-user-id",
      roles: ["USER"],
      email: "user.vtripplanner@example.com",
      profile: {
        fullName: "Người Dùng Thử Nghiệm",
        displayName: "Du Khách VTrip",
        phone: "0912345678",
        dateOfBirth: "1998-10-20",
        city: "TP. Hồ Chí Minh",
        bio: "Đam mê khám phá các điểm đến Việt Nam",
        avatarUrl: null,
      },
      partner: null,
    });
  }

  let user: any = null;
  try {
    user = await prisma.user.findUnique({
      where: { id: authorization.access.applicationUserId },
      select: {
        id: true,
        email: true,
        profile: {
          select: {
            fullName: true,
            displayName: true,
            phone: true,
            dateOfBirth: true,
            city: true,
            bio: true,
            avatarUrl: true,
          },
        },
        ownedPartner: {
          select: {
            id: true,
            name: true,
            type: true,
            approvalStatus: true,
            rejectionReason: true,
            phone: true,
            email: true,
          },
        },
      },
    });
  } catch (err) {
    console.warn("access/me prisma user query error:", err);
  }

  return NextResponse.json({
    authenticated: true,
    applicationUserId: authorization.access.applicationUserId,
    roles: authorization.access.roles,
    email: user?.email ?? authorization.access.authUser.email,
    profile: user?.profile ?? null,
    partner: user?.ownedPartner ?? null,
  });
}