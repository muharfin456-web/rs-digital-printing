/**
 * store.js — Lapisan data RS Digital Printing
 * -------------------------------------------
 * Saat ini memakai localStorage sebagai fallback (belum ada kredensial Firebase).
 * Struktur data sengaja dibuat identik dengan skema Firestore di PRD sehingga
 * mudah dipindahkan ke Firebase hanya dengan mengganti fungsi baca/tulis di bawah.
 */

const RS_STORE = (() => {
  "use strict";

  const WA_NUMBER = "0895616765522";
  const WA_INTERNATIONAL = "6285616765522";
  const KEYS = {
    portfolios: "rsdp_portfolios_v1",
    transactions: "rsdp_transactions_v1",
    session: "rsdp_admin_session_v1",
    credentials: "rsdp_admin_credentials_v1",
  };

  const CATEGORIES = ["Semua", "Logo", "Packaging", "Baju", "Lanyard", "Stiker", "Bros"];
  const SKU_PREFIX = {
    Logo: "LGO",
    Packaging: "PKG",
    Baju: "BJU",
    Lanyard: "LYD",
    Stiker: "STK",
    Bros: "BRS",
  };
  const ORDER_STATUS = ["BARU", "DESAIN", "CETAK", "SELESAI"];
  const ORDER_STATUS_LABEL = {
    BARU: "Menunggu Desain",
    DESAIN: "Proses Desain",
    CETAK: "Proses Cetak",
    SELESAI: "Selesai",
  };

  /* ------------------------------------------------------------------ */
  /* Utilitas                                                            */
  /* ------------------------------------------------------------------ */

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      console.warn("[RS Store] Gagal membaca", key, err);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error("[RS Store] Gagal menyimpan", key, err);
      return false;
    }
  }

  function pad(n, len = 3) {
    return String(n).padStart(len, "0");
  }

  function formatRupiah(value) {
    const num = Number(value) || 0;
    return "Rp " + num.toLocaleString("id-ID");
  }

  function formatDate(iso, withTime = true) {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    const date = d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    if (!withTime) return date;
    const time = d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${date}, ${time}`;
  }

  function escapeHtml(text) {
    return String(text ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  /* ------------------------------------------------------------------ */
  /* Placeholder gambar portofolio (SVG ringan, bisa diganti .webp asli) */
  /* ------------------------------------------------------------------ */

  // Foto dummy per desain (satu foto untuk setiap judul katalog)
  const PHOTO_FILES = {
    Logo: "assets/images/portfolio/logo-kopi-senja.jpg",
    Packaging: "assets/images/portfolio/sachet-kopi-premium.jpg",
    Baju: "assets/images/portfolio/kaos-komunitas.jpg",
    Lanyard: "assets/images/portfolio/lanyard-tissue-custom.jpg",
    Stiker: "assets/images/portfolio/stiker-label-produk.jpg",
    Bros: "assets/images/portfolio/bros-logo-sekolah.jpg",
  };

  const SEED_PHOTOS = {
    "pf-001": "assets/images/portfolio/logo-kopi-senja.jpg",
    "pf-002": "assets/images/portfolio/logo-patria-event.jpg",
    "pf-003": "assets/images/portfolio/box-hampers-lebaran.jpg",
    "pf-004": "assets/images/portfolio/sachet-kopi-premium.jpg",
    "pf-005": "assets/images/portfolio/kaos-komunitas.jpg",
    "pf-006": "assets/images/portfolio/hoodie-panitia-festival.jpg",
    "pf-007": "assets/images/portfolio/lanyard-tissue-custom.jpg",
    "pf-008": "assets/images/portfolio/lanyard-conference.jpg",
    "pf-009": "assets/images/portfolio/stiker-label-produk.jpg",
    "pf-010": "assets/images/portfolio/stiker-karakter-maskot.jpg",
    "pf-011": "assets/images/portfolio/bros-logo-sekolah.jpg",
    "pf-012": "assets/images/portfolio/bros-pin-acara.jpg",
  };

  function photoFor(category, portfolioId) {
    return (portfolioId && SEED_PHOTOS[portfolioId]) || PHOTO_FILES[category] || placeholderImage(category, category);
  }

  const PALETTE = {
    Logo: ["#1e3a8a", "#3b82f6"],
    Packaging: ["#7c2d12", "#f97316"],
    Baju: ["#312e81", "#818cf8"],
    Lanyard: ["#134e4a", "#14b8a6"],
    Stiker: ["#831843", "#ec4899"],
    Bros: ["#713f12", "#eab308"],
  };

  function placeholderImage(title, category) {
    const [dark, light] = PALETTE[category] || ["#0f172a", "#64748b"];
    const safeTitle = escapeHtml(title).slice(0, 28);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${dark}"/>
          <stop offset="1" stop-color="${light}"/>
        </linearGradient>
        <pattern id="p" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M0 32L32 0" stroke="#ffffff" stroke-opacity="0.07" stroke-width="8"/>
        </pattern>
      </defs>
      <rect width="640" height="480" fill="url(#g)"/>
      <rect width="640" height="480" fill="url(#p)"/>
      <circle cx="540" cy="70" r="110" fill="#ffffff" opacity="0.07"/>
      <circle cx="80" cy="420" r="140" fill="#ffffff" opacity="0.06"/>
      <text x="32" y="60" fill="#ffffff" opacity="0.75" font-family="Arial,sans-serif" font-size="22" letter-spacing="4">${escapeHtml(category.toUpperCase())}</text>
      <text x="32" y="250" fill="#ffffff" font-family="Arial,sans-serif" font-size="38" font-weight="bold">${safeTitle}</text>
      <text x="32" y="300" fill="#ffffff" opacity="0.8" font-family="Arial,sans-serif" font-size="20">RS Digital Printing</text>
      <rect x="32" y="330" width="120" height="5" rx="2" fill="#ffffff" opacity="0.9"/>
    </svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  /* ------------------------------------------------------------------ */
  /* Seed data                                                           */
  /* ------------------------------------------------------------------ */

  const SEED_PORTFOLIOS = [
    ["Logo Kopi Senja", "Logo", "Logo brand kafe dengan nuansa hangat, cocok untuk kemasan dan media sosial.", 450000],
    ["Logo Patria Event", "Logo", "Identitas visual acara komunitas dengan tipografi tebal dan mark ikonik.", 400000],
    ["Box Hampers Lebaran", "Packaging", "Hardbox premium dengan laminasi doff dan finishing emboss.", 850000],
    ["Sachet Kopi Premium", "Packaging", "Kemasan sachet flat bottom dengan desain ilustrasi biji kopi.", 650000],
    ["Kaos Komunitas", "Baju", "Kaos cotton combed 30s, sablon logo komunitas depan-belakang.", 120000],
    ["Hoodie Panitia Festival", "Baju", "Hoodie fleece dengan sablon boarding dan nama panitia di lengan.", 185000],
    ["Lanyard Tissue Custom", "Lanyard", "Lanyard polyester full print dengan kartu ID dan pengait logam.", 9500],
    ["Lanyard Conference", "Lanyard", "Lanyard starboard dengan cetak logo instansi dan QR undangan.", 12000],
    ["Stiker Label Produk", "Stiker", "Stiker vinyl waterproof, cetak full color, finishing glossy.", 85000],
    ["Stiker Karakter Maskot", "Stiker", "Stiker die-cut karakter maskot brand untuk kebutuhan promosi.", 65000],
    ["Bros Logo Sekolah", "Bros", "Bros akrilik custom bentuk logo sekolah dengan finishing mengkilap.", 15000],
    ["Bros Pin Acara", "Bros", "Pin logam enamel warna dengan kemasan kartu individual.", 22000],
  ];

  function seedPortfolios() {
    const now = new Date().toISOString();
    return SEED_PORTFOLIOS.map(([title, category, description, basePrice], index) => ({
      portfolio_id: `pf-${pad(index + 1, 3)}`,
      sku_code: `${SKU_PREFIX[category]}-${pad(index + 1, 3)}`,
      title,
      category,
      description,
      base_price: basePrice,
      image_url: photoFor(category, `pf-${pad(index + 1, 3)}`),
      is_active: true,
      created_at: now,
    }));
  }

  function ensureSeed() {
    if (!read(KEYS.portfolios, null)) write(KEYS.portfolios, seedPortfolios());

    // Migrasi: sample bawaan memakai foto dummy yang sesuai judulnya.
    // Foto hasil upload admin sengaja tidak ditimpa.
    const stored = read(KEYS.portfolios, []);
    let migrated = false;
    stored.forEach((item) => {
      if (!/^pf-0\d\d$/.test(item.portfolio_id)) return;
      const seed = SEED_PORTFOLIOS[Number(item.portfolio_id.slice(3)) - 1];
      if (!seed) return;
      const desired = photoFor(seed[1], item.portfolio_id);
      const isOldDefault =
        String(item.image_url).startsWith("data:image/svg+xml") ||
        item.image_url === PHOTO_FILES[seed[1]] ||
        /^assets\/images\/portfolio\/(logo|packaging|baju|lanyard|stiker|bros)\.jpg$/.test(item.image_url) ||
        item.image_url === "assets/images/portfolio/kaos-komunitas-kumintas.jpg";
      if (isOldDefault && item.image_url !== desired) {
        item.image_url = desired;
        migrated = true;
      }
      if (item.title === "Kaos Komunitas Run" || item.title === "Kaos Komunitas Kumintas") {
        item.title = seed[0];
        item.description = seed[2];
        migrated = true;
      }
    });
    if (migrated) write(KEYS.portfolios, stored);

    if (!read(KEYS.transactions, null)) write(KEYS.transactions, []);
    if (!read(KEYS.credentials, null)) {
      write(KEYS.credentials, {
        email: "admin@rsdigitalprinting.id",
        password: "rsadmin2026",
        name: "Admin RS Digital Printing",
        role: "Superadmin",
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Portofolio                                                          */
  /* ------------------------------------------------------------------ */

  function getPortfolios({ onlyActive = false } = {}) {
    ensureSeed();
    const list = read(KEYS.portfolios, []);
    return onlyActive ? list.filter((item) => item.is_active !== false) : list;
  }

  function getPortfolioById(id) {
    return getPortfolios().find((item) => item.portfolio_id === id) || null;
  }

  function getPortfolioBySku(sku) {
    return getPortfolios().find((item) => item.sku_code === sku) || null;
  }

  function generateSku(category) {
    const prefix = SKU_PREFIX[category] || "DSN";
    const list = getPortfolios().filter((item) => item.sku_code.startsWith(prefix + "-"));
    let max = 0;
    list.forEach((item) => {
      const n = parseInt(item.sku_code.split("-")[1], 10);
      if (!Number.isNaN(n) && n > max) max = n;
    });
    return `${prefix}-${pad(max + 1)}`;
  }

  function generatePortfolioId() {
    return "pf-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function savePortfolio(data) {
    const list = getPortfolios();
    const item = {
      portfolio_id: data.portfolio_id || generatePortfolioId(),
      sku_code: data.sku_code || generateSku(data.category),
      title: data.title,
      category: data.category,
      description: data.description || "",
      base_price: Number(data.base_price) || 0,
      image_url: data.image_url || placeholderImage(data.title, data.category),
      is_active: data.is_active !== false,
      created_at: data.created_at || new Date().toISOString(),
    };
    const index = list.findIndex((p) => p.portfolio_id === item.portfolio_id);
    if (index >= 0) list[index] = { ...list[index], ...item };
    else list.unshift(item);
    write(KEYS.portfolios, list);
    return item;
  }

  function deletePortfolio(id) {
    write(KEYS.portfolios, getPortfolios().filter((p) => p.portfolio_id !== id));
  }

  /* ------------------------------------------------------------------ */
  /* Transaksi                                                           */
  /* ------------------------------------------------------------------ */

  function generateInvoiceId() {
    const d = new Date();
    const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1, 2)}${pad(d.getDate(), 2)}`;
    const list = getTransactions().filter((t) => t.transaction_id.startsWith(`INV-${stamp}-`));
    return `INV-${stamp}-${pad(list.length + 1)}`;
  }

  function getTransactions() {
    ensureSeed();
    return read(KEYS.transactions, []).sort(
      (a, b) => new Date(b.paid_at) - new Date(a.paid_at)
    );
  }

  function getTransactionById(id) {
    return getTransactions().find((t) => t.transaction_id === id) || null;
  }

  function createTransaction(data) {
    const tx = {
      transaction_id: data.transaction_id || generateInvoiceId(),
      portfolio_id: data.portfolio_id || null,
      sku_reference: data.sku_reference || "-",
      design_title: data.design_title || "-",
      customer_name: data.customer_name,
      customer_whatsapp: data.customer_whatsapp,
      quantity: Number(data.quantity) || 1,
      custom_notes: data.custom_notes || "-",
      amount_paid: Number(data.amount_paid) || 0,
      payment_method: "DUMMY_QRIS",
      payment_status: "PAID",
      order_status: "BARU",
      paid_at: new Date().toISOString(),
    };
    const list = getTransactions();
    list.unshift(tx);
    write(KEYS.transactions, list);
    return tx;
  }

  function updateTransactionStatus(id, status) {
    if (!ORDER_STATUS.includes(status)) return null;
    const list = getTransactions();
    const index = list.findIndex((t) => t.transaction_id === id);
    if (index < 0) return null;
    list[index].order_status = status;
    write(KEYS.transactions, list);
    return list[index];
  }

  function getSummary() {
    const list = getTransactions();
    const paid = list.filter((t) => t.payment_status === "PAID");
    return {
      totalRevenue: paid.reduce((sum, t) => sum + Number(t.amount_paid || 0), 0),
      totalOrders: list.length,
      paidOrders: paid.length,
      byStatus: ORDER_STATUS.reduce((acc, status) => {
        acc[status] = list.filter((t) => t.order_status === status).length;
        return acc;
      }, {}),
      recent: list.slice(0, 5),
    };
  }

  /* ------------------------------------------------------------------ */
  /* Autentikasi admin (demo lokal — ganti dengan Firebase Auth nanti)  */
  /* ------------------------------------------------------------------ */

  function login(email, password) {
    ensureSeed();
    const cred = read(KEYS.credentials, null);
    if (!cred) return { ok: false, message: "Kredensial admin belum tersedia." };
    if (
      String(email).trim().toLowerCase() === cred.email.toLowerCase() &&
      String(password) === cred.password
    ) {
      const session = {
        email: cred.email,
        name: cred.name,
        role: cred.role,
        login_at: new Date().toISOString(),
      };
      write(KEYS.session, session);
      return { ok: true, session };
    }
    return { ok: false, message: "Email atau password salah." };
  }

  function getSession() {
    return read(KEYS.session, null);
  }

  function logout() {
    localStorage.removeItem(KEYS.session);
  }

  /* ------------------------------------------------------------------ */
  /* WhatsApp deep-link                                                  */
  /* ------------------------------------------------------------------ */

  function buildWaMessage(tx) {
    return (
      `Halo Admin *RS Digital Printing*, saya telah melakukan pemesanan dan pembayaran melalui website. Berikut detail pesanan saya:\n\n` +
      `*ID Transaksi:* ${tx.transaction_id}\n` +
      `*Nama Pemesan:* ${tx.customer_name}\n` +
      `*Referensi Desain:* ${tx.sku_reference} (${tx.design_title})\n` +
      `*Jumlah Pesanan:* ${tx.quantity} pcs\n` +
      `*Total Dibayarkan:* ${formatRupiah(tx.amount_paid)} (Status: LUNAS - Simulasi QRIS)\n\n` +
      `*Catatan Request Desain:*\n${tx.custom_notes}\n\n` +
      `Mohon konfirmasinya untuk proses desain lebih lanjut. Terima kasih!`
    );
  }

  function waUrl(text, number = WA_INTERNATIONAL) {
    return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
  }

  function resetDemoData() {
    Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
    ensureSeed();
  }

  ensureSeed();

  return {
    WA_NUMBER,
    WA_INTERNATIONAL,
    CATEGORIES,
    SKU_PREFIX,
    ORDER_STATUS,
    ORDER_STATUS_LABEL,
    formatRupiah,
    formatDate,
    escapeHtml,
    placeholderImage,
    getPortfolios,
    getPortfolioById,
    getPortfolioBySku,
    savePortfolio,
    deletePortfolio,
    generateSku,
    generateInvoiceId,
    getTransactions,
    getTransactionById,
    createTransaction,
    updateTransactionStatus,
    getSummary,
    login,
    getSession,
    logout,
    buildWaMessage,
    waUrl,
    resetDemoData,
  };
})();
