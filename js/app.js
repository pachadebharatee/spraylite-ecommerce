/**
 * Spraylite storefront: rendering, cart, wishlist, filters, search and small widgets.
 * Depends on CATEGORIES and PRODUCTS defined in js/products.js.
 */
(function () {
  "use strict";

  const STORAGE_KEYS = { cart: "spraylite.cart.v1", wishlist: "spraylite.wishlist.v1" };
  const MAX_QTY = 10;
  const TOAST_DURATION = 2800;
  const GIFT_DEADLINE = new Date("2026-12-20T23:59:59+05:30");
  const DESKTOP_NAV = "(min-width: 1100px)";

  const productById = new Map(PRODUCTS.map((p) => [p.id, p]));
  const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
  const formatPrice = (value) => inr.format(value);
  const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const $ = (id) => document.getElementById(id);

  /* ------------------------------------------------------------------
     Elements
     ------------------------------------------------------------------ */
  const el = {
    grid: $("product-grid"),
    bestsellerGrid: $("bestseller-grid"),
    familyList: $("family-list"),
    filterTabs: $("filter-tabs"),
    filterStatus: $("filter-status"),
    gridEmpty: $("grid-empty"),
    searchSummary: $("search-summary"),
    searchSummaryTerm: $("search-summary-term"),
    collection: $("collection"),
    cartButton: $("cart-button"),
    wishlistButton: $("wishlist-button"),
    cartDrawer: $("cart-drawer"),
    wishlistDrawer: $("wishlist-drawer"),
    cartItems: $("cart-items"),
    cartEmpty: $("cart-empty"),
    cartSummary: $("cart-summary"),
    cartSubtotal: $("cart-subtotal"),
    cartUnits: $("cart-units"),
    wishlistItems: $("wishlist-items"),
    wishlistEmpty: $("wishlist-empty"),
    toast: $("toast"),
    menuToggle: $("menu-toggle"),
    nav: $("primary-nav"),
    searchButton: $("search-button"),
    searchPanel: $("search-panel"),
    searchForm: $("search-form"),
    searchInput: $("search-input"),
    searchClose: $("search-close"),
    searchLive: $("search-live"),
    countdown: $("countdown"),
    countdownEnded: $("countdown-ended"),
    newsletterForm: $("newsletter-form"),
    newsletterEmail: $("newsletter-email"),
    newsletterMessage: $("newsletter-message"),
    year: $("year"),
  };

  /* ------------------------------------------------------------------
     Persistence (defensive: storage may be unavailable, full or corrupted)
     ------------------------------------------------------------------ */
  const storage = {
    read(key) {
      try {
        const raw = window.localStorage.getItem(key);
        return raw === null ? null : JSON.parse(raw);
      } catch (error) {
        return null; // Invalid JSON or storage blocked: start fresh.
      }
    },
    write(key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        // Storage full or blocked (e.g. private mode): keep working in memory.
      }
    },
  };

  /** Keep only known products with whole-number quantities; merge duplicates. */
  function sanitizeCart(data) {
    if (!Array.isArray(data)) return [];
    const merged = new Map();
    data.forEach((entry) => {
      if (!entry || typeof entry !== "object") return;
      const qty = Number(entry.qty);
      if (!productById.has(entry.id) || !Number.isInteger(qty) || qty < 1) return;
      merged.set(entry.id, Math.min(MAX_QTY, (merged.get(entry.id) || 0) + qty));
    });
    return Array.from(merged, ([id, qty]) => ({ id, qty }));
  }

  /** Keep only unique, known product ids. */
  function sanitizeWishlist(data) {
    if (!Array.isArray(data)) return [];
    return Array.from(new Set(data.filter((id) => typeof id === "string" && productById.has(id))));
  }

  const state = {
    cart: sanitizeCart(storage.read(STORAGE_KEYS.cart)),
    wishlist: sanitizeWishlist(storage.read(STORAGE_KEYS.wishlist)),
  };

  function saveCart() { storage.write(STORAGE_KEYS.cart, state.cart); }
  function saveWishlist() { storage.write(STORAGE_KEYS.wishlist, state.wishlist); }

  const cartUnits = () => state.cart.reduce((sum, item) => sum + item.qty, 0);
  const cartSubtotal = () => state.cart.reduce((sum, item) => sum + productById.get(item.id).price * item.qty, 0);
  const isWishlisted = (id) => state.wishlist.includes(id);

  /* ------------------------------------------------------------------
     Templates
     ------------------------------------------------------------------ */
  const escapeHTML = (value) =>
    String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const HEART_ICON =
    '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20.5s-7.5-4.6-9.3-9.4C1.5 7.8 3.6 4.5 7 4.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.4 0 5.5 3.3 4.3 6.6-1.8 4.8-9.3 9.4-9.3 9.4z"/></svg>';

  /**
   * One card template for the main grid and the best-seller row.
   * `prefix` keeps element ids unique when the same product appears twice.
   */
  function productCardHTML(p, { prefix = "product", ranked = false } = {}) {
    const name = escapeHTML(p.name);
    const uid = `${prefix}-${p.id}`;
    let tag = "";
    if (ranked) tag = `<span class="rank-tag"><strong>#${p.rank}</strong> Best seller</span>`;
    else if (p.badge) tag = `<span class="product-badge" data-badge="${escapeHTML(p.badge.toLowerCase())}">${escapeHTML(p.badge)}</span>`;
    return `
      <li data-id="${p.id}" data-category="${escapeHTML(p.category)}">
        <article class="product-card" id="${uid}" tabindex="-1" aria-labelledby="${uid}-name">
          <div class="product-media">
            <img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.alt)}" width="800" height="1000" loading="lazy" decoding="async">
            ${tag}
            <button class="wishlist-toggle" type="button" data-action="toggle-wishlist" data-id="${p.id}"
                    aria-pressed="false" aria-label="Save ${name} to wishlist">${HEART_ICON}</button>
          </div>
          <div class="product-info">
            <div class="product-meta">
              <p class="product-family"><span class="visually-hidden">Fragrance family: </span>${escapeHTML(p.family)}</p>
              <p class="product-size"><span class="visually-hidden">Size: </span>${escapeHTML(p.size)}</p>
            </div>
            <h3 class="product-name" id="${uid}-name">${name}</h3>
            <p class="product-notes"><span class="visually-hidden">Notes: </span>${escapeHTML(p.notes)}</p>
            <div class="product-bottom">
              <p class="price"><span class="visually-hidden">Price: </span>${formatPrice(p.price)}</p>
              <button class="button button-dark add-to-cart" type="button" data-action="add-to-cart" data-id="${p.id}">
                <svg class="icon icon-sm" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 8h14l-1.2 11.1a1.6 1.6 0 0 1-1.6 1.4H7.8a1.6 1.6 0 0 1-1.6-1.4L5 8z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/></svg>Add<span class="visually-hidden"> ${name} to cart</span>
              </button>
            </div>
          </div>
        </article>
      </li>`;
  }

  function familyTileHTML(category) {
    const items = PRODUCTS.filter((p) => p.category === category.id);
    return `
      <li>
        <button class="family-tile" type="button" data-filter="${category.id}">
          <span class="family-image"><img src="${escapeHTML(items[0].image)}" alt="" width="800" height="1000" loading="lazy" decoding="async"></span>
          <span class="family-body">
            <span class="family-name">${escapeHTML(category.label)}</span>
            <span class="family-notes">${escapeHTML(category.description || "")}</span>
            <span class="family-count">${plural(items.length, "scent")}</span>
          </span>
          <span class="family-arrow" aria-hidden="true">
            <svg class="icon icon-sm" viewBox="0 0 24 24" focusable="false"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </span>
        </button>
      </li>`;
  }

  function cartItemHTML(item) {
    const p = productById.get(item.id);
    const name = escapeHTML(p.name);
    return `
      <li class="line-item" data-id="${p.id}">
        <img src="${escapeHTML(p.image)}" alt="" width="72" height="90" loading="lazy" decoding="async">
        <div class="line-item-body">
          <div class="line-item-top">
            <div>
              <p class="line-item-name">${name}</p>
              <p class="line-item-meta">${escapeHTML(p.family)} · ${escapeHTML(p.size)} · ${formatPrice(p.price)} each</p>
            </div>
            <p class="line-item-price"><span class="visually-hidden">Line total: </span>${formatPrice(p.price * item.qty)}</p>
          </div>
          <div class="line-item-actions">
            <div class="qty" role="group" aria-label="Quantity for ${name}">
              <button type="button" data-action="decrease" data-id="${p.id}" aria-label="Decrease quantity of ${name}" aria-disabled="${item.qty <= 1}">−</button>
              <span class="qty-value"><span class="visually-hidden">Quantity </span>${item.qty}</span>
              <button type="button" data-action="increase" data-id="${p.id}" aria-label="Increase quantity of ${name}" aria-disabled="${item.qty >= MAX_QTY}">+</button>
            </div>
            <button class="text-button" type="button" data-action="remove-from-cart" data-id="${p.id}">Remove<span class="visually-hidden"> ${name}</span></button>
          </div>
        </div>
      </li>`;
  }

  function wishlistItemHTML(id) {
    const p = productById.get(id);
    const name = escapeHTML(p.name);
    return `
      <li class="wish-item" data-id="${p.id}">
        <img src="${escapeHTML(p.image)}" alt="" width="88" height="110" loading="lazy" decoding="async">
        <div class="wish-item-body">
          <p class="wish-item-family">${escapeHTML(p.family)}</p>
          <p class="line-item-name">${name}</p>
          <p class="wish-item-meta"><span class="wish-item-price">${formatPrice(p.price)}</span> · ${escapeHTML(p.size)}</p>
          <button class="button button-dark wish-item-add" type="button" data-action="move-to-cart" data-id="${p.id}">Move to cart<span class="visually-hidden">: ${name}</span></button>
        </div>
        <button class="wish-item-remove" type="button" data-action="remove-from-wishlist" data-id="${p.id}" aria-label="Remove ${name} from wishlist">
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </li>`;
  }

  /* ------------------------------------------------------------------
     Rendering
     ------------------------------------------------------------------ */
  function renderCatalogue() {
    el.grid.innerHTML = PRODUCTS.map((p) => productCardHTML(p)).join("");
    el.bestsellerGrid.innerHTML = PRODUCTS.filter((p) => p.rank)
      .sort((a, b) => a.rank - b.rank)
      .map((p) => productCardHTML(p, { prefix: "bestseller", ranked: true }))
      .join("");
    el.familyList.innerHTML = CATEGORIES.map(familyTileHTML).join("");
    document.querySelectorAll("[data-price-for]").forEach((node) => {
      const product = productById.get(node.dataset.priceFor);
      if (product) node.textContent = formatPrice(product.price);
    });
    el.filterTabs.innerHTML = [{ id: "all", label: "All" }]
      .concat(CATEGORIES)
      .map((t) => {
        const count = t.id === "all" ? PRODUCTS.length : PRODUCTS.filter((p) => p.category === t.id).length;
        return `<button class="filter-tab" type="button" data-filter-tab="${t.id}" aria-pressed="${t.id === "all"}">${escapeHTML(t.label)}<span class="filter-count" aria-hidden="true">${count}</span></button>`;
      })
      .join("");
  }

  function setCount(button, value, label) {
    const badge = button.querySelector(".count");
    badge.textContent = value > 99 ? "99+" : String(value);
    badge.dataset.empty = String(value === 0);
    button.setAttribute("aria-label", label);
  }

  function render(focusHint) {
    const units = cartUnits();
    setCount(el.cartButton, units, `Cart, ${plural(units, "item")}`);
    setCount(el.wishlistButton, state.wishlist.length, `Wishlist, ${plural(state.wishlist.length, "item")}`);

    // Hearts appear in several places (main grid and best sellers); keep them all in sync.
    document.querySelectorAll('[data-action="toggle-wishlist"]').forEach((button) => {
      button.setAttribute("aria-pressed", String(isWishlisted(button.dataset.id)));
    });

    const cartEmpty = state.cart.length === 0;
    el.cartItems.innerHTML = state.cart.map(cartItemHTML).join("");
    el.cartItems.hidden = cartEmpty;
    el.cartEmpty.hidden = !cartEmpty;
    el.cartSummary.hidden = cartEmpty;
    el.cartSubtotal.textContent = formatPrice(cartSubtotal());
    el.cartUnits.textContent = `(${plural(units, "item")})`;

    const wishEmpty = state.wishlist.length === 0;
    el.wishlistItems.innerHTML = state.wishlist.map(wishlistItemHTML).join("");
    el.wishlistItems.hidden = wishEmpty;
    el.wishlistEmpty.hidden = !wishEmpty;
    const wishCount = document.getElementById("wishlist-count");
    if (wishCount) {
      wishCount.textContent = String(state.wishlist.length);
      wishCount.hidden = wishEmpty;
    }

    if (focusHint) restoreFocus(focusHint);
  }

  /**
   * Drawer lists are re-rendered, so the focused button is replaced.
   * Put focus back on the equivalent control, or a sensible neighbour if the row was removed.
   */
  function restoreFocus({ list, action, id, index, fallback }) {
    const same = list.querySelector(`[data-action="${action}"][data-id="${id}"]`);
    if (same) { same.focus(); return; }
    const siblings = list.querySelectorAll(`[data-action="${action}"]`);
    if (siblings.length) { siblings[Math.min(index, siblings.length - 1)].focus(); return; }
    fallback.focus();
  }

  /* ------------------------------------------------------------------
     Feedback
     ------------------------------------------------------------------ */
  let toastTimer;

  /** Announce a message: inside the open drawer if there is one, otherwise as a toast. */
  function announce(message) {
    const openDrawer = document.querySelector("dialog[open]");
    const region = openDrawer ? openDrawer.querySelector("[data-status]") : el.toast;
    region.textContent = ""; // Clear first so repeating the same message is still announced.
    window.clearTimeout(toastTimer);
    window.requestAnimationFrame(() => {
      region.textContent = message;
      if (region === el.toast) el.toast.classList.add("is-visible");
      toastTimer = window.setTimeout(() => el.toast.classList.remove("is-visible"), TOAST_DURATION);
    });
  }

  /* ------------------------------------------------------------------
     Cart and wishlist actions
     ------------------------------------------------------------------ */
  /** Add one unit; returns false (and explains why) when the line is already at MAX_QTY. */
  function addToCart(id, { silent = false } = {}) {
    const product = productById.get(id);
    const line = state.cart.find((item) => item.id === id);
    if (line && line.qty >= MAX_QTY) {
      announce(`You can add up to ${MAX_QTY} of ${product.name}.`);
      return false;
    }
    if (line) line.qty += 1;
    else state.cart.push({ id, qty: 1 });
    saveCart();
    render();
    if (!silent) announce(`Added ${product.name} to your cart. Cart has ${plural(cartUnits(), "item")}.`);
    return true;
  }

  /** Wishlist → cart: add one unit, then drop the item from the wishlist. */
  function moveToCart(id) {
    if (!addToCart(id, { silent: true })) return;
    const index = state.wishlist.indexOf(id);
    if (index !== -1) state.wishlist.splice(index, 1);
    saveWishlist();
    render({ list: el.wishlistItems, action: "move-to-cart", id, index: Math.max(index, 0), fallback: $("wishlist-title") });
    announce(`Moved ${productById.get(id).name} to your cart.`);
  }

  function changeQuantity(id, delta) {
    const line = state.cart.find((item) => item.id === id);
    if (!line) return;
    const next = line.qty + delta;
    if (next < 1 || next > MAX_QTY) return;
    line.qty = next;
    saveCart();
    render({ list: el.cartItems, action: delta > 0 ? "increase" : "decrease", id, index: 0, fallback: el.cartDrawer });
    announce(`${productById.get(id).name} quantity ${next}. Subtotal ${formatPrice(cartSubtotal())}.`);
  }

  function removeFromCart(id) {
    const index = state.cart.findIndex((item) => item.id === id);
    if (index === -1) return;
    state.cart.splice(index, 1);
    saveCart();
    render({ list: el.cartItems, action: "remove-from-cart", id, index, fallback: $("cart-title") });
    announce(`Removed ${productById.get(id).name} from your cart.`);
  }

  function toggleWishlist(id) {
    const name = productById.get(id).name;
    const removing = isWishlisted(id);
    if (removing) state.wishlist = state.wishlist.filter((saved) => saved !== id);
    else state.wishlist.push(id);
    saveWishlist();
    render();
    announce(removing ? `Removed ${name} from your wishlist.` : `Saved ${name} to your wishlist.`);
  }

  function removeFromWishlist(id) {
    const index = state.wishlist.indexOf(id);
    if (index === -1) return;
    state.wishlist.splice(index, 1);
    saveWishlist();
    render({ list: el.wishlistItems, action: "remove-from-wishlist", id, index, fallback: $("wishlist-title") });
    announce(`Removed ${productById.get(id).name} from your wishlist.`);
  }

  const ACTIONS = {
    "add-to-cart": (id) => addToCart(id),
    "move-to-cart": moveToCart,
    "toggle-wishlist": toggleWishlist,
    increase: (id) => changeQuantity(id, 1),
    decrease: (id) => changeQuantity(id, -1),
    "remove-from-cart": removeFromCart,
    "remove-from-wishlist": removeFromWishlist,
  };

  /* ------------------------------------------------------------------
     Collection view: family filter + text search (not persisted)
     ------------------------------------------------------------------ */
  const view = { category: "all", query: "" };

  function matchesQuery(product, query) {
    if (!query) return true;
    const haystack = `${product.name} ${product.family} ${product.category} ${product.notes}`.toLowerCase();
    return query.toLowerCase().split(/\s+/).every((word) => haystack.includes(word));
  }

  /** Apply the current view to the main grid and return the number of matches. */
  function applyView({ announceChange = true } = {}) {
    el.filterTabs.querySelectorAll("[data-filter-tab]").forEach((tab) => {
      tab.setAttribute("aria-pressed", String(tab.dataset.filterTab === view.category));
    });
    let shown = 0;
    el.grid.querySelectorAll("li[data-id]").forEach((item) => {
      const product = productById.get(item.dataset.id);
      const match = (view.category === "all" || product.category === view.category) && matchesQuery(product, view.query);
      item.hidden = !match;
      if (match) shown += 1;
    });
    el.gridEmpty.hidden = shown > 0;
    const countNode = document.getElementById("collection-count");
    if (countNode) countNode.textContent = `Showing ${plural(shown, "fragrance")}`;
    el.searchSummary.hidden = !view.query;
    el.searchSummaryTerm.textContent = view.query;
    if (announceChange) {
      const family = view.category === "all" ? "" : `${CATEGORIES.find((c) => c.id === view.category).label.toLowerCase()} `;
      const term = view.query ? ` for “${view.query}”` : "";
      el.filterStatus.textContent = `Showing ${shown} ${family}fragrance${shown === 1 ? "" : "s"}${term}.`;
    }
    return shown;
  }

  /** Reorder the main grid's cards; "featured" restores catalogue order. */
  function sortGrid(mode) {
    const order = new Map(PRODUCTS.map((p, i) => [p.id, i]));
    const compare = {
      featured: (a, b) => order.get(a.id) - order.get(b.id),
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      name: (a, b) => a.name.localeCompare(b.name),
    }[mode] || ((a, b) => order.get(a.id) - order.get(b.id));
    Array.from(el.grid.querySelectorAll("li[data-id]"))
      .sort((x, y) => compare(productById.get(x.dataset.id), productById.get(y.dataset.id)))
      .forEach((item) => el.grid.appendChild(item));
  }

  function setFilter(category, options) {
    view.category = category === "all" || CATEGORIES.some((c) => c.id === category) ? category : "all";
    return applyView(options);
  }

  function resetView(options) {
    view.query = "";
    el.searchInput.value = "";
    return setFilter("all", options);
  }

  function goToCollection() {
    el.collection.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
    el.collection.focus({ preventScroll: true });
  }

  /* ------------------------------------------------------------------
     Header: mobile menu and search panel
     ------------------------------------------------------------------ */
  function setMenu(open, { restoreFocus = false } = {}) {
    el.menuToggle.setAttribute("aria-expanded", String(open));
    el.menuToggle.setAttribute("aria-label", open ? "Close menu" : "Menu");
    el.nav.classList.toggle("is-open", open);
    if (open) setSearch(false);
    if (!open && restoreFocus) el.menuToggle.focus();
  }

  function setSearch(open, { restoreFocus = false } = {}) {
    el.searchPanel.hidden = !open;
    el.searchButton.setAttribute("aria-expanded", String(open));
    if (open) {
      setMenu(false);
      el.searchInput.focus();
    } else {
      el.searchLive.textContent = "";
      if (restoreFocus) el.searchButton.focus();
    }
  }

  function runSearch(term) {
    view.query = term.trim();
    view.category = "all";
    const shown = applyView();
    el.searchLive.textContent = view.query
      ? `${plural(shown, "fragrance")} match “${view.query}”.`
      : "";
    return shown;
  }

  function setupHeader() {
    el.menuToggle.addEventListener("click", () => setMenu(el.menuToggle.getAttribute("aria-expanded") !== "true"));
    el.nav.addEventListener("click", (event) => { if (event.target.closest("a")) setMenu(false); });

    el.searchButton.addEventListener("click", () => setSearch(el.searchPanel.hidden));
    el.searchClose.addEventListener("click", () => setSearch(false, { restoreFocus: true }));

    let searchTimer;
    el.searchInput.addEventListener("input", () => {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => runSearch(el.searchInput.value), 200);
    });
    el.searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      runSearch(el.searchInput.value);
      setSearch(false);
      goToCollection();
    });
    el.searchPanel.addEventListener("click", (event) => {
      const chip = event.target.closest("[data-search-term]");
      if (!chip) return;
      el.searchInput.value = chip.dataset.searchTerm;
      el.searchForm.requestSubmit();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || document.querySelector("dialog[open]")) return;
      if (!el.searchPanel.hidden) setSearch(false, { restoreFocus: true });
      else if (el.nav.classList.contains("is-open")) setMenu(false, { restoreFocus: true });
    });
    document.addEventListener("click", (event) => {
      if (event.target.closest(".site-header")) return;
      if (el.nav.classList.contains("is-open")) setMenu(false);
      if (!el.searchPanel.hidden) setSearch(false);
    });
    window.matchMedia(DESKTOP_NAV).addEventListener("change", (event) => {
      if (event.matches) setMenu(false);
    });
  }

  /* ------------------------------------------------------------------
     Drawers (native <dialog>: focus containment, Escape and inert page for free)
     ------------------------------------------------------------------ */
  function setupDrawer(dialog, opener) {
    opener.addEventListener("click", () => {
      el.toast.classList.remove("is-visible");
      setMenu(false);
      setSearch(false);
      dialog.showModal();
      document.body.classList.add("has-open-drawer");
    });

    dialog.addEventListener("close", () => {
      document.body.classList.remove("has-open-drawer");
      dialog.querySelector("[data-status]").textContent = "";
      if (dialog.dataset.gotoCollection === "true") {
        delete dialog.dataset.gotoCollection;
        goToCollection();
      } else {
        opener.focus();
      }
    });

    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close(); // Backdrop click.
      const closer = event.target.closest("[data-close]");
      if (closer) {
        if (closer.hasAttribute("data-goto-collection")) dialog.dataset.gotoCollection = "true";
        dialog.close();
      }
    });
  }

  /* ------------------------------------------------------------------
     Festive countdown
     ------------------------------------------------------------------ */
  function setupCountdown() {
    const units = {};
    el.countdown.querySelectorAll("[data-unit]").forEach((node) => { units[node.dataset.unit] = node; });
    const pad = (n) => String(n).padStart(2, "0");
    let timer;

    function tick() {
      const remaining = GIFT_DEADLINE.getTime() - Date.now();
      if (remaining <= 0) {
        el.countdown.hidden = true;
        el.countdownEnded.hidden = false;
        window.clearInterval(timer);
        return;
      }
      const seconds = Math.floor(remaining / 1000);
      units.days.textContent = pad(Math.floor(seconds / 86400));
      units.hours.textContent = pad(Math.floor((seconds % 86400) / 3600));
      units.minutes.textContent = pad(Math.floor((seconds % 3600) / 60));
      units.seconds.textContent = pad(seconds % 60);
    }

    tick();
    timer = window.setInterval(tick, 1000);
  }

  /* ------------------------------------------------------------------
     Newsletter (front-end only: validates, nothing is sent or stored)
     ------------------------------------------------------------------ */
  function setupNewsletter() {
    const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    el.newsletterForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = el.newsletterEmail.value.trim();
      const valid = EMAIL.test(value);
      el.newsletterEmail.setAttribute("aria-invalid", String(!valid));
      el.newsletterMessage.dataset.state = valid ? "success" : "error";
      if (!valid) {
        el.newsletterMessage.textContent = value
          ? "Please enter a valid email address, like name@example.com."
          : "Please enter your email address.";
        el.newsletterEmail.focus();
        return;
      }
      el.newsletterMessage.textContent = "Thank you for subscribing. (Demo only: nothing is sent or stored.)";
      el.newsletterForm.reset();
      el.newsletterEmail.removeAttribute("aria-invalid");
    });
  }

  /* ------------------------------------------------------------------
     Hero background video
     Muted loop; paused while the tab is hidden. Visitors who prefer
     reduced motion see the poster only.
     ------------------------------------------------------------------ */
  function setupHeroVideo() {
    const video = $("hero-video");
    if (!video) return;
    let ready = false; // The video only starts downloading once the page has loaded (poster first).
    function sync() {
      if (!ready) return;
      if (prefersReducedMotion() || document.hidden) {
        video.pause();
        return;
      }
      const playing = video.play();
      if (playing) playing.catch(() => {}); // missing file or blocked: poster stays
    }
    document.addEventListener("visibilitychange", sync);
    window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", sync);
    function start() { ready = true; sync(); }
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
  }

  /* ------------------------------------------------------------------
     Header over the hero
     Transparent at the top of the page; solid white with a soft shadow once
     the page scrolls, and while the mobile menu or search panel is open.
     ------------------------------------------------------------------ */
  function setupHeaderOverlay() {
    const header = $("site-header");
    if (!header || !header.classList.contains("is-overlay")) return;
    const nav = $("primary-nav");
    const search = $("search-panel");
    function update() {
      const open = (nav && nav.classList.contains("is-open")) || (search && !search.hidden);
      header.classList.toggle("is-solid", window.scrollY > 24 || Boolean(open));
    }
    window.addEventListener("scroll", update, { passive: true });
    const observer = new MutationObserver(update);
    if (nav) observer.observe(nav, { attributes: true, attributeFilter: ["class"] });
    if (search) observer.observe(search, { attributes: true, attributeFilter: ["hidden"] });
    update();
  }

  /* ------------------------------------------------------------------
     Scroll reveals
     Tags section content with data-reveal and fades it up as it enters the
     viewport; siblings in a grid get a short stagger. Product cards are
     re-rendered by the filters, so new nodes are picked up as they appear.
     Skipped entirely for reduced motion or without IntersectionObserver.
     ------------------------------------------------------------------ */
  function setupReveals() {
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) return;
    const main = document.getElementById("main");
    if (!main) return;

    // [selector, reveal style, stagger siblings?]
    const RULES = [
      [".section-head", "", false],
      [".families-intro > *", "", true],
      [".features-list > .feature", "", true],
      [".family-list > li", "", true],
      [".promo-grid > li", "", true],
      [".product-grid > li", "", true],
      [".bestsellers-layout > .feature-card", "", false],
      [".story-media, .lookbook-media, .gifting-media", "", false],
      [".about-collage-main, .about-collage-detail, .about-collage .about-badge", "", true],
      [".about-copy > *, .story-copy > *, .lookbook-copy > *, .gifting-copy > *", "", true],
      [".testimonial-track > li", "", true],
      [".ways-grid > li", "", true],
    ];

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });

    function register(scope) {
      RULES.forEach(([selector, type, stagger]) => {
        scope.querySelectorAll(selector).forEach((element) => {
          if (element.hasAttribute("data-reveal") || element.closest(".hero")) return;
          element.setAttribute("data-reveal", type);
          if (stagger && element.parentElement) {
            const index = Array.prototype.indexOf.call(element.parentElement.children, element);
            element.style.setProperty("--reveal-delay", `${Math.min(index, 6) * 90}ms`);
          }
          observer.observe(element);
        });
      });
    }

    register(main);
    // Grids rendered later (products, filter changes).
    new MutationObserver((mutations) => {
      if (mutations.some((m) => m.addedNodes.length)) register(main);
    }).observe(main, { childList: true, subtree: true });
  }

  /* ------------------------------------------------------------------
     Auto sliders ([data-slider])
     A scroll-snap track that advances one card at a time and loops.
     Autoplay pauses on hover/focus and while the tab is hidden, stops for
     good once the visitor uses the arrows or dots, and never runs for
     reduced motion. Touch users can swipe the track directly.
     ------------------------------------------------------------------ */
  function setupSliders() {
    document.querySelectorAll("[data-slider]").forEach((root) => {
      const track = root.querySelector("[data-slider-track]");
      if (!track) return;
      const dotsBox = root.querySelector("[data-slider-dots]");
      const delay = Number(root.dataset.autoplay) || 0;
      let stopped = prefersReducedMotion() || !delay;
      let paused = false;
      let timer = null;

      const items = () => Array.from(track.children);
      function step() {
        const list = items();
        if (list.length < 2) return track.clientWidth;
        return list[1].getBoundingClientRect().left - list[0].getBoundingClientRect().left;
      }
      function pages() {
        const s = step();
        const perView = Math.max(1, Math.round(track.clientWidth / s));
        return Math.max(1, items().length - perView + 1);
      }
      function current() { return Math.round(track.scrollLeft / step()); }
      function goTo(index) {
        const count = pages();
        const target = ((index % count) + count) % count;
        track.scrollTo({ left: target * step(), behavior: prefersReducedMotion() ? "auto" : "smooth" });
      }

      function buildDots() {
        if (!dotsBox) return;
        const count = pages();
        dotsBox.innerHTML = Array.from({ length: count }, (_, i) =>
          `<button class="slider-dot" type="button" data-slider-dot="${i}" aria-label="Go to slide ${i + 1} of ${count}"></button>`).join("");
        syncDots();
      }
      function syncDots() {
        if (!dotsBox) return;
        const active = Math.min(current(), pages() - 1);
        dotsBox.querySelectorAll("[data-slider-dot]").forEach((dot, i) => {
          if (i === active) dot.setAttribute("aria-current", "true");
          else dot.removeAttribute("aria-current");
        });
      }

      function schedule() {
        window.clearInterval(timer);
        timer = !stopped && !paused && !document.hidden
          ? window.setInterval(() => goTo(current() + 1), delay)
          : null;
      }
      function takeControl() { stopped = true; schedule(); }

      root.addEventListener("click", (event) => {
        const dot = event.target.closest("[data-slider-dot]");
        if (dot) { takeControl(); goTo(Number(dot.dataset.sliderDot)); }
        else if (event.target.closest("[data-slider-prev]")) { takeControl(); goTo(current() - 1); }
        else if (event.target.closest("[data-slider-next]")) { takeControl(); goTo(current() + 1); }
      });
      track.addEventListener("pointerdown", takeControl, { passive: true });
      root.addEventListener("mouseenter", () => { paused = true; schedule(); });
      root.addEventListener("mouseleave", () => { paused = root.contains(document.activeElement); schedule(); });
      root.addEventListener("focusin", () => { paused = true; schedule(); });
      root.addEventListener("focusout", (event) => {
        if (!root.contains(event.relatedTarget)) { paused = root.matches(":hover"); schedule(); }
      });
      document.addEventListener("visibilitychange", schedule);

      let scrollQueued = false;
      track.addEventListener("scroll", () => {
        if (scrollQueued) return;
        scrollQueued = true;
        window.setTimeout(() => { scrollQueued = false; syncDots(); }, 120);
      }, { passive: true });
      let resizeTimer;
      window.addEventListener("resize", () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(buildDots, 200);
      });

      buildDots();
      schedule();
    });
  }

  /* ------------------------------------------------------------------
     Sort dropdown
     The native <select> can't be styled when open, so it is swapped for a
     button + listbox (ARIA "select-only combobox" pattern). The hidden
     select stays the source of truth and still fires "change".
     ------------------------------------------------------------------ */
  function setupSortMenu(select) {
    const CHECK = '<svg class="icon icon-sm" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
    const CHEVRON = '<svg class="icon icon-sm sort-chevron" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6"/></svg>';
    const options = Array.from(select.options);
    const wrap = document.createElement("div");
    wrap.className = "sort-menu";
    wrap.innerHTML = `
      <button class="sort-trigger" type="button" id="sort-trigger" role="combobox" aria-haspopup="listbox"
              aria-expanded="false" aria-controls="sort-options" aria-labelledby="sort-label sort-trigger">
        <span class="sort-value"></span>${CHEVRON}
      </button>
      <ul class="sort-options" id="sort-options" role="listbox" aria-labelledby="sort-label" hidden>
        ${options.map((o, i) => `<li class="sort-option" role="option" id="sort-opt-${i}" data-value="${escapeHTML(o.value)}" aria-selected="false">${CHECK}<span>${escapeHTML(o.text)}</span></li>`).join("")}
      </ul>`;
    select.hidden = true;
    select.setAttribute("tabindex", "-1");
    select.after(wrap);

    const trigger = wrap.querySelector(".sort-trigger");
    const list = wrap.querySelector(".sort-options");
    const items = Array.from(list.children);
    let active = 0;

    function sync() {
      trigger.querySelector(".sort-value").textContent = select.options[select.selectedIndex].text;
      items.forEach((li, i) => li.setAttribute("aria-selected", String(i === select.selectedIndex)));
    }
    function highlight(index) {
      active = (index + items.length) % items.length;
      items.forEach((li, i) => li.classList.toggle("is-active", i === active));
      trigger.setAttribute("aria-activedescendant", items[active].id);
    }
    function open() {
      list.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      highlight(select.selectedIndex);
    }
    function close({ focus = true } = {}) {
      list.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      trigger.removeAttribute("aria-activedescendant");
      if (focus) trigger.focus();
    }
    function choose(index) {
      if (select.selectedIndex !== index) {
        select.selectedIndex = index;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
      sync();
      close();
    }

    trigger.addEventListener("click", () => (list.hidden ? open() : close()));
    // Focus stays on the trigger; the highlighted option is exposed via aria-activedescendant.
    trigger.addEventListener("keydown", (event) => {
      const isOpen = !list.hidden;
      const keys = {
        ArrowDown: () => (isOpen ? highlight(active + 1) : open()),
        ArrowUp: () => (isOpen ? highlight(active - 1) : open()),
        Home: () => isOpen && highlight(0),
        End: () => isOpen && highlight(items.length - 1),
        Enter: () => (isOpen ? choose(active) : open()),
        " ": () => (isOpen ? choose(active) : open()),
        Escape: () => isOpen && close(),
        Tab: () => isOpen && close({ focus: false }),
      };
      if (!keys[event.key]) return;
      if (event.key !== "Tab") event.preventDefault();
      if (event.key === "Escape" && isOpen) event.stopPropagation();
      keys[event.key]();
    });
    list.addEventListener("mousedown", (event) => event.preventDefault()); // Keep focus on the trigger.
    list.addEventListener("click", (event) => {
      const li = event.target.closest('[role="option"]');
      if (li) choose(items.indexOf(li));
    });
    list.addEventListener("mousemove", (event) => {
      const li = event.target.closest('[role="option"]');
      if (li && items.indexOf(li) !== active) highlight(items.indexOf(li));
    });
    document.addEventListener("click", (event) => {
      if (!list.hidden && !wrap.contains(event.target)) close({ focus: false });
    });
    select.addEventListener("change", sync); // Stay in sync if the value is set elsewhere.
    sync();
  }

  /* ------------------------------------------------------------------
     Back to top
     ------------------------------------------------------------------ */
  function setupBackToTop() {
    const button = $("back-to-top");
    const logo = document.querySelector(".site-header .logo");
    const SHOW_AFTER = 600;
    let ticking = false;

    function update() {
      button.classList.toggle("is-visible", window.scrollY > SHOW_AFTER);
      ticking = false;
    }

    window.addEventListener("scroll", () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }, { passive: true });

    button.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
      // Move keyboard focus to the top of the page as well.
      logo.focus({ preventScroll: true });
    });

    window.requestAnimationFrame(update); // Avoid forcing layout during start-up.
  }

  /* ------------------------------------------------------------------
     Init
     ------------------------------------------------------------------ */
  function init() {
    if (el.year) el.year.textContent = String(new Date().getFullYear());

    renderCatalogue();
    saveCart(); // Persist the cleaned-up state so invalid saved data is not read again.
    saveWishlist();
    render();

    // One delegated handler covers every card, drawer row and link.
    document.addEventListener("click", (event) => {
      const actionButton = event.target.closest("button[data-action]");
      if (actionButton) {
        const { action, id } = actionButton.dataset;
        if (actionButton.getAttribute("aria-disabled") !== "true" && productById.has(id) && ACTIONS[action]) {
          ACTIONS[action](id);
        }
        return;
      }

      const tab = event.target.closest("[data-filter-tab]");
      if (tab) { setFilter(tab.dataset.filterTab); return; }

      const tile = event.target.closest("[data-filter]");
      if (tile) { setFilter(tile.dataset.filter); goToCollection(); return; }

      if (event.target.closest("[data-clear-search]")) { resetView(); el.collection.focus(); return; }

      // Links into the collection (or to a product) reset or set the view first.
      const link = event.target.closest("a[data-show-all], a[data-filter-link]");
      if (link) {
        if (link.dataset.filterLink) { view.query = ""; el.searchInput.value = ""; setFilter(link.dataset.filterLink); }
        else resetView({ announceChange: false });
      }
    });

    setupHeader();
    setupDrawer(el.cartDrawer, el.cartButton);
    setupDrawer(el.wishlistDrawer, el.wishlistButton);
    setupCountdown();
    setupNewsletter();
    setupBackToTop();
    setupHeroVideo();
    setupHeaderOverlay();
    setupReveals();
    setupSliders();
    const sortSelect = document.getElementById("sort-select");
    if (sortSelect) {
      sortSelect.addEventListener("change", () => sortGrid(sortSelect.value));
      setupSortMenu(sortSelect);
    }

    // Keep multiple open tabs in sync.
    window.addEventListener("storage", (event) => {
      const all = event.key === null; // localStorage.clear() in another tab
      if (!all && event.key !== STORAGE_KEYS.cart && event.key !== STORAGE_KEYS.wishlist) return;
      state.cart = sanitizeCart(storage.read(STORAGE_KEYS.cart));
      state.wishlist = sanitizeWishlist(storage.read(STORAGE_KEYS.wishlist));
      render();
    });
  }

  init();
})();
