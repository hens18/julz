(() => {
  document.documentElement.classList.add("js");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Nav background once the hero is scrolled past
  const nav = document.querySelector("[data-nav]");
  const onScroll = () => nav.classList.toggle("is-scrolled", scrollY > 40);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Hide the hero video if every source fails, leaving the SVG fallback
  const video = document.querySelector(".hero__video");
  const sources = video ? [...video.querySelectorAll("source")] : [];
  const last = sources[sources.length - 1];
  if (last) last.addEventListener("error", () => { video.style.display = "none"; });
  if (video && reduceMotion) video.pause();

  // Staggered scroll reveals
  const revealEls = document.querySelectorAll("[data-reveal]");
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const siblings = [...entry.target.parentElement.querySelectorAll(":scope > [data-reveal]")];
      entry.target.style.setProperty("--d", `${Math.max(0, siblings.indexOf(entry.target)) * 0.09}s`);
      entry.target.classList.add("is-in");
      io.unobserve(entry.target);
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
  revealEls.forEach((el) => io.observe(el));

  // Follower count-up
  const counter = document.querySelector("[data-count]");
  if (counter) {
    const target = Number(counter.dataset.count);
    const run = () => {
      if (reduceMotion) { counter.textContent = target; return; }
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / 1800);
        counter.textContent = Math.round(target * (1 - Math.pow(1 - t, 4)));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    new IntersectionObserver(([e], obs) => {
      if (e.isIntersecting) { run(); obs.disconnect(); }
    }, { threshold: 0.5 }).observe(counter);
  }

  // Starfield: one light per follower, drifting slowly around the count
  const canvas = document.querySelector(".circle__sky");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    const stars = Array.from({ length: 205 }, () => ({
      a: Math.random() * Math.PI * 2,
      r: 0.18 + Math.pow(Math.random(), 0.7) * 0.62,
      s: 0.4 + Math.random() * 1.3,
      tw: Math.random() * Math.PI * 2,
      v: (Math.random() * 0.5 + 0.2) * 0.0006,
    }));
    let w, h, dpr, visible = false;
    const size = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const draw = (time = 0) => {
      ctx.clearRect(0, 0, w, h);
      const R = Math.max(w, h) * 0.62;
      for (const st of stars) {
        const a = st.a + (reduceMotion ? 0 : time * st.v * 0.05);
        const x = w / 2 + Math.cos(a) * st.r * R;
        const y = h / 2 + Math.sin(a) * st.r * R * 0.62;
        const alpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(st.tw + time * 0.0012));
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, st.s, 0, Math.PI * 2);
        ctx.fill();
      }
      if (visible && !reduceMotion) requestAnimationFrame(draw);
    };
    size();
    addEventListener("resize", () => { size(); draw(performance.now()); });
    new IntersectionObserver(([e]) => {
      const was = visible;
      visible = e.isIntersecting;
      if (visible && !was) requestAnimationFrame(draw);
    }).observe(canvas);
    draw();
  }

  // Waitlist form — front-end only; connect to your email provider's endpoint
  const form = document.querySelector("[data-join]");
  if (form) {
    const status = form.querySelector(".join__status");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = form.email.value.trim();
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      status.classList.toggle("is-error", !ok);
      if (!ok) { status.textContent = "That email doesn't look right — try again."; return; }
      status.textContent = "You're in. Watch the sky. ✦";
      form.reset();
    });
  }

  document.querySelectorAll("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
