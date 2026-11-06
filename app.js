// Top Marmoraria — prévia conceitual (Bruno Luque). Ideia central: "Da chapa à peça".
// Camadas de motion:
//  - Assinatura: o corte da chapa no hero (cena presa curta no desktop; versão curta no celular).
//  - Narrativa: mesa de amostras (pedras), trilho de projetos com recorte/guias, linha do processo, faixas de cor (arquitetos).
//  - Interface: botões, chips, menu, CTA magnético, topo e dock.
// O conteúdo funciona sem este arquivo: os estados escondidos só existem depois de `motion-ready`.

const root = document.documentElement;
const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
const fineMQ = matchMedia('(hover: hover) and (pointer: fine)');
const deskMQ = matchMedia('(min-width: 1024px)');
const reduce = reduceMQ.matches;
if (reduce) root.classList.add('reduce');

// tokens (espelham o CSS)
const EASE_OUT = [0.23, 1, 0.32, 1];
const EASE_IO = [0.77, 0, 0.175, 1];
const SPRING = { type: 'spring', stiffness: 260, damping: 30, mass: 1 };

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const M = window.Motion || null;
const motionOn = !!M && !reduce;
const animate = M ? M.animate : null;
const prog = (p) => (typeof p === 'number' ? p : p?.y?.progress ?? 0);

/* ------------------------------------------------------------------ */
/* Topo, menu e dock                                                   */
/* ------------------------------------------------------------------ */
const top = $('[data-top]');
const dock = $('[data-dock]');
const menu = $('[data-menu]');
const menuBtn = $('[data-menu-btn]');
let contactVisible = false;
const onScrollUI = () => {
  top.classList.toggle('is-solid', scrollY > 24);
  if (dock) dock.classList.toggle('is-on', scrollY > innerHeight * 0.8 && !contactVisible);
};
addEventListener('scroll', onScrollUI, { passive: true });
onScrollUI();
const contactEl = $('#contato');
if (contactEl && 'IntersectionObserver' in window) {
  new IntersectionObserver(([e]) => { contactVisible = e.isIntersecting; onScrollUI(); }, { threshold: 0.15 }).observe(contactEl);
}
function setMenu(open) {
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.querySelector('.sr').textContent = open ? 'Fechar menu' : 'Abrir menu';
  menu.classList.toggle('is-open', open);
}
menuBtn?.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); } });
deskMQ.addEventListener('change', () => setMenu(false));

/* ------------------------------------------------------------------ */
/* Rolagem contínua (Lenis) — só roda do mouse; toque fica nativo       */
/* ------------------------------------------------------------------ */
let lenis = null;
function startLenis() {
  if (reduce || !fineMQ.matches || !window.Lenis || lenis) return;
  lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.95 });
  const raf = (t) => { if (!lenis) return; lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}
