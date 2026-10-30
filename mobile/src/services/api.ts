import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL, resolveMediaUrl } from "../constants/theme";
import { supabase } from "../lib/supabase";

export const LOCAL_AUTH_STORAGE_KEY = "vtripplanner_local_auth";

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
    if (data?.session?.access_token) {
      return {
        Authorization: `Bearer ${data.session.access_token}`,
      };
    }

    let localRaw: string | null = null;
    if (Platform.OS === "web") {
      localRaw = typeof localStorage !== "undefined" ? localStorage.getItem(LOCAL_AUTH_STORAGE_KEY) : null;
    } else {
      localRaw = await SecureStore.getItemAsync(LOCAL_AUTH_STORAGE_KEY);
    }

    if (localRaw) {
      const parsed = JSON.parse(localRaw);
      if (parsed?.token) {
        return {
          Authorization: `Bearer ${parsed.token}`,
        };
      }
    }
  } catch (error) {
    console.warn("Failed to get auth session:", error);
  }
  return {};
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs: number = 4000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, {
      ...init,
      signal: init?.signal || controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export type UserRoleType = "USER" | "PARTNER" | "ADMIN";

export type UserProfileData = {
  fullName: string | null;
  displayName: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  city: string | null;
  bio: string | null;
  avatarUrl: string | null;
};

export type PartnerData = {
  id: string;
  name: string;
  type: string;
  approvalStatus: "NOT_APPLIED" | "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  rejectionReason: string | null;
  phone: string | null;
  email: string | null;
};

export type MyAccessResponse = {
  authenticated: boolean;
  applicationUserId: string;
  roles: UserRoleType[];
  email: string | null;
  profile: UserProfileData | null;
  partner: PartnerData | null;
};

export type TripTransportMode = "MOTORBIKE" | "CAR" | "COACH";

export type TripPlanningRequest = {
  origin: string;
  destination: string;
  startDate: string;
  departureTime: string;
  transportMode: TripTransportMode;
  duration: number;
  travelerCount: number;
  totalBudget: number;
  interests: string[];
};

export type SocialReactionType = "LIKE" | "LOVE" | "WOW";

export type SocialFeedMedia = {
  id: string;
  type: "IMAGE" | "VIDEO";
  url: string | null;
  mimeType?: string | null;
  altText?: string | null;
  sortOrder?: number;
};

export type SocialFeedItem = {
  id: string;
  type: string;
  headline: string | null;
  caption: string | null;
  publishedAt: string;
  sourceName: string;
  sourceAvatarUrl: string | null;
  coverImageUrl: string | null;
  coverImageAlt?: string;
  places: Array<{
    id: string;
    name: string;
    provinceName: string;
    isPrimary?: boolean;
  }>;
  reactionCount: number;
  commentCount: number;
  viewerReaction: SocialReactionType | null;
  viewerSaved: boolean;
  viewerCanManage?: boolean;
  isSystemPost?: boolean;
  authorRole?: string;
  media?: SocialFeedMedia[];
  seasonMonths?: number[];
};

export type TripExpenseCategoryType =
  | "TRANSPORTATION"
  | "ACCOMMODATION"
  | "FOOD"
  | "TICKET"
  | "ACTIVITY"
  | "SHOPPING"
  | "HEALTH"
  | "EMERGENCY"
  | "OTHER";

export type TripExpenseItem = {
  id: string;
  tripId: string;
  title: string;
  category: TripExpenseCategoryType | string;
  scope?: string;
  actualAmount: number;
  estimatedAmount?: number | null;
  occurredAt?: string | null;
  note?: string | null;
  createdAt?: string;
};

export type TripChecklistItem = {
  id: string;
  checklistId: string;
  title: string;
  note?: string | null;
  status: "TODO" | "COMPLETED" | "SKIPPED";
  dueAt?: string | null;
  sortOrder: number;
  completedAt?: string | null;
};

export type TripChecklistDetail = {
  id: string;
  tripId: string;
  title: string;
  phase: "BEFORE_TRIP" | "DURING_TRIP" | "AFTER_TRIP";
  source: "DEFAULT" | "AI" | "USER";
  sortOrder: number;
  items: TripChecklistItem[];
};

export type TripBudgetInfo = {
  plannedAmount: number;
  contingencyAmount: number;
  currency: string;
};

export type SavedTripItem = {
  id: string;
  title: string;
  status: string;
  startDate: string;
  endDate: string;
  originName: string;
  destinationName: string;
  departureAt: string;
  estimatedArrivalAt: string | null;
  estimatedTravelDistanceKm: number | null;
  estimatedTravelDurationMinutes: number | null;
  travelerCount: number;
  totalBudget: number;
  estimatedTotalCost: number;
  currency: string;
  createdAt: string;
  days?: Array<{
    id: string;
    dayNumber: number;
    date: string;
    activities: Array<{
      id: string;
      title: string;
      type: string;
      startsAt: string;
      endsAt: string;
      place?: {
        id: string;
        name: string;
      } | null;
    }>;
  }>;
  checklists?: Array<{
    id: string;
    title: string;
    items: Array<{
      id: string;
      title: string;
      status: string;
    }>;
  }>;
  expenseEntries?: Array<{
    id: string;
    category: string;
    actualAmount: number;
    estimatedAmount: number | null;
  }>;
  managedBudget?: TripBudgetInfo | null;
};

export type TripDetail = {
  id: string;
  title: string;
  status: string;
  startDate: string;
  endDate: string;
  originName: string;
  destinationName: string;
  departureAt: string;
  estimatedArrivalAt: string | null;
  estimatedTravelDistanceKm: number | null;
  estimatedTravelDurationMinutes: number | null;
  travelerCount: number;
  totalBudget: number;
  estimatedTotalCost: number;
  currency: string;
  createdAt: string;
  notes?: string | null;
  days: Array<{
    id: string;
    dayNumber: number;
    date: string;
    activities: Array<{
      id: string;
      title: string;
      type: string;
      startsAt: string;
      endsAt: string;
      place?: {
        id: string;
        name: string;
        addressLine: string;
        latitude?: number | null;
        longitude?: number | null;
        images?: Array<{ storagePath: string }>;
      } | null;
    }>;
  }>;
  checklists: TripChecklistDetail[];
  expenseEntries: TripExpenseItem[];
  managedBudget?: TripBudgetInfo | null;
};

export type PlaceCardItem = {
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
  isVerified?: boolean;
};

export type PlaceImageItem = {
  id: string;
  url: string | null;
  caption?: string | null;
  altText?: string | null;
  isCover: boolean;
};

export type PlacePriceItem = {
  id: string;
  label: string;
  audience: string;
  unit: string;
  amount: number;
  currency: string;
  validFrom?: string | null;
  validUntil?: string | null;
};

export type PlaceOpeningHourItem = {
  id: string;
  dayOfWeek: string;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
  isOpen24Hours: boolean;
  note?: string | null;
};

export type PlaceReviewItem = {
  id: string;
  rating: number;
  content: string | null;
  createdAt: string;
  author: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
};

export type PlaceDetailItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  addressLine: string;
  ward: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  websiteUrl: string | null;
  bestVisitMonths: number[];
  seasonNote: string | null;
  provinceName: string;
  provinceSlug: string;
  districtName: string | null;
  categoryName: string;
  categorySlug: string;
  averageRating: number | null;
  reviewCount: number;
  coverImageUrl: string | null;
  images: PlaceImageItem[];
  prices: PlacePriceItem[];
  openingHours: PlaceOpeningHourItem[];
  reviews: PlaceReviewItem[];
};

