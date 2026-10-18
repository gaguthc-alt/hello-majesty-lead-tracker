(() => {
  "use strict";

  // Passive sidebar-only diagnostic. No network calls, no lead writes, no MutationObserver.
  // Scans at a low frequency and only while the user has enabled monitoring in the panel.
  const PANEL_ID = "hm-wa-detection-panel";
  const PHONE_RE = /(?:\\+?62|0)[\\s().-]*8(?:[\\s().-]*\\d){7,12}/;
  let timer = null;
  let enabled = false;
  let lastSummary = "";

  function normalizePhone(value) {
    let digits = (value || "").replace(/\\D/g, "");
    if (digits.startsWith("0")) digits = "62" + digits.slice(1);
    if (digits.startsWith("8")) digits = "62" + digits;
    return digits.length >= 10 && digits.length <= 15 ? "+" + digits : "";
  }

  function getPanel() { return document.getElementById(PANEL_ID); }
  function setText(id, value) {
    const panel = getPanel();
    const el = panel && panel.querySelector("#" + id);
    if (el) el.textContent = value;
  }

  function scanSidebar() {
    if (!enabled || !document.body) return;
    const sidebar = document.querySelector('#pane-side')
      || document.querySelector('[data-testid="chat-list"]')
      || document.querySelector('[aria-label*="Chat list"]');
    if (!sidebar) {
      setText("hm-wa-state", "Daftar chat belum ditemukan.");
      return;
    }

    // Only inspect a small number of visible chat rows in the sidebar.
    const rows = [...sidebar.querySelectorAll('[role="listitem"], [data-testid="cell-frame-container"]')]
      .filter(el => el.getClientRects().length)
      .slice(0, 12);
    const chats = [];
    for (const row of rows) {
      const text = (row.innerText || "").trim().replace(/\\s+/g, " ").slice(0, 220);
      if (!text) continue;
      const match = text.match(PHONE_RE);
      chats.push({
        label: text.slice(0, 90),
        phone: match ? normalizePhone(match[0]) : ""
      });
    }
    const summary = JSON.stringify(chats);
    if (summary !== lastSummary) {
      lastSummary = summary;
      window.__HM_WA_PASSIVE_SNAPSHOT = {
        detectedAt: new Date().toISOString(),
        mode: "passive-sidebar-only",
        rowsInspected: chats.length,
        chats
      };
      setText("hm-wa-state", "Pemantauan aktif: daftar chat diperiksa secara ringan.");
      setText("hm-wa-phone", "Nomor hanya terbaca jika ditampilkan di daftar chat.");
      setText("hm-wa-cs", "Identitas CS belum dinilai dari chat yang belum dibuka.");
      setText("hm-wa-reply", chats.length ? chats.map(c => c.label).slice(0, 5).join(" | ") : "Belum ada baris chat terbaca.");
      setText("hm-wa-result", chats.length
        ? "Perubahan daftar chat terdeteksi. Tidak ada lead dibuat."
        : "Belum ada percakapan yang bisa dibaca.");
    }
  }

  function stopMonitoring() {
    enabled = false;
    if (timer) clearInterval(timer);
    timer = null;
    const btn = getPanel()?.querySelector("#hm-wa-toggle");
    if (btn) btn.textContent = "Mulai pemantauan";
    setText("hm-wa-state", "Pemantauan nonaktif.");
    setText("hm-wa-result", "Mode pasif: tidak ada lead dibuat.");
  }

  function startMonitoring() {
    enabled = true;
    if (timer) clearInterval(timer);
    scanSidebar();
    timer = setInterval(scanSidebar, 10000);
    const btn = getPanel()?.querySelector("#hm-wa-toggle");
    if (btn) btn.textContent = "Hentikan pemantauan";
    setText("hm-wa-state", "Pemantauan aktif; pemeriksaan setiap 10 detik.");
  }

  function ensurePanel() {
    let panel = getPanel();
    if (panel) return panel;
    panel = document.createElement("section");
    panel.id = PANEL_ID;
    panel.style.cssText = "position:fixed;z-index:2147483647;right:16px;bottom:16px;width:330px;max-width:calc(100vw - 32px);background:#102a43;color:#fff;border:1px solid #486581;border-radius:12px;padding:14px;font:13px/1.45 Arial,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.3)";
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><strong style="font-size:14px">Hello Majesty · WA Test</strong><button id="hm-wa-close" type="button" style="background:transparent;color:#fff;border:0;font-size:18px;cursor:pointer">×</button></div>
      <div style="margin:8px 0;color:#9fb3c8;font-size:11px">PEMANTAUAN PASIF · TIDAK MEMBUAT LEAD</div>
      <div id="hm-wa-state">Pemantauan belum dimulai.</div>
      <div style="margin-top:8px"><b>Nomor customer</b><div id="hm-wa-phone">Belum diperiksa</div></div>
      <div style="margin-top:8px"><b>CS terdeteksi</b><div id="hm-wa-cs">Belum diperiksa</div></div>
      <div style="margin-top:8px"><b>Ringkasan daftar chat</b><div id="hm-wa-reply" style="max-height:90px;overflow:auto;color:#d9e2ec">Belum diperiksa</div></div>
      <div id="hm-wa-result" style="margin-top:10px;padding:8px;background:#243b53;border-radius:8px">Tidak ada pemindaian otomatis.</div>
      <button id="hm-wa-toggle" type="button" style="margin-top:10px;width:100%;padding:8px;background:#38a169;color:white;border:0;border-radius:7px;cursor:pointer">Mulai pemantauan</button>
      <button id="hm-wa-copy" type="button" style="margin-top:7px;width:100%;padding:8px;background:#486581;color:white;border:0;border-radius:7px;cursor:pointer">Salin hasil pemantauan</button>
      <div style="margin-top:7px;color:#9fb3c8;font-size:10px">Hanya memeriksa 12 baris daftar chat tiap 10 detik. Data tidak dikirim ke server. Hentikan jika WhatsApp melambat.</div>`;
    document.body.appendChild(panel);
    panel.querySelector("#hm-wa-close").addEventListener("click", stopAndRemove);
    panel.querySelector("#hm-wa-toggle").addEventListener("click", () => enabled ? stopMonitoring() : startMonitoring());
    panel.querySelector("#hm-wa-copy").addEventListener("click", async () => {
      const payload = JSON.stringify(window.__HM_WA_PASSIVE_SNAPSHOT || {
        detectedAt: new Date().toISOString(),
        mode: "passive-sidebar-only",
        note: "Belum ada hasil; mulai pemantauan terlebih dahulu."
      }, null, 2);
      try {
        await navigator.clipboard.writeText(payload);
        setText("hm-wa-result", "Hasil disalin. Tempelkan di percakapan ini.");
      } catch { setText("hm-wa-result", payload); }
    });
    return panel;
  }

  function stopAndRemove() {
    stopMonitoring();
    getPanel()?.remove();
  }

  function start() {
    if (!document.body || getPanel()) return;
    ensurePanel();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
  window.addEventListener("pagehide", stopMonitoring, { once: true });
})();