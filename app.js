const $ = id => document.getElementById(id);
const PRODUTOS = [...COMBOS.map(c => ({ ...c, grupo: 'Combos' })), ...AVULSOS.map(c => ({ ...c, grupo: 'Avulsos' }))];

// ---- encaixe por blocos: cada produto num unico bloco, tudo colado ------------
// Cada tipo de peca vira UM bloco retangular (colunas x linhas, peças coladas). Os blocos sao
// encaixados no canto inferior esquerdo, sem folga. Cada bloco pode girar 90 graus.

function cellsFor(tipo, qtd, P, o, rot) {
  const p = P[tipo], cells = [];
  for (let q = qtd; q > 0; q -= p.perCell) {
    const k = Math.min(q, p.perCell);   // fileira de k pecas, uma apoiada na outra
    const ow = p.w + (p.step ? (k - 1) * p.step : 0), od = p.d;
    cells.push({ tipo, k, ow, od, rot, w: (rot ? od : ow) + o.gap, d: (rot ? ow : od) + o.gap, h: p.h });
  }
  return cells;
}

// opcoes de bloco para um grupo numa largura W: [{rot, cols, w, h, cells, cw, cd}]
function blockOptions(g, P, o, W) {
  const out = [];
  for (const rot of [false, true]) {
    const cells = cellsFor(g.tipo, g.qtd, P, o, rot);
    const cw = Math.max(...cells.map(c => c.w)), cd = Math.max(...cells.map(c => c.d));
    if (rot && Math.abs(cw - cd) < 2) continue;      // girar peca quadrada nao muda nada
    const cmax = Math.floor(W / cw + 1e-9);
    if (cmax < 1) continue;
    const n = cells.length, rows = Math.ceil(n / cmax), c1 = Math.ceil(n / rows);
    for (const cols of new Set([c1, cmax > n ? n : cmax])) {
      const r = Math.ceil(n / cols);
      out.push({ g, rot, cols, cells, cw, cd, w: cols * cw, h: r * cd });
    }
  }
  return out;
}

// opcoes finas: todas as formas de bloco com poucas celulas vazias, limitadas a k por grupo
function blockOptionsFine(g, P, o, W, k) {
  const out = [];
  for (const rot of [false, true]) {
    const cells = cellsFor(g.tipo, g.qtd, P, o, rot);
    const cw = Math.max(...cells.map(c => c.w)), cd = Math.max(...cells.map(c => c.d));
    if (rot && Math.abs(cw - cd) < 2) continue;
    const cmax = Math.floor(W / cw + 1e-9), n = cells.length;
    const seen = new Set();
    for (let r = 1; r <= n; r++) {
      const cols = Math.ceil(n / r);
      if (cols > cmax || seen.has(cols)) continue;
      seen.add(cols);
      const rows = Math.ceil(n / cols);
      out.push({ g, rot, cols, cells, cw, cd, w: cols * cw, h: rows * cd, vazio: (cols * rows - n) * cw * cd });
    }
  }
  return out.sort((x, y) => x.vazio - y.vazio || Math.abs(x.w - x.h) - Math.abs(y.w - y.h)).slice(0, k);
}

// encaixa blocos no canto inferior esquerdo; devolve L e as celulas posicionadas
const ORDENS = [(x, y) => y.h - x.h || y.w - x.w, (x, y) => y.w - x.w || y.h - x.h, (x, y) => y.w * y.h - x.w * x.h];
function placeBlocks(blocks, W, ord = 0) {
  const rects = [], out = []; let L = 0;
  for (const b of [...blocks].sort(ORDENS[ord])) {
    let bx = -1, by = Infinity;
    for (const x of [0, ...rects.map(r => r.x + r.w)]) {
      if (x + b.w > W + 1e-9) continue;
      let y = 0;
      for (const r of rects) if (x < r.x + r.w - 1e-9 && x + b.w > r.x + 1e-9 && r.y + r.h > y) y = r.y + r.h;
      if (y < by - 1e-9 || (Math.abs(y - by) < 1e-9 && x < bx)) { by = y; bx = x; }
    }
    if (bx < 0) return null;
    rects.push({ x: bx, y: by, w: b.w, h: b.h });
    L = Math.max(L, by + b.h);
    out.push({ tipo: b.g.tipo, qtd: b.g.qtd, rot: b.rot, cols: b.cols, x: bx, y: by });
  }
  // regularidade: blocos alinhados (poucas linhas e colunas de partida) = organizacao logica, como na caixa real
  const uy = new Set(out.map(b => Math.round(b.y))).size, ux = new Set(out.map(b => Math.round(b.x))).size;
  return { blocks: out, L, reg: 1 + .08 * (uy - 1) + .03 * (ux - 1) };
}

// melhor arranjo de um conjunto de grupos numa largura W (testa giros e numero de colunas)
function packAt(groups, o, P, W, fino) {
  const k = fino ? Math.max(3, Math.floor(Math.pow(2500, 1 / groups.length))) : 0;
  const opts = groups.map(g => fino ? blockOptionsFine(g, P, o, W, k) : blockOptions(g, P, o, W));
  if (opts.some(x => !x.length)) return null;
  // muitos produtos num combo: so os 2 maiores grupos testam giro/colunas; os outros ficam no arranjo padrao
  if (opts.reduce((p, x) => p * x.length, 1) > 300) {
    const top = groups.map((g, i) => [i, g.qtd]).sort((x, y) => y[1] - x[1]).slice(0, 2).map(x => x[0]);
    opts.forEach((x, i) => { if (!top.includes(i)) opts[i] = x.slice(0, 1); });
  }
  let best = null;
  const pick = new Array(groups.length);
  (function rec(i) {
    if (i === groups.length) {
      for (let ord = 0; ord < (fino ? ORDENS.length : 1); ord++) {
        const r = placeBlocks(pick, W, ord);
        if (r && (!best || r.L * r.reg < best.L * best.reg - 1e-9)) best = { ...r, W };
      }
      return;
    }
    for (const b of opts[i]) { pick[i] = b; rec(i + 1); }
  })(0);
  return best;
}

