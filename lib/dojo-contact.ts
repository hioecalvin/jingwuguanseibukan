export type DojoContact = {
  dojo_id: string; class_id: string; dojo_name: string; class_name: string;
  active: boolean; can_manage: boolean; version: number;
  contact_name: string | null; contact_phone: string | null;
  instagram_username: string | null; address: string | null; maps_url: string | null;
};

// Keep the same URL boundary as the database; reject credentials, ports,
// encoded hosts, lookalike domains and non-Maps paths before rendering links.
export function safeGoogleMapsUrl(value: string | null) {
  if (!value || value.length > 2048 || [...value].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) || /[\s\\]/.test(value)) return null;
  if (/\/(?:\.|%2e){1,2}(?:[/?#]|$)/i.test(value)) return null;
  return /^https:\/\/(?:(?:www\.)?google\.com\/maps(?:[/?#][^\s\\]*)?|maps\.google\.com\/(?:maps(?:[/?#][^\s\\]*)?|[?#][^\s\\]*)?|maps\.app\.goo\.gl\/[A-Za-z0-9_-]+(?:\?[^\s\\]*)?|goo\.gl\/maps\/[A-Za-z0-9_-]+(?:\?[^\s\\]*)?)$/.test(value) ? value : null;
}

export function dojoPhoneLink(value: string | null) {
  if (!value || !/^\+?[0-9 ()-]{3,32}$/.test(value)) return null;
  const digits = value.replace(/[^0-9]/g, "");
  return digits.length >= 3 ? `tel:${value.startsWith("+") ? "+" : ""}${digits}` : null;
}

export function instructorWhatsAppLink(value: string | null) {
  const raw = value?.trim();
  if (!raw || !/^\+?[0-9 ()-]+$/.test(raw)) return null;
  let digits = raw.replace(/[^0-9]/g, "");
  if (digits.startsWith("00") && !raw.startsWith("+")) digits = digits.slice(2);
  else if (digits.startsWith("08") && !raw.startsWith("+")) digits = "62" + digits.slice(1);
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  return `https://wa.me/${digits}`;
}
