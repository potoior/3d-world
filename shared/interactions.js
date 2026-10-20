import * as THREE from 'three';

const STYLE_ID = 'xi-style';
const TOUR_INTERVAL = 7000;
const WEATHER_ORDER = ['clear', 'rain', 'snow'];
const WEATHER_LABEL = { clear: '晴', rain: '雨', snow: '雪' };

const STYLE = `
  :root {
    --xi-gold: #d8b46a;
    --xi-gold-soft: rgba(216, 180, 106, 0.34);
    --xi-gold-faint: rgba(216, 180, 106, 0.16);
    --xi-panel: rgba(17, 18, 15, 0.8);
    --xi-panel-solid: rgba(19, 20, 16, 0.94);
    --xi-text: #f2e9d6;
    --xi-muted: rgba(242, 233, 214, 0.56);
    --xi-line: rgba(216, 180, 106, 0.25);
  }
  #xi-sidebar-toggle {
    position: fixed;
    left: 0;
    top: 42%;
    z-index: 9;
    transform: translateY(-50%);
    appearance: none;
    border: 1px solid var(--xi-line);
    border-left: 0;
    border-radius: 0 2px 2px 0;
    background: rgba(17, 18, 15, 0.66);
    color: var(--xi-gold);
    font-family: inherit;
    font-size: 12px;
    letter-spacing: 0.34em;
    padding: 13px 7px 13px 6px;
    writing-mode: vertical-rl;
    cursor: pointer;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    transition: background 0.25s, color 0.25s;
  }
  #xi-sidebar-toggle:hover,
  #xi-sidebar-toggle.active {
    background: rgba(216, 180, 106, 0.16);
    color: #f6e6c2;
  }
  #xi-sidebar {
    position: fixed;
    left: 34px;
    top: 104px;
    bottom: 92px;
    width: 292px;
    z-index: 9;
    display: flex;
    flex-direction: column;
    background: var(--xi-panel);
    border: 1px solid var(--xi-line);
    border-radius: 3px;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.3);
    opacity: 0;
    visibility: hidden;
    transform: translateX(-14px);
    transition: opacity 0.32s ease, transform 0.32s ease, visibility 0.32s;
    pointer-events: none;
  }
  #xi-sidebar.open {
    opacity: 1;
    visibility: visible;
    transform: none;
    pointer-events: auto;
  }
  .xi-side-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 17px 18px 12px;
    border-bottom: 1px solid var(--xi-gold-faint);
  }
  .xi-side-head h2 {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.32em;
    color: var(--xi-text);
  }
  .xi-side-head small {
    display: block;
    margin-top: 5px;
    font-family: "Helvetica Neue", Arial, sans-serif;
    font-size: 8.5px;
    letter-spacing: 0.2em;
    color: var(--xi-muted);
  }
  .xi-close {
    appearance: none;
    border: 1px solid var(--xi-gold-faint);
    background: transparent;
    color: var(--xi-muted);
    width: 26px;
    height: 26px;
    line-height: 1;
    font-size: 15px;
    cursor: pointer;
    border-radius: 2px;
    flex: 0 0 auto;
    transition: color 0.2s, border-color 0.2s;
  }
  .xi-close:hover {
    color: var(--xi-gold);
    border-color: var(--xi-gold-soft);
  }
  .xi-side-list {
    flex: 1;
    overflow-y: auto;
    padding: 9px;
    scrollbar-width: thin;
    scrollbar-color: var(--xi-gold-soft) transparent;
  }
  .xi-side-list::-webkit-scrollbar {
    width: 5px;
  }
  .xi-side-list::-webkit-scrollbar-thumb {
    background: var(--xi-gold-soft);
  }
  .xi-side-item {
    appearance: none;
    width: 100%;
    display: grid;
    grid-template-columns: 28px 1fr;
    gap: 10px;
    text-align: left;
    border: 1px solid transparent;
    background: transparent;
    color: var(--xi-text);
    font-family: inherit;
    padding: 11px 10px;
    cursor: pointer;
    border-radius: 2px;
    transition: background 0.2s, border-color 0.2s;
  }
  .xi-side-item:hover {
    background: rgba(216, 180, 106, 0.08);
    border-color: var(--xi-gold-faint);
  }
  .xi-side-item.active {
    background: rgba(216, 180, 106, 0.14);
    border-color: var(--xi-gold-soft);
  }
  .xi-side-item.visited .xi-side-num::after {
    content: "✓";
    display: block;
    margin-top: 3px;
    font-size: 8px;
    color: #a8c293;
  }
  .xi-side-num {
    font-family: "Helvetica Neue", Arial, sans-serif;
    font-size: 10px;
    letter-spacing: 0.08em;
    color: var(--xi-gold);
    padding-top: 3px;
  }
  .xi-side-item strong {
    display: block;
    font-size: 13.5px;
    font-weight: 600;
    letter-spacing: 0.14em;
    margin-bottom: 5px;
  }
  .xi-side-item p {
    margin: 0;
    font-size: 10.5px;
    line-height: 1.65;
    letter-spacing: 0.04em;
    color: var(--xi-muted);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .xi-stamps {
    padding: 12px 14px 13px;
    border-bottom: 1px solid var(--xi-gold-faint);
  }
  .xi-stamps-text {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 9px;
    font-family: "Helvetica Neue", Arial, sans-serif;
    font-size: 9px;
    letter-spacing: 0.16em;
    color: var(--xi-muted);
  }
  .xi-stamps-text b {
    color: var(--xi-gold);
    font-weight: 500;
  }
  .xi-stamps-row {
    display: flex;
    gap: 6px;
  }
  .xi-stamp {
    width: 27px;
    height: 27px;
    display: grid;
    place-items: center;
    border: 1px solid var(--xi-gold-faint);
    border-radius: 2px;
    color: rgba(216, 180, 106, 0.3);
    font-size: 11px;
    line-height: 1;
    transition: background 0.25s, color 0.25s, border-color 0.25s;
  }
  .xi-stamp.on {
    color: #1a150f;
    background: var(--xi-gold);
    border-color: var(--xi-gold);
  }
  #xi-toast {
    position: fixed;
    left: 50%;
    bottom: 24px;
    z-index: 15;
    transform: translateX(-50%) translateY(8px);
    padding: 9px 18px;
    border: 1px solid var(--xi-line);
    background: var(--xi-panel-solid);
    color: var(--xi-text);
    font-size: 11px;
    letter-spacing: 0.16em;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 0.25s, transform 0.25s, visibility 0.25s;
  }
  #xi-toast.show {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%);
  }
  #xi-dock {
    position: fixed;
    right: 34px;
    bottom: 62px;
    z-index: 9;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
  }
  .xi-btn {
    appearance: none;
    border: 1px solid var(--xi-line);
    border-radius: 2px;
    background: rgba(17, 18, 15, 0.56);
    color: rgba(242, 233, 214, 0.82);
    font-family: inherit;
    font-size: 11.5px;
    letter-spacing: 0.16em;
    padding: 8px 13px;
    min-width: 84px;
    text-align: center;
    cursor: pointer;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    transition: background 0.22s, color 0.22s, border-color 0.22s;
  }
  .xi-btn:hover {
    color: #f7e9c9;
    background: rgba(216, 180, 106, 0.13);
    border-color: var(--xi-gold-soft);
  }
  .xi-btn.active {
    color: #1a150f;
    background: var(--xi-gold);
    border-color: var(--xi-gold);
  }
  #xi-tour-progress {
    width: 84px;
    height: 2px;
    background: rgba(216, 180, 106, 0.14);
    opacity: 0;
    overflow: hidden;
    transition: opacity 0.3s;
  }
  #xi-tour-progress.active {
    opacity: 1;
  }
  #xi-tour-progress span {
    display: block;
    height: 100%;
    width: 0;
    background: var(--xi-gold);
    transition: width 0.12s linear;
  }
  #xi-markers {
    position: fixed;
    inset: 0;
    z-index: 7;
    pointer-events: none;
    overflow: hidden;
  }
  .xi-marker {
    position: absolute;
    left: 0;
    top: 0;
    display: flex;
    align-items: center;
    gap: 7px;
    appearance: none;
    border: 0;
    background: transparent;
    color: var(--xi-text);
    font-family: inherit;
    padding: 0;
    cursor: pointer;
    pointer-events: auto;
    transform: translate(-50%, -50%);
    opacity: 0;
    transition: opacity 0.2s;
    will-change: left, top;
  }
  .xi-marker.visible {
    opacity: 1;
  }
  .xi-dot {
    width: 23px;
    height: 23px;
    flex: 0 0 23px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    border: 1px solid var(--xi-gold-soft);
    background: rgba(17, 18, 15, 0.78);
    color: var(--xi-gold);
    font-family: "Helvetica Neue", Arial, sans-serif;
    font-size: 9px;
    letter-spacing: 0.02em;
    box-shadow: 0 0 0 3px rgba(12, 13, 10, 0.22), 0 2px 12px rgba(0, 0, 0, 0.35);
    transition: background 0.2s, color 0.2s, transform 0.2s;
  }
  .xi-marker:hover .xi-dot,
  .xi-marker.active .xi-dot {
    background: var(--xi-gold);
    color: #17130d;
    transform: scale(1.08);
  }
  .xi-marker-label {
    display: block;
    max-width: 132px;
    padding: 4px 8px;
    border-left: 1px solid var(--xi-gold-soft);
    background: rgba(17, 18, 15, 0.56);
    color: rgba(243, 234, 216, 0.88);
    font-size: 10.5px;
    letter-spacing: 0.1em;
    line-height: 1.35;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px);
  }
  #xi-card {
    position: fixed;
    left: 50%;
    bottom: 108px;
    z-index: 11;
    width: min(340px, calc(100vw - 32px));
    transform: translateX(-50%) translateY(8px);
    background: var(--xi-panel-solid);
    border: 1px solid var(--xi-line);
    border-radius: 3px;
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.4);
    padding: 15px 17px 14px;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 0.24s, transform 0.24s, visibility 0.24s;
  }
  #xi-card.open {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%);
    pointer-events: auto;
  }
  .xi-card-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .xi-card-head h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.16em;
    color: var(--xi-text);
  }
  .xi-card-desc {
    margin: 9px 0 13px;
    font-size: 11px;
    line-height: 1.72;
    letter-spacing: 0.05em;
    color: var(--xi-muted);
  }
  .xi-card-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  .xi-card-actions .xi-btn {
    min-width: 0;
    padding: 7px 18px;
  }
  #scene {
    filter: saturate(1.06) contrast(1.035) brightness(1.01);
  }
  #xi-grade {
    position: fixed;
    inset: 0;
    z-index: 2;
    pointer-events: none;
    background:
      radial-gradient(ellipse at 50% 43%, transparent 50%, rgba(8, 9, 7, 0.26) 100%),
      linear-gradient(180deg, rgba(255, 238, 206, 0.035), transparent 20%, transparent 78%, rgba(8, 10, 8, 0.1));
  }
  #xi-grade::after {
    content: "";
    position: absolute;
    inset: 0;
    opacity: 0.24;
    background-image:
      repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.022) 0, rgba(255, 255, 255, 0.022) 1px, transparent 1px, transparent 3px);
    mix-blend-mode: soft-light;
  }
  #xi-wx-vignette {
    position: fixed;
    inset: 0;
    z-index: 3;
    pointer-events: none;
    opacity: 0;
    transition: opacity 1s ease;
  }
  #xi-wx-vignette.rain {
    opacity: 1;
    background:
      radial-gradient(ellipse at 50% 42%, transparent 42%, rgba(40, 58, 68, 0.3) 100%),
      linear-gradient(to bottom, rgba(58, 76, 86, 0.2), transparent 24%, transparent 72%, rgba(32, 44, 50, 0.26));
  }
  #xi-wx-vignette.snow {
    opacity: 1;
    background:
      radial-gradient(ellipse at 50% 42%, transparent 38%, rgba(214, 229, 236, 0.22) 100%),
      linear-gradient(to bottom, rgba(229, 238, 242, 0.14), transparent 28%, transparent 70%, rgba(190, 207, 216, 0.18));
  }
  #xi-help {
    position: fixed;
    inset: 0;
    z-index: 14;
    display: grid;
    place-items: center;
    background: rgba(7, 8, 6, 0.5);
    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 0.25s, visibility 0.25s;
  }
  #xi-help.open {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }
  .xi-help-panel {
    width: min(440px, calc(100vw - 40px));
    max-height: calc(100vh - 80px);
    overflow-y: auto;
    background: var(--xi-panel-solid);
    border: 1px solid var(--xi-line);
    border-radius: 3px;
    box-shadow: 0 22px 60px rgba(0, 0, 0, 0.45);
    padding: 22px 24px;
  }
  .xi-help-panel h2 {
    margin: 0 0 4px;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.3em;
    color: var(--xi-text);
  }
  .xi-help-panel .xi-help-sub {
    margin: 0 0 16px;
    font-family: "Helvetica Neue", Arial, sans-serif;
    font-size: 8.5px;
    letter-spacing: 0.22em;
    color: var(--xi-muted);
  }
  .xi-help-grid {
    display: grid;
    grid-template-columns: 62px 1fr;
    gap: 8px 14px;
    font-size: 11.5px;
    line-height: 1.6;
    letter-spacing: 0.04em;
    color: var(--xi-muted);
  }
  .xi-help-grid b {
    color: var(--xi-gold);
    font-family: "Helvetica Neue", Arial, sans-serif;
    font-size: 10.5px;
    font-weight: 500;
    letter-spacing: 0.08em;
    padding-top: 1px;
  }
  #xi-photo-hint {
    position: fixed;
    left: 50%;
    bottom: 26px;
    transform: translateX(-50%);
    z-index: 15;
    padding: 8px 17px;
    border: 1px solid var(--xi-line);
    border-radius: 2px;
    background: rgba(17, 18, 15, 0.62);
    color: rgba(243, 234, 216, 0.86);
    font-size: 10.5px;
    letter-spacing: 0.18em;
    white-space: nowrap;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
  }
  body.xi-photo #xi-photo-hint {
    opacity: 1 !important;
    visibility: visible !important;
  }
  body.xi-photo .brand,
  body.xi-photo .toolbar,
  body.xi-photo .caption,
  body.xi-photo .hint,
  body.xi-photo .legend,
  body.xi-photo #fp-hint,
  body.xi-photo .fp-hint,
  body.xi-photo #fp-crosshair,
  body.xi-photo .crosshair,
  body.xi-photo #xi-dock,
  body.xi-photo #xi-sidebar,
  body.xi-photo #xi-sidebar-toggle,
  body.xi-photo #xi-markers,
  body.xi-photo #xi-card,
  body.xi-photo #xi-help,
  body.xi-photo #xi-wx-vignette {
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
    transition: none !important;
  }
  body.fp-active #xi-markers,
  body.fp-active #xi-card,
  body.fp-active #xi-sidebar,
  body.fp-active #xi-sidebar-toggle,
  body.fp-active #xi-dock {
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }
  @media (max-width: 860px) {
    #xi-sidebar {
      left: 12px;
      right: 12px;
      width: auto;
      top: 84px;
      bottom: 142px;
    }
    #xi-dock {
      right: 14px;
      bottom: 96px;
      gap: 5px;
    }
    .xi-btn {
      font-size: 10.5px;
      padding: 7px 10px;
      min-width: 70px;
    }
    #xi-tour-progress {
      width: 70px;
    }
    .xi-marker-label {
      display: none;
    }
    #xi-card {
      bottom: 154px;
    }
  }
`;

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE;
  document.head.appendChild(style);
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function viewAttr(key) {
  return String(key).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function noteFor(notes, key) {
  const n = notes ? notes[key] : null;
  if (Array.isArray(n)) return { title: n[0] || key, desc: n[1] || '' };
  if (n && typeof n === 'object') return { title: n.title || n.name || key, desc: n.desc || n.text || '' };
  if (typeof n === 'string') return { title: n, desc: '' };
  return { title: key, desc: '' };
}

export function initInteractions(options = {}) {
  injectStyle();
  let gradeEl = document.getElementById('xi-grade');
  if (!gradeEl) {
    gradeEl = document.createElement('div');
    gradeEl.id = 'xi-grade';
    document.body.appendChild(gradeEl);
  }

  const sourceViews = options.views || (options.world && options.world.views) || {};
  const sourceNotes = options.notes || (options.world && options.world.notes) || {};
  const camera = options.camera || null;
  const controls = options.controls || null;
  const scene = options.scene || null;
  const renderer = options.renderer || null;
  const canvas = options.canvas || (renderer && renderer.domElement) || document.getElementById('scene');
  const fpRef = options.fp || null;
  const notes = sourceNotes || {};
  const viewKeys = Object.keys(sourceViews || {});
  const landmarkKeys = viewKeys.filter((key) => key !== 'overview');
  const tourKeys = landmarkKeys.length ? landmarkKeys : viewKeys.slice();

  let destroyed = false;
  let activeKey = viewKeys[0] || null;
  let cardKey = null;
  let sidebarOpen = false;
  let helpOpen = false;
  let photoMode = false;
  let internalClick = false;
  let weatherKind = 'clear';
  let soundOn = false;
  let audio = null;
  let rafId = 0;
  let tourTimer = null;

  const tour = { active: false, paused: false, index: -1, elapsed: 0, last: 0 };
  const listeners = [];
  const sidebarItems = new Map();
  const markerEls = new Map();
  const STAMP_KEY = 'xi-stamps:' + location.pathname;
  let visited = new Set();
  try {
    const saved = JSON.parse(localStorage.getItem(STAMP_KEY) || '[]');
    if (Array.isArray(saved)) visited = new Set(saved.filter((key) => landmarkKeys.includes(key)));
  } catch (err) {}
  let stampText = null;
  let stampRow = null;
  let toastEl = null;
  let toastTimer = null;
  let lightTimer = null;
  let focusTween = null;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function on(target, type, handler, opts) {
    if (!target) return;
    target.addEventListener(type, handler, opts);
    listeners.push([target, type, handler, opts]);
  }

  function isFpActive() {
    if (document.body.classList.contains('fp-active')) return true;
    return !!(fpRef && typeof fpRef.isActive === 'function' && fpRef.isActive());
  }

  function firstPersonButton() {
    return document.getElementById('btn-fp') || document.getElementById('btn-walk') ||
      document.querySelector('[data-first-person]');
  }

  function focusAt(event) {
    if (!scene || !camera || !controls || isFpActive() || destroyed) return false;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(scene.children, true);
    const hit = hits.find((h) => {
      const o = h.object;
      if (!o || !o.isMesh || !o.visible) return false;
      if (o.name && o.name.indexOf('xi-') === 0) return false;
      if (o.material && o.material.side === THREE.BackSide) return false;
      return true;
    });
    if (!hit) return false;
    const point = hit.point.clone();
    const dir = camera.position.clone().sub(point);
    if (dir.lengthSq() < 0.0001) return false;
    dir.normalize();
    const dist = THREE.MathUtils.clamp(camera.position.distanceTo(point) * 0.62, 6, 90);
    focusTween = {
      fromP: camera.position.clone(),
      toP: point.clone().add(dir.multiplyScalar(dist)),
      fromT: controls.target.clone(),
      toT: point,
      t: 0,
      dur: 0.62,
    };
    stopTour();
    closeCard();
    toast('聚焦近景 · 拖拽可继续观察');
    return true;
  }

  on(canvas, 'dblclick', focusAt);
  if (controls) on(controls, 'start', () => { focusTween = null; });

  function saveVisited() {
    try {
      localStorage.setItem(STAMP_KEY, JSON.stringify([...visited]));
    } catch (err) {}
  }

  function toast(text) {
    if (!toastEl) {
      toastEl = el('div', '', text);
      toastEl.id = 'xi-toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = text;
    toastEl.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
      toastTimer = null;
    }, 2600);
  }

  function updateStamps() {
    if (stampText) {
      stampText.innerHTML = '已探索 <b>' + visited.size + ' / ' + landmarkKeys.length + '</b>';
    }
    if (stampRow) {
      stampRow.querySelectorAll('.xi-stamp').forEach((node) => {
        node.classList.toggle('on', visited.has(node.dataset.key));
      });
    }
    if (sidebarItems.size) {
      sidebarItems.forEach((node, key) => node.classList.toggle('visited', visited.has(key)));
    }
  }

  function markVisited(key) {
    if (!landmarkKeys.includes(key) || visited.has(key)) return;
    visited.add(key);
    saveVisited();
    updateStamps();
    if (visited.size === landmarkKeys.length) {
      toast('本境地标已全部探索 · 印章集齐');
    }
  }

  function clickFirstPersonButton() {
    const btn = firstPersonButton();
    if (!btn) return false;
    btn.click();
    return true;
  }

  function noteTitle(key) {
    const note = noteFor(notes, key);
    if (note.title && note.title !== key) return note.title;
    const btn = document.querySelector('[data-view="' + viewAttr(key) + '"]');
    if (btn && btn.textContent.trim()) return btn.textContent.trim();
    return key;
  }

  function noteDesc(key) {
    return noteFor(notes, key).desc || '';
  }

  function writeCaption(key) {
    if (typeof options.setCaption === 'function') {
      try {
        options.setCaption(key);
        return;
      } catch (err) {}
    }
    const titleEl = document.getElementById('caption-title');
    const textEl = document.getElementById('caption-text');
    if (titleEl) titleEl.textContent = noteTitle(key);
    if (textEl) textEl.textContent = noteDesc(key);
  }

  function setActiveKey(key) {
    if (!key) return;
    activeKey = key;
    sidebarItems.forEach((node, k) => node.classList.toggle('active', k === key));
    markerEls.forEach((node, k) => node.root.classList.toggle('active', k === key));
  }

  function go(key, opts) {
    if (!sourceViews[key]) return false;
    const user = !opts || opts.user !== false;
    if (user) {
      stopTour();
      closeCard();
    }
    setActiveKey(key);
    markVisited(key);
    if (isFpActive()) {
      if (fpRef && typeof fpRef.exit === 'function') {
        try {
          fpRef.exit();
        } catch (err) {}
      } else {
        clickFirstPersonButton();
      }
    }
    const viewBtn = document.querySelector('[data-view="' + viewAttr(key) + '"]');
    if (viewBtn) {
      internalClick = true;
      try {
        viewBtn.click();
      } finally {
        internalClick = false;
      }
      return true;
    }
    if (typeof options.travelTo === 'function') {
      try {
        options.travelTo(sourceViews[key]);
      } catch (err) {}
      writeCaption(key);
      return true;
    }
    const view = sourceViews[key];
    if (camera && controls && view && view.p && view.t) {
      camera.position.set(view.p[0], view.p[1], view.p[2]);
      controls.target.set(view.t[0], view.t[1], view.t[2]);
      if (typeof view.fov === 'number') {
        camera.fov = view.fov;
        camera.updateProjectionMatrix();
      }
      controls.update();
      writeCaption(key);
      return true;
    }
    return false;
  }

  /* ---------- sidebar ---------- */
  const sidebarToggle = el('button', '', '景 点');
  sidebarToggle.id = 'xi-sidebar-toggle';
  sidebarToggle.type = 'button';
  sidebarToggle.setAttribute('aria-label', '打开地标索引');
  document.body.appendChild(sidebarToggle);

  const sidebar = el('aside');
  sidebar.id = 'xi-sidebar';
  sidebar.setAttribute('aria-label', '地标索引');

  const sideHead = el('div', 'xi-side-head');
  const sideHeadText = el('div');
  const sideTitle = el('h2', '', '地标索引');
  const sideSub = el('small', '', 'LANDMARK INDEX');
  sideHeadText.append(sideTitle, sideSub);
  const sideClose = el('button', 'xi-close', '×');
  sideClose.type = 'button';
  sideClose.setAttribute('aria-label', '关闭地标索引');
  sideHead.append(sideHeadText, sideClose);

  const sideList = el('div', 'xi-side-list');
  const stampBox = el('div', 'xi-stamps');
  stampText = el('div', 'xi-stamps-text', '已探索 0 / ' + landmarkKeys.length);
  stampRow = el('div', 'xi-stamps-row');
  landmarkKeys.forEach((key) => {
    const stamp = el('span', 'xi-stamp', '印');
    stamp.dataset.key = key;
    stamp.title = noteTitle(key);
    stampRow.appendChild(stamp);
  });
  stampBox.append(stampText, stampRow);
  sideList.appendChild(stampBox);
  if (landmarkKeys.length) {
    landmarkKeys.forEach((key, i) => {
      const item = el('button', 'xi-side-item');
      item.type = 'button';
      const num = el('span', 'xi-side-num', String(i + 2).padStart(2, '0'));
      const body = el('span');
      const title = el('strong', '', noteTitle(key));
      const desc = el('p', '', noteDesc(key) || '点击前往该地标');
      body.append(title, desc);
      item.append(num, body);
      item.dataset.key = key;
      item.addEventListener('click', () => go(key, { user: true }));
      sidebarItems.set(key, item);
      sideList.appendChild(item);
    });
  } else {
    sideList.appendChild(el('p', 'xi-card-desc', '暂无可前往的地标'));
  }
  sidebar.append(sideHead, sideList);
  document.body.appendChild(sidebar);

  function setSidebar(open) {
    sidebarOpen = !!open;
    sidebar.classList.toggle('open', sidebarOpen);
    sidebarToggle.classList.toggle('active', sidebarOpen);
    sidebarToggle.textContent = sidebarOpen ? '收 起' : '景 点';
    sidebarToggle.setAttribute('aria-label', sidebarOpen ? '收起地标索引' : '打开地标索引');
  }

  function toggleSidebar() {
    setSidebar(!sidebarOpen);
  }

  on(sidebarToggle, 'click', toggleSidebar);
  on(sideClose, 'click', () => setSidebar(false));

  /* ---------- markers ---------- */
  const markerLayer = el('div');
  markerLayer.id = 'xi-markers';
  viewKeys.forEach((key, i) => {
    const root = el('button', 'xi-marker');
    root.type = 'button';
    root.dataset.key = key;
    root.setAttribute('aria-label', '地标 ' + noteTitle(key));
    const dot = el('span', 'xi-dot', String(i + 1).padStart(2, '0'));
    const label = el('span', 'xi-marker-label', noteTitle(key));
    root.append(dot, label);
    root.addEventListener('click', () => {
      stopTour();
      openCard(key);
    });
    markerEls.set(key, { root, dot, label });
    markerLayer.appendChild(root);
  });
  document.body.appendChild(markerLayer);

  /* ---------- info card ---------- */
  const card = el('section');
  card.id = 'xi-card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', '地标信息');
  const cardHead = el('div', 'xi-card-head');
  const cardTitle = el('h3');
  const cardClose = el('button', 'xi-close', '×');
  cardClose.type = 'button';
  cardClose.setAttribute('aria-label', '关闭地标信息');
  cardHead.append(cardTitle, cardClose);
  const cardDesc = el('p', 'xi-card-desc');
  const cardActions = el('div', 'xi-card-actions');
  const cardGo = el('button', 'xi-btn', '前往');
  cardGo.type = 'button';
  cardActions.append(cardGo);
  card.append(cardHead, cardDesc, cardActions);
  document.body.appendChild(card);

  function openCard(key) {
    if (!sourceViews[key]) return;
    cardKey = key;
    cardTitle.textContent = noteTitle(key);
    cardDesc.textContent = noteDesc(key) || '前往该地标查看详情。';
    card.classList.add('open');
  }

  function closeCard() {
    cardKey = null;
    card.classList.remove('open');
  }

  on(cardClose, 'click', closeCard);
  on(cardGo, 'click', () => {
    if (cardKey) go(cardKey, { user: true });
  });

  /* ---------- tour ---------- */
  const tourBtn = el('button', 'xi-btn', '巡游');
  tourBtn.id = 'xi-tour-btn';
  tourBtn.type = 'button';
  tourBtn.setAttribute('aria-label', '自动巡游');
  const weatherBtn = el('button', 'xi-btn', '天气 · 晴');
  weatherBtn.id = 'xi-weather-btn';
  weatherBtn.type = 'button';
  const soundBtn = el('button', 'xi-btn', '音景');
  soundBtn.id = 'xi-sound-btn';
  soundBtn.type = 'button';
  const helpBtn = el('button', 'xi-btn', '帮助');
  helpBtn.id = 'xi-help-btn';
  helpBtn.type = 'button';
  const photoBtn = el('button', 'xi-btn', '摄影');
  photoBtn.id = 'xi-photo-btn';
  photoBtn.type = 'button';
  const shotBtn = el('button', 'xi-btn', '留影');
  shotBtn.id = 'xi-shot-btn';
  shotBtn.type = 'button';
  shotBtn.setAttribute('aria-label', '下载当前画面');
  const overviewBtn = el('button', 'xi-btn', '总览');
  overviewBtn.id = 'xi-overview-btn';
  overviewBtn.type = 'button';
  const lightBtn = el('button', 'xi-btn', '光影');
  lightBtn.id = 'xi-light-btn';
  lightBtn.type = 'button';
  lightBtn.setAttribute('aria-label', '自动昼夜光影');

  const tourProgress = el('div');
  tourProgress.id = 'xi-tour-progress';
  const tourBar = el('span');
  tourProgress.appendChild(tourBar);

  const dock = el('div');
  dock.id = 'xi-dock';
  dock.append(tourProgress, tourBtn, weatherBtn, lightBtn, overviewBtn, shotBtn, soundBtn, helpBtn, photoBtn);
  document.body.appendChild(dock);

  function captureFrame() {
    if (!renderer || !canvas || destroyed) return false;
    try {
      renderer.render(scene, camera);
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const name = (document.title || 'scene').replace(/[^\w\u4e00-\u9fa5-]+/g, '_').replace(/^_+|_+$/g, '');
      link.href = url;
      link.download = (name || 'scene') + '_' + Date.now() + '.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast('画面已保存');
      return true;
    } catch (err) {
      return false;
    }
  }

  function toggleLight() {
    const duskBtn = document.getElementById('btn-dusk');
    if (!duskBtn) return false;
    if (lightTimer) {
      clearInterval(lightTimer);
      lightTimer = null;
      lightBtn.classList.remove('active');
      lightBtn.textContent = '光影';
      return false;
    }
    lightTimer = setInterval(() => {
      if (destroyed) {
        clearInterval(lightTimer);
        lightTimer = null;
        return;
      }
      duskBtn.click();
    }, 12000);
    lightBtn.classList.add('active');
    lightBtn.textContent = '光影 · 自动';
    toast('自动光影已开启 · 12 秒切换');
    return true;
  }

  on(overviewBtn, 'click', () => go('overview', { user: true }));
  on(shotBtn, 'click', captureFrame);
  on(lightBtn, 'click', toggleLight);

  function advanceTour() {
    if (!tourKeys.length) return;
    tour.index = (tour.index + 1) % tourKeys.length;
    tour.elapsed = 0;
    go(tourKeys[tour.index], { user: false });
  }

  function tickTour() {
    if (!tour.active || destroyed) return;
    const now = performance.now();
    const dt = Math.max(0, now - tour.last);
    tour.last = now;
    if (!tour.paused) {
      tour.elapsed += dt;
      if (tour.elapsed >= TOUR_INTERVAL) advanceTour();
    }
    updateTourUI();
  }

  function startTour() {
    if (!tourKeys.length) return false;
    if (tour.active) {
      tour.paused = false;
      tour.last = performance.now();
      updateTourUI();
      return true;
    }
    tour.active = true;
    tour.paused = false;
    tour.index = -1;
    tour.elapsed = 0;
    tour.last = performance.now();
    if (tourTimer) clearInterval(tourTimer);
    tourTimer = setInterval(tickTour, 110);
    advanceTour();
    updateTourUI();
    return true;
  }

  function stopTour() {
    if (!tour.active && !tourTimer) return;
    tour.active = false;
    tour.paused = false;
    tour.elapsed = 0;
    if (tourTimer) {
      clearInterval(tourTimer);
      tourTimer = null;
    }
    updateTourUI();
  }

  function toggleTour() {
    if (tour.active) {
      tour.paused = !tour.paused;
      tour.last = performance.now();
      updateTourUI();
      return true;
    }
    return startTour();
  }

  function setTour(state) {
    if (state === false) {
      stopTour();
      return false;
    }
    if (state === true || state == null) return startTour();
    return tour.active;
  }

  function updateTourUI() {
    if (!tourBtn) return;
    tourBtn.textContent = tour.active ? (tour.paused ? '继续巡游' : '暂停巡游') : '巡游';
    tourBtn.classList.toggle('active', tour.active && !tour.paused);
    tourProgress.classList.toggle('active', tour.active);
    const ratio = tour.active ? clamp(tour.elapsed / TOUR_INTERVAL, 0, 1) : 0;
    tourBar.style.width = (ratio * 100).toFixed(2) + '%';
  }

  on(tourBtn, 'click', toggleTour);

  on(document, 'click', (event) => {
    if (internalClick) return;
    const target = event.target;
    if (!target || !target.closest) return;
    const viewBtn = target.closest('[data-view]');
    if (!viewBtn) return;
    const key = viewBtn.getAttribute('data-view');
    if (!sourceViews[key]) return;
    stopTour();
    setActiveKey(key);
    markVisited(key);
    closeCard();
  }, true);

  const bodyObserver = new MutationObserver(() => {
    const fp = isFpActive();
    if (fp) {
      stopTour();
      closeCard();
    }
    if (markerLayer) markerLayer.style.display = fp || photoMode || helpOpen ? 'none' : '';
  });
  bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  /* ---------- weather ---------- */
  const vignette = el('div');
  vignette.id = 'xi-wx-vignette';
  document.body.appendChild(vignette);

  const weatherGroup = new THREE.Group();
  weatherGroup.name = 'xi-weather';
  weatherGroup.visible = false;
  const weatherSystems = {};
  let weatherBuilt = false;

  const POINT_VERTEX = `
    uniform float uTime;
    uniform float uHeight;
    uniform float uRadius;
    uniform float uFall;
    uniform float uWindX;
    uniform float uWindZ;
    uniform float uSize;
    uniform float uMode;
    attribute float aSeed;
    varying float vFade;

    void main() {
      vec3 p = position;
      float speed = uFall * (uMode > 0.5 ? (0.34 + aSeed * 0.5) : (0.72 + aSeed * 0.7));
      p.y = mod(position.y - uTime * speed, uHeight);
      float phase = aSeed * 6.2831;
      if (uMode > 0.5) {
        p.x += sin(uTime * 0.55 + phase) * 1.9;
        p.z += cos(uTime * 0.47 + phase * 1.7) * 1.9;
      } else {
        p.x += sin(uTime * 1.15 + phase) * 0.8;
      }
      p.x = mod(p.x + uWindX * uTime + uRadius, uRadius * 2.0) - uRadius;
      p.z = mod(p.z + uWindZ * uTime + uRadius, uRadius * 2.0) - uRadius;

      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = clamp(uSize * (320.0 / max(1.0, -mv.z)), 1.0, 42.0);

      float h = p.y / uHeight;
      float groundFade = smoothstep(0.0, 0.11, h);
      float topFade = 1.0 - smoothstep(0.86, 1.0, h);
      vFade = groundFade * topFade;
    }
  `;

  const POINT_FRAGMENT = `
    uniform vec3 uColor;
    uniform float uOpacity;
    uniform float uMode;
    varying float vFade;

    void main() {
      float alpha;
      if (uMode > 0.5) {
        float d = length(gl_PointCoord - vec2(0.5));
        alpha = smoothstep(0.5, 0.08, d);
      } else {
        float dx = abs(gl_PointCoord.x - 0.5);
        alpha = pow(max(0.0, 1.0 - dx * 3.4), 2.0);
        alpha *= smoothstep(0.0, 0.16, gl_PointCoord.y);
        alpha *= 1.0 - smoothstep(0.84, 1.0, gl_PointCoord.y);
        alpha *= 0.8;
      }
      gl_FragColor = vec4(uColor, alpha * vFade * uOpacity);
    }
  `;

  function weatherScale() {
    const points = [];
    viewKeys.forEach((key) => {
      const view = sourceViews[key];
      if (view && view.t && view.t.length >= 3) {
        points.push(new THREE.Vector3(view.t[0], view.t[1], view.t[2]));
      }
    });
    let radius = 170;
    if (points.length) {
      const box = new THREE.Box3().setFromPoints(points);
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      if (isFinite(sphere.radius) && sphere.radius > 0) radius = sphere.radius;
    }
    const camY = camera ? Math.abs(camera.position.y) : 0;
    return {
      radius: clamp(radius * 0.72, 120, 340),
      height: clamp(Math.max(125, camY * 1.45, radius * 0.58), 120, 560),
    };
  }

  function buildPointSystem(kind, radius, height) {
    const isSnow = kind === 'snow';
    const count = isSnow ? 1500 : 2400;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() * 2 - 1) * radius;
      positions[i * 3 + 1] = Math.random() * height;
      positions[i * 3 + 2] = (Math.random() * 2 - 1) * radius;
      seeds[i] = Math.random();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uHeight: { value: height },
        uRadius: { value: radius },
        uFall: { value: (isSnow ? 9 : 42) * Math.max(1, height / 150) },
        uWindX: { value: isSnow ? 1.8 : 5.8 },
        uWindZ: { value: isSnow ? 1.3 : 3.4 },
        uSize: { value: isSnow ? 2.5 : 1.7 },
        uMode: { value: isSnow ? 1 : 0 },
        uColor: { value: new THREE.Color(isSnow ? 0xf2fbff : 0xadc6d6) },
        uOpacity: { value: isSnow ? 0.92 : 0.58 },
      },
      vertexShader: POINT_VERTEX,
      fragmentShader: POINT_FRAGMENT,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      fog: false,
      blending: isSnow ? THREE.AdditiveBlending : THREE.NormalBlending,
    });

    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    points.renderOrder = 3;
    points.visible = false;
    return { points, geometry, material };
  }

  function ensureWeather() {
    if (weatherBuilt || !scene) return;
    weatherBuilt = true;
    const scale = weatherScale();
    weatherSystems.rain = buildPointSystem('rain', scale.radius, scale.height);
    weatherSystems.snow = buildPointSystem('snow', scale.radius, scale.height);
    weatherGroup.add(weatherSystems.rain.points, weatherSystems.snow.points);
    weatherGroup.position.set(camera ? camera.position.x : 0, 0, camera ? camera.position.z : 0);
    scene.add(weatherGroup);
  }

  function setWeather(kind) {
    if (!WEATHER_ORDER.includes(kind)) return weatherKind;
    if (kind !== 'clear' && scene) ensureWeather();
    weatherKind = kind;
    if (weatherBuilt) {
      weatherGroup.visible = kind !== 'clear';
      weatherSystems.rain.points.visible = kind === 'rain';
      weatherSystems.snow.points.visible = kind === 'snow';
    }
    vignette.classList.toggle('rain', kind === 'rain');
    vignette.classList.toggle('snow', kind === 'snow');
    weatherBtn.textContent = '天气 · ' + WEATHER_LABEL[kind];
    weatherBtn.classList.toggle('active', kind !== 'clear');
    return weatherKind;
  }

  function toggleWeather() {
    const index = WEATHER_ORDER.indexOf(weatherKind);
    return setWeather(WEATHER_ORDER[(index + 1) % WEATHER_ORDER.length]);
  }

  function updateWeather(now) {
    if (!weatherBuilt || weatherKind === 'clear' || !scene) return;
    weatherGroup.position.set(camera.position.x, 0, camera.position.z);
    const time = now * 0.001;
    Object.values(weatherSystems).forEach((system) => {
      system.material.uniforms.uTime.value = time;
    });
  }

  on(weatherBtn, 'click', toggleWeather);

  /* ---------- help ---------- */
  const help = el('div');
  help.id = 'xi-help';
  help.setAttribute('role', 'dialog');
  help.setAttribute('aria-label', '操作帮助');
  const helpPanel = el('div', 'xi-help-panel');
  const helpHead = el('div', 'xi-card-head');
  const helpHeadText = el('div');
  const helpTitle = el('h2', '', '操作指南');
  const helpSub = el('p', 'xi-help-sub', 'KEYBOARD & INTERACTION');
  helpHeadText.append(helpTitle, helpSub);
  const helpClose = el('button', 'xi-close', '×');
  helpClose.type = 'button';
  helpClose.setAttribute('aria-label', '关闭帮助');
  helpHead.append(helpHeadText, helpClose);

  const helpGrid = el('div', 'xi-help-grid');
  [
    ['1–9', '选择对应地标'],
    ['F', '进入 / 退出第一人称'],
    ['R', '开启 / 关闭环绕'],
    ['N', '切换黄昏 / 日间'],
    ['T', '开始 / 暂停巡游'],
    ['L', '开启 / 关闭自动光影'],
    ['O', '返回全景总览'],
    ['G', '保存当前画面'],
    ['P', '进入 / 退出摄影模式'],
    ['H', '打开 / 关闭本帮助'],
    ['Esc', '关闭面板 / 退出模式'],
    ['双击场景', '聚焦近景'],
    ['拖拽 / 滚轮', '旋转视角 / 缩放画面'],
  ].forEach(([key, text]) => {
    helpGrid.append(el('b', '', key), el('span', '', text));
  });
  helpPanel.append(helpHead, helpGrid);
  help.appendChild(helpPanel);
  document.body.appendChild(help);

  function setHelp(open) {
    helpOpen = !!open;
    help.classList.toggle('open', helpOpen);
    if (helpOpen) {
      closeCard();
      setSidebar(false);
    }
  }

  function toggleHelp() {
    setHelp(!helpOpen);
  }

  on(helpBtn, 'click', toggleHelp);
  on(helpClose, 'click', () => setHelp(false));
  on(help, 'click', (event) => {
    if (event.target === help) setHelp(false);
  });

  /* ---------- photo mode ---------- */
  const photoHint = el('div', '', 'P / Esc 退出摄影');
  photoHint.id = 'xi-photo-hint';
  document.body.appendChild(photoHint);

  function setPhoto(open) {
    photoMode = !!open;
    document.body.classList.toggle('xi-photo', photoMode);
    if (photoMode) {
      stopTour();
      closeCard();
      setHelp(false);
      setSidebar(false);
      if (isFpActive()) {
        if (fpRef && typeof fpRef.exit === 'function') {
          try {
            fpRef.exit();
          } catch (err) {}
        } else {
          clickFirstPersonButton();
        }
      }
    }
    return photoMode;
  }

  function togglePhoto() {
    return setPhoto(!photoMode);
  }

  on(photoBtn, 'click', togglePhoto);

  /* ---------- ambient audio ---------- */
  function scheduleBird(state) {
    if (!state || audio !== state || destroyed) return;
    state.birdTimer = setTimeout(() => {
      if (audio !== state || destroyed) return;
      chirp(state);
      scheduleBird(state);
    }, 4500 + Math.random() * 8000);
  }

  function chirp(state) {
    const ctx = state.ctx;
    const master = state.master;
    if (!ctx || ctx.state === 'closed') return;
    const now = ctx.currentTime + 0.03;
    const count = 2 + Math.floor(Math.random() * 3);
    let dest = master;
    if (typeof ctx.createStereoPanner === 'function') {
      const pan = ctx.createStereoPanner();
      pan.pan.value = Math.random() * 1.5 - 0.75;
      pan.connect(master);
      dest = pan;
    }
    for (let i = 0; i < count; i++) {
      const t = now + i * (0.09 + Math.random() * 0.06);
      const base = 1500 + Math.random() * 1500;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(base, t);
      osc.frequency.exponentialRampToValueAtTime(base * (1.25 + Math.random() * 0.5), t + 0.06);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.05, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.17);
    }
  }

  function updateSoundUI() {
    soundBtn.textContent = soundOn ? '音景 · 开' : '音景';
    soundBtn.classList.toggle('active', soundOn);
  }

  function startSound() {
    if (audio || destroyed) return false;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    try {
      const ctx = new Ctx();
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, ctx.currentTime);
      master.connect(ctx.destination);

      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 4), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.2;
      }

      const wind = ctx.createBufferSource();
      wind.buffer = buffer;
      wind.loop = true;
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'lowpass';
      windFilter.frequency.value = 520;
      windFilter.Q.value = 0.6;
      const windGain = ctx.createGain();
      windGain.gain.value = 0.2;
      wind.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(master);

      const water = ctx.createBufferSource();
      water.buffer = buffer;
      water.loop = true;
      const waterFilter = ctx.createBiquadFilter();
      waterFilter.type = 'bandpass';
      waterFilter.frequency.value = 1150;
      waterFilter.Q.value = 0.7;
      const waterGain = ctx.createGain();
      waterGain.gain.value = 0.035;
      water.connect(waterFilter);
      waterFilter.connect(waterGain);
      waterGain.connect(master);

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.07;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.075;
      lfo.connect(lfoGain);
      lfoGain.connect(windGain.gain);

      wind.start();
      water.start();
      lfo.start();
      master.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 1.4);

      const state = { ctx, master, sources: [wind, water, lfo], birdTimer: null };
      audio = state;
      soundOn = true;
      updateSoundUI();
      scheduleBird(state);
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume().catch(() => {});
      return true;
    } catch (err) {
      soundOn = false;
      updateSoundUI();
      return false;
    }
  }

  function stopSound() {
    const state = audio;
    audio = null;
    soundOn = false;
    updateSoundUI();
    if (!state) return;
    if (state.birdTimer) clearTimeout(state.birdTimer);
    const ctx = state.ctx;
    try {
      state.master.gain.cancelScheduledValues(ctx.currentTime);
      state.master.gain.setValueAtTime(Math.max(0.0001, state.master.gain.value), ctx.currentTime);
      state.master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    } catch (err) {}
    setTimeout(() => {
      state.sources.forEach((source) => {
        try {
          source.stop();
        } catch (err) {}
      });
      try {
        ctx.close();
      } catch (err) {}
    }, 420);
  }

  function toggleSound() {
    if (soundOn || audio) {
      stopSound();
      return false;
    }
    return startSound();
  }

  on(soundBtn, 'click', toggleSound);

  /* ---------- keyboard ---------- */
  function isTypingTarget(target) {
    if (!target) return false;
    const tag = String(target.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || !!target.isContentEditable;
  }

  function onKeyDown(event) {
    if (destroyed || isTypingTarget(event.target)) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const code = event.code;

    if (code === 'Escape') {
      if (photoMode) {
        setPhoto(false);
        event.preventDefault();
        return;
      }
      if (helpOpen) {
        setHelp(false);
        event.preventDefault();
        return;
      }
      if (cardKey) {
        closeCard();
        event.preventDefault();
        return;
      }
      if (sidebarOpen) {
        setSidebar(false);
        event.preventDefault();
        return;
      }
      return;
    }

    if (event.repeat) return;

    if (photoMode) {
      if (code === 'KeyP') {
        setPhoto(false);
        event.preventDefault();
      } else if (code === 'KeyF') {
        setPhoto(false);
        clickFirstPersonButton();
        event.preventDefault();
      }
      return;
    }

    const digitMatch = /^(?:Digit|Numpad)([1-9])$/.exec(code);
    if (digitMatch) {
      const key = viewKeys[Number(digitMatch[1]) - 1];
      if (key) {
        go(key, { user: true });
        event.preventDefault();
      }
      return;
    }

    switch (code) {
      case 'KeyF':
        clickFirstPersonButton();
        event.preventDefault();
        break;
      case 'KeyR': {
        const btn = document.getElementById('btn-rotate');
        if (btn) btn.click();
        event.preventDefault();
        break;
      }
      case 'KeyN': {
        const btn = document.getElementById('btn-dusk');
        if (btn) btn.click();
        event.preventDefault();
        break;
      }
      case 'KeyT':
        toggleTour();
        event.preventDefault();
        break;
      case 'KeyL':
        toggleLight();
        event.preventDefault();
        break;
      case 'KeyO':
        go('overview', { user: true });
        event.preventDefault();
        break;
      case 'KeyG':
        captureFrame();
        event.preventDefault();
        break;
      case 'KeyP':
        togglePhoto();
        event.preventDefault();
        break;
      case 'KeyH':
        setHelp(!helpOpen);
        event.preventDefault();
        break;
      default:
        break;
    }
  }

  on(window, 'keydown', onKeyDown);

  /* ---------- atmosphere motes ---------- */
  let moteGroup = null;
  let moteTexture = null;
  if (scene && camera) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, 'rgba(255,240,210,0.9)');
    rg.addColorStop(0.3, 'rgba(255,232,190,0.35)');
    rg.addColorStop(1, 'rgba(255,232,190,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, 64, 64);
    moteTexture = new THREE.CanvasTexture(c);
    const count = 160;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 110;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 110;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      map: moteTexture,
      color: 0xffe0ad,
      size: 0.72,
      transparent: true,
      opacity: 0.26,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    moteGroup = new THREE.Points(geo, mat);
    moteGroup.name = 'xi-motes';
    moteGroup.frustumCulled = false;
    scene.add(moteGroup);
  }

  /* ---------- per-frame projection & weather ---------- */
  const markerDir = new THREE.Vector3();
  const markerWorld = new THREE.Vector3();

  function updateMarkers() {
    if (!camera || destroyed) return;
    const hide = photoMode || helpOpen || isFpActive() || !viewKeys.length;
    markerLayer.style.display = hide ? 'none' : '';
    if (hide) return;

    const width = (canvas && canvas.clientWidth) || window.innerWidth;
    const height = (canvas && canvas.clientHeight) || window.innerHeight;
    camera.updateMatrixWorld();
    camera.getWorldDirection(markerDir);

    markerEls.forEach((node, key) => {
      const view = sourceViews[key];
      if (!view || !view.t || view.t.length < 3) {
        node.root.classList.remove('visible');
        return;
      }
      markerWorld.set(view.t[0], view.t[1], view.t[2]);
      const dx = markerWorld.x - camera.position.x;
      const dy = markerWorld.y - camera.position.y;
      const dz = markerWorld.z - camera.position.z;
      const behind = dx * markerDir.x + dy * markerDir.y + dz * markerDir.z <= 0;
      markerWorld.project(camera);
      const x = (markerWorld.x * 0.5 + 0.5) * width;
      const y = (-markerWorld.y * 0.5 + 0.5) * height;
      const outside = markerWorld.z > 1 || markerWorld.z < -1 || x < -40 || x > width + 40 || y < -40 || y > height + 40;
      if (behind || outside) {
        node.root.classList.remove('visible');
        return;
      }
      node.root.style.left = x.toFixed(1) + 'px';
      node.root.style.top = y.toFixed(1) + 'px';
      node.root.classList.add('visible');
    });
  }

  function frame(now) {
    if (destroyed) return;
    if (focusTween) {
      const dt = focusTween.last == null ? 0.016 : Math.min(0.05, (now - focusTween.last) / 1000);
      focusTween.last = now;
      focusTween.t += dt / focusTween.dur;
      const t = Math.min(1, focusTween.t);
      const ease = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(focusTween.fromP, focusTween.toP, ease);
      controls.target.lerpVectors(focusTween.fromT, focusTween.toT, ease);
      controls.update();
      if (t >= 1) focusTween = null;
    }
    if (moteGroup && camera) {
      moteGroup.position.set(camera.position.x, camera.position.y - 2, camera.position.z);
      moteGroup.rotation.y = now * 0.000018;
      moteGroup.rotation.x = Math.sin(now * 0.00005) * 0.03;
    }
    updateMarkers();
    updateWeather(now);
    rafId = requestAnimationFrame(frame);
  }

  setActiveKey(activeKey);
  updateStamps();
  updateTourUI();
  updateSoundUI();
  rafId = requestAnimationFrame(frame);

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    stopTour();
    stopSound();
    if (lightTimer) {
      clearInterval(lightTimer);
      lightTimer = null;
    }
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    bodyObserver.disconnect();
    listeners.forEach(([target, type, handler, opts]) => {
      try {
        target.removeEventListener(type, handler, opts);
      } catch (err) {}
    });
    listeners.length = 0;
    if (moteGroup) {
      if (scene) scene.remove(moteGroup);
      try {
        moteGroup.geometry.dispose();
        moteGroup.material.dispose();
        if (moteTexture) moteTexture.dispose();
      } catch (err) {}
    }
    if (weatherBuilt) {
      Object.values(weatherSystems).forEach((system) => {
        try {
          system.geometry.dispose();
          system.material.dispose();
        } catch (err) {}
      });
      if (scene) scene.remove(weatherGroup);
    }
    [sidebarToggle, sidebar, markerLayer, card, dock, help, vignette, photoHint, toastEl, gradeEl].forEach((node) => {
      if (node && node.parentNode) node.parentNode.removeChild(node);
    });
    document.body.classList.remove('xi-photo');
    const style = document.getElementById(STYLE_ID);
    if (style) style.remove();
  }

  const api = {
    destroy,
    go,
    toggleWeather,
    togglePhoto,
    setTour,
    toggleTour,
    setWeather,
    setPhoto,
    toggleSidebar,
    setSidebar,
    toggleHelp,
    setHelp,
    toggleSound,
    startSound,
    stopSound,
    captureFrame,
    toggleLight,
    focusAt,
    markVisited,
    openCard,
    closeCard,
    getState: () => ({
      activeKey,
      cardKey,
      sidebarOpen,
      helpOpen,
      photoMode,
      weather: weatherKind,
      soundOn,
      stamps: [...visited],
      stampTotal: landmarkKeys.length,
      lightAuto: !!lightTimer,
      tour: { active: tour.active, paused: tour.paused, index: tour.index, elapsed: tour.elapsed },
    }),
  };

  return api;
}