// proporcao e suave: planta mais comprida so e aceita se economizar area de verdade
const shape = (W, L, o) => {
  const r = Math.max(W, L) / Math.min(W, L), pw = o.peso || .35;
  return 1 + pw * Math.max(0, r - o.ratio) + (o.minRatio ? pw * Math.max(0, o.minRatio - r) : 0);   // minRatio: forca caixa retangular
};

// estrategia "linhas/colunas": cada produto vira UMA fileira (ou uma coluna) de pecas iguais, como na caixa real
function mkBlock(g, P, o, rot, cols) {
  const cells = cellsFor(g.tipo, g.qtd, P, o, rot);
  const cw = Math.max(...cells.map(c => c.w)), cd = Math.max(...cells.map(c => c.d)), n = cells.length;
  const c = cols === 'n' ? n : Math.min(cols, n);
  return { g, rot, cols: c, cells, cw, cd, w: c * cw, h: Math.ceil(n / c) * cd };
}
function linhas(groups, P, o, strat) {
  const blocks = groups.map(g => mkBlock(g, P, o, false, strat === 'row' ? 'n' : 1));
  const W = strat === 'row' ? Math.max(...blocks.map(b => b.w)) : blocks.reduce((s, b) => s + b.w, 0);
  const r = placeBlocks(blocks, W);
  return r && { ...r, W };
}

function packLayers(layers, o, P, fino, faixa) {
  const minW = Math.max(...layers.flat().map(g => { const c = cellsFor(g.tipo, 1, P, o, false)[0]; return Math.min(c.w, c.d); }));
  let best = null;
  const [w0, w1, passo] = faixa || [Math.ceil(minW), 400, 2];
  const consider = (rs, W, alinhado) => {
    const L = Math.max(...rs.map(r => r.L));
    if (o.horizontal !== false && W < L - 1e-9) return;   // caixa na horizontal
    const reg = rs.reduce((s, r) => s + r.reg, 0) / rs.length;
    // fileiras/colunas de produtos iguais (como na caixa real) aceitam uma caixa mais comprida
    const score = W * L * shape(W, L, alinhado ? { ...o, ratio: Math.max(o.ratio, 3.2) } : o) * reg;
    if (!best || score < best.score - 1) best = { rs, W, L, score };
  };
  for (let W = Math.max(Math.ceil(minW), w0); W <= w1; W += passo) {
    const rs = layers.map(l => packAt(l, o, P, W, fino));
    if (!rs.some(r => !r)) consider(rs, W);
  }
  if (!faixa) for (const strat of ['col', 'row']) {   // candidatos alinhados
    const rs = layers.map(l => linhas(l, P, o, strat));
    if (!rs.some(r => !r)) consider(rs, Math.max(...rs.map(r => r.W)), true);
  }
  return best;
}

const _memo = new Map();
const up5 = n => Math.ceil(n / 5) * 5;
function build(prod, o, P) {
  const key = JSON.stringify([prod.nome, o, Object.values(P).map(p => [p.w, p.d, p.h])]);
  if (_memo.has(key)) return _memo.get(key);
  const r = build0(prod, o, P);
  if (_memo.size > 400) _memo.clear();
  _memo.set(key, r);
  return r;
}

function variantsOf(prod, o, P) {
  const groups = Object.entries(prod.itens).map(([tipo, qtd]) => ({ tipo, qtd }));
  let variants;
  if (o.layers === 2 && (groups.length > 1 || groups[0].qtd > 1)) {
    variants = [];
    const g = groups.length;
    // area (celulas) de cada produto, para so testar divisoes em camadas equilibradas
    const area = groups.map(s => cellsFor(s.tipo, s.qtd, P, o, false).reduce((t, c) => t + c.w * c.d, 0));
    const tot = area.reduce((s, x) => s + x, 0);
    const parte = m => groups.reduce((s, _, i) => s + (m >> i & 1 ? area[i] : 0), 0) / tot;
    // 1) cada produto inteiro numa camada (so as divisoes mais equilibradas)
    const masks = [];
    for (let m = 1; m < (1 << g) - 1; m++) if (m & 1) masks.push([Math.abs(parte(m) - .5), m]);
    masks.sort((x, y) => x[0] - y[0]);
    masks.slice(0, 24).forEach(([, m]) => variants.push([groups.filter((_, i) => m >> i & 1), groups.filter((_, i) => !(m >> i & 1))]));
    // 2) o maior produto dividido ao meio entre as camadas
    const si = area.indexOf(Math.max(...area)), s = groups[si];
    if (s.qtd >= 2) {
      const per = P[s.tipo].perCell, half = Math.ceil(s.qtd / 2 / per) * per;
      const a1 = { tipo: s.tipo, qtd: Math.min(half, s.qtd) }, b1 = { tipo: s.tipo, qtd: s.qtd - a1.qtd };
      const others = groups.filter((_, i) => i !== si), ms = [];
      for (let m = 0; m < (1 << others.length); m++) ms.push(m);
      ms.sort((x, y) => Math.abs(others.reduce((t, _, i) => t + (x >> i & 1), 0) - others.length / 2) - Math.abs(others.reduce((t, _, i) => t + (y >> i & 1), 0) - others.length / 2));
      ms.slice(0, 12).forEach(m => {
        const A = [a1, ...others.filter((_, i) => m >> i & 1)], B = [...(b1.qtd ? [b1] : []), ...others.filter((_, i) => !(m >> i & 1))];
        if (B.length) variants.push([A, B]);
      });
    }
  } else variants = [[groups]];
  return variants;
}

