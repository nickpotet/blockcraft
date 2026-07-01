import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { ITEMS } from '../src/data/items.js';

const SIZE = 32;
const output = new URL('../public/textures/items/', import.meta.url);
mkdirSync(output, { recursive: true });

// ───────────────────────── низкоуровневая отрисовка ─────────────────────────
const rgba = hex => { const v = parseInt(hex.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255, 255]; };
const image = () => Array.from({ length: SIZE * SIZE }, () => [0, 0, 0, 0]);
const px = (img, x, y, color, alpha = 255) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < SIZE && y < SIZE) img[y * SIZE + x] = [...rgba(color).slice(0, 3), alpha]; };
const rect = (img, x, y, w, h, color) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) px(img, xx, yy, color); };
const line = (img, x0, y0, x1, y1, width, color) => { const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= steps; i++) { const x = x0 + (x1 - x0) * i / steps, y = y0 + (y1 - y0) * i / steps; rect(img, Math.round(x - (width - 1) / 2), Math.round(y - (width - 1) / 2), width, width, color); } };
const disc = (img, cx, cy, r, color) => { for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) { const dx = x - cx, dy = y - cy; if (dx * dx + dy * dy <= r * r) px(img, x, y, color); } };
const ring = (img, cx, cy, rx, ry, color, inner = 0.62) => { for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) { const v = Math.abs(x - cx) / rx + Math.abs(y - cy) / ry; if (v <= 1 && v >= inner) px(img, x, y, color); } };
// Вертикальная трапеция: на строке y0 спан x0L..x0R, на y1 — x1L..x1R, рёбра линейно
const trap = (img, y0, x0L, x0R, y1, x1L, x1R, color) => { for (let y = y0; y <= y1; y++) { const t = y1 === y0 ? 0 : (y - y0) / (y1 - y0); const l = x0L + (x1L - x0L) * t, r = x0R + (x1R - x0R) * t; for (let x = Math.round(l); x <= Math.round(r); x++) px(img, x, y, color); } };
// детерминированный «шум» для крапин (стабилен между запусками)
const H = (x, y) => { const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return s - Math.floor(s); };
const speckle = (img, test, color, thr) => { for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (test(x, y) && H(x, y) > thr) px(img, x, y, color); };
// Обводка: тёмный контур по силуэту — главный приём читаемости пиксель-арта
const OUT = '#13151a';
const outline = (img, color = OUT) => {
  const a = img.map(p => p[3]);
  const nb = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    if (a[y * SIZE + x] > 0) continue;
    if (nb.some(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < SIZE && ny < SIZE && a[ny * SIZE + nx] > 0; })) px(img, x, y, color);
  }
};

// ───────────────────────── изометрический куб (блоки) ─────────────────────────
const inTop = (x, y) => Math.abs(x - 16) / 14 + Math.abs(y - 10) / 8 <= 1;
const lY = x => 10 + (x - 2) / 14 * 8;
const inLeft = (x, y) => x >= 2 && x <= 16 && y >= lY(x) && y <= lY(x) + 13;
const rY = x => 18 - (x - 16) / 14 * 8;
const inRight = (x, y) => x >= 16 && x <= 30 && y >= rY(x) && y <= rY(x) + 13;
const anyFace = (x, y) => inTop(x, y) || inLeft(x, y) || inRight(x, y);
const cube = (img, top, left, right) => { for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) { if (inTop(x, y)) px(img, x, y, top); else if (inLeft(x, y)) px(img, x, y, left); else if (inRight(x, y)) px(img, x, y, right); } };
// горизонтальные «доски»-швы вдоль наклона боковых граней
const seams = (img, color, offsets) => { for (const o of offsets) { for (let x = 2; x <= 16; x++) px(img, x, lY(x) + o, color); for (let x = 16; x <= 30; x++) px(img, x, rY(x) + o, color); } };

// ───────────────────────── вспомогательное для инструментов ─────────────────────────
const handle = (img, dark = '#5e3f22', lite = '#7d5630') => { line(img, 9, 28, 22, 11, 3, dark); line(img, 10, 27, 22, 12, 1, lite); };
const tierPips = (img, x, y, n, color = '#f2e6c4') => { for (let i = 0; i < n; i++) px(img, x + i * 2, y, color); };