export type PlaceFilterOptions = {
  provinces: Array<{ name: string; slug: string }>;
  categories: Array<{ name: string; slug: string }>;
};

export type PlacesResponse = {
  ok: boolean;
  places: PlaceCardItem[];
  total: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  filterOptions: PlaceFilterOptions;
};

export type PromotionVoucherItem = {
  id: string;
  title: string;
  description: string;
  terms: string | null;
  discountType: "PERCENT" | "FIXED_AMOUNT";
  discountValue: number;
  maxDiscountAmount: number | null;
  minimumSpend: number | null;
  startAt: string;
  endAt: string;
  partnerName: string;
  partnerLogoUrl: string | null;
  places: Array<{
    id: string;
    name: string;
    provinceName: string;
  }>;
  myClaim: {
    id: string;
    code: string;
    status: string;
    claimedAt: string;
    expiresAt: string;
  } | null;
};

export type SocialComment = {
  id: string;
  postId?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  authorName?: string;
  authorAvatarUrl?: string | null;
  isOwner?: boolean;
  viewerCanManage?: boolean;
  author?: {
    id?: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  };
};

export const api = {
  // --- Account & Access ---
  async register(payload: { email: string; password: string; fullName: string }) {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/account/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.message || "Đăng ký không thành công.");
    }
    return data;
  },

  async getMyAccess(): Promise<MyAccessResponse> {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/access/me`, {
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      return {
        authenticated: false,
        applicationUserId: "",
        roles: ["USER"],
        email: null,
        profile: null,
        partner: null,
      };
    }
    return res.json();
  },

  async updateProfile(payload: {
    fullName?: string;
    displayName?: string;
    phone?: string;
    dateOfBirth?: string;
    city?: string;
    bio?: string;
  }) {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/account/profile`, {
      method: "PATCH",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Không thể cập nhật hồ sơ.");
    }
    return res.json();
  },

  // --- Partner Management ---
  async getPartnerApplication() {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/partner/application`, {
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) return null;
    return res.json();
  },

  async submitPartnerApplication(payload: {
    name: string;
    type: string;
    description: string;
    phone: string;
    email: string;
    websiteUrl?: string;
    taxCode?: string;
    businessLicenseUrl?: string;
  }) {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/partner/application`, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Không thể gửi hồ sơ đối tác.");
    }
    return res.json();
  },

  async getPartnerPlaces() {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/partner/places`, {
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) return { places: [] };
    return res.json();
  },

  async getPartnerPromotions() {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/partner/promotions`, {
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) return { promotions: [] };
    return res.json();
  },

  // --- Admin Management ---
  async getAdminPartners() {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/admin/partners`, {
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) return { partners: [] };
    return res.json();
  },

  async reviewAdminPartner(partnerId: string, decision: "APPROVE" | "REJECT", rejectionReason?: string) {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/admin/partners/review`, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ partnerId, decision, rejectionReason }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Không thể duyệt đối tác.");
    }
    return res.json();
  },

  // --- Social Feed & Posts ---
  async createPost(formData: FormData) {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/social/posts`, {
      method: "POST",
      headers: {
        ...authHeaders,
      },
      body: formData,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.message || "Không thể đăng bài viết.");
    }
    return data;
  },

  /**
   * Lấy một trang bảng tin. Truyền `month` để xếp hạng giống hệt web; nếu bỏ
   * trống, server dùng tháng hiện tại theo giờ Việt Nam.
   */
  async getFeed(cursor?: string, month?: number): Promise<{
    posts: SocialFeedItem[];
    nextCursor: string | null;
    hasMore: boolean;
    currentMonth: number | null;
    snapshotAt: string | null;
  }> {
    const authHeaders = await getAuthHeader();
    const url = new URL(`${API_BASE_URL}/api/social/feed`);
    if (cursor) url.searchParams.set("cursor", cursor);
    if (month) url.searchParams.set("month", String(month));

    const res = await fetchWithTimeout(url.toString(), {
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) throw new Error("Không thể tải bảng tin du lịch.");
    const data = await res.json();
    return {
      posts: data.posts || [],
      nextCursor: data.nextCursor || null,
      hasMore: Boolean(data.hasMore),
      currentMonth: Number(data.currentMonth) || null,
      snapshotAt: typeof data.snapshotAt === "string" ? data.snapshotAt : null,
    };
  },

  /** Hỏi server có bài mới đăng sau mốc `snapshotAt` hay không (giống web). */
  async checkFeedUpdates(month: number, snapshotAt: string): Promise<boolean> {
    const authHeaders = await getAuthHeader();
    const url = new URL(`${API_BASE_URL}/api/social/feed/updates`);
    url.searchParams.set("month", String(month));
    url.searchParams.set("snapshotAt", snapshotAt);

    const res = await fetchWithTimeout(url.toString(), { headers: { ...authHeaders } });
    if (!res.ok) return false;
    const data = await res.json().catch(() => ({}));
    return Boolean(data.ok && data.hasNewPosts);
  },

  /**
   * Đặt reaction cho bài viết. Truyền `null` để gỡ reaction hiện tại.
   */
  async setReaction(
    postId: string,
    type: SocialReactionType | null
  ): Promise<{ reactionType: SocialReactionType | null; reactionCount: number }> {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/social/reactions`, {
      method: type ? "POST" : "DELETE",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(type ? { postId, type } : { postId }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.message || "Không thể thả cảm xúc.");
    }
    return {
      reactionType: data.reactionType ?? null,
      reactionCount: Number(data.reactionCount) || 0,
    };
  },

  async setSaved(postId: string, saved: boolean): Promise<{ saved: boolean }> {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/social/saves`, {
      method: saved ? "POST" : "DELETE",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ postId }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.message || (saved ? "Không thể lưu bài viết." : "Không thể bỏ lưu bài viết."));
    }
    return { saved: Boolean(data.saved) };
  },

  async getMyPosts(): Promise<SocialFeedItem[]> {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/social/posts/mine`, {
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
    }, 8000);

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.message || "Không thể tải bài viết của bạn.");
    }
    return data.posts || [];
  },

  async getSavedPosts(): Promise<SocialFeedItem[]> {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/social/saves`, {
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
    }, 8000);

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.message || "Không thể tải bài viết đã lưu.");
    }
    return data.posts || [];
  },

  async updatePostCaption(postId: string, caption: string): Promise<{ caption: string }> {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/social/posts/manage`, {
      method: "PATCH",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ postId, caption }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.message || "Không thể chỉnh sửa bài viết.");
    }
    return { caption: data.post?.caption ?? caption };
  },

  async deletePost(postId: string): Promise<{ ok: boolean }> {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/social/posts/manage`, {
      method: "DELETE",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ postId }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.message || "Không thể xóa bài viết.");
    }
    return { ok: true };
  },

  // --- Social Comments ---
  async getComments(postId: string): Promise<{
    comments: SocialComment[];
    count: number;
    hasMore: boolean;
  }> {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/api/social/comments?postId=${encodeURIComponent(postId)}`,
      {
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) throw new Error("Không thể tải bình luận.");
    const data = await res.json();
    return {
      comments: data.comments || [],
      count: data.count || 0,
      hasMore: Boolean(data.hasMore),
    };
  },

  async addComment(
    postId: string,
    content: string
  ): Promise<{ ok: boolean; comment: SocialComment }> {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/social/comments`, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ postId, content }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Không thể gửi bình luận.");
    }
    return res.json();
  },

  async deleteComment(commentId: string): Promise<{ ok: boolean }> {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/social/comments`, {
      method: "DELETE",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ commentId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Không thể xóa bình luận.");
    }
    return res.json();
  },

  // --- Trip Planner & Manage ---
  async getProvinces(): Promise<Array<{ id: string; name: string; slug: string }>> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/trip-planner/provinces`);
    if (!res.ok) return [];
    return res.json();
  },

  async generatePlan(payload: TripPlanningRequest) {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/trip-planner/plan`, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Không thể tạo lịch trình.");
    }
    return res.json();
  },

  async saveTrip(payload: any) {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/trip-planner/save`, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Không thể lưu chuyến đi.");
    }
    return res.json();
  },

  async getMyTrips(): Promise<SavedTripItem[]> {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/trips/manage`, {
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.trips || [];
  },

  async getTripDetail(tripId: string): Promise<TripDetail | null> {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/api/trips/manage?tripId=${encodeURIComponent(tripId)}`,
      {
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    return data.trip || null;
  },

  async updateTripStatus(tripId: string, status: string): Promise<{ ok: boolean }> {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/trips/manage`, {
      method: "PATCH",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tripId, status }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Không thể cập nhật trạng thái chuyến đi.");
    }
    return res.json();
  },

  async updateTripTitle(tripId: string, title: string): Promise<{ ok: boolean }> {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/trips/manage`, {
      method: "PATCH",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tripId, title }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Không thể đổi tên chuyến đi.");
    }
    return res.json();
  },

  async deleteTrip(tripId: string): Promise<{ ok: boolean }> {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/trips/manage`, {
      method: "DELETE",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tripId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Không thể xóa chuyến đi.");
    }
    return res.json();
  },

  // --- Checklists ---
  async applySeasonalChecklist(
    tripId: string,
    presetKey: string
  ): Promise<{ ok: boolean; checklist: TripChecklistDetail }> {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/trips/manage/checklists`, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "APPLY_PRESET", tripId, presetKey }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Không thể áp dụng checklist theo mùa.");
    }
    return res.json();
  },

  async toggleChecklistItem(itemId: string): Promise<{ ok: boolean; item: TripChecklistItem }> {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/trips/manage/checklists`, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "TOGGLE_ITEM", itemId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Không thể đổi trạng thái việc cần làm.");
    }
    return res.json();
  },

  async addChecklistItem(
    tripId: string,
    title: string,
    note?: string,
    checklistId?: string
  ): Promise<{ ok: boolean; item: TripChecklistItem }> {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/trips/manage/checklists`, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "ADD_ITEM", tripId, title, note, checklistId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Không thể thêm đồ dùng mới.");
    }
    return res.json();
  },

  async deleteChecklistItem(itemId: string): Promise<{ ok: boolean }> {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/trips/manage/checklists`, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "DELETE_ITEM", itemId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Không thể xóa mục checklist.");
    }
    return res.json();
  },

  // --- Expenses ---
  async addTripExpense(payload: {
    tripId: string;
    title: string;
    category: string;
    actualAmount: number;
    estimatedAmount?: number;
    occurredAt?: string;
    note?: string;
    plannedBudget?: number;
  }): Promise<{ ok: boolean; expense?: TripExpenseItem; message?: string }> {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/trips/manage/expenses`, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Không thể ghi nhận khoản chi.");
    }
    return res.json();
  },

  async deleteTripExpense(expenseId: string): Promise<{ ok: boolean }> {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/api/trips/manage/expenses?expenseId=${encodeURIComponent(expenseId)}`,
      {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Không thể xóa khoản chi.");
    }
    return res.json();
  },

  // --- Share Trip to Feed ---
  async shareTripToFeed(
    tripId: string,
    headline?: string,
    caption?: string
  ): Promise<{ ok: boolean; post?: any; message?: string }> {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/trips/manage/share-to-feed`, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tripId, headline, caption }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Không thể chia sẻ chuyến đi lên cộng đồng.");
    }
    return res.json();
  },

  // --- Vouchers & Promotions ---
  async getVouchers(): Promise<PromotionVoucherItem[]> {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/vouchers`, {
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.promotions || [];
  },

  async claimVoucher(promotionId: string) {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/vouchers/claim`, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ promotionId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Không thể lưu voucher.");
    }
    return res.json();
  },

  // --- Shared Trips ---
  async getSharedTrip(token: string) {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/trips/share/${token}`);
    if (!res.ok) {
      return {
        id: token,
        title: "Hành trình Du lịch Khám phá",
        origin: "TP. Hồ Chí Minh",
        destination: "Đà Lạt",
      };
    }
    return res.json();
  },

  async claimSharedTrip(token: string) {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/trips/share/${token}/claim`, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      return { success: true };
    }
    return res.json();
  },

  // --- Places (Khám Phá Địa Điểm) ---
  async getPlaces(filters?: {
    query?: string;
    province?: string;
    category?: string;
    month?: number;
    page?: number;
    pageSize?: number;
  }): Promise<PlacesResponse> {
    const params = new URLSearchParams();
    if (filters?.query) params.set("q", filters.query);
    if (filters?.province && filters.province !== "all") params.set("province", filters.province);
    if (filters?.category && filters.category !== "all") params.set("category", filters.category);
    if (filters?.month) params.set("month", filters.month.toString());
    if (filters?.page) params.set("page", filters.page.toString());
    if (filters?.pageSize) params.set("pageSize", filters.pageSize.toString());

    const qs = params.toString();
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/places${qs ? `?${qs}` : ""}`);
    if (!res.ok) {
      throw new Error("Không thể tải danh sách địa điểm.");
    }
    return res.json();
  },

  async getPlaceDetail(placeIdOrSlug: string): Promise<PlaceDetailItem | null> {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/api/places?id=${encodeURIComponent(placeIdOrSlug)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.place || null;
  },
};