function build0(prod, o, P) {
  const variants = variantsOf(prod, o, P);
  const grossos = variants.map(v => ({ v, r: packLayers(v, o, P) })).filter(x => x.r).sort((x, y) => x.r.score - y.r.score);
  let best = null;
  for (const { v, r } of grossos.slice(0, 3)) {   // refina as 3 melhores divisoes: largura de 1 em 1 mm, mais formas e ordens
    const f = packLayers(v, o, P, true, [Math.max(1, r.W - 14), r.W + 14, 1]);
    const c = f && f.score < r.score ? f : r;
    if (!best || c.score < best.score) best = c;
  }
  const blocks = best.rs.flatMap((r, li) => r.blocks.map(b => ({ ...b, layer: li, id: `${b.tipo}#${li}` })));
  return assemble(blocks, P, o);
}

// monta o resultado (celulas, caixa, camadas) a partir dos blocos; serve para o automatico e para o manual
function geomBlock(b, P, o) {
  const cells = cellsFor(b.tipo, b.qtd, P, o, b.rot);
  const cw = Math.max(...cells.map(c => c.w)), cd = Math.max(...cells.map(c => c.d));
  return { cells, cw, cd, w: b.cols * cw, h: Math.ceil(cells.length / b.cols) * cd };
}

function assemble(blocks, P, o) {
  const nl = Math.max(1, ...blocks.map(b => b.layer + 1));
  const packs = Array.from({ length: nl }, () => ({ placed: [] })), ge = {};
  let W = 0, L = 0, area = 0, n = 0;
  for (const b of blocks) {
    const g = geomBlock(b, P, o);
    ge[b.id] = { x: b.x, y: b.y, w: g.w, h: g.h, layer: b.layer };
    g.cells.forEach((c, i) => packs[b.layer].placed.push({ ...c, bid: b.id, ci: i, x: b.x + (i % b.cols) * g.cw, y: b.y + Math.floor(i / b.cols) * g.cd }));
    W = Math.max(W, b.x + g.w); L = Math.max(L, b.y + g.h);
    area += g.cells.reduce((s, c) => s + c.ow * c.od, 0); n += g.cells.length;
  }
  const hs = packs.map(p => Math.max(0, ...p.placed.map(c => c.h)));
  const H = hs.reduce((s, h) => s + h, 0) + (nl > 1 ? 6 : 0) + o.lid;
  return { packs, ge, blocks, W: W + 2 * o.margin - o.gap, L: L + 2 * o.margin - o.gap, H, hs, n, fill: Math.min(1, area / nl / Math.max(1, W * L)) };
}

// menor comprimento em que o produto cabe com a largura W fixa (rearranjando os blocos)
const _minL = new Map();
function minL(prod, o, P, W) {
  const key = `${prod.nome}|${o.layers}|${o.gap}|${o.margin}|${W}|${Object.values(P).map(p => p.w + 'x' + p.d).join()}`;
  if (_minL.has(key)) return _minL.get(key);
  let best = Infinity;
  for (const v of variantsOf(prod, o, P)) {
    const rs = v.map(l => packAt(l, o, P, W - 2 * o.margin + o.gap, false));
    if (rs.some(r => !r)) continue;
    best = Math.min(best, Math.max(...rs.map(r => r.L)) + 2 * o.margin - o.gap);
  }
  if (_minL.size > 20000) _minL.clear();
  _minL.set(key, best); return best;
}
const cabeCaixa = (n, c, minFill, o, P) =>
  n.H <= c.H && n.H / c.H >= minFill && (n.W * n.L) / (c.W * c.L) >= minFill &&
  (n.W <= c.W && n.L <= c.L || minL(n.pr, n.oo, P, c.W) <= c.L || minL(n.pr, n.oo, P, c.L) <= c.W);

// escolhe o MENOR numero de caixas (cobertura gulosa) que comporta todos os produtos
function escolherCaixas(prods, o, P, minFill) {
  const need = prods.map(pr => {
    const oo = { ...o, layers: Object.values(pr.itens).reduce((s, v) => s + v, 0) > 30 ? 2 : 1 };
    const b = build(pr, oo, P);
    return { pr, oo, nome: pr.nome, W: up5(b.W), L: up5(b.L), H: up5(b.H) };
  });
  const cand = [...new Map(need.map(n => [`${n.W}x${n.L}x${n.H}`, { W: n.W, L: n.L, H: n.H }])).values()];
  let falta = new Set(need.map((_, i) => i)); const esc = [];
  while (falta.size) {
    let best = null;
    for (const c of cand) {
      const cob = [...falta].filter(i => cabeCaixa(need[i], c, minFill, o, P));
      if (!best || cob.length > best.cob.length || (cob.length === best.cob.length && c.W * c.L * c.H < best.c.W * best.c.L * best.c.H)) best = { c, cob };
    }
    if (!best.cob.length) break;
    esc.push(best.c); best.cob.forEach(i => falta.delete(i));
  }
  esc.sort((x, y) => x.W * x.L * x.H - y.W * y.L * y.H);
  const caixas = esc.map((c, i) => ({ ...c, id: String.fromCharCode(65 + i), produtos: [] }));
  need.forEach(n => { const c = caixas.find(c => cabeCaixa(n, c, minFill, o, P)) || caixas.find(c => n.W <= c.W && n.L <= c.L && n.H <= c.H); if (c) c.produtos.push(n.nome); });
  return caixas;
}

