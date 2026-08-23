"use client";

const COOKIE_NAME = "prenota_active_restaurant";

export function getActiveRestaurantId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setActiveRestaurantId(id: string) {
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(id)}; path=/; max-age=31536000; SameSite=Lax`;
}
