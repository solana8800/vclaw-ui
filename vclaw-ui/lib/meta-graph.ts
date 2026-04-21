const GRAPH = "https://graph.facebook.com/v21.0";

export type MetaPageAccount = { id: string; name: string; access_token?: string };

export async function exchangeMetaCodeForShortLivedToken(params: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
}): Promise<{ access_token: string; expires_in?: number }> {
  const u = new URL(`${GRAPH}/oauth/access_token`);
  u.searchParams.set("client_id", params.clientId);
  u.searchParams.set("client_secret", params.clientSecret);
  u.searchParams.set("redirect_uri", params.redirectUri);
  u.searchParams.set("code", params.code);
  const res = await fetch(u.toString(), { cache: "no-store" });
  const json = (await res.json()) as { access_token?: string; expires_in?: number; error?: { message?: string } };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error?.message ?? "meta_code_exchange_failed");
  }
  return { access_token: json.access_token, expires_in: json.expires_in };
}

export async function exchangeMetaShortForLongLivedToken(params: {
  clientId: string;
  clientSecret: string;
  shortLivedUserToken: string;
}): Promise<{ access_token: string; expires_in?: number }> {
  const u = new URL(`${GRAPH}/oauth/access_token`);
  u.searchParams.set("grant_type", "fb_exchange_token");
  u.searchParams.set("client_id", params.clientId);
  u.searchParams.set("client_secret", params.clientSecret);
  u.searchParams.set("fb_exchange_token", params.shortLivedUserToken);
  const res = await fetch(u.toString(), { cache: "no-store" });
  const json = (await res.json()) as { access_token?: string; expires_in?: number; error?: { message?: string } };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error?.message ?? "meta_long_lived_exchange_failed");
  }
  return { access_token: json.access_token, expires_in: json.expires_in };
}

export async function fetchMetaMe(userAccessToken: string): Promise<{ id: string; name: string }> {
  const u = new URL(`${GRAPH}/me`);
  u.searchParams.set("fields", "id,name");
  u.searchParams.set("access_token", userAccessToken);
  const res = await fetch(u.toString(), { cache: "no-store" });
  const json = (await res.json()) as { id?: string; name?: string; error?: { message?: string } };
  if (!res.ok || !json.id) {
    throw new Error(json.error?.message ?? "meta_me_failed");
  }
  return { id: json.id, name: json.name ?? json.id };
}

export async function fetchMetaManagedPages(userAccessToken: string): Promise<MetaPageAccount[]> {
  const u = new URL(`${GRAPH}/me/accounts`);
  u.searchParams.set("fields", "id,name,access_token");
  u.searchParams.set("access_token", userAccessToken);
  const res = await fetch(u.toString(), { cache: "no-store" });
  const json = (await res.json()) as {
    data?: MetaPageAccount[];
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(json.error?.message ?? "meta_accounts_failed");
  }
  return Array.isArray(json.data) ? json.data : [];
}

/** Lưu server-only: kèm page access_token để sau này gọi Graph Page (không trả về client). */
export function metaProfileFullJson(me: { id: string; name: string }, pages: MetaPageAccount[]): string {
  return JSON.stringify({
    user: me,
    pages: pages.map((p) => ({
      id: p.id,
      name: p.name,
      access_token: p.access_token,
    })),
  });
}
