import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Chuẩn hoá chuỗi để lọc/tìm: bỏ dấu kết hợp, chữ thường — "Nguyễn" khớp "nguyen".
 */
export function foldLocaleSearchString(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .trim();
}