// ───────────────────────── рисунки предметов ─────────────────────────
const draw = {
  // ── БЛОКИ ──
  grass(img) { cube(img, '#6fa343', '#5f4127', '#735030'); speckle(img, inTop, '#5d8a36', .5); speckle(img, inTop, '#84b855', .72); for (let x = 2; x <= 30; x++) { const yy = x <= 16 ? lY(x) : rY(x); px(img, x, yy, '#5d8a36'); px(img, x, yy + 1, '#4f7a2e'); } speckle(img, (x, y) => inLeft(x, y) || inRight(x, y), '#4f3622', .8); },
  dirt(img) { cube(img, '#8a623c', '#5f4127', '#73502f'); speckle(img, anyFace, '#4e3621', .72); speckle(img, anyFace, '#9c7850', .85); },
  stone(img) { cube(img, '#9a9e9b', '#6f736f', '#838784'); speckle(img, anyFace, '#5a5e5b', .8); speckle(img, anyFace, '#b0b4b1', .86); line(img, 9, 12, 13, 9, 1, '#5a5e5b'); line(img, 20, 22, 26, 18, 1, '#5a5e5b'); line(img, 6, 18, 10, 22, 1, '#5a5e5b'); },
  sand(img) { cube(img, '#d6c386', '#b3a06a', '#c4b176'); speckle(img, anyFace, '#e8d99e', .6); speckle(img, anyFace, '#a89560', .8); },
  wood(img) { cube(img, '#b0824a', '#5a3c22', '#6b4a2a'); ring(img, 16, 10, 11, 6.4, '#946739', .78); ring(img, 16, 10, 6.5, 3.8, '#946739', .6); disc(img, 16, 10, 1.6, '#7d5530'); for (let x = 2; x <= 16; x++) if (H(x, 3) > .5) line(img, x, lY(x), x, lY(x) + 13, 1, '#4a3019'); for (let x = 16; x <= 30; x++) if (H(x, 7) > .5) line(img, x, rY(x), x, rY(x) + 13, 1, '#5a3c22'); },
  leaves(img) { cube(img, '#558a40', '#2f5125', '#3f6b32'); speckle(img, anyFace, '#6fab4e', .55); speckle(img, anyFace, '#23401b', .72); speckle(img, anyFace, '#7dbd58', .9); },
  planks(img) { cube(img, '#c08a4c', '#8a6034', '#a3743f'); seams(img, '#6e4a26', [3, 7, 11]); px(img, 6, 16, '#5a3c22'); px(img, 13, 22, '#5a3c22'); px(img, 22, 17, '#5a3c22'); },
  brick(img) { cube(img, '#a85544', '#7a3528', '#9b4a3a'); seams(img, '#cdb89a', [4, 9]); for (let x = 2; x <= 16; x += 4) line(img, x, lY(x), x, lY(x) + 4, 1, '#cdb89a'); for (let x = 4; x <= 16; x += 4) line(img, x, lY(x) + 9, x, lY(x) + 13, 1, '#cdb89a'); for (let x = 18; x <= 30; x += 4) line(img, x, rY(x), x, rY(x) + 4, 1, '#cdb89a'); for (let x = 20; x <= 30; x += 4) line(img, x, rY(x) + 9, x, rY(x) + 13, 1, '#cdb89a'); },
  workbench(img) { cube(img, '#8a6034', '#6e4a26', '#7d5530'); for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (inTop(x, y)) px(img, x, y, (x + y) % 2 ? '#5c3e22' : '#6b4a2a'); line(img, 9, 9, 21, 13, 1, '#caa86a'); line(img, 12, 6, 16, 14, 1, '#caa86a'); seams(img, '#5a3c22', [6, 11]); },
  campfire(img) { line(img, 5, 27, 27, 21, 4, '#6d4127'); line(img, 5, 21, 27, 27, 4, '#5a361f'); px(img, 5, 27, '#946739'); px(img, 27, 21, '#946739'); px(img, 5, 21, '#946739'); px(img, 27, 27, '#946739'); trap(img, 9, 15, 17, 22, 11, 21, '#d4541a'); trap(img, 12, 14, 18, 22, 12, 20, '#f59022'); trap(img, 15, 15, 17, 22, 14, 18, '#ffd05a'); px(img, 16, 8, '#ffe89a'); disc(img, 16, 19, 2, '#fff0b0'); },
  chest(img) { rect(img, 5, 14, 22, 14, '#7a5530'); rect(img, 5, 9, 22, 6, '#8f6038'); rect(img, 5, 14, 22, 1, '#4a3120'); line(img, 9, 9, 9, 28, 1, '#5e3f22'); line(img, 23, 9, 23, 28, 1, '#5e3f22'); rect(img, 13, 9, 6, 19, '#4a4138'); rect(img, 14, 10, 4, 17, '#6b6258'); rect(img, 14, 15, 4, 4, '#caa23a'); px(img, 16, 17, '#3a2f12'); },
  torch(img) { rect(img, 14, 13, 4, 17, '#6b4528'); rect(img, 15, 13, 1, 17, '#8a5e36'); rect(img, 14, 26, 4, 1, '#4a3019'); disc(img, 16, 9, 4, '#e08b2f'); disc(img, 16, 8, 2.4, '#ffd06a'); px(img, 16, 6, '#fff0b0'); px(img, 16, 3, '#f59022'); },
  door(img) { rect(img, 8, 2, 17, 28, '#8f6038'); rect(img, 8, 2, 17, 1, '#a87548'); rect(img, 10, 5, 6, 9, '#6e4a26'); rect(img, 17, 5, 6, 9, '#6e4a26'); rect(img, 10, 17, 6, 10, '#6e4a26'); rect(img, 17, 17, 6, 10, '#6e4a26'); disc(img, 21, 16, 1.4, '#caa23a'); },

  // ── МАТЕРИАЛЫ ──
  flint(img) { trap(img, 7, 15, 18, 25, 6, 25, '#5a615e'); trap(img, 8, 15, 16, 22, 8, 15, '#787f7c'); px(img, 17, 8, '#9aa19e'); trap(img, 19, 19, 25, 25, 22, 26, '#3f4543'); line(img, 7, 24, 17, 9, 1, '#9aa19e'); },
  fiber(img) { for (const [x0, x1] of [[8, 11], [13, 16], [18, 21], [22, 25]]) { line(img, x0, 27, x1, 5, 2, '#9c8a4e'); line(img, x0, 26, x1, 6, 1, '#b8a45c'); } rect(img, 7, 16, 19, 3, '#6e5e2e'); rect(img, 7, 17, 19, 1, '#8a7a42'); },
  coal(img) { disc(img, 12, 19, 6, '#2a2e2f'); disc(img, 20, 16, 6, '#232728'); disc(img, 17, 23, 5, '#2f3334'); for (const [x, y] of [[10, 16], [19, 13], [22, 19], [15, 21]]) px(img, x, y, '#5a6266'); px(img, 11, 17, '#717b7f'); px(img, 20, 14, '#717b7f'); },
  iron_ore(img) { disc(img, 13, 19, 6, '#8d877b'); disc(img, 20, 16, 6, '#7d776b'); disc(img, 17, 23, 5, '#948e82'); for (const [x, y, r] of [[12, 17, 2], [21, 18, 2], [16, 22, 1.6], [19, 13, 1.4]]) disc(img, x, y, r, '#c2925a'); px(img, 12, 16, '#dcab6e'); px(img, 21, 17, '#dcab6e'); },
  silver_ore(img) { disc(img, 13, 19, 6, '#8d8f8c'); disc(img, 20, 16, 6, '#7d7f7c'); disc(img, 17, 23, 5, '#94968f'); for (const [x, y, r] of [[12, 17, 2], [21, 18, 2], [16, 22, 1.6], [19, 13, 1.4]]) disc(img, x, y, r, '#bfe0e0'); px(img, 12, 16, '#eef9f9'); px(img, 21, 17, '#eef9f9'); },
  iron_ingot(img) { trap(img, 11, 11, 21, 15, 8, 24, '#c1c8c5'); trap(img, 15, 8, 24, 24, 10, 22, '#8d9695'); rect(img, 11, 11, 11, 1, '#dde3e0'); rect(img, 12, 22, 9, 1, '#6c7472'); px(img, 13, 13, '#eef3f1'); px(img, 18, 13, '#eef3f1'); },
  silver_ingot(img) { trap(img, 11, 11, 21, 15, 8, 24, '#e2f0f0'); trap(img, 15, 8, 24, 24, 10, 22, '#bcd0d0'); rect(img, 11, 11, 11, 1, '#f5ffff'); rect(img, 12, 22, 9, 1, '#94abab'); px(img, 13, 13, '#ffffff'); px(img, 19, 13, '#ffffff'); },
  hide(img) { disc(img, 16, 17, 9, '#8d6a45'); rect(img, 5, 9, 5, 5, '#7d5c3e'); rect(img, 22, 9, 5, 5, '#7d5c3e'); rect(img, 7, 22, 5, 5, '#7d5c3e'); rect(img, 20, 22, 5, 5, '#7d5c3e'); disc(img, 16, 18, 5, '#a8835a'); for (const [x, y] of [[12, 14], [20, 14], [12, 21], [20, 21]]) px(img, x, y, '#5f4530'); },
  essence(img) { disc(img, 16, 17, 9, '#4a2f66'); disc(img, 16, 16, 6, '#7d52a8'); disc(img, 15, 15, 3, '#b98fe0'); px(img, 14, 14, '#e6d4f7'); line(img, 16, 9, 16, 3, 1, '#9a6fc4'); px(img, 7, 11, '#caa7ee'); px(img, 25, 13, '#caa7ee'); px(img, 23, 24, '#caa7ee'); px(img, 9, 24, '#caa7ee'); },

  // ── ИНСТРУМЕНТЫ ──
  stone_pickaxe(img) { handle(img); trap(img, 12, 6, 9, 9, 5, 12, '#8f9491'); trap(img, 12, 23, 26, 9, 20, 29, '#8f9491'); line(img, 7, 12, 16, 9, 1, '#6d726f'); line(img, 16, 9, 28, 11, 1, '#6d726f'); line(img, 8, 11, 15, 8, 1, '#b0b5b2'); tierPips(img, 14, 14, 1); },
  iron_pickaxe(img) { handle(img); trap(img, 12, 6, 9, 9, 5, 12, '#b2bcbc'); trap(img, 12, 23, 26, 9, 20, 29, '#b2bcbc'); line(img, 8, 11, 15, 8, 1, '#dde6e6'); line(img, 18, 9, 28, 11, 1, '#dde6e6'); line(img, 7, 12, 16, 10, 1, '#7f8a8a'); tierPips(img, 13, 14, 2); },
  wood_axe(img) { handle(img); trap(img, 6, 17, 21, 16, 22, 26, '#9aa3a1'); trap(img, 6, 17, 19, 16, 22, 23, '#c8d0ce'); line(img, 22, 8, 27, 20, 2, '#d6dedc'); line(img, 17, 7, 18, 21, 1, '#6d726f'); },
  iron_shovel(img) { handle(img); trap(img, 18, 13, 17, 28, 8, 22, '#aab4b4'); trap(img, 18, 13, 15, 26, 9, 18, '#d2dada'); rect(img, 9, 26, 13, 1, '#7f8a8a'); line(img, 14, 18, 14, 11, 2, '#7d5630'); },

  // ── ОРУЖИЕ ──
  flint_dagger(img) { trap(img, 6, 16, 16, 17, 13, 19, '#787f7c'); trap(img, 6, 16, 16, 17, 14, 17, '#a0a7a4'); rect(img, 11, 17, 10, 2, '#4a3120'); rect(img, 14, 19, 4, 8, '#5e3f22'); for (let y = 20; y <= 26; y += 2) rect(img, 14, y, 4, 1, '#3a2614'); disc(img, 16, 28, 1.6, '#caa23a'); },
  steel_sword(img) { trap(img, 3, 16, 16, 21, 13, 19, '#c3c9c7'); trap(img, 3, 16, 16, 21, 15, 17, '#eef3f1'); rect(img, 9, 21, 14, 2, '#6b6f6c'); rect(img, 8, 21, 1, 2, '#8f9491'); rect(img, 23, 21, 1, 2, '#8f9491'); rect(img, 14, 23, 4, 6, '#5a3f26'); for (let y = 24; y <= 28; y += 2) rect(img, 14, y, 4, 1, '#3a2614'); disc(img, 16, 30, 1.8, '#8f9491'); },
  silver_sword(img) { trap(img, 3, 16, 16, 21, 13, 19, '#d9e6e6'); trap(img, 3, 16, 16, 21, 15, 17, '#f6ffff'); for (let y = 5; y <= 19; y += 3) px(img, 16, y, '#aac6c6'); rect(img, 8, 21, 16, 2, '#b9912f'); rect(img, 8, 20, 1, 3, '#e0c060'); rect(img, 23, 20, 1, 3, '#e0c060'); rect(img, 14, 23, 4, 6, '#46355a'); disc(img, 16, 30, 1.8, '#b9912f'); },
  crossbow(img) { rect(img, 14, 12, 4, 17, '#6b4528'); rect(img, 15, 12, 1, 17, '#8a5e36'); trap(img, 11, 4, 7, 13, 2, 9, '#7d5630'); trap(img, 11, 25, 28, 13, 23, 30, '#7d5630'); line(img, 5, 12, 27, 12, 1, '#3a2614'); line(img, 16, 12, 16, 6, 1, '#cdd4d2'); trap(img, 4, 15, 17, 7, 16, 16, '#cdd4d2'); rect(img, 13, 25, 6, 3, '#5a3f26'); },
  bolt(img) { rect(img, 15, 9, 2, 16, '#7d5630'); trap(img, 3, 16, 16, 9, 13, 19, '#cdd4d2'); trap(img, 3, 16, 16, 9, 14, 18, '#eef3f1'); line(img, 12, 24, 16, 27, 2, '#b9463a'); line(img, 20, 24, 16, 27, 2, '#b9463a'); line(img, 13, 22, 16, 25, 1, '#d96a5e'); },
  bomb(img) { disc(img, 15, 20, 8, '#34383a'); disc(img, 15, 20, 6.5, '#26292b'); disc(img, 12, 17, 2, '#5a6266'); rect(img, 17, 9, 4, 4, '#3a2f22'); line(img, 19, 11, 25, 4, 2, '#a77939'); disc(img, 25, 3, 1.6, '#ffd05a'); px(img, 26, 2, '#fff0b0'); },
  shield(img) { disc(img, 16, 16, 12, '#6e4a28'); disc(img, 16, 16, 10, '#8a6038'); for (let a = 0; a < 16; a++) px(img, 16 + Math.cos(a) * 11, 16 + Math.sin(a) * 11, '#9aa09c'); line(img, 16, 6, 16, 26, 1, '#6e4a26'); line(img, 7, 12, 25, 20, 1, '#6e4a26'); disc(img, 16, 16, 3.4, '#aab2ad'); disc(img, 16, 16, 2, '#d2dad6'); for (const [x, y] of [[16, 7], [16, 25], [8, 13], [24, 19]]) px(img, x, y, '#cdd4d2'); },
  leather_armor(img) { trap(img, 8, 11, 21, 14, 6, 26, '#81563b'); trap(img, 14, 6, 26, 27, 9, 23, '#81563b'); rect(img, 13, 6, 6, 3, '#5f3e29'); trap(img, 8, 11, 14, 13, 5, 9, '#6b4628'); trap(img, 8, 18, 21, 13, 23, 27, '#6b4628'); line(img, 16, 10, 16, 25, 1, '#3f2a1a'); for (let y = 12; y <= 24; y += 3) { px(img, 14, y, '#3f2a1a'); px(img, 18, y, '#3f2a1a'); } px(img, 11, 14, '#9c6f4a'); },

  // ── ЕДА ──
  berries(img) { disc(img, 12, 20, 4, '#9a2943'); disc(img, 20, 19, 4, '#9a2943'); disc(img, 16, 24, 4, '#9a2943'); disc(img, 12, 20, 3, '#c33b58'); disc(img, 20, 19, 3, '#c33b58'); disc(img, 16, 24, 3, '#c33b58'); px(img, 11, 18, '#e88a9a'); px(img, 19, 17, '#e88a9a'); px(img, 15, 22, '#e88a9a'); line(img, 16, 14, 16, 18, 1, '#4f7a32'); trap(img, 11, 16, 20, 14, 14, 19, '#5f9a3a'); },
  raw_meat(img) { disc(img, 17, 18, 9, '#c0605a'); disc(img, 18, 19, 7, '#d07770'); rect(img, 4, 14, 7, 5, '#ece2d0'); disc(img, 5, 13, 2, '#ece2d0'); disc(img, 5, 20, 2, '#ece2d0'); px(img, 18, 15, '#e89a92'); px(img, 21, 20, '#a84840'); px(img, 15, 21, '#a84840'); },
  cooked_meat(img) { disc(img, 17, 18, 9, '#8a4f2e'); disc(img, 18, 19, 7, '#a3633a'); rect(img, 4, 14, 7, 5, '#ece2d0'); disc(img, 5, 13, 2, '#ece2d0'); disc(img, 5, 20, 2, '#ece2d0'); line(img, 13, 14, 21, 22, 1, '#5e351c'); line(img, 17, 13, 24, 20, 1, '#5e351c'); px(img, 16, 16, '#caa86a'); },
  jerky(img) { for (const x of [10, 16, 22]) { trap(img, 6, x - 2, x + 2, 27, x - 3, x + 1, '#5a3a22'); line(img, x, 6, x - 1, 27, 1, '#76492b'); } px(img, 11, 12, '#c8b88a'); px(img, 17, 18, '#c8b88a'); px(img, 22, 14, '#c8b88a'); px(img, 15, 22, '#c8b88a'); },

  // ── АЛХИМИЯ ──
  elixir(img) { rect(img, 13, 3, 6, 4, '#86613a'); rect(img, 13, 2, 6, 1, '#a07a48'); rect(img, 14, 7, 4, 5, '#aeb8b4'); disc(img, 16, 21, 8, '#aeb8b4'); disc(img, 16, 22, 7, '#b02c35'); disc(img, 16, 24, 5, '#d23a44'); rect(img, 14, 12, 4, 6, '#9a463a'); px(img, 12, 19, '#f4dfe2'); line(img, 12, 18, 13, 23, 1, '#e8f0ee'); },
};