// ---- UI --------------------------------------------------------------------
const P = JSON.parse(JSON.stringify(PIECES));
function opts() {
  return {
    layers: +$('layers').value, gap: +$('gap').value, wall: +$('wall').value,
    margin: +$('margin').value, lid: +$('lid').value, ratio: +$('ratio').value || 1.8,
  };
}
const fmt = n => Math.round(n);

// ---- vista de cima: area fixa, escala automatica, medidas reais -------------
const FORMA = new Proxy({ nigiri: 'rect', hosso: 'circle', uramaki: 'circle', hot: 'circle', futo: 'circle', shake: 'circle', sashimi: 'rect', porcao: 'circle', crispy: 'circle', oniguiri: 'tri' }, { get: (o, k) => o[k] || (String(k).startsWith('gunkan') ? 'circle' : 'circle') });
const PHOTO = {};   // tipo -> [l,t,r,b] fracoes do PNG ocupadas pela peca (img/meta.json); sombra fica fora
fetch('img/meta.json').then(r => r.json()).then(m => Object.entries(m).forEach(([t, b]) => {
  const im = new Image(); im.onload = () => { PHOTO[t] = b; render(); }; im.src = `img/${t}.webp`;
})).catch(() => {});
let layerIdx = 0;
const VW = 640, VH = 440, PAD = 46;

// foto recortada: a peca (bbox) cobre EXATAMENTE a pegada x,y,w,d; a sombra transborda por fora
function photo(tipo, x, y, w, d) {
  const [l, t, r, b] = PHOTO[tipo], fw = w / (r - l), fh = d / (b - t);
  return `<image href="img/${tipo}.webp" x="${x - l * fw}" y="${y - t * fh}" width="${fw}" height="${fh}" preserveAspectRatio="none" style="filter:drop-shadow(0 .5px .6px rgba(0,0,0,.6)) drop-shadow(0 1.6px 2.2px rgba(0,0,0,.22))"/>`;
}

function shapeSVG(c, x, y, p, s, id) {
  if (p.step) {   // fileira inclinada: foto do conjunto todo, ou pecas sobrepostas
    const gw = (p.w + (c.k - 1) * p.step) * s, gd = p.d * s, f = FORMA[c.tipo];
    if (PHOTO[c.tipo + '_tile']) {   // mesma peca repetida, mesmo angulo, uma encostada na outra (fileira organizada)
      return Array.from({ length: c.k }, (_, i) => photo(c.tipo + '_tile', x + i * p.step * s, y, p.w * s, gd)).join('');
    }
    if (PHOTO[c.tipo]) return photo(c.tipo, x, y, gw, gd);
    return Array.from({ length: c.k }, (_, i) => {
      const sx = x + i * p.step * s, w = p.w * s;
      return f === 'circle'
        ? `<circle cx="${sx + w / 2}" cy="${y + gd / 2}" r="${Math.min(w, gd) / 2}" fill="${p.cor}" stroke="#0004"/>`
        : `<rect x="${sx}" y="${y}" width="${w}" height="${gd}" rx="${w * .3}" fill="${p.cor}" stroke="#0004"/>`;
    }).join('');
  }
  const w = p.w * s, d = p.d * s, f = FORMA[c.tipo], cx = x + w / 2, cy = y + d / 2;
  let geo, clip;
  if (f === 'circle') { const r = Math.min(w, d) / 2; geo = `<circle cx="${cx}" cy="${cy}" r="${r}"`; clip = `<circle cx="${cx}" cy="${cy}" r="${r}"/>`; }
  else if (f === 'oval') { geo = `<ellipse cx="${cx}" cy="${cy}" rx="${w / 2}" ry="${d / 2}"`; clip = `<ellipse cx="${cx}" cy="${cy}" rx="${w / 2}" ry="${d / 2}"/>`; }
  else if (f === 'tri') { const pts = `${cx},${y} ${x + w},${y + d} ${x},${y + d}`; geo = `<polygon points="${pts}"`; clip = `<polygon points="${pts}"/>`; }
  else { const rr = Math.min(w, d) * .25; geo = `<rect x="${x}" y="${y}" width="${w}" height="${d}" rx="${rr}"`; clip = `<rect x="${x}" y="${y}" width="${w}" height="${d}" rx="${rr}"/>`; }
  if (PHOTO[c.tipo]) return photo(c.tipo, x, y, w, d);
  return `${geo} fill="${p.cor}" stroke="#0004"/>`;
}

