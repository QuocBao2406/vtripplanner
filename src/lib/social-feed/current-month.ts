/** Tháng hiện tại (1-12) theo múi giờ Việt Nam, dùng để xếp hạng bài theo mùa. */
export function getVietnamCurrentMonth(): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      month: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date()),
  );
}

/** Trả về tháng hợp lệ từ query, nếu thiếu hoặc sai thì dùng tháng hiện tại ở Việt Nam. */
export function resolveFeedMonth(rawValue: string | null): number {
  const month = Number(rawValue);

  return Number.isInteger(month) && month >= 1 && month <= 12
    ? month
    : getVietnamCurrentMonth();
}
