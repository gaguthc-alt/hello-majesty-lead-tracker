// Cloudflare Pages Function: clean public creator referral URL
// Example: https://app.hello-majesty.com/r/aca-tiktok
export async function onRequest(context) {
  const requestUrl = new URL(context.request.url);
  // Read the slug from the URL path directly; this also works if Pages
  // does not populate the dynamic params object for this route.
  const slug = requestUrl.pathname.split("/").filter(Boolean).at(-1)?.trim().toLowerCase() || "";
  if (!/^[a-z0-9-]{2,80}$/.test(slug)) {
    return new Response("Link referral tidak valid.", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const target = new URL("https://ksowzhhmzrumyciehuyv.supabase.co/functions/v1/creator-link");
  target.searchParams.set("slug", slug);

  try {
    const response = await fetch(target.toString(), {
      method: "GET",
      redirect: "manual",
      headers: { "Accept": "text/plain, */*" },
    });
    const headers = new Headers();
    headers.set("Cache-Control", "no-store");
    const location = response.headers.get("Location");
    if (location) headers.set("Location", location);
    headers.set("Content-Type", response.headers.get("Content-Type") || "text/plain; charset=utf-8");
    return new Response(response.body, { status: response.status, headers });
  } catch {
    return new Response("Link referral sementara tidak tersedia. Silakan coba kembali.", {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
