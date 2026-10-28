import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import {
  TripChecklistPhase,
  TripChecklistSource,
  TripChecklistItemStatus,
} from "@/generated/prisma/enums";

export const runtime = "nodejs";

const SEASONAL_PRESETS: Record<
  string,
  {
    title: string;
    items: Array<{ title: string; note?: string }>;
  }
> = {
  MUA_MUA: {
    title: "Checklist: Mùa mưa & ẩm ướt",
    items: [
      { title: "Áo mưa bộ cao cấp & bọc giày chống nước", note: "Ưu tiên áo mưa bộ thay vì áo mưa cánh dơi" },
      { title: "Bọc chống nước cho balo và điện thoại", note: "Túi zip hoặc bao cover chống nước" },
      { title: "Giày chống nước / dép có độ bám đường tốt", note: "Tránh trơn trượt trên địa hình ướt" },
      { title: "Thuốc cảm cúm, hạ sốt & xịt chống muỗi", note: "Mùa mưa muỗi và côn trùng nhiều" },
      { title: "Khăn giấy khô, khăn ướt & túi zip dự phòng", note: "Bảo quản giấy tờ tùy thân" },
      { title: "Quần áo chất liệu mau khô (dry-fit)", note: "Dễ khô trong thời tiết nồm ẩm" },
    ],
  },
  MUA_LANH: {
    title: "Checklist: Mùa đông & vùng núi cao",
    items: [
      { title: "Áo phao lông vũ / áo khoác cản gió chống rét", note: "Nên mặc theo phong cách nhiều lớp (layering)" },
      { title: "Khăn quàng cổ, mũ len & găng tay ấm", note: "Giữ ấm tai và các đầu ngón tay" },
      { title: "Miếng dán giữ nhiệt bỏ túi & dầu tràm", note: "Dán ở vùng lưng hoặc bàn chân" },
      { title: "Bình giữ nhiệt nước nóng", note: "Duy trì nước ấm khi di chuyển ngoài trời" },
      { title: "Kem dưỡng ẩm và son dưỡng chống nứt nẻ", note: "Khí hậu lạnh dễ làm khô da" },
      { title: "Thuốc ho, cảm lạnh & viên ngậm họng", note: "Dự phòng khi thời tiết thay đổi đột ngột" },
    ],
  },
  BIEN_HE: {
    title: "Checklist: Biển hè & đảo nhiệt đới",
    items: [
      { title: "Kem chống nắng SPF 50+ & kính râm chống tia UV", note: "Thoa lại sau mỗi 2-3 tiếng tắm biển" },
      { title: "Đồ bơi, khăn tắm kích thước lớn & kính bơi", note: "Chuẩn bị 2 bộ để thay phiên" },
      { title: "Mũ rộng vành / nón cản nắng", note: "Tránh say nắng khi hoạt động ngoài trời" },
      { title: "Túi chống nước điện thoại chụp ảnh dưới nước", note: "Kiểm tra độ kín nước trước khi dùng" },
      { title: "Dép đi biển chống bỏng cát / giày san hô", note: "Bảo vệ chân khi đi dạo bờ biển" },
      { title: "Gel lô hội làm dịu da cháy nắng", note: "Thoa ngay sau khi đi nắng về" },
    ],
  },
  PHUOT_XE_MAY: {
    title: "Checklist: Phượt xe máy đường dài",
    items: [
      { title: "Bộ dụng cụ sửa xe & vá xe không ruột mini", note: "Kèm bơm cầm tay hoặc bình khí CO2" },
      { title: "Găng tay bảo hộ xe máy & giáp bảo vệ tay chân", note: "An toàn tối đa khi di chuyển cung đường đèo" },
      { title: "Kính chống lóa đêm & khăn trùm Ninja chống bụi", note: "Giảm mỏi mắt khi chạy đường xa" },
      { title: "Bản đồ offline / giá đỡ điện thoại chắc chắn", note: "Tải trước bản đồ ngoại tuyến Google Maps" },
      { title: "Dây thun chằng hàng co giãn & áo phản quang", note: "Chằng ba lô cố định vào đuôi xe" },
      { title: "Bình xịt bôi trơn sên / xích & nhớt sơ cua", note: "Chăm sóc xích xe sau khi chạy mưa hoặc cát bụi" },
    ],
  },
};

function errorResponse(status: number, error: string, message: string) {
  return NextResponse.json({ ok: false, error, message }, { status });
}

