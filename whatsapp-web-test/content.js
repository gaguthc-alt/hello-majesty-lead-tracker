(() => {
  "use strict";

  // Safe, manual-only local diagnostic. No timers, MutationObserver, network calls, or lead writes.
  const PANEL_ID = "hm-wa-detection-panel";
  const PHONE_RE = /(?:\+?62|0)[\s().-]*8(?:[\s().-]*\d){7,12}/;

  function normalizePhone(value) {
    let digits = (value || "").replace(/\D/g, "");
    if (digits.startsWith("0")) digits = "62" + digits.slice(1);
    if (digits.startsWith("8")) digits = "62" + digits;
    return digits.length >= 10 && digits.length <= 15 ? "+" + digits : "";
  }

  function ensurePanel() {
    let panel = document.getElementById(PANEL_ID);
    if (panel) return panel;
    panel = document.createElement("section");
    panel.id = PANEL_ID;
    panel.style.cssText = "position:fixed;z-index:2147483647;right:16px;bottom:16px;width:320px;max-width:calc(100vw - 32px);background:#102a43;color:#fff;border:1px solid #486581;border-radius:12px;padding:14px;font:13px/1.45 Arial,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.3)";
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><strong style="font-size:14px">Hello Majesty · WA Test</strong><button id="hm-wa-close" type="button" style="background:transparent;color:#fff;border:0;font-size:18px;cursor:pointer">×</button></div>
      <div style="margin:8px 0;color:#9fb3c8;font-size:11px">MODE MANUAL · TIDAK MEMBUAT LEAD</div>
      <div id="hm-wa-state">Klik tombol untuk memeriksa chat aktif.</div>
      <div style="margin-top:8px"><b>Nomor customer</b><div id="hm-wa-phone">Belum diperiksa</div></div>
      <div style="margin-top:8px"><b>CS terdeteksi</b><div id="hm-wa-cs">Belum diperiksa</div></div>
      <div style="margin-top:8px"><b>Contoh balasan CS</b><div id="hm-wa-reply" style="max-height:58px;overflow:auto;color:#d9e2ec">Belum diperiksa</div></div>
      <div id="hm-wa-result" style="margin-top:10px;padding:8px;background:#243b53;border-radius:8px">Tidak ada pemindaian otomatis.</div>
      <button id="hm-wa-scan" type="button" style="margin-top:10px;width:100%;padding:8px;background:#38a169;color:white;border:0;border-radius:7px;cursor:pointer">Periksa chat sekarang</button>
      <button id="hm-wa-copy" type="button" style="margin-top:7px;width:100%;padding:8px;background:#486581;color:white;border:0;border-radius:7px;cursor:pointer">Salin hasil deteksi</button>
      <div style="margin-top:7px;color:#9fb3c8;font-size:10px">Pemindaian hanya berjalan saat tombol ditekan. Data tidak dikirim ke server.</div>`;
    document.body.appendChild(panel);
    panel.querySelector("#hm-wa-close").addEventListener("click", () => panel.remove());
    panel.querySelector("#hm-wa-scan").addEventListener("click", scanOnce);
    panel.querySelector("#hm-wa-copy").addEventListener("click", async () => {
      const payload = JSON.stringify(window.__HM_WA_TEST_SNAPSHOT || { mode: "manual-only", note: "Belum ada hasil pemindaian" }, null, 2);
      try {
        await navigator.clipboard.writeText(payload);
        panel.querySelector("#hm-wa-result").textContent = "Hasil disalin. Tempelkan di chat ini untuk diperiksa.";
      } catch {
        panel.querySelector("#hm-wa-result").textContent = payload;
      }
    });
    return panel;
  }

  function scanOnce() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    // Query only likely header nodes, not the full page text or message history.
    const header = document.querySelector('[data-testid="conversation-info-header"]')
      || document.querySelector('[data-testid="conversation-header"]')
      || document.querySelector('#main header')
      || document.querySelector('[role="main"] header');
    const headerText = header ? (header.innerText || "").slice(0, 180) : "";
    let phone = "";
    // WhatsApp may show the number in the open contact-info pane, not in the chat header.
    // Read only visible contact-info areas and their small text nodes; do not scan all page text.
    const contactInfo = document.querySelector('[data-testid="contact-info-drawer"]')
      || document.querySelector('[data-testid="drawer-right"]')
      || document.querySelector('[role="dialog"]')
      || document.querySelector('div[aria-label="Info kontak"]');
    const searchRoots = [contactInfo, header].filter(Boolean);
    for (const root of searchRoots) {
      const values = [root.innerText || ""];
      for (const el of root.querySelectorAll("[title], [aria-label]")) {
        values.push(el.getAttribute("title") || "", el.getAttribute("aria-label") || "");
      }
      for (const value of values) {
        const match = value.match(PHONE_RE);
        if (match) { phone = normalizePhone(match[0]); if (phone) break; }
      }
      if (phone) break;
    }

    // Inspect only a small number of visible outgoing bubbles.
    const messageRoot = document.querySelector('[data-testid="conversation-panel-messages"]')
      || document.querySelector('#main');
    const nodes = messageRoot
      ? [...messageRoot.querySelectorAll('[data-testid="msg-container"], .message-out')].slice(-12)
      : [];
    let reply = "", csName = "";
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      if (!node.getClientRects().length) continue;
      const text = (node.innerText || "").trim().slice(0, 240);
      const match = text.match(/(?:dengan|saya|aku)\s+([A-Z][a-zA-ZÀ-ÿ.'-]{1,24})/i);
      if (match) { reply = text; csName = match[1]; break; }
    }

    const snapshot = { detectedAt: new Date().toISOString(), phone, csName, reply, headerText, mode: "manual-local-only" };
    window.__HM_WA_TEST_SNAPSHOT = snapshot;
    panel.querySelector("#hm-wa-state").textContent = headerText ? "Header chat ditemukan" : "Header chat belum ditemukan";
    panel.querySelector("#hm-wa-phone").textContent = phone || "Belum terdeteksi; nomor mungkin tersimpan sebagai nama kontak";
    panel.querySelector("#hm-wa-cs").textContent = csName || "Belum terdeteksi";
    panel.querySelector("#hm-wa-reply").textContent = reply || "Belum ditemukan";
    panel.querySelector("#hm-wa-result").textContent = phone && csName
      ? "Nomor + CS terdeteksi. Belum ada lead yang dibuat."
      : "Belum lengkap. Periksa chat aktif dan coba lagi.";
  }

  function start() {
    if (!document.body || document.getElementById(PANEL_ID)) return;
    ensurePanel();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();