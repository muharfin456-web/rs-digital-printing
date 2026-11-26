/**
 * admin.js — Logika panel admin
 * Login (demo lokal) → Dashboard → Transaksi → Katalog → Pengaturan
 */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const SECTIONS = {
    dashboard: {
      title: "Dashboard",
      subtitle: "Ringkasan uang masuk dan aktivitas pesanan.",
    },
    transactions: {
      title: "Manajemen Transaksi",
      subtitle: "Pantau pesanan masuk, update status, dan hubungi pelanggan.",
    },
    catalog: {
      title: "Kelola Katalog",
      subtitle: "Tambah, ubah, atau hapus contoh desain pada website.",
    },
    settings: {
      title: "Pengaturan",
      subtitle: "Informasi integrasi WhatsApp dan pengelolaan data demo.",
    },
  };

  let currentSection = "dashboard";

  /* ------------------------------------------------------------------ */
  /* Autentikasi                                                        */
  /* ------------------------------------------------------------------ */

  function showApp(session) {
    $("loginView").classList.add("rs-hide");
    $("appView").classList.remove("rs-hide");
    $("adminName").textContent = session.name || "Admin";
    renderAll();
  }

  function showLogin() {
    $("appView").classList.add("rs-hide");
    $("loginView").classList.remove("rs-hide");
  }

  function handleLogin(event) {
    event.preventDefault();
    const result = RS_STORE.login($("loginEmail").value, $("loginPassword").value);
    const error = $("loginError");
    if (result.ok) {
      error.classList.add("rs-hide");
      event.target.reset();
      showApp(result.session);
    } else {
      error.textContent = result.message;
      error.classList.remove("rs-hide");
    }
  }

  function handleLogout() {
    RS_STORE.logout();
    showLogin();
  }

  /* ------------------------------------------------------------------ */
  /* Navigasi section                                                   */
  /* ------------------------------------------------------------------ */

  function goTo(section) {
    if (!SECTIONS[section]) return;
    currentSection = section;
    $("sectionTitle").textContent = SECTIONS[section].title;
    $("sectionSubtitle").textContent = SECTIONS[section].subtitle;

    Object.keys(SECTIONS).forEach((key) => {
      $("section-" + key).classList.toggle("rs-hide", key !== section);
    });
    document.querySelectorAll(".rs-admin-nav-item[data-section]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.section === section);
    });

    renderAll();
  }

  /* ------------------------------------------------------------------ */
  /* Dashboard                                                          */
  /* ------------------------------------------------------------------ */

  function renderDashboard() {
    const summary = RS_STORE.getSummary();
    $("statRevenue").textContent = RS_STORE.formatRupiah(summary.totalRevenue);
    $("statOrders").textContent = summary.totalOrders;
    $("statPaid").textContent = summary.paidOrders;
    $("statDone").textContent = summary.byStatus.SELESAI;

    const labels = RS_STORE.ORDER_STATUS.map((status) => ({
      status,
      label: RS_STORE.ORDER_STATUS_LABEL[status],
      count: summary.byStatus[status],
    }));
    const barColors = {
      BARU: "bg-amber-400",
      DESAIN: "bg-blue-500",
      CETAK: "bg-violet-500",
      SELESAI: "bg-green-500",
    };
    const max = Math.max(1, ...labels.map((l) => l.count));

    $("statusBreakdown").innerHTML = labels.map((item) => `
      <div>
        <div class="flex justify-between text-xs font-semibold text-slate-600 mb-1">
          <span>${item.label}</span><span>${item.count}</span>
        </div>
        <div class="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div class="h-full rounded-full ${barColors[item.status]}" style="width:${(item.count / max) * 100}%"></div>
        </div>
      </div>`).join("");

    const recent = summary.recent;
    $("recentTransactions").innerHTML = recent.length
      ? recent.map((tx) => `
          <div class="px-5 py-3.5 border-b border-slate-100 last:border-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div class="min-w-0">
              <div class="font-mono text-xs font-bold text-slate-800">${RS_STORE.escapeHtml(tx.transaction_id)}</div>
              <div class="text-sm font-semibold text-slate-700 truncate">${RS_STORE.escapeHtml(tx.customer_name)} · ${RS_STORE.escapeHtml(tx.sku_reference)}</div>
            </div>
            <div class="flex items-center gap-3 shrink-0">
              <span class="font-extrabold text-slate-900 text-sm">${RS_STORE.formatRupiah(tx.amount_paid)}</span>
              <span class="rs-status-pill rs-status-${tx.order_status}">${RS_STORE.ORDER_STATUS_LABEL[tx.order_status] || tx.order_status}</span>
            </div>
          </div>`).join("")
      : `<div class="text-center py-10 text-sm text-slate-500">Belum ada pesanan masuk.</div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Transaksi                                                          */
  /* ------------------------------------------------------------------ */

  function renderTransactions() {
    const query = ($("txSearch").value || "").toLowerCase().trim();
    const filter = $("txStatusFilter").value;
    let list = RS_STORE.getTransactions();

    if (filter !== "SEMUA") list = list.filter((tx) => tx.order_status === filter);
    if (query) {
      list = list.filter((tx) =>
        [tx.transaction_id, tx.customer_name, tx.sku_reference, tx.design_title]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    }

    $("txEmpty").classList.toggle("rs-hide", list.length > 0);
    $("txTableBody").innerHTML = list.map((tx) => {
      const waText =
        `Halo ${tx.customer_name}, pesanan Anda di RS Digital Printing dengan ID ${tx.transaction_id} ` +
        `sedang berstatus *${RS_STORE.ORDER_STATUS_LABEL[tx.order_status]}*. Terima kasih!`;
      return `
        <tr>
          <td><span class="font-mono font-bold text-slate-800">${RS_STORE.escapeHtml(tx.transaction_id)}</span>
              <div class="text-[10px] text-green-600 font-bold mt-0.5">LUNAS</div></td>
          <td>
            <div class="font-semibold text-slate-800">${RS_STORE.escapeHtml(tx.customer_name)}</div>
            <div class="text-[11px] text-slate-500">${RS_STORE.escapeHtml(tx.customer_whatsapp)}</div>
          </td>
          <td>
            <div class="rs-sku">${RS_STORE.escapeHtml(tx.sku_reference)}</div>
            <div class="text-[11px] text-slate-500 mt-1 max-w-[180px] truncate">${RS_STORE.escapeHtml(tx.design_title)}</div>
          </td>
          <td class="font-semibold text-slate-700">${tx.quantity} pcs</td>
          <td class="font-extrabold text-slate-900">${RS_STORE.formatRupiah(tx.amount_paid)}</td>
          <td class="text-slate-500 text-xs whitespace-nowrap">${RS_STORE.formatDate(tx.paid_at)}</td>
          <td>
            <select class="status-select rs-field !py-1.5 !text-xs !w-auto" data-id="${RS_STORE.escapeHtml(tx.transaction_id)}">
              ${RS_STORE.ORDER_STATUS.map((s) => `<option value="${s}" ${s === tx.order_status ? "selected" : ""}>${RS_STORE.ORDER_STATUS_LABEL[s]}</option>`).join("")}
            </select>
          </td>
          <td>
            <a href="${RS_STORE.waUrl(waText, tx.customer_whatsapp)}" target="_blank" rel="noopener"
               class="rs-btn rs-btn-wa rs-btn-sm" title="Chat pelanggan">Chat WA</a>
          </td>
        </tr>`;
    }).join("");

    $("txTableBody").querySelectorAll(".status-select").forEach((select) => {
      select.addEventListener("change", () => {
        const updated = RS_STORE.updateTransactionStatus(select.dataset.id, select.value);
        if (updated) {
          renderAll();
          alert(`Status ${updated.transaction_id} diperbarui menjadi ${RS_STORE.ORDER_STATUS_LABEL[updated.order_status]}.`);
        }
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Katalog CRUD                                                        */
  /* ------------------------------------------------------------------ */

  function renderCatalog() {
    const list = RS_STORE.getPortfolios();
    $("catalogGrid").innerHTML = list.map((p) => `
      <div class="rs-card overflow-hidden flex flex-col">
        <div class="relative bg-slate-100">
          <img src="${p.image_url}" alt="${RS_STORE.escapeHtml(p.title)}" loading="lazy" class="w-full h-40 object-cover" />
          <span class="absolute top-2 left-2 rs-sku bg-white/95">${RS_STORE.escapeHtml(p.sku_code)}</span>
          <span class="absolute top-2 right-2 rounded-full px-2 py-1 text-[10px] font-bold ${p.is_active ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}">
            ${p.is_active ? "Aktif" : "Nonaktif"}
          </span>
        </div>
        <div class="p-4 flex-1">
          <h3 class="font-extrabold text-slate-900 text-sm">${RS_STORE.escapeHtml(p.title)}</h3>
          <p class="text-xs text-slate-500 mt-1">${RS_STORE.escapeHtml(p.category)} · ${RS_STORE.formatRupiah(p.base_price)}</p>
        </div>
        <div class="px-4 pb-4 flex gap-2">
          <button class="edit-cat rs-btn rs-btn-outline rs-btn-sm flex-1" data-id="${p.portfolio_id}">Edit</button>
          <button class="delete-cat rs-btn rs-btn-sm flex-1" style="background:#fee2e2;color:#b91c1c" data-id="${p.portfolio_id}">Hapus</button>
        </div>
      </div>`).join("");

    $("catalogGrid").querySelectorAll(".edit-cat").forEach((btn) => {
      btn.addEventListener("click", () => openCatalogModal(btn.dataset.id));
    });
    $("catalogGrid").querySelectorAll(".delete-cat").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = RS_STORE.getPortfolioById(btn.dataset.id);
        if (!item) return;
        if (confirm(`Hapus desain "${item.title}" (${item.sku_code}) dari katalog?`)) {
          RS_STORE.deletePortfolio(item.portfolio_id);
          renderAll();
        }
      });
    });
  }

  function openCatalogModal(id) {
    const item = id ? RS_STORE.getPortfolioById(id) : null;
    $("catalogModalTitle").textContent = item ? "Ubah Desain" : "Tambah Desain";
    $("catId").value = item ? item.portfolio_id : "";
    $("catTitle").value = item ? item.title : "";
    $("catDescription").value = item ? item.description : "";
    $("catPrice").value = item ? item.base_price : "";
    $("catSku").value = item ? item.sku_code : "";
    $("catActive").checked = item ? item.is_active !== false : true;
    $("catImage").value = "";
    $("catalogError").classList.add("rs-hide");
    $("catalogModal").classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeCatalogModal() {
    $("catalogModal").classList.remove("is-open");
    if (!document.querySelector(".rs-modal-overlay.is-open")) document.body.style.overflow = "";
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Gagal membaca file."));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Format gambar tidak didukung."));
        img.onload = () => {
          const maxW = 800;
          const maxH = 600;
          let { width, height } = img;
          const ratio = Math.min(maxW / width, maxH / height, 1);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          const webp = canvas.toDataURL("image/webp", 0.72);
          resolve(webp.length < 50 ? canvas.toDataURL("image/jpeg", 0.72) : webp);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleCatalogSubmit(event) {
    event.preventDefault();
    const error = $("catalogError");
    const file = $("catImage").files[0];
    let imageUrl = "";

    try {
      if (file) imageUrl = await compressImage(file);
    } catch (err) {
      error.textContent = err.message;
      error.classList.remove("rs-hide");
      return;
    }

    const existing = $("catId").value ? RS_STORE.getPortfolioById($("catId").value) : null;
    const data = {
      portfolio_id: existing ? existing.portfolio_id : "",
      sku_code: $("catSku").value.trim() || (existing ? existing.sku_code : RS_STORE.generateSku($("catCategory").value)),
      title: $("catTitle").value.trim(),
      category: $("catCategory").value,
      description: $("catDescription").value.trim(),
      base_price: Number($("catPrice").value) || 0,
      image_url: imageUrl || (existing ? existing.image_url : ""),
      is_active: $("catActive").checked,
      created_at: existing ? existing.created_at : new Date().toISOString(),
    };

    if (data.image_url.length > 1.5 * 1024 * 1024) {
      error.textContent = "Gambar terlalu besar untuk localStorage. Gunakan file lebih kecil.";
      error.classList.remove("rs-hide");
      return;
    }

    RS_STORE.savePortfolio(data);
    event.target.reset();
    closeCatalogModal();
    renderAll();
  }

  /* ------------------------------------------------------------------ */
  /* Render semua                                                       */
  /* ------------------------------------------------------------------ */

  function renderAll() {
    renderDashboard();
    renderTransactions();
    renderCatalog();
  }

  /* ------------------------------------------------------------------ */
  /* Init                                                               */
  /* ------------------------------------------------------------------ */

  function init() {
    $("catCategory").innerHTML = RS_STORE.CATEGORIES.filter((c) => c !== "Semua")
      .map((c) => `<option value="${c}">${c}</option>`).join("");

    $("loginForm").addEventListener("submit", handleLogin);
    $("logoutBtn").addEventListener("click", handleLogout);
    $("mobileLogoutBtn").addEventListener("click", handleLogout);

    document.querySelectorAll(".rs-admin-nav-item[data-section]").forEach((btn) => {
      btn.addEventListener("click", () => goTo(btn.dataset.section));
    });
    document.querySelectorAll(".goto-transactions").forEach((btn) => {
      btn.addEventListener("click", () => goTo("transactions"));
    });

    $("txSearch").addEventListener("input", renderTransactions);
    $("txStatusFilter").addEventListener("change", renderTransactions);

    $("addPortfolioBtn").addEventListener("click", () => openCatalogModal(null));
    $("catalogForm").addEventListener("submit", handleCatalogSubmit);
    $("catalogModal").querySelectorAll(".modal-close").forEach((btn) => {
      btn.addEventListener("click", closeCatalogModal);
    });
    $("catalogModal").addEventListener("click", (event) => {
      if (event.target === $("catalogModal")) closeCatalogModal();
    });

    $("resetDataBtn").addEventListener("click", () => {
      if (confirm("Reset seluruh data demo? Semua transaksi akan dihapus dan katalog kembali ke 12 desain awal.")) {
        RS_STORE.resetDemoData();
        renderAll();
        alert("Data demo berhasil direset.");
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeCatalogModal();
    });

    const session = RS_STORE.getSession();
    if (session) showApp(session);
    else showLogin();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