// ---- organizacoes salvas por produto + arrastar e soltar -----------------------
const STORE = 'kampeki-orgs-v1';
let LAYS = {}; try { LAYS = JSON.parse(localStorage.getItem(STORE) || '{}'); } catch (e) { LAYS = {}; }
const saveLays = () => { try { localStorage.setItem(STORE, JSON.stringify(LAYS)); } catch (e) { /* sem armazenamento */ } };
let selBid = null, lastR = null, lastS = 1, lastGeo = null, lastKeys = new Set(), drag = null;
const cur = () => ({ o: opts(), prod: PRODUTOS[$('sel').value] });
const slotOf = (prod, o) => (LAYS[prod.nome + '|' + o.layers] ||= { idx: -1, items: [] });
const plain = bl => bl.map(({ id, tipo, qtd, rot, cols, x, y, layer }) => ({ id, tipo, qtd, rot, cols, x, y, layer }));
const hit = (a, b) => a.x < b.x + b.w - .01 && a.x + a.w > b.x + .01 && a.y < b.y + b.h - .01 && a.y + a.h > b.y + .01;
const hasOverlap = r => { const ids = Object.keys(r.ge); return ids.some((i, ix) => ids.slice(ix + 1).some(j => r.ge[i].layer === r.ge[j].layer && hit(r.ge[i], r.ge[j]))); };

function result(prod, o) {
  const sl = slotOf(prod, o), it = sl.items[sl.idx];
  if (it) { const r = assemble(it.blocks, P, o); if (!hasOverlap(r)) return r; }   // medidas mudaram e sobrepos: volta ao automatico
  return build(prod, o, P);
}

// rolls (uramaki, hossomaki, hot, futomaki) se arrastam em bloco; o resto (niguiri, gunkan, sashimi...) peca por peca
const ROLL = t => /^(uramaki|hosso|hot)_|^futo$/.test(t);
function explode(bl) {
  const { o } = cur();
  return bl.flatMap(b => {
    if (ROLL(b.tipo)) return [b];
    const g = geomBlock(b, P, o);
    return g.cells.map((c, i) => ({ tipo: b.tipo, qtd: c.k, rot: b.rot, cols: 1, x: b.x + (i % b.cols) * g.cw, y: b.y + Math.floor(i / b.cols) * g.cd, layer: b.layer, id: `${b.tipo}#${b.layer}:${i}` }));
  });
}
function novaOrg(blocks, nome) {
  const { prod, o } = cur(), sl = slotOf(prod, o);
  sl.items.push({ nome: nome || `Organização ${sl.items.length + 1}`, blocks: plain(explode(plain(blocks))) });
  sl.idx = sl.items.length - 1; saveLays();
  return sl.items[sl.idx].blocks;
}
function editBlocks() {   // organizacao editavel; se esta no automatico, cria uma copia
  const { prod, o } = cur(), sl = slotOf(prod, o);
  return sl.items[sl.idx] ? sl.items[sl.idx].blocks : novaOrg(lastR.blocks);
}
function normalize(bl) {
  const mx = Math.min(...bl.map(b => b.x)), my = Math.min(...bl.map(b => b.y));
  bl.forEach(b => { b.x -= mx; b.y -= my; });
}
function livre(b, bl, o) {   // primeiro lugar livre (mais baixo, mais a esquerda) para o bloco na camada dele
  const g = geomBlock(b, P, o), os = bl.filter(x => x.id !== b.id && x.layer === b.layer).map(x => ({ ...x, ...(({ w, h }) => ({ w, h }))(geomBlock(x, P, o)) }));
  const xs = [0, ...os.map(x => x.x + x.w)], ys = [0, ...os.map(x => x.y + x.h)];
  let best = null;
  for (const y of ys) for (const x of xs) {
    if (os.some(q => hit({ x, y, w: g.w, h: g.h }, q))) continue;
    if (!best || y < best.y - .01 || (Math.abs(y - best.y) < .01 && x < best.x)) best = { x, y };
  }
  return best;
}
let CAIXAS = [];   // caixas padrao calculadas para todos os produtos
function caixaPara(w, l, h) {   // menor caixa padrao que comporta (sem exigir aproveitamento minimo)
  return CAIXAS.filter(c => w <= c.W && l <= c.L && h <= c.H).sort((x, y) => x.W * x.L * x.H - y.W * y.L * y.H)[0] || null;
}
function sugerida(r) {
  const a = Math.max(r.W, r.L), b = Math.min(r.W, r.L), ratio = a / b;
  const forma = ratio < 1.08 ? 'quadrada' : `retangular (1 : ${ratio.toFixed(2).replace('.', ',')})`;
  const c = CAIXAS.length ? caixaPara(up5(r.W), up5(r.L), up5(r.H)) : null;
  const pad = !CAIXAS.length ? '<span class="mut">calculando caixas padrão…</span>'
    : c ? `<span><b>Usa a Caixa ${c.id}</b> (${c.W} × ${c.L} × ${c.H} mm) · folga de ${Math.round((1 - r.W * r.L / (c.W * c.L)) * 100)}% na planta</span>`
    : `<span class="warn"><b>Não cabe em nenhuma caixa padrão</b> — pediria uma nova de ${up5(r.W)} × ${up5(r.L)} × ${up5(r.H)} mm</span>`;
  return `<span><b>Caixa sugerida:</b> ${up5(r.W)} × ${up5(r.L)} × ${up5(r.H)} mm · ${forma}</span><span>ocupação ${Math.round(r.fill * 100)}%</span>${pad}`;
}

function calcCaixas() {
  const o = opts(), minFill = (+$('minfill').value || 40) / 100;
  CAIXAS = escolherCaixas(PRODUTOS, o, P, minFill);
  $('caixas').innerHTML = `<p class="mut">${CAIXAS.length} caixas atendem ${PRODUTOS.length} produtos (aproveitamento mínimo de ${Math.round(minFill * 100)}% da planta e da altura; o produto pode ser reorganizado para caber).</p>` +
    CAIXAS.map(c => `<details><summary><b>Caixa ${c.id}</b> · ${c.W} × ${c.L} × ${c.H} mm · ${c.produtos.length} produto(s)</summary><div class="mut">${c.produtos.join(' · ')}</div></details>`).join('');
  if (lastR) $('sug').innerHTML = sugerida(lastR);
}

