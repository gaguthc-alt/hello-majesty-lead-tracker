// Cloudflare Pages Function: clean public creator referral URL
// Example: https://app.hello-majesty.com/r/rizky-tiktok
export async function onRequest({ params }) {
  const slug = String(params?.slug || "").trim().toLowerCase();
  if (!/^[a-z0-9-]{2,80}$/.test(slug)) {
    return new Response("Link referral tidak valid.", { status: 404 });
  }

  const target = new URL("https://ksowzhhmzrumyciehuyv.supabase.co/functions/v1/creator-link");
  target.searchParams.set("slug", slug);

  try {
    const response = await fetch(target.toString(), {
      method: "GET",
      redirect: "manual",
      headers: { "Accept": "text/plain, */*" },
    });
    return new Response(response.body, {
      status: response.status,
      headers: {
        "Location": response.headers.get("Location") || "",
        "Cache-Control": "no-store",
        "Content-Type": response.headers.get("Content-Type") || "text/plain; charset=utf-8",
      },
    });
  } catch {
    return new Response("Link referral sementara tidak tersedia. Silakan coba kembali.", {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
