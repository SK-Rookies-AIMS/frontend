const TOKEN_KEYS = ["accessToken", "token", "authToken", "auth_token", "
  -accessToken"];
const JSON_TOKEN_KEYS = ["auth", "user", "login", "session", "authState"];

function pickToken(value) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  const nestedToken =
    value.accessToken ??
    value.token ??
    value.authToken ??
    value.data?.accessToken ??
    value.data?.token;

  return typeof nestedToken === "string" ? nestedToken.trim() : "";
}

function readStorageToken(storage) {
  if (!storage) {
    return "";
  }

  for (const key of TOKEN_KEYS) {
    const token = pickToken(storage.getItem(key));
    if (token) {
      return token;
    }
  }

  for (const key of JSON_TOKEN_KEYS) {
    const rawValue = storage.getItem(key);

    if (!rawValue) {
      continue;
    }

    try {
      const token = pickToken(JSON.parse(rawValue));
      if (token) {
        return token;
      }
    } catch {
      continue;
    }
  }

  return "";
}

export function getStoredAccessToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    readStorageToken(window.localStorage) ||
    readStorageToken(window.sessionStorage) ||
    ""
  );
}