function stageSVG(r, o, opt = {}) {
  const li = Math.min(layerIdx, r.packs.length - 1), pack = r.packs[li];
  let s, ox, oy;
  if (opt.lock) ({ s, ox, oy } = opt.lock);   // durante o arraste a escala fica travada
  else { s = Math.min((VW - 2 * PAD) / r.W, (VH - 2 * PAD) / r.L); ox = (VW - r.W * s) / 2; oy = (VH - r.L * s) / 2; }
  lastS = s; lastGeo = { s, ox, oy };
  const bw = r.W * s, bl = r.L * s;
  const byB = {}, geo = {};
  pack.placed.forEach((c, i) => {
    const p = P[c.tipo], fw = (c.rot ? c.od : c.ow) * s, fd = (c.rot ? c.ow : c.od) * s;
    const x = ox + (o.margin + c.x + o.gap / 2) * s, y = oy + (o.margin + c.y + o.gap / 2) * s;
    let svg;
    if (!c.rot) svg = shapeSVG(c, x, y, p, s, 'cl' + i);
    else { const cx = x + fw / 2, cy = y + fd / 2; svg = `<g transform="rotate(90 ${cx} ${cy})">${shapeSVG(c, cx - c.ow * s / 2, cy - c.od * s / 2, p, s, 'cl' + i)}</g>`; }
    // rolls arrastam em bloco; o resto (niguiri, gunkan, sashimi...) peca por peca
    const key = ROLL(c.tipo) || c.bid.includes(':') ? c.bid : `${c.bid}:${c.ci}`;
    (byB[key] ||= []).push(svg);
    if (ROLL(c.tipo)) geo[key] = { x: ox + (o.margin + r.ge[c.bid].x) * s, y: oy + (o.margin + r.ge[c.bid].y) * s, w: r.ge[c.bid].w * s, h: r.ge[c.bid].h * s };
    else geo[key] = { x: ox + (o.margin + c.x) * s, y: oy + (o.margin + c.y) * s, w: (c.rot ? c.od : c.ow) * s, h: (c.rot ? c.ow : c.od) * s };
  });
  lastKeys = new Set(Object.keys(byB));
  let slots = '', floats = '';
  const blocos = Object.entries(byB).map(([bid, parts]) => {
    const g = geo[bid], on = bid === selBid;
    const rx = g.x, ry = g.y;
    const grp = `<g class="blk" data-bid="${bid}">${parts.join('')}<rect class="hit" data-bid="${bid}" x="${rx}" y="${ry}" width="${g.w}" height="${g.h}" fill="transparent" ${on ? 'stroke="#141413" stroke-dasharray="5 3" stroke-width="1.5"' : ''} style="cursor:grab"/></g>`;
    if (opt.floatId === bid) {   // area destacada onde a peca vai entrar + a peca acompanhando o cursor
      slots += `<rect x="${rx}" y="${ry}" width="${g.w}" height="${g.h}" rx="6" fill="rgba(255,139,134,.30)" stroke="#ff8b86" stroke-width="2" stroke-dasharray="6 3"/>`;
      floats += `<g transform="translate(${opt.fx},${opt.fy})" opacity=".85" style="pointer-events:none">${grp}</g>`;
      return '';
    }
    return grp;
  }).join('');
  const dimTxt = (x, y, t, rot) => `<text x="${x}" y="${y}" font-size="13" text-anchor="middle" fill="currentColor" ${rot ? `transform="rotate(-90 ${x} ${y})"` : ''}>${t}</text>`;
  return `<svg viewBox="0 0 ${VW} ${VH}" width="${VW}" height="${VH}" role="img" style="touch-action:none">
    <rect x="${ox}" y="${oy}" width="${bw}" height="${bl}" fill="none" stroke="#ff8b86" stroke-width="3" rx="3"/>
    ${slots}${blocos}${floats}
    <line x1="${ox}" y1="${oy - 14}" x2="${ox + bw}" y2="${oy - 14}" stroke="currentColor"/>${dimTxt(VW / 2, oy - 20, fmt(r.W) + ' mm')}
    <line x1="${ox + bw + 14}" y1="${oy}" x2="${ox + bw + 14}" y2="${oy + bl}" stroke="currentColor"/>${dimTxt(ox + bw + 28, VH / 2, fmt(r.L) + ' mm', true)}
  </svg>`;
}

