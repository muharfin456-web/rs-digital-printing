/**
 * app.js — Logika halaman customer
 * Katalog → Request Desain → Dummy QRIS → Simpan Transaksi → WhatsApp
 */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const state = {
    activeCategory: "Semua",
    selectedPortfolio: null,
    draftOrder: null,
    transaction: null,
  };

  /* ------------------------------------------------------------------ */
  /* QR simulator (deterministik dari ID transaksi)                     */
  /* ------------------------------------------------------------------ */

  function hashSeed(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i += 1) {
      h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    }
    return h >>> 0;
  }

  function makeRandom(seed) {
    let s = seed || 1;
    return () => {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      return (s >>> 0) / 4294967296;
    };
  }

  function finderModule(r, c, br, bc) {
    const rr = r - br;
    const cc = c - bc;
    if (rr >= -1 && rr <= 7 && cc >= -1 && cc <= 7) {
      if (rr < 0 || rr > 6 || cc < 0 || cc > 6) return 0;
      if (rr === 0 || rr === 6 || cc === 0 || cc === 6) return 1;
      if (rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4) return 1;
      return 0;
    }
    return null;
  }

  function renderDummyQr(seedText) {
    const size = 25;
    const rand = makeRandom(hashSeed(seedText));
    const corners = [
      [0, 0],
      [0, size - 7],
      [size - 7, 0],
    ];
    let rects = "";

    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        let value = null;
        for (const [br, bc] of corners) {
          const found = finderModule(r, c, br, bc);
          if (found !== null) {
            value = found;
            break;
          }
        }
        if (value === null) {
          if (r === 6 || c === 6) value = (r + c) % 2 === 0 ? 1 : 0;
          else value = rand() > 0.52 ? 1 : 0;
        }
        if (value === 1) {
          rects += `<rect x="${c}" y="${r}" width="1" height="1"/>`;
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 27 27" role="img" aria-label="Dummy barcode QRIS">
      <rect x="-1" y="-1" width="27" height="27" fill="#ffffff"/>
      <g fill="#0f172a">${rects}</g>
    </svg>`;
  }

  /* ------------------------------------------------------------------ */
  /* Render katalog                                                      */
  /* ------------------------------------------------------------------ */

  function renderFilters() {
    const bar = $("filterBar");
    bar.innerHTML = RS_STORE.CATEGORIES.map((cat) => {
      const active = cat === state.activeCategory;
      return `<button type="button" role="tab" aria-selected="${active}"
        class="rs-filter-btn ${active ? "is-active" : ""}" data-category="${cat}">${cat}</button>`;
    }).join("");

    bar.querySelectorAll("[data-category]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.activeCategory = btn.dataset.category;
        renderFilters();
        renderPortfolios();
      });
    });
  }

  function renderPortfolios() {
    const grid = $("portfolioGrid");
    const all = RS_STORE.getPortfolios({ onlyActive: true });
    const list = state.activeCategory === "Semua"
      ? all
      : all.filter((p) => p.category === state.activeCategory);

    $("catalogCount").textContent = `${list.length} desain tersedia`;
    $("emptyState").classList.toggle("rs-hide", list.length > 0);

    grid.innerHTML = list.map((p) => `
      <article class="rs-card rs-portfolio-card rs-fade-up">
        <div class="relative overflow-hidden bg-slate-100">
          <img src="${p.image_url}" alt="Contoh desain ${RS_STORE.escapeHtml(p.title)}" loading="lazy" decoding="async" />
          <span class="absolute top-3 left-3 rs-sku bg-white/95 shadow-sm">${RS_STORE.escapeHtml(p.sku_code)}</span>
          <span class="absolute top-3 right-3 rounded-full bg-white/95 shadow-sm px-2.5 py-1 text-[10px] font-bold text-slate-700">${RS_STORE.escapeHtml(p.category)}</span>
        </div>
        <div class="p-5 flex flex-col flex-1">
          <h3 class="text-base font-extrabold text-slate-900 leading-snug">${RS_STORE.escapeHtml(p.title)}</h3>
          <p class="text-sm text-slate-600 mt-2 leading-relaxed line-clamp-2 flex-1">${RS_STORE.escapeHtml(p.description)}</p>
          <div class="flex items-end justify-between gap-3 mt-5 pt-4 border-t border-slate-100">
            <div>
              <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Mulai dari</div>
              <div class="font-extrabold text-slate-900">${RS_STORE.formatRupiah(p.base_price)}</div>
            </div>
            <button type="button" class="rs-btn rs-btn-primary rs-btn-sm" data-request="${p.portfolio_id}">
              Request Desain
            </button>
          </div>
        </div>
      </article>
    `).join("");

    grid.querySelectorAll("[data-request]").forEach((btn) => {
      btn.addEventListener("click", () => openOrderModal(btn.dataset.request));
    });
  }

  /* ------------------------------------------------------------------ */
  /* Modal helper                                                       */
  /* ------------------------------------------------------------------ */

  let lastFocused = null;

  function openModal(id) {
    lastFocused = document.activeElement;
    $(id).classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeModal(id) {
    $(id).classList.remove("is-open");
    if (!document.querySelector(".rs-modal-overlay.is-open")) {
      document.body.style.overflow = "";
    }
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  function bindModalClose(id) {
    const modal = $(id);
    modal.querySelectorAll(".modal-close").forEach((btn) => {
      btn.addEventListener("click", () => closeModal(id));
    });
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal(id);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Alur order                                                          */
  /* ------------------------------------------------------------------ */

  function openOrderModal(portfolioId) {
    const portfolio = RS_STORE.getPortfolioById(portfolioId);
    if (!portfolio) return;
    state.selectedPortfolio = portfolio;

    $("orderDesignPreview").innerHTML = `
      <img src="${portfolio.image_url}" alt="" class="w-16 h-16 rounded-xl object-cover bg-slate-100 shrink-0" />
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <span class="rs-sku">${RS_STORE.escapeHtml(portfolio.sku_code)}</span>
          <span class="text-[11px] font-semibold text-slate-500">${RS_STORE.escapeHtml(portfolio.category)}</span>
        </div>
        <div class="font-extrabold text-slate-900 truncate mt-1">${RS_STORE.escapeHtml(portfolio.title)}</div>
      </div>`;

    $("amount").value = portfolio.base_price;
    $("quantity").value = 1;
    $("priceHint").textContent = `Estimasi harga paket: ${RS_STORE.formatRupiah(portfolio.base_price)} — bisa disesuaikan.`;
    $("orderError").classList.add("rs-hide");
    openModal("orderModal");
  }

  function normalizeWa(input) {
    let digits = String(input).replace(/\D/g, "");
    if (digits.startsWith("0")) digits = "62" + digits.slice(1);
    else if (digits.startsWith("8")) digits = "62" + digits;
    return digits;
  }

  function handleOrderSubmit(event) {
    event.preventDefault();
    const errorBox = $("orderError");
    const wa = normalizeWa($("customerWa").value);

    if (!/^628\d{8,12}$/.test(wa)) {
      errorBox.textContent = "Nomor WhatsApp tidak valid. Gunakan format 08xxxxxxxxxx.";
      errorBox.classList.remove("rs-hide");
      $("customerWa").focus();
      return;
    }

    const name = $("customerName").value.trim();
    const qty = Math.max(1, Number($("quantity").value) || 1);
    const amount = Number($("amount").value) || 0;
    if (!name || amount < 1000) {
      errorBox.textContent = "Lengkapi nama dan nominal pembayaran minimal Rp 1.000.";
      errorBox.classList.remove("rs-hide");
      return;
    }

    state.draftOrder = {
      portfolio_id: state.selectedPortfolio.portfolio_id,
      sku_reference: state.selectedPortfolio.sku_code,
      design_title: state.selectedPortfolio.title,
      customer_name: name,
      customer_whatsapp: wa,
      quantity: qty,
      custom_notes: $("customNotes").value.trim() || "-",
      amount_paid: amount,
      transaction_id: RS_STORE.generateInvoiceId(),
    };

    event.target.reset();
    closeModal("orderModal");
    openPaymentModal();
  }

  function openPaymentModal() {
    const draft = state.draftOrder;
    $("payInvoice").textContent = draft.transaction_id;
    $("paySku").textContent = draft.sku_reference;
    $("payAmount").textContent = RS_STORE.formatRupiah(draft.amount_paid);
    $("qrCode").innerHTML = renderDummyQr(draft.transaction_id);
    openModal("paymentModal");
  }

  function handleConfirmPayment() {
    const tx = RS_STORE.createTransaction(state.draftOrder);
    state.transaction = tx;

    $("receiptBox").innerHTML = `
      <div class="flex justify-between gap-3"><span class="text-slate-500">ID Transaksi</span><span class="font-mono font-bold">${RS_STORE.escapeHtml(tx.transaction_id)}</span></div>
      <div class="flex justify-between gap-3"><span class="text-slate-500">Nama</span><span class="font-bold">${RS_STORE.escapeHtml(tx.customer_name)}</span></div>
      <div class="flex justify-between gap-3"><span class="text-slate-500">Referensi</span><span class="font-bold">${RS_STORE.escapeHtml(tx.sku_reference)}</span></div>
      <div class="flex justify-between gap-3"><span class="text-slate-500">Jumlah</span><span class="font-bold">${tx.quantity} pcs</span></div>
      <div class="flex justify-between gap-3 border-t border-slate-200 pt-2"><span class="text-slate-500">Total Dibayar</span><span class="font-extrabold text-green-600">${RS_STORE.formatRupiah(tx.amount_paid)}</span></div>
      <div class="flex justify-between gap-3"><span class="text-slate-500">Status</span><span class="font-bold text-green-600">LUNAS (Simulasi)</span></div>`;

    $("successWaBtn").href = RS_STORE.waUrl(RS_STORE.buildWaMessage(tx));
    closeModal("paymentModal");
    openModal("successModal");
  }

  /* ------------------------------------------------------------------ */
  /* Inisialisasi                                                        */
  /* ------------------------------------------------------------------ */

  function init() {
    $("year").textContent = new Date().getFullYear();

    const greeting = "Halo RS Digital Printing, saya ingin konsultasi desain & cetak.";
    const waLink = RS_STORE.waUrl(greeting);
    ["navWaBtn", "heroWaBtn", "contactWa", "ctaWaBtn", "floatWaBtn"].forEach((id) => {
      const el = $(id);
      if (el) el.href = waLink;
    });

    renderFilters();
    renderPortfolios();

    $("orderForm").addEventListener("submit", handleOrderSubmit);
    $("confirmPayBtn").addEventListener("click", handleConfirmPayment);
    $("closeSuccessBtn").addEventListener("click", () => closeModal("successModal"));

    ["orderModal", "paymentModal", "successModal"].forEach(bindModalClose);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        const open = document.querySelector(".rs-modal-overlay.is-open");
        if (open) closeModal(open.id);
      }
    });

    const menuBtn = $("menuBtn");
    menuBtn.addEventListener("click", () => {
      const menu = $("mobileMenu");
      const willShow = menu.classList.contains("rs-hide");
      menu.classList.toggle("rs-hide", !willShow);
      menuBtn.setAttribute("aria-expanded", String(willShow));
    });
    $("mobileMenu").querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        $("mobileMenu").classList.add("rs-hide");
        menuBtn.setAttribute("aria-expanded", "false");
      });
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