// ───────────────────────── PNG-кодек ─────────────────────────
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = buffer => { let crc = 0xffffffff; for (const byte of buffer) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const name = Buffer.from(type), size = Buffer.alloc(4), crc = Buffer.alloc(4); size.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(Buffer.concat([name, data]))); return Buffer.concat([size, name, data, crc]); };
const saveImg = (name, img) => { const rows = Buffer.alloc((SIZE * 4 + 1) * SIZE); for (let y = 0; y < SIZE; y++) { const offset = y * (SIZE * 4 + 1); for (let x = 0; x < SIZE; x++) Buffer.from(img[y * SIZE + x]).copy(rows, offset + 1 + x * 4); } const header = Buffer.alloc(13); header.writeUInt32BE(SIZE, 0); header.writeUInt32BE(SIZE, 4); header[8] = 8; header[9] = 6; writeFileSync(new URL(`${name}.png`, output), Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))])); };

// ───────────────────────── генерация ─────────────────────────
let missing = 0;
for (const id of Object.keys(ITEMS)) {
  const img = image();
  if (draw[id]) draw[id](img);
  else { rect(img, 8, 9, 16, 14, '#8b7354'); rect(img, 10, 11, 12, 10, '#a98c63'); missing++; }
  outline(img);
  saveImg(id, img);
}
console.log(`Generated ${Object.keys(ITEMS).length} item icons${missing ? ` (${missing} without a dedicated drawer)` : ''}.`);

export { draw, image, outline, SIZE };