function render() {
  const { o, prod } = cur(), sl = slotOf(prod, o);
  if (sl.idx >= sl.items.length) sl.idx = -1;
  const r = lastR = result(prod, o);
  $('dim').innerHTML = `${fmt(r.W)} × ${fmt(r.L)} × ${fmt(r.H)} <small>mm (larg × comp × alt, interno)</small>`;
  $('sug').innerHTML = sugerida(r);
  const tipos = Object.entries(prod.itens).map(([t, q]) => `<span><span class="sw" style="background:${P[t].cor}"></span>${q} ${P[t].nome} · ${P[t].w}×${P[t].d}×${P[t].h}</span>`).join('');
  $('meta').innerHTML = tipos;
  if (layerIdx >= r.packs.length) layerIdx = 0;
  $('tabs').innerHTML = r.packs.length > 1 ? r.packs.map((p, i) => `<button class="tab ${i === layerIdx ? 'on' : ''}" data-i="${i}">Camada ${i + 1} · alt. ${fmt(r.hs[i])} mm</button>`).join('') : `<span class="mut">Altura das peças ${fmt(r.hs[0])} mm</span>`;
  $('lay').innerHTML = `<option value="-1">Automático</option>` + sl.items.map((it, i) => `<option value="${i}">${it.nome.replace(/</g, '&lt;')}</option>`).join('');
  $('lay').value = String(sl.idx);
  $('btnRot').disabled = !selBid || !lastKeys.has(selBid);
  $('btnLayer').disabled = !selBid || !lastKeys.has(selBid) || o.layers < 2;
  $('btnRename').disabled = $('btnDel').disabled = sl.idx < 0;
  $('views').innerHTML = stageSVG(r, o);
  tabelaTodos(o);
}
let _tok = 0;
function tabelaTodos(o) {
  const tok = ++_tok;
  $('all').innerHTML = '<tr><th>Produto</th><th>Larg</th><th>Comp</th><th>Alt</th></tr>' + PRODUTOS.map((pr, i) => {
    const l = Object.values(pr.itens).reduce((a, b) => a + b, 0) > 30 ? 2 : 1;
    return `<tr data-i="${i}"><td>${pr.nome}${l === 2 ? ' · 2 cam.' : ''}</td><td>…</td><td></td><td></td></tr>`;
  }).join('');
  let i = 0;
  (function passo() {
    if (tok !== _tok || i >= PRODUTOS.length) return;
    const pr = PRODUTOS[i], oo = { ...o, layers: Object.values(pr.itens).reduce((a, b) => a + b, 0) > 30 ? 2 : 1 };
    const b = build(pr, oo, P), tr = $('all').querySelector(`tr[data-i="${i}"]`);
    if (tr) tr.innerHTML = `<td>${pr.nome}${oo.layers === 2 ? ' · 2 cam.' : ''}</td><td>${fmt(b.W)}</td><td>${fmt(b.L)}</td><td>${fmt(b.H)}</td>`;
    i++; if (i >= PRODUTOS.length) setTimeout(calcCaixas, 0); else setTimeout(passo, 0);
  })();
}
$('tabs').addEventListener('click', e => { if (e.target.dataset.i) { layerIdx = +e.target.dataset.i; render(); } });

// arrastar: a peca entra ao lado de outra e a vizinha e empurrada; a area destacada mostra onde ela vai entrar
function empurrar(bl, id, x, y, eixo, sinal) {
  const { o } = cur(), G = {};
  bl.forEach(b => { const g = geomBlock(b, P, o); G[b.id] = { w: g.w, h: g.h }; });
  const m = bl.find(b => b.id === id); m.x = x; m.y = y;
  const R = b => ({ x: b.x, y: b.y, w: G[b.id].w, h: G[b.id].h });
  const fila = [m]; let guarda = 0;
  while (fila.length && guarda++ < 500) {
    const a = fila.shift(), ra = R(a);
    for (const b of bl) {
      if (b === m || b === a || b.layer !== m.layer) continue;
      const rb = R(b); if (!hit(ra, rb)) continue;
      if (eixo === 'x') b.x = sinal > 0 ? ra.x + ra.w : ra.x - rb.w; else b.y = sinal > 0 ? ra.y + ra.h : ra.y - rb.h;
      fila.push(b);
    }
  }
  return bl;
}
$('views').addEventListener('pointerdown', e => {
  const h = e.target.closest('.hit'); if (!h) return;
  selBid = h.dataset.bid;
  const svg = $('views').querySelector('svg'), a = svg.getScreenCTM().a;
  drag = { bid: selBid, sx: e.clientX, sy: e.clientY, k: 1 / (a * lastS), lock: { ...lastGeo }, moved: false, b: null, prop: null, raf: 0 };
  try { $('views').setPointerCapture(e.pointerId); } catch (err) { /* sem captura: segue sem */ }
});
$('views').addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
  if (!drag.moved && Math.hypot(dx, dy) < 4) return;
  drag.cx = e.clientX; drag.cy = e.clientY;
  if (drag.raf) return;
  drag.raf = requestAnimationFrame(() => { drag.raf = 0; if (drag) arrasto(); });
});
function arrasto() {
  const { o } = cur(), dx = drag.cx - drag.sx, dy = drag.cy - drag.sy;
  if (!drag.b) {   // primeiro movimento: garante organizacao editavel e congela os dados do arraste
    const bl = editBlocks(); drag.bl = bl; drag.b = bl.find(x => x.id === drag.bid);
    drag.base = bl.map(b => ({ ...b })); drag.x0 = drag.b.x; drag.y0 = drag.b.y; drag.moved = true;
    drag.ge = {}; drag.base.forEach(b => { const g = geomBlock(b, P, o); drag.ge[b.id] = { w: g.w, h: g.h }; });
  }
  const m = drag.base.find(b => b.id === drag.bid), g = drag.ge[m.id];
  const os = drag.base.filter(x => x.id !== m.id && x.layer === m.layer).map(x => ({ ...x, ...drag.ge[x.id] }));
  const T = 5, snap = (v, c) => { let best = v, d = T; for (const q of c) if (Math.abs(q - v) < d) { d = Math.abs(q - v); best = q; } return best; };
  const px = drag.x0 + dx * drag.k, py = drag.y0 + dy * drag.k;   // posicao livre do cursor (mm)
  const nx = snap(px, os.flatMap(q => [q.x, q.x + q.w, q.x + q.w - g.w, q.x - g.w])), ny = snap(py, os.flatMap(q => [q.y, q.y + q.h, q.y + q.h - g.h, q.y - g.h]));
  const eixo = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y', sinal = (eixo === 'x' ? dx : dy) >= 0 ? 1 : -1;
  const prop = empurrar(drag.base.map(b => ({ ...b })), m.id, nx, ny, eixo, sinal);
  drag.prop = prop;
  const r2 = assemble(prop, P, o);
  $('views').innerHTML = stageSVG(r2, o, { lock: drag.lock, floatId: m.id, fx: (px - nx) * drag.lock.s, fy: (py - ny) * drag.lock.s });
}
const endDrag = () => {
  if (!drag) return;
  const d = drag; drag = null;
  if (d.moved && d.prop) {
    d.prop.forEach(p => { const b = d.bl.find(x => x.id === p.id); if (b) { b.x = p.x; b.y = p.y; } });
    normalize(d.bl); saveLays();
  }
  render();
};
$('views').addEventListener('pointerup', endDrag);
$('views').addEventListener('pointercancel', endDrag);

