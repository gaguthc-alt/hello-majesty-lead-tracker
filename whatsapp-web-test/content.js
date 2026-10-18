(() => {
  "use strict";

  // Local-only diagnostic. This extension never sends data to a server and never writes leads.
  const PANEL_ID = "hm-wa-detection-panel";
  const PHONE_RE = /(?:\+?62|0)[\s().-]*8(?:[\s().-]*\d){7,12}/;
  const CS_RE = /\b(?:dengan|saya|aku)\s+([A-Z][a-zA-ZÀ-ÿ.'-]{1,24})\b/i;
  let lastSnapshot = "";
  let observerStarted = false;

  const normalizePhone = (value) => {
    if (!value) return "";
    let digits = value.replace(/\D/g, "");
    if (digits.startsWith("0")) digits = "62" + digits.slice(1);
    if (digits.startsWith("8")) digits = "62" + digits;
    return digits.length >= 10 && digits.length <= 15 ? "+" + digits : "";
  };

  function activeChatHeader() {
    const selectors = [
      '[data-testid="conversation-info-header"]',
      '[data-testid="conversation-header"]',
      'header'
    ];
    for (const selector of selectors) {
      const nodes = [...document.querySelectorAll(selector)];
      for (const node of nodes.reverse()) {
        const rect = node.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.top < 300) {
          const text = (node.innerText || "").trim();
          if (text) return { node, text };
        }
      }
    }
    return { node: null, text: "" };
  }

  function findPhone(header) {
    const titleValues = [];
    if (header.node) {
      titleValues.push(header.node.innerText || "");
      for (const el of header.node.querySelectorAll("[title], [aria-label]")) {
        titleValues.push(el.getAttribute("title") || "");
        titleValues.push(el.getAttribute("aria-label") || "");
      }
    }
    titleValues.push(header.text || "");
    for (const value of titleValues) {
      const match = value.match(PHONE_RE);
      if (match) {
        const phone = normalizePhone(match[0]);
        if (phone) return phone;
      }
    }
    return "";
  }

  function latestOutgoingText() {
    const candidates = [
      '[data-testid="msg-container"]',
      '[data-testid="conversation-panel-messages"] [data-testid="msg-container"]',
      'div.message-out'
    ];
    let nodes = [];
    for (const selector of candidates) {
      nodes = [...document.querySelectorAll(selector)].filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      if (nodes.length) break;
    }
    // Fallback to common WhatsApp Web outgoing bubble markers.
    if (!nodes.length) {
      nodes = [...document.querySelectorAll('[class*="message-out"]')].filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
    }
    for (const node of nodes.reverse().slice(0, 15)) {
      const text = (node.innerText || "").trim();
      if (!text) continue;
      const match = text.match(/(?:dengan|saya|aku)\s+([A-Z][a-zA-ZÀ-ÿ.'-]{1,24})/i);
      if (match) return { text: text.slice(0, 240), csName: match[1] };
    }
    return { text: "", csName: "" };
  }

  function ensurePanel() {
    let panel = document.getElementById(PANEL_ID);
    if (panel) return panel;
    panel = document.createElement("section");
    panel.id = PANEL_ID;
    panel.style.cssText = [
      "position:fixed", "z-index:2147483647", "right:16px", "bottom:16px",
      "width:320px", "max-width:calc(100vw - 32px)", "background:#102a43",
      "color:#fff", "border:1px solid #486581", "border-radius:12px",
      "padding:14px", "font:13px/1.45 Arial,sans-serif",
      "box-shadow:0 8px 28px rgba(0,0,0,.3)"
    ].join(";");
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <strong style="font-size:14px">Hello Majesty · WA Test</strong>
        <button id="hm-wa-close" type="button" style="background:transparent;color:#fff;border:0;font-size:18px;cursor:pointer">×</button>
      </div>
      <div style="margin:8px 0;color:#9fb3c8;font-size:11px">MODE DETEKSI LOKAL · TIDAK MEMBUAT LEAD</div>
      <div id="hm-wa-state">Menunggu chat aktif…</div>
      <div style="margin-top:8px"><b>Nomor customer</b><div id="hm-wa-phone" style="overflow-wrap:anywhere">Belum terdeteksi</div></div>
      <div style="margin-top:8px"><b>CS terdeteksi</b><div id="hm-wa-cs">Belum terdeteksi</div></div>
      <div style="margin-top:8px"><b>Contoh balasan CS</b><div id="hm-wa-reply" style="max-height:58px;overflow:auto;color:#d9e2ec">Belum ditemukan</div></div>
      <div id="hm-wa-result" style="margin-top:10px;padding:8px;background:#243b53;border-radius:8px">Belum lengkap: perlu nomor customer + nama CS.</div>
      <button id="hm-wa-copy" type="button" style="margin-top:10px;width:100%;padding:8px;background:#38a169;color:white;border:0;border-radius:7px;cursor:pointer">Salin hasil deteksi</button>
      <div style="margin-top:7px;color:#9fb3c8;font-size:10px">Data tidak dikirim ke mana pun. Uji coba ini hanya membaca tampilan chat yang sedang terbuka.</div>
    `;
    document.body.appendChild(panel);
    panel.querySelector("#hm-wa-close").addEventListener("click", () => panel.remove());
    panel.querySelector("#hm-wa-copy").addEventListener("click", async () => {
      const snapshot = window.__HM_WA_TEST_SNAPSHOT || {};
      const payload = JSON.stringify(snapshot, null, 2);
      try {
        await navigator.clipboard.writeText(payload);
        panel.querySelector("#hm-wa-result").textContent = "Hasil deteksi disalin. Tempelkan di chat ini untuk diperiksa.";
      } catch {
        panel.querySelector("#hm-wa-result").textContent = payload;
      }
    });
    return panel;
  }

  function scan() {
    if (!document.body) return;
    const panel = ensurePanel();
    if (!document.getElementById(PANEL_ID)) return;
    const header = activeChatHeader();
    const phone = findPhone(header);
    const outgoing = latestOutgoingText();
    const snapshot = {
      detectedAt: new Date().toISOString(),
      phone,
      csName: outgoing.csName || "",
      reply: outgoing.text || "",
      headerText: (header.text || "").slice(0, 120),
      mode: "local-detection-only"
    };
    window.__HM_WA_TEST_SNAPSHOT = snapshot;
    panel.querySelector("#hm-wa-state").textContent = header.text ? "Chat aktif terdeteksi" : "Pilih satu chat customer";
    panel.querySelector("#hm-wa-phone").textContent = phone || "Belum terdeteksi — nomor mungkin tersimpan sebagai nama kontak";
    panel.querySelector("#hm-wa-cs").textContent = outgoing.csName || "Belum terdeteksi";
    panel.querySelector("#hm-wa-reply").textContent = outgoing.text || "Kirim balasan tes seperti: Ya kak, dengan Kadek ada yang bisa dibantu.";
    const complete = Boolean(phone && outgoing.csName);
    panel.querySelector("#hm-wa-result").textContent = complete
      ? "TERDETEKSI: nomor customer + nama CS. Belum ada lead yang dibuat."
      : "Belum lengkap: perlu nomor customer + nama CS pada chat aktif.";
    const signature = JSON.stringify({ phone, csName: outgoing.csName, reply: outgoing.text, header: header.text });
    if (signature !== lastSnapshot) {
      lastSnapshot = signature;
      try { chrome.storage.local.set({ hmWhatsAppDetectionTest: snapshot }); } catch (_) {}
    }
  }

  function start() {
    if (observerStarted) return;
    observerStarted = true;
    scan();
    const observer = new MutationObserver(() => scan());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    // WhatsApp virtualizes chat views; a low-frequency fallback catches header/chat changes.
    setInterval(scan, 1800);
  }

  const ready = () => {
    if (document.body) start();
    else setTimeout(ready, 250);
  };
  ready();
})();
