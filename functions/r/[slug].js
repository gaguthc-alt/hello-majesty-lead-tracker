// Cloudflare Pages Function: TikTok-safe creator referral landing page
// Example: https://app.hello-majesty.com/r/aca-tiktok
function page(title, message, target = "") {
  const safeTarget = target.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const action = safeTarget
    ? `<a class="cta" href="${safeTarget}" rel="noopener noreferrer">LANJUTKAN KE WHATSAPP</a>
       <p class="hint">Jika WhatsApp belum terbuka, tekan tombol di atas sekali lagi atau pilih buka melalui browser.</p>`
    : `<p class="hint">Silakan coba kembali beberapa saat lagi.</p>`;
  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#111827">
<title>${title} — Hello Majesty</title>
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#f6f7f9;color:#111827;font-family:Arial,Helvetica,sans-serif}
main{width:100%;max-width:430px;text-align:center;background:#fff;padding:36px 24px;border-radius:22px;box-shadow:0 12px 40px rgba(17,24,39,.08)}
.logo{font-size:13px;font-weight:800;letter-spacing:2px;color:#6b7280;margin-bottom:28px}
.mark{width:58px;height:58px;margin:0 auto 20px;border-radius:18px;background:#e8f8ef;color:#16834a;display:grid;place-items:center;font-size:29px}
h1{font-size:24px;line-height:1.25;margin:0 0 12px}p{font-size:15px;line-height:1.6;color:#606775;margin:0}
.cta{display:block;margin:26px 0 14px;padding:17px 16px;border-radius:13px;background:#16834a;color:white;text-decoration:none;font-size:16px;font-weight:800;letter-spacing:.2px}
.cta:active{opacity:.85}.hint{font-size:13px;color:#7b8190}
.footer{margin-top:30px;font-size:11px;color:#9aa1ad;letter-spacing:1px}
</style>
</head>
<body><main>
<div class="logo">HELLO MAJESTY</div>
<div class="mark">✓</div>
<h1>${title}</h1>
<p>${message}</p>
${action}
<div class="footer">BUILT ON TRUST</div>
</main></body></html>`;
}

export async function onRequest(context) {
  const requestUrl = new URL(context.request.url);
  const slug = requestUrl.pathname.split("/").filter(Boolean).at(-1)?.trim().toLowerCase() || "";
  if (!/^[a-z0-9-]{2,80}$/.test(slug)) {
    return new Response(page("Tautan tidak valid", "Tautan promosi ini tidak dikenali."), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
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
    const location = response.headers.get("Location");
    if (response.status >= 300 && response.status < 400 && location) {
      const destination = new URL(location);
      // Only allow the expected WhatsApp destination; never turn this route into an open redirect.
      if (destination.protocol !== "https:" || destination.hostname !== "wa.me") {
        return new Response(page("Tautan belum siap", "Tujuan WhatsApp belum dapat diverifikasi."), {
          status: 502,
          headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
        });
      }
      return new Response(page("Hubungi Hello Majesty", "Tekan tombol berikut untuk melanjutkan percakapan melalui WhatsApp." , destination.toString()), {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
      });
    }
    const status = response.status === 404 ? 404 : 502;
    return new Response(page("Tautan tidak tersedia", "Tautan ini mungkin sudah tidak aktif atau sedang mengalami gangguan."), {
      status,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch {
    return new Response(page("Koneksi belum tersedia", "Periksa koneksi internet Anda, lalu coba buka tautan ini kembali."), {
      status: 502,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
}
