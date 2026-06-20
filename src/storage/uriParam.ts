// SAF content-URI dùng làm route param.
// content-URI tự nó đã percent-encoded (%3A, %2F, %E1%BB%91...). Nếu đưa qua
// encodeURIComponent rồi để React Router tự decode + decode tay nữa → double-decode
// làm hỏng URI. Dùng base64url (chỉ A-Za-z0-9-_ ) nên router KHÔNG đụng tới, round-trip an toàn.

export function encodeUriParam(uri: string): string {
  const bytes = new TextEncoder().encode(uri);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeUriParam(param: string): string {
  const b64 = param.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