export async function POST(request: Request): Promise<NextResponse> {
  const authUser = await getCurrentUser();
  if (!authUser) {
    return errorResponse(401, "AUTH_REQUIRED", "Vui lòng đăng nhập để thao tác checklist.");
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Dữ liệu gửi lên không hợp lệ.");
  }

  const { action, tripId, presetKey, checklistId, itemId, title, note } = body;

  if (!action) {
    return errorResponse(400, "ACTION_REQUIRED", "Thiếu tham số action.");
  }

  try {
    // 1. APPLY PRESET
    if (action === "APPLY_PRESET") {
      if (!tripId || !presetKey) {
        return errorResponse(400, "INVALID_PARAMS", "Thiếu tripId hoặc presetKey.");
      }

      const preset = SEASONAL_PRESETS[presetKey];
      if (!preset) {
        return errorResponse(400, "INVALID_PRESET", "Bộ checklist theo mùa không tồn tại.");
      }

      // Check ownership
      const trip = await prisma.trip.findFirst({
        where: { id: tripId, ownerUserId: authUser.id, deletedAt: null },
      });
      if (!trip) {
        return errorResponse(404, "TRIP_NOT_FOUND", "Không tìm thấy chuyến đi.");
      }

      // Create or reuse checklist
      let checklist = await prisma.tripChecklist.findFirst({
        where: { tripId, title: preset.title },
      });

      if (!checklist) {
        const lastChecklist = await prisma.tripChecklist.findFirst({
          where: { tripId },
          orderBy: { sortOrder: "desc" },
        });

        checklist = await prisma.tripChecklist.create({
          data: {
            tripId,
            title: preset.title,
            phase: TripChecklistPhase.BEFORE_TRIP,
            source: TripChecklistSource.AI,
            sortOrder: (lastChecklist?.sortOrder ?? 0) + 1,
          },
        });
      }

      // Insert items that don't exist yet
      for (let i = 0; i < preset.items.length; i++) {
        const itemDef = preset.items[i];
        const existing = await prisma.tripChecklistItem.findFirst({
          where: { checklistId: checklist.id, title: itemDef.title },
        });

        if (!existing) {
          await prisma.tripChecklistItem.create({
            data: {
              checklistId: checklist.id,
              title: itemDef.title,
              note: itemDef.note || null,
              status: TripChecklistItemStatus.TODO,
              sortOrder: i,
            },
          });
        }
      }

      // Return updated checklist with items
      const updatedChecklist = await prisma.tripChecklist.findUnique({
        where: { id: checklist.id },
        include: {
          items: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
        },
      });

      return NextResponse.json({ ok: true, checklist: updatedChecklist });
    }

    // 2. ADD ITEM
    if (action === "ADD_ITEM") {
      if (!tripId || !title?.trim()) {
        return errorResponse(400, "INVALID_PARAMS", "Thiếu tripId hoặc tiêu đề việc cần chuẩn bị.");
      }

      const trip = await prisma.trip.findFirst({
        where: { id: tripId, ownerUserId: authUser.id, deletedAt: null },
      });
      if (!trip) {
        return errorResponse(404, "TRIP_NOT_FOUND", "Không tìm thấy chuyến đi.");
      }

      let targetChecklistId = checklistId;
      if (!targetChecklistId) {
        let firstChecklist = await prisma.tripChecklist.findFirst({
          where: { tripId },
          orderBy: { sortOrder: "asc" },
        });

        if (!firstChecklist) {
          firstChecklist = await prisma.tripChecklist.create({
            data: {
              tripId,
              title: "Hành lý & Chuẩn bị cá nhân",
              phase: TripChecklistPhase.BEFORE_TRIP,
              source: TripChecklistSource.USER,
              sortOrder: 0,
            },
          });
        }
        targetChecklistId = firstChecklist.id;
      }

      const lastItem = await prisma.tripChecklistItem.findFirst({
        where: { checklistId: targetChecklistId },
        orderBy: { sortOrder: "desc" },
      });

      const newItem = await prisma.tripChecklistItem.create({
        data: {
          checklistId: targetChecklistId,
          title: title.trim(),
          note: note?.trim() || null,
          status: TripChecklistItemStatus.TODO,
          sortOrder: (lastItem?.sortOrder ?? 0) + 1,
        },
      });

      return NextResponse.json({ ok: true, item: newItem });
    }

    // 3. TOGGLE ITEM
    if (action === "TOGGLE_ITEM") {
      if (!itemId) {
        return errorResponse(400, "ITEM_ID_REQUIRED", "Thiếu itemId.");
      }

      const item = await prisma.tripChecklistItem.findUnique({
        where: { id: itemId },
        include: { checklist: { include: { trip: true } } },
      });

      if (!item || item.checklist.trip.ownerUserId !== authUser.id) {
        return errorResponse(404, "ITEM_NOT_FOUND", "Không tìm thấy mục checklist.");
      }

      const isCompleted = item.status === TripChecklistItemStatus.COMPLETED;
      const newStatus = isCompleted ? TripChecklistItemStatus.TODO : TripChecklistItemStatus.COMPLETED;

      const updated = await prisma.tripChecklistItem.update({
        where: { id: itemId },
        data: {
          status: newStatus,
          completedAt: newStatus === TripChecklistItemStatus.COMPLETED ? new Date() : null,
        },
      });

      return NextResponse.json({ ok: true, item: updated });
    }

    // 4. DELETE ITEM
    if (action === "DELETE_ITEM") {
      if (!itemId) {
        return errorResponse(400, "ITEM_ID_REQUIRED", "Thiếu itemId.");
      }

      const item = await prisma.tripChecklistItem.findUnique({
        where: { id: itemId },
        include: { checklist: { include: { trip: true } } },
      });

      if (!item || item.checklist.trip.ownerUserId !== authUser.id) {
        return errorResponse(404, "ITEM_NOT_FOUND", "Không tìm thấy mục checklist.");
      }

      await prisma.tripChecklistItem.delete({
        where: { id: itemId },
      });

      return NextResponse.json({ ok: true, itemId });
    }

    return errorResponse(400, "UNKNOWN_ACTION", `Hành động '${action}' không được hỗ trợ.`);
  } catch (error) {
    console.error("Checklist operation failed:", error);
    return errorResponse(500, "CHECKLIST_FAILED", "Không thể cập nhật danh sách chuẩn bị.");
  }
}