if (window.Lenis) startLenis(); else addEventListener('load', startLenis, { once: true });
reduceMQ.addEventListener('change', () => { if (reduceMQ.matches && lenis) { lenis.destroy(); lenis = null; } });
const scrollToY = (y) => {
  if (lenis) lenis.scrollTo(y, { duration: 1.2, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
};

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href');
  if (id.length < 2) return;
  const target = id === '#inicio' ? document.body : $(id);
  if (!target) return;
  e.preventDefault();
  setMenu(false);
  const y = id === '#inicio' ? 0 : target.getBoundingClientRect().top + scrollY - (id === '#projetos' ? 0 : top.offsetHeight + 8);
  scrollToY(y);
  if (id !== '#inicio') { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
});

/* ------------------------------------------------------------------ */
/* Pedras: índice + mesa de amostras                                   */
/* ------------------------------------------------------------------ */
const stones = $$('[data-stone]');
const samples = $$('[data-sample]');
let activeStone = 0;
root.classList.add('ui-ready');
const slot = (d) => (deskMQ.matches
  ? { x: `${d * 15}%`, y: `${-d * 4.5}%`, scale: 1 - d * 0.065, rotate: d * 1.2 }
  : { x: `${d * 13}%`, y: `${-d * 4}%`, scale: 1 - d * 0.07, rotate: d * 1 });
function placeSamples(animated) {
  samples.forEach((s, j) => {
    const d = (j - activeStone + samples.length) % samples.length;
    const t = slot(d);
    s.style.zIndex = String(10 - d);
    s.style.filter = d ? `brightness(${(1 - d * 0.035).toFixed(3)})` : '';
    if (animate) {
      // a amostra escolhida sobe à frente (mola); as outras recuam na pilha
      const go = animated && motionOn;
      const lift = go && d === 0 ? { y: ['-14%', t.y] } : {};
      animate(s, { x: t.x, y: t.y, scale: t.scale, rotate: t.rotate, ...lift }, go ? (d === 0 ? { ...SPRING, stiffness: 220 } : SPRING) : { duration: 0 });
    } else {
      s.style.transform = `translate(${t.x}, ${t.y}) scale(${t.scale}) rotate(${t.rotate}deg)`;
    }
  });
}
function setStone(i) {
  if (i === activeStone) return;
  stones[activeStone].classList.remove('is-active');
  $('.stone__btn', stones[activeStone]).setAttribute('aria-expanded', 'false');
  activeStone = i;
  stones[i].classList.add('is-active');
  $('.stone__btn', stones[i]).setAttribute('aria-expanded', 'true');
  placeSamples(true);
}
stones.forEach((li, i) => $('.stone__btn', li).addEventListener('click', () => setStone(i)));
if (samples.length) {
  // com JS, a pilha passa a ser controlada por transform (independente do leque estático do CSS)
  samples.forEach((s) => { s.style.transform = 'none'; });
  placeSamples(false);
}

/* ------------------------------------------------------------------ */
/* Projetos: carrossel nativo (base) ou trilho preso (desktop)          */
/* ------------------------------------------------------------------ */
const works = $('[data-works]');
const track = $('[data-track]');
const bar = $('[data-works-bar]');
const intro = $('[data-works-intro]');
const chips = $$('[data-go]');
const groups = $$('[data-group]');
let pinned = false;
let maxX = 0;
let curX = 0;
const stepPx = () => Math.min(innerWidth * 0.6, 520);

function setChip(x) {
  let current = null;
  groups.forEach((g) => { if (g.offsetLeft - innerWidth * 0.5 <= x) current = g.dataset.group; });
  chips.forEach((c) => c.classList.toggle('is-on', c.dataset.go === current));
}
function setBar(p) { if (bar) bar.style.transform = `scaleX(${p.toFixed(4)})`; }

function layoutWorks() {
  pinned = motionOn && deskMQ.matches;
  root.classList.toggle('works-pin', pinned);
  if (pinned) {
    track.style.transform = '';
    maxX = Math.max(0, track.scrollWidth - innerWidth);
    works.style.height = `${innerHeight + maxX}px`;
  } else {
    works.style.height = '';
    track.style.transform = '';
    if (intro) intro.style.transform = '';
  }
}
function renderWorks(p) {
  if (!pinned) return;
  curX = p * maxX;
  track.style.transform = `translate3d(${-curX.toFixed(1)}px,0,0)`;
  setBar(p); setChip(curX);
  if (intro) intro.style.transform = `translate3d(${-curX.toFixed(1)}px, -42%, 0)`; // o texto de abertura segue o trilho
}
function goWorks(dir) {
  if (pinned) scrollToY(scrollY + dir * stepPx());
  else track.scrollBy({ left: dir * stepPx(), behavior: reduce ? 'auto' : 'smooth' });
}
$('[data-prev]')?.addEventListener('click', () => goWorks(-1));
$('[data-next]')?.addEventListener('click', () => goWorks(1));
track.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') { e.preventDefault(); goWorks(1); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); goWorks(-1); }
});
chips.forEach((c) => c.addEventListener('click', () => {
  const g = $(`[data-group="${c.dataset.go}"]`);
  const x = g.offsetLeft - parseFloat(getComputedStyle(track).paddingLeft);
  if (pinned) scrollToY(works.getBoundingClientRect().top + scrollY + clamp(x, 0, maxX));
  else track.scrollTo({ left: x, behavior: reduce ? 'auto' : 'smooth' });
}));
track.addEventListener('scroll', () => {
  if (pinned) return;
  const m = track.scrollWidth - track.clientWidth;
  setBar(m > 0 ? track.scrollLeft / m : 0); setChip(track.scrollLeft);
}, { passive: true });

