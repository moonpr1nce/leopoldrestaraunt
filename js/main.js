/* Leopold — интерактивность сайта. Без зависимостей. */
(() => {
  "use strict";

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const WA_PHONE = "996998000333";
  const TZ = "Asia/Bishkek";
  const OPEN_H = 11, CLOSE_H = 23;

  /* ---------- время в Бишкеке ---------- */
  function bishkekNow() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date());
    const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
    return { date: `${p.year}-${p.month}-${p.day}`, h: +p.hour, m: +p.minute };
  }

  /* ---------- прелоадер ---------- */
  const markLoaded = () => document.documentElement.classList.add("is-loaded");
  if (document.readyState === "complete") setTimeout(markLoaded, 300);
  else window.addEventListener("load", () => setTimeout(markLoaded, 300));
  setTimeout(markLoaded, 2800); // не держим пользователя, если картинки грузятся долго

  /* ---------- разбивка текста на буквы ---------- */
  $$("[data-split], .split-scroll").forEach((el) => {
    const text = el.textContent;
    el.textContent = "";
    [...text].forEach((ch, i) => {
      const outer = document.createElement("span");
      outer.className = "char";
      outer.style.setProperty("--i", i);
      const inner = document.createElement("span");
      inner.textContent = ch;
      outer.append(el.matches("[data-split]") ? inner : ch);
      el.append(outer);
    });
  });

  /* ---------- слайдер в hero ---------- */
  const slides = $$(".hero__slide");
  const dots = $$(".hero__dots button");
  let slide = 0, slideTimer;
  function showSlide(n) {
    slide = (n + slides.length) % slides.length;
    slides.forEach((s, i) => {
      s.classList.toggle("is-active", i === slide);
      // перезапуск ken burns
      const img = s.querySelector("img");
      if (i === slide) { img.style.animation = "none"; img.offsetWidth; img.style.animation = ""; }
    });
    dots.forEach((d, i) => d.setAttribute("aria-selected", String(i === slide)));
    clearTimeout(slideTimer);
    if (!reduced) slideTimer = setTimeout(() => showSlide(slide + 1), 7000);
  }
  dots.forEach((d, i) => d.addEventListener("click", () => showSlide(i)));
  if (slides.length) showSlide(0);

  /* ---------- шапка, прогресс, FAB ---------- */
  const header = $("#header");
  const progress = $(".progress");
  const fab = $(".fab");
  let lastY = scrollY;
  function onScrollUI() {
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    header.classList.toggle("is-scrolled", y > 40);
    const menuOpen = document.body.classList.contains("is-locked");
    header.classList.toggle("is-hidden", !menuOpen && y > lastY && y > innerHeight * 0.8);
    fab.classList.toggle("is-visible", y > innerHeight * 0.6);
    lastY = y;
  }

  /* активный пункт меню */
  const navLinks = $$(".nav a");
  const sectionObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${e.target.id}`));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  navLinks.forEach((a) => { const t = $(a.getAttribute("href")); if (t) sectionObs.observe(t); });

  /* ---------- мобильное меню ---------- */
  const burger = $(".burger");
  const mnav = $("#mnav");
  function setMenu(open) {
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    mnav.classList.toggle("is-open", open);
    mnav.setAttribute("aria-hidden", String(!open));
    document.body.classList.toggle("is-locked", open);
    if (open) header.classList.remove("is-hidden");
  }
  burger.addEventListener("click", () => setMenu(burger.getAttribute("aria-expanded") !== "true"));
  $$("a", mnav).forEach((a) => a.addEventListener("click", () => setMenu(false)));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && mnav.classList.contains("is-open")) { setMenu(false); burger.focus(); } });
  matchMedia("(min-width: 1101px)").addEventListener("change", (e) => e.matches && setMenu(false));

  /* ---------- появление при прокрутке ---------- */
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-in"); revealObs.unobserve(e.target); }
    });
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0.08 });
  $$(".reveal, .clip-reveal").forEach((el) => revealObs.observe(el));

  /* ---------- счётчики ---------- */
  const fmt = (n, dec) => n.toLocaleString("ru-RU", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  function runCounter(el) {
    const target = parseFloat(el.dataset.count);
    const dec = +(el.dataset.decimals || 0);
    const suffix = el.dataset.suffix || "";
    if (reduced) { el.textContent = fmt(target, dec) + suffix; return; }
    const dur = 2000, t0 = performance.now();
    const tick = (t) => {
      const k = Math.min((t - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - k, 4);
      el.textContent = fmt(target * eased, dec) + suffix;
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  const countObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { runCounter(e.target); countObs.unobserve(e.target); } });
  }, { threshold: 0.6 });
  $$("[data-count]").forEach((el) => countObs.observe(el));

  /* ---------- параллакс + горизонтальный скролл + волна в подвале ---------- */
  const parallaxEls = $$("[data-parallax]");
  const sig = $(".signature");
  const sigTrack = $(".signature__track");
  const sigSticky = $(".signature__sticky");
  const panoBg = $(".panorama__bg");
  const footerChars = $$(".footer__big .char");
  const sigStatic = matchMedia("(max-width: 640px)");
  let sigDistance = 0;

  function setupSignature() {
    if (reduced || sigStatic.matches) {
      sig.classList.add("is-static");
      sig.style.height = "";
      sigTrack.style.transform = "";
      return;
    }
    sig.classList.remove("is-static");
    sigDistance = Math.max(0, sigTrack.scrollWidth - innerWidth);
    sig.style.height = `${sigSticky.offsetHeight + sigDistance}px`;
  }
  function sigProgress() {
    const r = sig.getBoundingClientRect();
    const total = sig.offsetHeight - sigSticky.offsetHeight;
    return total > 0 ? Math.min(Math.max(-r.top / total, 0), 1) : 0;
  }

  function onFrame() {
    onScrollUI();
    if (!reduced) {
      parallaxEls.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > innerHeight + 200) return;
        const center = r.top + r.height / 2 - innerHeight / 2;
        el.style.transform = `translate3d(0, ${(-center * parseFloat(el.dataset.parallax)).toFixed(1)}px, 0)`;
      });
      if (!sig.classList.contains("is-static")) {
        sigTrack.style.transform = `translate3d(${(-sigProgress() * sigDistance).toFixed(1)}px, 0, 0)`;
      }
      const pr = panoBg.parentElement.getBoundingClientRect();
      if (pr.bottom > 0 && pr.top < innerHeight) {
        panoBg.style.transform = `translate3d(0, ${(pr.top * -0.12).toFixed(1)}px, 0)`;
      }
      if (footerChars.length) {
        const fr = footerChars[0].parentElement.getBoundingClientRect();
        if (fr.top < innerHeight) {
          const k = Math.min(Math.max((innerHeight - fr.top) / (innerHeight * 0.6), 0), 1);
          footerChars.forEach((c, i) => c.style.setProperty("--y", `${((1 - k) * (40 + (i % 2 ? 30 : -10))).toFixed(1)}px`));
        }
      }
    }
    ticking = false;
  }
  let ticking = false;
  const requestFrame = () => { if (!ticking) { ticking = true; requestAnimationFrame(onFrame); } };
  addEventListener("scroll", requestFrame, { passive: true });
  addEventListener("resize", () => { setupSignature(); requestFrame(); updateInks(); });
  sigStatic.addEventListener("change", setupSignature);
  addEventListener("load", () => { setupSignature(); requestFrame(); });
  setupSignature();
  onFrame();

  /* кнопки слайдера фирменных блюд */
  $$("[data-sig]").forEach((btn) => btn.addEventListener("click", () => {
    const dir = btn.dataset.sig === "next" ? 1 : -1;
    const card = $(".sig", sigTrack);
    const step = card.offsetWidth + parseFloat(getComputedStyle(sigTrack).gap || 0);
    if (sig.classList.contains("is-static")) {
      sigTrack.scrollBy({ left: dir * step, behavior: reduced ? "auto" : "smooth" });
    } else {
      const total = sig.offsetHeight - sigSticky.offsetHeight;
      const top = sig.getBoundingClientRect().top + scrollY;
      const targetP = Math.min(Math.max(sigProgress() + (dir * step) / (sigDistance || 1), 0), 1);
      scrollTo({ top: top + targetP * total, behavior: reduced ? "auto" : "smooth" });
    }
  }));
  sigTrack.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") $("[data-sig='next']").click();
    if (e.key === "ArrowLeft") $("[data-sig='prev']").click();
  });

  /* ---------- курсор и магнитные кнопки ---------- */
  if (finePointer && !reduced) {
    const cursor = $(".cursor");
    const label = $(".cursor__label");
    let cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
    addEventListener("mousemove", (e) => { tx = e.clientX; ty = e.clientY; cursor.classList.add("is-visible"); }, { passive: true });
    document.addEventListener("mouseleave", () => cursor.classList.remove("is-visible"));
    (function loop() {
      cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
      cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      requestAnimationFrame(loop);
    })();
    const labelled = [[".g", "Открыть"], [".signature__track", "Листать"], [".ev", "Бронь"]];
    document.addEventListener("mouseover", (e) => {
      const hit = labelled.find(([sel]) => e.target.closest(sel));
      cursor.classList.toggle("is-label", !!hit);
      label.textContent = hit ? hit[1] : "";
      cursor.classList.toggle("is-hover", !hit && !!e.target.closest("a, button, input, select, textarea, label, .feature"));
    });

    $$(".magnetic").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.25;
        const y = (e.clientY - r.top - r.height / 2) * 0.35;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener("mouseleave", () => { el.style.transform = ""; });
    });
  }

  /* подсветка карточек преимуществ за курсором */
  $$(".feature").forEach((card) => card.addEventListener("pointermove", (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  }));

  /* ---------- «бегунок» под вкладками ---------- */
  function moveInk(ink, btn) {
    if (!ink || !btn) return;
    ink.style.width = `${btn.offsetWidth}px`;
    ink.style.transform = `translateX(${btn.offsetLeft}px)`;
  }
  function updateInks() {
    moveInk($(".tabs__ink"), $(".tabs [aria-selected='true']"));
    moveInk($(".switch__ink"), $(".switch [aria-checked='true']"));
  }

  /* ---------- фильтр меню ---------- */
  const tabs = $$(".tabs button");
  const dishes = $$(".dish");
  function filterMenu(btn) {
    tabs.forEach((t) => { t.setAttribute("aria-selected", String(t === btn)); t.tabIndex = t === btn ? 0 : -1; });
    moveInk($(".tabs__ink"), btn);
    btn.scrollIntoView({ block: "nearest", inline: "center", behavior: reduced ? "auto" : "smooth" });
    const f = btn.dataset.filter;
    let i = 0;
    dishes.forEach((d) => {
      const show = f === "all" || d.dataset.cat === f;
      d.classList.toggle("is-hidden", !show);
      d.classList.remove("is-entering");
      if (show) { d.style.setProperty("--i", i++); void d.offsetWidth; d.classList.add("is-entering"); }
    });
  }
  tabs.forEach((t, idx) => {
    t.tabIndex = idx === 0 ? 0 : -1;
    t.addEventListener("click", () => filterMenu(t));
    t.addEventListener("keydown", (e) => {
      const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!d) return;
      const next = tabs[(idx + d + tabs.length) % tabs.length];
      next.focus(); filterMenu(next);
    });
  });

  /* ---------- панорама: день / закат / ночь ---------- */
  const pano = $(".panorama");
  const panoText = $("[data-pano-text]");
  const panoCopy = {
    day: "Днём — горный хребет Ала-Тоо и солнечная терраса. Идеально для делового обеда и встречи после покупок.",
    sunset: "Закат над Ала-Тоо из окон восьмого этажа — лучшее время для ужина. Попросите столик у окна при бронировании.",
    night: "Ночью центр Бишкека загорается огнями до самого горизонта. Тихая музыка, авторский чай и разговоры до закрытия.",
  };
  function setPano(mode, animate = true) {
    pano.dataset.mode = mode;
    $$(".panorama__bg img").forEach((img) => img.classList.toggle("is-active", img.dataset.mode === mode));
    $$(".switch button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.mode === mode)));
    moveInk($(".switch__ink"), $(`.switch [data-mode='${mode}']`));
    if (!animate) { panoText.textContent = panoCopy[mode]; return; }
    panoText.style.opacity = 0;
    setTimeout(() => { panoText.textContent = panoCopy[mode]; panoText.style.opacity = 1; }, 250);
  }
  $$(".switch button").forEach((b) => b.addEventListener("click", () => setPano(b.dataset.mode)));
  const { h } = bishkekNow();
  setPano(h >= 7 && h < 17 ? "day" : h >= 17 && h < 20 ? "sunset" : "night", false);

  const clock = $("[data-bishkek-time]");
  function tickClock() {
    const n = bishkekNow();
    clock.textContent = `Бишкек ${String(n.h).padStart(2, "0")}:${String(n.m).padStart(2, "0")}`;
  }
  tickClock(); setInterval(tickClock, 30000);

  /* ---------- открыто сейчас ---------- */
  function updateStatus() {
    const n = bishkekNow();
    const mins = n.h * 60 + n.m;
    const open = mins >= OPEN_H * 60 && mins < CLOSE_H * 60;
    const soon = open && CLOSE_H * 60 - mins <= 60;
    $$("[data-open-status]").forEach((el) => {
      el.classList.add("status");
      el.classList.toggle("is-open", open);
      el.classList.toggle("is-closed", !open);
      el.textContent = open
        ? (soon ? `Открыто · закроемся в ${CLOSE_H}:00` : `Открыто до ${CLOSE_H}:00`)
        : `Закрыто · откроемся в ${OPEN_H}:00`;
    });
  }
  updateStatus(); setInterval(updateStatus, 60000);

  /* ---------- мероприятия: превью за курсором ---------- */
  const preview = $(".ev-preview");
  const previewImg = $("img", preview);
  if (finePointer) {
    let px = 0, py = 0, vx = 0, vy = 0, active = false;
    $$(".ev").forEach((ev) => {
      ev.addEventListener("mouseenter", () => { previewImg.src = ev.dataset.img; preview.classList.add("is-visible"); active = true; });
      ev.addEventListener("mouseleave", () => { preview.classList.remove("is-visible"); active = false; });
      ev.addEventListener("mousemove", (e) => { px = e.clientX; py = e.clientY; });
    });
    (function follow() {
      vx += (px - vx) * 0.12; vy += (py - vy) * 0.12;
      if (active || preview.classList.contains("is-visible")) {
        const rot = Math.max(Math.min((px - vx) * 0.05, 8), -8);
        preview.style.left = `${vx + 30}px`;
        preview.style.top = `${vy - preview.offsetHeight / 2}px`;
        preview.style.rotate = `${rot}deg`;
      }
      requestAnimationFrame(follow);
    })();
    // предзагрузка превью
    $$(".ev").forEach((ev) => { const i = new Image(); i.src = ev.dataset.img; });
  }

  /* ---------- галерея: лайтбокс ---------- */
  const lb = $(".lightbox");
  const lbImg = $("img", lb);
  const lbCap = $("figcaption", lb);
  const shots = $$(".g");
  let lbIndex = 0, lbReturn = null;
  function lbShow(i) {
    lbIndex = (i + shots.length) % shots.length;
    const img = $("img", shots[lbIndex]);
    lbImg.style.animation = "none"; void lbImg.offsetWidth; lbImg.style.animation = "";
    lbImg.src = shots[lbIndex].dataset.full;
    lbImg.alt = img.alt;
    lbCap.textContent = `${img.alt} · ${lbIndex + 1} / ${shots.length}`;
  }
  function lbOpen(i) {
    lbReturn = document.activeElement;
    lb.hidden = false;
    requestAnimationFrame(() => lb.classList.add("is-open"));
    document.body.classList.add("is-locked");
    lbShow(i);
    $(".lightbox__close").focus();
  }
  function lbClose() {
    lb.classList.remove("is-open");
    document.body.classList.remove("is-locked");
    setTimeout(() => { lb.hidden = true; }, 300);
    lbReturn?.focus();
  }
  shots.forEach((s, i) => s.addEventListener("click", () => lbOpen(i)));
  $(".lightbox__close").addEventListener("click", lbClose);
  $(".lightbox__nav--prev").addEventListener("click", () => lbShow(lbIndex - 1));
  $(".lightbox__nav--next").addEventListener("click", () => lbShow(lbIndex + 1));
  lb.addEventListener("click", (e) => { if (e.target === lb) lbClose(); });
  addEventListener("keydown", (e) => {
    if (lb.hidden) return;
    if (e.key === "Escape") lbClose();
    if (e.key === "ArrowRight") lbShow(lbIndex + 1);
    if (e.key === "ArrowLeft") lbShow(lbIndex - 1);
    if (e.key === "Tab") { // удерживаем фокус внутри
      const f = $$("button", lb);
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  let touchX = null;
  lb.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) lbShow(lbIndex + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  /* ---------- бронирование ---------- */
  const form = $("#booking-form");
  const fDate = $("#f-date"), fTime = $("#f-time"), fPhone = $("#f-phone"), fGuests = $("#f-guests");
  const done = $(".form__done");

  function fillTimes() {
    const n = bishkekNow();
    const isToday = fDate.value === n.date;
    const nowMins = n.h * 60 + n.m + 30; // бронь не раньше чем через 30 минут
    const prev = fTime.value;
    fTime.innerHTML = "";
    for (let m = OPEN_H * 60; m <= (CLOSE_H - 1) * 60; m += 30) {
      if (isToday && m < nowMins) continue;
      const t = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
      fTime.add(new Option(t, t, false, t === prev));
    }
    if (!fTime.options.length) fTime.add(new Option("На сегодня мест нет — выберите другую дату", ""));
    else if (!prev) fTime.value = [...fTime.options].find((o) => o.value === "19:00")?.value || fTime.options[0].value;
  }
  (function initDate() {
    const n = bishkekNow();
    fDate.min = n.date;
    const max = new Date(); max.setDate(max.getDate() + 90);
    fDate.max = max.toISOString().slice(0, 10);
    // после 22:00 по умолчанию предлагаем завтра
    if (n.h >= CLOSE_H - 1) { const t = new Date(`${n.date}T12:00:00`); t.setDate(t.getDate() + 1); fDate.value = t.toISOString().slice(0, 10); }
    else fDate.value = n.date;
    fillTimes();
  })();
  fDate.addEventListener("change", fillTimes);

  /* маска телефона: +996 XXX XXX XXX */
  fPhone.addEventListener("focus", () => { if (!fPhone.value) fPhone.value = "+996 "; });
  fPhone.addEventListener("blur", () => { if (fPhone.value.trim() === "+996") fPhone.value = ""; });
  fPhone.addEventListener("input", () => {
    let d = fPhone.value.replace(/\D/g, "");
    if (d.startsWith("996")) d = d.slice(3);
    // местный формат 0555 123 456 → +996 555 123 456
    const r = d.replace(/^0+/, "").slice(0, 9);
    fPhone.value = "+996" + (r ? " " + r.slice(0, 3) : "") + (r.length > 3 ? " " + r.slice(3, 6) : "") + (r.length > 6 ? " " + r.slice(6, 9) : "");
  });

  /* гости */
  $$(".stepper button").forEach((b) => b.addEventListener("click", () => {
    const v = Math.min(Math.max((+fGuests.value || 1) + +b.dataset.step, 1), 150);
    fGuests.value = v;
  }));

  /* ссылки, которые предзаполняют форму */
  function preset({ occasion, zone }) {
    if (occasion) { const r = $(`input[name="occasion"][value="${occasion}"]`, form); if (r) r.checked = true; }
    if (zone === "window") $("#f-zone").value = "У панорамного окна";
    if (occasion === "Банкет" || occasion === "Корпоратив") { if (+fGuests.value < 20) fGuests.value = 20; }
  }
  $$("[data-occasion], [data-zone]").forEach((a) => a.addEventListener("click", () => preset(a.dataset)));

  function setError(input, msg) {
    const field = input.closest(".field");
    field.classList.toggle("is-invalid", !!msg);
    $(".field__err", field).textContent = msg || "";
    input.setAttribute("aria-invalid", String(!!msg));
  }
  function validate() {
    const errs = [];
    const name = $("#f-name");
    const nameOk = name.value.trim().length >= 2;
    setError(name, nameOk ? "" : "Как к вам обращаться?"); if (!nameOk) errs.push(name);
    const phoneOk = fPhone.value.replace(/\D/g, "").length === 12;
    setError(fPhone, phoneOk ? "" : "Введите номер полностью: +996 XXX XXX XXX"); if (!phoneOk) errs.push(fPhone);
    const dateOk = !!fDate.value && fDate.value >= fDate.min;
    setError(fDate, dateOk ? "" : "Выберите дату"); if (!dateOk) errs.push(fDate);
    const timeOk = !!fTime.value;
    setError(fTime, timeOk ? "" : "Выберите время"); if (!timeOk) errs.push(fTime);
    return errs;
  }
  $$("input, select", form).forEach((el) => el.addEventListener("input", () => {
    if (el.closest(".field")?.classList.contains("is-invalid")) validate();
  }));

  let waUrl = "";
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const errs = validate();
    if (errs.length) { errs[0].focus(); return; }
    const data = new FormData(form);
    const dateHuman = new Date(`${data.get("date")}T12:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "long" });
    const lines = [
      "Здравствуйте! Хочу забронировать столик в Leopold.",
      "",
      `Имя: ${data.get("name").trim()}`,
      `Телефон: ${data.get("phone")}`,
      `Дата: ${dateHuman}`,
      `Время: ${data.get("time")}`,
      `Гостей: ${data.get("guests")}`,
      `Зона: ${data.get("zone")}`,
      `Повод: ${data.get("occasion")}`,
    ];
    const comment = (data.get("comment") || "").trim();
    if (comment) lines.push(`Комментарий: ${comment}`);
    waUrl = `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(lines.join("\n"))}`;
    $("[data-wa-fallback]").href = waUrl;
    window.open(waUrl, "_blank", "noopener");
    done.hidden = false;
    $("h3", done).setAttribute("tabindex", "-1");
    $("h3", done).focus();
  });
  $("[data-form-reset]").addEventListener("click", () => {
    form.reset();
    done.hidden = true;
    const n = bishkekNow(); fDate.value = n.date; fillTimes();
    $("#f-name").focus();
  });

  /* ---------- мелочи ---------- */
  $$("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });
  addEventListener("load", updateInks);
  document.fonts?.ready.then(updateInks);
  updateInks();
})();
