(() => {
  // ---- Catalogue: swap in real names, prices and photos (image: "assets/products/tee.jpg") ----
  const PRODUCTS = [
    { id: "tee-black",     name: "Star Tee",          type: "Heavyweight cotton — Black", category: "tops",        price: 45,  image: null },
    { id: "hood-black",    name: "North Hoodie",      type: "Brushed fleece — Black",     category: "tops",        price: 95,  image: null },
    { id: "cap",           name: "Emblem Cap",        type: "Six-panel — Black",          category: "accessories", price: 38,  image: null },
    { id: "crew-bone",     name: "Circle Crewneck",   type: "Loopback — Bone",            category: "tops",        price: 85,  image: null },
    { id: "pant",          name: "Field Pant",        type: "Twill — Black",              category: "bottoms",     price: 110, image: null },
    { id: "tee-white",     name: "Star Tee",          type: "Heavyweight cotton — White", category: "tops",        price: 45,  image: null },
    { id: "short",         name: "Sweat Short",       type: "Fleece — Heather",           category: "bottoms",     price: 60,  image: null },
    { id: "tote",          name: "Carry Tote",        type: "Canvas — Natural",           category: "accessories", price: 30,  image: null },
  ];

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const money = (n) => `$${n}`;
  const mark = '<svg aria-hidden="true"><use href="#mark"/></svg>';

  // ---- Wordmark: scale "JULZ ✦" to exactly fill the content width ----
  const word = $("[data-fit]");
  const fit = () => {
    if (!word) return;
    const cs = getComputedStyle(word.parentElement);
    const avail = word.parentElement.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    word.style.fontSize = "100px";
    const w = word.getBoundingClientRect().width;
    word.style.fontSize = `${(100 * avail) / w}px`;
  };
  fit();
  addEventListener("resize", fit);
  document.fonts?.ready.then(fit);

  // ---- Product grid ----
  const grid = $("[data-grid]");
  grid.innerHTML = PRODUCTS.map((p, i) => `
    <li class="card" data-cat="${p.category}" style="--d:${(i % 4) * 0.06}s">
      <div class="card__media">
        ${p.image
          ? `<img src="${p.image}" alt="${p.name}, ${p.type}" loading="lazy">`
          : `<div class="card__ph">${mark}</div><span class="card__soon">Photo soon</span>`}
        <span class="card__num">${String(i + 1).padStart(2, "0")}</span>
        <button class="card__add" type="button" data-add="${p.id}">Add to bag +</button>
      </div>
      <div class="card__meta"><span class="k">${p.name}</span><span class="k">${money(p.price)}</span></div>
      <p class="card__type">${p.type}</p>
    </li>`).join("");

  const shown = $("[data-shown]");
  const setShown = () => { shown.textContent = `(${$$(".card:not([hidden])").length})`; };
  setShown();

  $$("[data-filter]").forEach((btn) => btn.addEventListener("click", () => {
    $$("[data-filter]").forEach((b) => { b.classList.toggle("is-on", b === btn); b.setAttribute("aria-pressed", b === btn); });
    const f = btn.dataset.filter;
    $$(".card").forEach((c) => { c.hidden = f !== "all" && c.dataset.cat !== f; });
    setShown();
  }));

  // ---- Bag (front-end only until a store backend is connected) ----
  let bag = [];
  try { bag = JSON.parse(localStorage.getItem("julz-bag") || "[]"); } catch {}
  const save = () => { try { localStorage.setItem("julz-bag", JSON.stringify(bag)); } catch {} };
  const drawer = $(".bag"), scrim = $(".scrim"), bagBtn = $(".bar__bag");

  const render = () => {
    const count = bag.reduce((n, x) => n + x.qty, 0);
    $$("[data-bag-count]").forEach((el) => { el.textContent = count; });
    $("[data-bag-empty]").hidden = count > 0;
    $("[data-bag-total]").textContent = money(bag.reduce((s, x) => s + x.qty * PRODUCTS.find((p) => p.id === x.id).price, 0));
    $("[data-bag-list]").innerHTML = bag.map((x) => {
      const p = PRODUCTS.find((q) => q.id === x.id);
      return `<li>
        <div class="bag__thumb">${mark}</div>
        <div><span class="k">${p.name}</span><small>${p.type} · Qty ${x.qty}</small></div>
        <button type="button" data-remove="${p.id}">Remove</button>
      </li>`;
    }).join("");
  };

  const open = () => { drawer.hidden = scrim.hidden = false; $("[data-bag-close].k", drawer).focus(); };
  const close = () => { drawer.hidden = scrim.hidden = true; bagBtn.focus(); };

  grid.addEventListener("click", (e) => {
    const id = e.target.closest("[data-add]")?.dataset.add;
    if (!id) return;
    const line = bag.find((x) => x.id === id);
    line ? line.qty++ : bag.push({ id, qty: 1 });
    save(); render();
    bagBtn.classList.remove("is-bump"); void bagBtn.offsetWidth; bagBtn.classList.add("is-bump");
  });
  $("[data-bag-list]").addEventListener("click", (e) => {
    const id = e.target.closest("[data-remove]")?.dataset.remove;
    if (!id) return;
    bag = bag.filter((x) => x.id !== id);
    save(); render();
  });
  $("[data-bag-open]").addEventListener("click", open);
  $$("[data-bag-close]").forEach((el) => el.addEventListener("click", close));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !drawer.hidden) close(); });
  render();

  // ---- Newsletter (connect to your email provider) ----
  const form = $("[data-join]");
  const status = $(".foot__status");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.value.trim());
    status.classList.toggle("is-error", !ok);
    status.textContent = ok ? "You're on the list." : "Check that email and try again.";
    if (ok) form.reset();
  });

  $$("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