/* ------------------------------------------------------------------ */
/* CTA magnético (só ponteiro fino)                                    */
/* ------------------------------------------------------------------ */
function springVec(apply, { stiffness = 220, damping = 18 } = {}) {
  const s = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, raf: 0, last: 0 };
  const tick = (t) => {
    const dt = Math.min(0.032, (t - (s.last || t)) / 1000 || 0.016); s.last = t;
    for (const k of ['x', 'y']) {
      const v = 'v' + k, tk = 't' + k;
      s[v] += (-stiffness * (s[k] - s[tk]) - damping * s[v]) * dt; s[k] += s[v] * dt;
    }
    apply(s.x, s.y);
    if (Math.abs(s.x - s.tx) + Math.abs(s.y - s.ty) + Math.abs(s.vx) + Math.abs(s.vy) > 0.01) s.raf = requestAnimationFrame(tick);
    else { s.raf = 0; s.last = 0; }
  };
  return (x, y) => { s.tx = x; s.ty = y; if (!s.raf) s.raf = requestAnimationFrame(tick); };
}
if (!reduce && fineMQ.matches) {
  $$('[data-magnetic]').forEach((b) => {
    const set = springVec((x, y) => { b.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`; });
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      set((e.clientX - r.left - r.width / 2) * 0.16, (e.clientY - r.top - r.height / 2) * 0.3);
    });
    b.addEventListener('pointerleave', () => set(0, 0));
  });
}

/* ------------------------------------------------------------------ */
/* HERO: o corte da chapa                                               */
/* ------------------------------------------------------------------ */
const hero = $('[data-hero]');
const pin = $('[data-hero-pin]');
const piece = $('[data-piece]');
const pieceImg = $('img', piece);
const halfA = $('[data-half-a]');
const halfB = $('[data-half-b]');
const cutSvg = $('[data-cut]');
const cutLine = $('[data-cut-line]');
const spark = $('[data-spark]');
const caption = $('.hero__caption', piece);
const heroSteps = $$('[data-hero-steps] li');
let heroMode = 'static'; // 'desk' | 'mob' | 'static'
// geometria do corte (em % da chapa): topo -> base
const CUT = { desk: [50, 42], mob: [66, 34] };

function setHeroStep(i) { heroSteps.forEach((li, k) => li.classList.toggle('is-on', k === i)); }
// o traço é desenhado em pixels reais (sem distorção da espessura nem do tracejado)
function sizeCut() {
  if (heroMode === 'static') return;
  const r = cutSvg.getBoundingClientRect();
  if (!r.width) return;
  const [t, b] = CUT[heroMode];
  cutSvg.setAttribute('viewBox', `0 0 ${r.width.toFixed(1)} ${r.height.toFixed(1)}`);
  cutLine.setAttribute('x1', (r.width * t / 100).toFixed(1)); cutLine.setAttribute('y1', '0');
  cutLine.setAttribute('x2', (r.width * b / 100).toFixed(1)); cutLine.setAttribute('y2', r.height.toFixed(1));
}
function clipPiece() {
  sizeCut();
  if (heroMode !== 'desk') { piece.style.clipPath = ''; return; }
  const H = pin.getBoundingClientRect();
  const P = piece.getBoundingClientRect();
  const [t, b] = CUT.desk;
  const cutX = (y) => H.width * (t - (t - b) * (y / H.height)) / 100;
  const gap = 18;
  const l1 = cutX(P.top - H.top) + gap - (P.left - H.left);
  const l2 = cutX(P.bottom - H.top) + gap - (P.left - H.left);
  piece.style.clipPath = `polygon(${l1.toFixed(1)}px 0, 100% 0, 100% 100%, ${l2.toFixed(1)}px 100%)`;
}
function resetHero() {
  [halfA, halfB, cutSvg, pieceImg, caption, spark].forEach((el) => { if (el) { el.style.transform = ''; el.style.opacity = ''; } });
  halfB.style.removeProperty('--sheen'); halfB.style.removeProperty('--sheen-x');
  cutLine.style.strokeDashoffset = '';
}
function renderHeroDesk(p) {
  if (heroMode !== 'desk') return;
  const [t, b] = CUT.desk;
  // 1. o traço do corte percorre a chapa
  const d = clamp((p - 0.04) / 0.32);
  cutLine.style.strokeDashoffset = String(1 - d);
  spark.style.left = `${t - (t - b) * d}%`;
  spark.style.top = `${d * 100}%`;
  spark.style.opacity = d > 0.01 && d < 0.99 ? '1' : '0';
  halfB.style.setProperty('--sheen', (Math.sin(Math.PI * d) * 0.85).toFixed(3));
  halfB.style.setProperty('--sheen-x', `${(d * 100).toFixed(1)}%`);
  // 2. a chapa se separa e revela a peça
  const s = easeInOut(clamp((p - 0.38) / 0.44));
  halfB.style.transform = `translate3d(${(s * 66).toFixed(2)}vw, ${(-s * 5).toFixed(2)}vh, 0) rotate(${(-s * 3.5).toFixed(2)}deg)`;
  const shiftA = `translate3d(${(-s * 1.2).toFixed(2)}vw, 0, 0)`;
  halfA.style.transform = shiftA;
  cutSvg.style.transform = shiftA;
  cutSvg.style.opacity = (1 - s * 0.6).toFixed(3);
  pieceImg.style.transform = `scale(${(1.12 - 0.12 * s).toFixed(4)})`;
  // 3. a peça acabada
  const c = clamp((p - 0.8) / 0.14);
  caption.style.opacity = c.toFixed(3);
  caption.style.transform = `translateY(${((1 - c) * 14).toFixed(1)}px)`;
  setHeroStep(p < 0.08 ? 0 : p < 0.62 ? 1 : 2);
}
let mobDrawn = false;
function renderHeroMob() {
  if (heroMode !== 'mob') return;
  const s = easeInOut(clamp(scrollY / (innerHeight * 0.42)));
  halfA.style.transform = `translate3d(${(-s * 72).toFixed(2)}%, ${(-s * 10).toFixed(2)}%, 0) rotate(${(-s * 3).toFixed(2)}deg)`;
  halfB.style.transform = `translate3d(${(s * 72).toFixed(2)}%, ${(s * 10).toFixed(2)}%, 0) rotate(${(s * 3).toFixed(2)}deg)`;
  cutSvg.style.opacity = mobDrawn ? (1 - Math.min(1, s * 2.5)).toFixed(3) : '';
  pieceImg.style.transform = `scale(${(1.1 - 0.1 * s).toFixed(4)})`;
}
function drawCutOnce() {
  // celular: o traço é desenhado uma vez, na entrada
  if (mobDrawn) return;
  const a = cutLine.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 1100, delay: 450, easing: 'cubic-bezier(0.77, 0, 0.175, 1)', fill: 'forwards' });
  a.onfinish = () => { mobDrawn = true; cutLine.style.strokeDashoffset = '0'; a.cancel(); renderHeroMob(); };
}

function applyHeroMode() {
  const next = !motionOn ? 'static' : deskMQ.matches ? 'desk' : 'mob';
  if (next === heroMode) { clipPiece(); return; }
  heroMode = next;
  root.classList.toggle('scene-desk', next === 'desk');
  root.classList.toggle('scene-mob', next === 'mob');
  resetHero();
  clipPiece();
  if (next === 'mob') { if (mobDrawn) cutLine.style.strokeDashoffset = '0'; else drawCutOnce(); renderHeroMob(); }
}

/* ------------------------------------------------------------------ */
/* Motion: coreografia                                                  */
/* ------------------------------------------------------------------ */
if (!M) console.warn('Motion indisponível; página segue estática.');
if (M) {
  const { scroll, inView, stagger } = M;
  root.classList.add('motion-ready');

  if (!reduce) {
    applyHeroMode();
    layoutWorks();

    /* ---- HERO: entrada (nome, mensagem e CTA não esperam a cena) ---- */
    animate('.hero__title .line > span', { transform: ['translateY(105%)', 'translateY(0%)'] }, { duration: 1, delay: stagger(0.09, { startDelay: 0.1 }), ease: EASE_OUT });
    animate('.hero__lead, .hero__actions, .hero__steps', { opacity: [0, 1], transform: ['translateY(12px)', 'translateY(0)'] }, { duration: 0.7, delay: stagger(0.07, { startDelay: 0.35 }), ease: EASE_OUT });
    animate(pieceImg, { opacity: [0, 1] }, { duration: 0.6, ease: EASE_OUT });

    scroll((p) => renderHeroDesk(prog(p)), { target: hero, offset: ['start start', 'end end'] });
    let mobRaf = 0;
    addEventListener('scroll', () => { if (heroMode === 'mob' && !mobRaf) mobRaf = requestAnimationFrame(() => { mobRaf = 0; renderHeroMob(); }); }, { passive: true });

    /* ---- PROJETOS: trilho preso ---- */
    scroll((p) => renderWorks(prog(p)), { target: works, offset: ['start start', 'end end'] });

    /* ---- PROJETOS: recorte com guias + varredura diagonal ---- */
    const HIDDEN = 'polygon(0% 0%, 0% 0%, -45% 100%, -45% 100%)';
    const SHOWN = 'polygon(0% 0%, 145% 0%, 100% 100%, -45% 100%)';
    $$('.work__frame').forEach((frame) => {
      const img = $('img', frame);
      const marks = document.createElement('span');
      marks.className = 'work__marks'; marks.setAttribute('aria-hidden', 'true');
      marks.innerHTML = '<i></i><i></i><i></i><i></i>';
      frame.appendChild(marks);
      img.style.clipPath = HIDDEN;
      marks.style.opacity = '0';
      inView(frame, () => {
        animate(marks, { opacity: [0, 1], transform: ['scale(.8)', 'scale(1)'] }, { duration: 0.6, ease: EASE_OUT });
        animate(img, { clipPath: [HIDDEN, SHOWN], transform: ['scale(1.12)', 'scale(1)'] }, { duration: 1.05, delay: 0.2, ease: EASE_IO });
        animate(marks, { opacity: 0 }, { duration: 0.5, delay: 1.3, ease: EASE_OUT });
      }, { amount: 0.3 });
    });

    /* ---- PROCESSO: a linha dourada avança e acende as etapas ---- */
    const body = $('.process__body');
    const fill = $('[data-process-fill]');
    const psteps = $$('.pstep');
    scroll((p) => {
      const t = prog(p);
      fill.style.transform = `scaleY(${t.toFixed(4)})`;
      const h = t * body.offsetHeight;
      psteps.forEach((s) => s.classList.toggle('is-on', h >= s.offsetTop + 10));
    }, { target: body, offset: ['start 0.7', 'end 0.6'] });

    /* ---- ARQUITETOS: faixas de cor cedem lugar à foto ---- */
    const bandsFig = $('[data-bands]');
    if (bandsFig) {
      const spans = $$('.bands span', bandsFig);
      const img = $('img', bandsFig);
      inView(bandsFig, () => {
        animate(spans, { transform: ['scaleY(1)', 'scaleY(0)'] }, { duration: 0.9, delay: stagger(0.08, { startDelay: 0.1 }), ease: EASE_IO });
        animate(img, { transform: ['scale(1.1)', 'scale(1)'] }, { duration: 1.4, ease: EASE_OUT });
      }, { amount: 0.35 });
    }

    /* ---- Títulos de seção: máscara por linha ---- */
    $$('.mask').forEach((h) => {
      if (h.getBoundingClientRect().top < innerHeight) return;
      const lines = $$('.line > span', h);
      lines.forEach((l) => (l.style.transform = 'translateY(105%)'));
      inView(h.parentElement, () => {
        animate(lines, { transform: ['translateY(105%)', 'translateY(0%)'] }, { duration: 0.95, delay: stagger(0.09), ease: EASE_OUT });
      }, { amount: 0.2 });
    });

    /* ---- recalcula geometria ---- */
    let rT = 0;
    const relayout = () => { applyHeroMode(); layoutWorks(); placeSamples(false); renderHeroMob(); };
    addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(relayout, 120); });
    addEventListener('load', relayout, { once: true });
    document.fonts?.ready.then(relayout);
  }
}
