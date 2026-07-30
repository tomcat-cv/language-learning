type AccessConfig = {
  username?: string;
  password?: string;
  allowUnauthenticated: boolean;
};

export type AccessDecision = "allow" | "unauthorized" | "misconfigured";

function safeEqual(left: string, right: string) {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;

  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }

  return difference === 0;
}

function parseBasicCredentials(header: string | null) {
  if (!header?.startsWith("Basic ")) {
    return null;
  }

  try {
    const decoded = atob(header.slice(6));
    const separator = decoded.indexOf(":");
    if (separator < 0) {
      return null;
    }
    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

export function decidePersonalAccess(
  authorization: string | null,
  config: AccessConfig,
): AccessDecision {
  if (!config.username && !config.password) {
    return config.allowUnauthenticated ? "allow" : "misconfigured";
  }
  if (!config.username || !config.password) {
    return "misconfigured";
  }

  const credentials = parseBasicCredentials(authorization);
  if (
    !credentials ||
    !safeEqual(credentials.username, config.username) ||
    !safeEqual(credentials.password, config.password)
  ) {
    return "unauthorized";
  }

  return "allow";
}

function runtimeAccessConfig(): AccessConfig {
  return {
    username: process.env.HIBI_ACCESS_USERNAME,
    password: process.env.HIBI_ACCESS_PASSWORD,
    allowUnauthenticated:
      process.env.NODE_ENV !== "production" ||
      process.env.HIBI_ALLOW_UNAUTHENTICATED === "true",
  };
}

function accessResponse(request: Request, decision: AccessDecision) {
  const isApi = new URL(request.url).pathname.startsWith("/api/");
  const misconfigured = decision === "misconfigured";
  const status = misconfigured ? 503 : 401;
  const message = misconfigured
    ? "生产环境尚未配置个人访问口令。"
    : "需要有效的个人访问口令。";
  const headers = new Headers({
    "cache-control": "no-store",
    "content-type": isApi
      ? "application/json; charset=utf-8"
      : "text/plain; charset=utf-8",
  });

  if (!misconfigured) {
    headers.set("www-authenticate", 'Basic realm="Hibi", charset="UTF-8"');
  }

  return new Response(
    isApi ? JSON.stringify({ error: message, code: "ACCESS_DENIED" }) : message,
    { status, headers },
  );
}

export function enforcePersonalAccess(request: Request) {
  const decision = decidePersonalAccess(
    request.headers.get("authorization"),
    runtimeAccessConfig(),
  );
  return decision === "allow" ? null : accessResponse(request, decision);
}