// girar / mudar de camada
function girar() {
  if (!selBid || !lastKeys.has(selBid)) return;
  const { o } = cur(), bl = editBlocks(), b = bl.find(x => x.id === selBid); if (!b) return;
  const ant = { ...b };
  b.rot = !b.rot;
  const g = geomBlock(b, P, o), outros = bl.filter(x => x.id !== b.id && x.layer === b.layer).map(x => ({ ...x, ...geomBlock(x, P, o) }));
  if (outros.some(q => hit({ x: b.x, y: b.y, w: g.w, h: g.h }, q))) {
    const p = livre(b, bl, o); if (!p) { Object.assign(b, ant); render(); return; }
    b.x = p.x; b.y = p.y;
  }
  normalize(bl); saveLays(); render();
}
function outraCamada() {
  const { o } = cur(); if (!selBid || o.layers < 2) return;
  const bl = editBlocks(), b = bl.find(x => x.id === selBid); if (!b) return;
  b.layer = (b.layer + 1) % 2;
  b.id = ROLL(b.tipo) ? `${b.tipo}#${b.layer}` : `${b.tipo}#${b.layer}:m${Date.now() % 100000}`;
  while (bl.some(x => x !== b && x.id === b.id)) b.id += '+';
  selBid = b.id; layerIdx = b.layer;
  const p = livre(b, bl, o); b.x = p ? p.x : 0; b.y = p ? p.y : 0;
  normalize(bl); saveLays(); render();
}
$('btnRot').addEventListener('click', girar);
$('btnLayer').addEventListener('click', outraCamada);
document.addEventListener('keydown', e => { if ((e.key === 'r' || e.key === 'R') && !/INPUT|SELECT|TEXTAREA/.test((e.target.tagName || '')) && !e.metaKey && !e.ctrlKey) girar(); });

// organizacoes
$('lay').addEventListener('input', () => { const { prod, o } = cur(); slotOf(prod, o).idx = +$('lay').value; selBid = null; saveLays(); render(); });
$('btnNova').addEventListener('click', () => { novaOrg(lastR.blocks); selBid = null; render(); });
$('btnSq').addEventListener('click', () => { const { prod, o } = cur(); novaOrg(build0(prod, { ...o, ratio: 1.05, peso: 4 }, P).blocks, 'Auto quadrada'); selBid = null; layerIdx = 0; render(); });
$('btnRe').addEventListener('click', () => { const { prod, o } = cur(); novaOrg(build0(prod, { ...o, ratio: 2.2, minRatio: 1.5, peso: 4 }, P).blocks, 'Auto retangular'); selBid = null; layerIdx = 0; render(); });
$('btnRename').addEventListener('click', () => {
  const { prod, o } = cur(), it = slotOf(prod, o).items[slotOf(prod, o).idx]; if (!it) return;
  const n = prompt('Nome da organização:', it.nome); if (n && n.trim()) { it.nome = n.trim(); saveLays(); render(); }
});
$('btnDel').addEventListener('click', () => {
  const { prod, o } = cur(), sl = slotOf(prod, o); if (sl.idx < 0) return;
  sl.items.splice(sl.idx, 1); sl.idx = -1; selBid = null; saveLays(); render();
});

$('sel').innerHTML = ['Combos', 'Avulsos'].map(g =>
  `<optgroup label="${g}">${PRODUTOS.map((p, i) => p.grupo === g ? `<option value="${i}">${p.nome}</option>` : '').join('')}</optgroup>`).join('');
$('tbl').innerHTML = '<tr><th>Peça</th><th>Larg</th><th>Prof</th><th>Alt</th></tr>' + Object.entries(P).map(([k, p]) =>
  `<tr><td><span class="sw" style="background:${p.cor}"></span>${p.nome}</td>` +
  ['w', 'd', 'h'].map(f => `<td><input type="number" data-k="${k}" data-f="${f}" value="${p[f]}" min="5"></td>`).join('') + '</tr>').join('');
$('tbl').addEventListener('input', e => { const t = e.target; if (t.dataset.k) { P[t.dataset.k][t.dataset.f] = +t.value || 5; render(); } });
$('minfill').addEventListener('input', () => { if (CAIXAS.length) calcCaixas(); });
['sel', 'layers', 'gap', 'wall', 'margin', 'lid', 'ratio'].forEach(id => $(id).addEventListener('input', () => { selBid = null; render(); }));
$('sel').value = PRODUTOS.findIndex(p => p.nome.startsWith('Combo Exclusivo'));
render();
