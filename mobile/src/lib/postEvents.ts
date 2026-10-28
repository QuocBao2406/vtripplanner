import { useEffect, type Dispatch, type SetStateAction } from "react";

import type { SocialFeedItem } from "../services/api";

/**
 * Kênh sự kiện dùng chung cho bài viết. Khi một màn hình thay đổi bài
 * (thả cảm xúc, lưu, sửa, xóa, đếm bình luận), mọi danh sách đang mở như
 * Bảng tin, Bài viết của tôi, Đã lưu đều nhận được và cập nhật theo.
 */
export type PostEvent =
  | { kind: "patch"; postId: string; patch: Partial<SocialFeedItem> }
  | { kind: "remove"; postId: string };

type Listener = (event: PostEvent) => void;

const listeners = new Set<Listener>();

export function emitPostPatch(postId: string, patch: Partial<SocialFeedItem>): void {
  listeners.forEach((listener) => listener({ kind: "patch", postId, patch }));
}

export function emitPostRemoved(postId: string): void {
  listeners.forEach((listener) => listener({ kind: "remove", postId }));
}

export function applyPostEvent(posts: SocialFeedItem[], event: PostEvent): SocialFeedItem[] {
  if (event.kind === "remove") {
    return posts.some((p) => p.id === event.postId) ? posts.filter((p) => p.id !== event.postId) : posts;
  }
  if (!posts.some((p) => p.id === event.postId)) return posts;
  return posts.map((p) => (p.id === event.postId ? { ...p, ...event.patch } : p));
}

/** Gắn một danh sách bài viết (state của màn hình) vào kênh sự kiện. */
export function useSyncedPosts(setPosts: Dispatch<SetStateAction<SocialFeedItem[]>>): void {
  useEffect(() => {
    const listener: Listener = (event) => setPosts((prev) => applyPostEvent(prev, event));
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [setPosts]);
}
