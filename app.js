'use strict';
/* Pulso Sano — app de ejercicio cardiovascular y seguimiento de tensión. Todo se guarda en este dispositivo. */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pad = n => String(n).padStart(2, '0');
const dkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const hm = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const fmtHM = m => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
const mmss = s => `${pad(Math.floor(s / 60))}:${pad(Math.floor(s % 60))}`;
const nf = (n, d = 1) => Number(n).toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAYS_L = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const I = {
  home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  run: '<svg viewBox="0 0 24 24"><circle cx="14" cy="4.5" r="2"/><path d="M6 21l3-6 3 2v4M9 9l4-1 3 4h3M13 8l-2 6M5 12l3-3"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/><path d="M4.5 12H9l1.5-3 2.5 5 1.5-2h5"/></svg>',
  leaf: '<svg viewBox="0 0 24 24"><path d="M5 19c0-9 5-14 15-14 0 10-5 15-14 15"/><path d="M4 21c2-6 6-9 11-11"/></svg>',
  cal: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  bell: '<svg viewBox="0 0 24 24"><path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21h4"/></svg>',
  user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><rect x="5" y="4" width="5" height="16" rx="1"/><rect x="14" y="4" width="5" height="16" rx="1"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  skip: '<svg viewBox="0 0 24 24"><path d="M5 5l9 7-9 7zM18 5v14"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
};

/* ---------- Estado ---------- */
const KEY = 'pulsosano.v1';
const DEF = {
  profile: null, bp: [], done: {}, water: {}, km: {}, fired: {}, sound: true,
  rem: {
    ex: { on: true, time: '18:30', days: [1, 2, 3, 4, 5, 6, 0] },
    water: { on: true, from: '08:30', to: '21:00', every: 90 },
    bp: { on: true, t1: '08:00', t2: '20:30' },
    move: { on: false, from: '09:00', to: '19:00', every: 60 },
    walk: { on: true, time: '19:30' },
  },
};
let S = structuredClone(DEF);
try { const raw = JSON.parse(localStorage.getItem(KEY)); if (raw) { S = Object.assign(S, raw); S.rem = Object.assign(structuredClone(DEF.rem), raw.rem || {}); } } catch (e) { /* sin almacenamiento */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* sin almacenamiento */ } };
let tab = 'hoy', planTab = 'dia', bpRange = 30, dietDay = (new Date().getDay() + 6) % 7;

/* ---------- Cálculos del perfil ---------- */
function calc(p = S.profile) {
  const bmi = p.weight / (p.height / 100) ** 2;
  const fcm = Math.round(208 - 0.7 * p.age);
  const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'm' ? 5 : -161);
  const tdee = bmr * { ini: 1.4, med: 1.55, act: 1.7 }[p.level];
  const lose = bmi >= 25;
  const kcal = Math.round(Math.max(p.sex === 'm' ? 1500 : 1200, tdee - (lose ? 400 : 0)) / 50) * 50;
  return {
    bmi, fcm, z2: [Math.round(fcm * .6), Math.round(fcm * .7)], kcal, lose,
    bmiTxt: bmi < 18.5 ? 'Peso bajo' : bmi < 25 ? 'Peso saludable' : bmi < 30 ? 'Sobrepeso' : 'Obesidad',
    water: clamp(Math.round(p.weight * 30 / 250) * 250, 1500, 3000),
    kmGoal: { ini: 3, med: 4, act: 5 }[p.level],
    goalKg: lose ? Math.round(p.weight * .95 * 10) / 10 : null,
  };
}
function progWeek() {
  const days = Math.floor((new Date(dkey()) - new Date(S.profile.start)) / 864e5);
  return clamp(Math.floor(days / 7) + 1, 1, 4);
}
const PROG = {
  hold: { ini: [60, 75, 90, 120], med: [90, 105, 120, 120], act: [120, 120, 120, 120] },
  aer: { ini: [20, 25, 30, 35], med: [30, 35, 40, 40], act: [40, 45, 45, 50] },
  rounds: { ini: [1, 2, 2, 2], med: [2, 2, 3, 3], act: [3, 3, 3, 3] },
};
function params(w = progWeek()) {
  const L = S.profile.level;
  return { hold: PROG.hold[L][w - 1], aer: PROG.aer[L][w - 1], rounds: PROG.rounds[L][w - 1] };
}

/* ---------- Ejercicios ---------- */
const EX = {
  wallsit: {
    name: 'Sentadilla isométrica en pared', kind: 'Isométrico', anim: 'wallsit',
    why: 'Es el ejercicio con mayor efecto medido sobre la tensión: unos 8 mmHg menos de sistólica tras varias semanas, 3 días por semana.',
    steps: ['Espalda apoyada en la pared, pies a 40–50 cm y separados al ancho de caderas.', 'Baja deslizando hasta notar trabajo en los muslos. Empieza alto (60–70°) y baja hacia 90° con las semanas.', 'Aguanta quieto respirando sin parar. 4 series con 1 minuto de descanso.'],
    safe: 'No aguantes la respiración. Si la rodilla molesta, sube un poco la posición.',
    cues: ['Respira: 4 segundos dentro, 4 fuera', 'No aguantes el aire', 'Espalda pegada a la pared', 'Peso en los talones', 'Hombros relajados'],
    build: p => series(4, p.hold, 60, 'wallsit', 'Aguanta'),
  },
  grip: {
    name: 'Apretón isométrico de mano', kind: 'Isométrico', anim: 'grip',
    why: 'Alternativa sin carga en las rodillas. Apretar al 30 % de tu fuerza también baja la tensión con la práctica.',
    steps: ['Usa una pelota blanda o una pinza de mano.', 'Aprieta a un tercio de tu fuerza máxima y mantén.', '4 series alternando mano, con 1 minuto de descanso.'],
    safe: 'Aprieta suave y constante. Respira con normalidad.',
    cues: ['Aprieta a un tercio de tu fuerza', 'Respira con normalidad', 'Hombro relajado'],
    build: p => series(4, Math.max(90, p.hold), 60, 'grip', i => (i % 2 ? 'Mano izquierda' : 'Mano derecha')),
  },
  walk: {
    name: 'Caminata rápida', kind: 'Aeróbico', anim: 'walk', gps: true,
    why: 'Caminar a paso vivo 150 minutos por semana baja la tensión entre 5 y 7 mmHg y mejora el colesterol.',
    steps: ['Empieza suave 3 minutos.', 'Sube a un ritmo en el que puedas hablar pero no cantar (Zona 2).', 'Acaba con 3 minutos tranquilos.'],
    safe: 'Calzado con amortiguación. Si te mareas o notas dolor en el pecho, para.',
    cues: ['Deberías poder hablar sin ahogarte', 'Brazos sueltos, mirada al frente', 'Paso corto y rítmico', 'Hombros abajo'],
    build: (p, min) => cardio(min || p.aer, 'walk'),
  },
  bike: {
    name: 'Bicicleta o elíptica', kind: 'Aeróbico', anim: 'bike',
    why: 'Mismo beneficio que caminar, sin impacto en rodillas y caderas.',
    steps: ['3 minutos de pedaleo suave.', 'Resistencia media, ritmo constante en Zona 2.', '3 minutos suaves para terminar.'],
    safe: 'Ajusta el sillín: la rodilla casi estirada abajo.',
    cues: ['Pedaleo redondo y constante', 'Deberías poder hablar', 'Relaja las manos'],
    build: (p, min) => cardio(min || p.aer, 'bike'),
  },
  strength: {
    name: 'Circuito de fuerza', kind: 'Fuerza', anim: 'squat',
    why: 'El músculo reduce la rigidez de las arterias y ayuda a controlar peso y azúcar. Suma unos 3–4 mmHg menos.',
    steps: ['5 ejercicios: sentadilla a silla, flexiones en pared, remo con goma, puente de glúteo y elevación de talones.', '40 segundos de trabajo y 20 de descanso.', 'Movimiento controlado, sin llegar al fallo.'],
    safe: 'Suelta el aire al hacer fuerza. Nunca empujes aguantando la respiración.',
    cues: ['Suelta el aire al hacer fuerza', 'Movimiento lento y controlado', 'Calidad antes que cantidad'],
    build: p => {
      const set = [['squat', 'Sentadilla a silla'], ['pushup', 'Flexiones en pared'], ['row', 'Remo con goma'], ['bridge', 'Puente de glúteo'], ['calf', 'Elevación de talones']];
      const ph = [];
      for (let r = 0; r < p.rounds; r++) set.forEach(([a, n], i) => {
        ph.push({ label: n, secs: 40, type: 'work', anim: a, sub: `Ronda ${r + 1} de ${p.rounds}` });
        if (!(r === p.rounds - 1 && i === set.length - 1)) ph.push({ label: 'Descanso', secs: 20, type: 'rest', anim: set[(i + 1) % set.length][0], sub: 'Siguiente: ' + set[(i + 1) % set.length][1] });
      });
      return ph;
    },
  },
  breath: {
    name: 'Respiración lenta', kind: 'Relajación', anim: 'breath',
    why: 'Respirar a unas 6 respiraciones por minuto calma el sistema nervioso y baja la tensión de forma inmediata.',
    steps: ['Siéntate con la espalda apoyada.', 'Inhala por la nariz 4 segundos mientras crece el círculo.', 'Exhala despacio 6 segundos mientras se encoge.'],
    safe: 'Si te mareas, vuelve a tu respiración normal.',
    cues: [], build: () => [{ label: 'Respira con el círculo', secs: 300, type: 'work', anim: 'breath' }],
  },
  stretch: {
    name: 'Estiramientos suaves', kind: 'Movilidad', anim: 'st_up',
    why: 'Mantienen las articulaciones listas para moverte cada día y ayudan a relajar.',
    steps: ['4 posturas de 45 segundos.', 'Estira hasta notar tensión agradable, sin dolor.', 'Respira lento todo el tiempo.'],
    safe: 'Sin rebotes.',
    cues: ['Sin rebotes', 'Respira lento', 'Tensión agradable, nunca dolor'],
    build: () => [['st_calf', 'Gemelos en pared'], ['st_ham', 'Parte posterior de la pierna'], ['st_chest', 'Abrir el pecho'], ['st_up', 'Brazos arriba']]
      .flatMap(([a, n], i, arr) => [{ label: n, secs: 45, type: 'work', anim: a }].concat(i < arr.length - 1 ? [{ label: 'Cambia de postura', secs: 6, type: 'rest', anim: arr[i + 1][0], sub: 'Siguiente: ' + arr[i + 1][1] }] : [])),
  },
};
function series(n, work, rest, anim, label) {
  const ph = [];
  for (let i = 0; i < n; i++) {
    ph.push({ label: typeof label === 'function' ? label(i) : label, secs: work, type: 'work', anim, sub: `Serie ${i + 1} de ${n}` });
    if (i < n - 1) ph.push({ label: 'Descanso', secs: rest, type: 'rest', anim: 'stand', sub: 'Camina un poco y respira' });
  }
  return ph;
}
function cardio(min, anim) {
  const w = min >= 15 ? 3 : 2;
  return [{ label: 'Calentamiento suave', secs: w * 60, type: 'rest', anim },
    { label: 'Ritmo vivo · Zona 2', secs: (min - 2 * w) * 60, type: 'work', anim },
    { label: 'Vuelta a la calma', secs: w * 60, type: 'rest', anim }];
}
const SHORT = { wallsit: 'Isométrico pared', grip: 'Isométrico mano', walk: 'Caminata', bike: 'Bici', strength: 'Fuerza', breath: 'Respiración', stretch: 'Estiramientos' };
const exMin = (id, min) => Math.round(EX[id].build(params(), min).reduce((a, p) => a + p.secs, 0) / 60);

/* Plan semanal: índice = día de la semana (0 domingo) */
function tasksFor(date = new Date(), w) {
  const p = S.profile ? params(w) : { aer: 30 };
  const iso = S.profile?.knee ? 'grip' : 'wallsit', aer2 = S.profile?.knee ? 'bike' : 'walk';
  const short = Math.max(10, Math.round(p.aer / 2 / 5) * 5), long = p.aer + 10;
  const plan = {
    1: [[iso], ['walk', short]], 2: [[aer2, p.aer], ['breath']], 3: [[iso], ['strength']], 4: [['bike', p.aer], ['stretch']],
    5: [[iso], ['walk', short]], 6: [[aer2, long], ['strength']], 0: [['walk', 20], ['breath'], ['stretch']],
  }[date.getDay()];
  return plan.map(([id, min]) => ({ id, min, total: S.profile ? exMin(id, min) : min || 10 }));
}
const doneOn = k => S.done[k] || {};
function setDone(id, minutes, k = dkey()) { (S.done[k] ||= {})[id] = minutes; save(); }
function weekStart(d = new Date()) { return addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -((d.getDay() + 6) % 7)); }
function weekStats() {
  const s = weekStart(); let aer = 0, iso = 0, str = 0, total = 0;
  for (let i = 0; i < 7; i++) for (const [id, m] of Object.entries(doneOn(dkey(addDays(s, i))))) {
    total += m; if (id === 'walk' || id === 'bike') aer += m; if (id === 'wallsit' || id === 'grip') iso++; if (id === 'strength') str++;
  }
  return { aer, iso, str, total };
}
function streak() {
  let n = 0, d = new Date();
  if (!Object.keys(doneOn(dkey(d))).length) d = addDays(d, -1);
  while (Object.keys(doneOn(dkey(d))).length) { n++; d = addDays(d, -1); }
  return n;
}

/* ---------- Figuras animadas ---------- */
function ik(a, b, l1, l2, dir) {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.min(Math.hypot(dx, dy) || .01, l1 + l2 - .01);
  const A = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), ang = Math.atan2(dy, dx) + dir * A;
  return [a[0] + l1 * Math.cos(ang), a[1] + l1 * Math.sin(ang)];
}
const mix = (a, b, s) => [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s];
const G = 172;
function breathState(t) { const c = t % 10; return c < 4 ? { s: c / 4, txt: 'Inhala por la nariz…', left: 4 - c } : { s: 1 - (c - 4) / 6, txt: 'Exhala despacio…', left: 10 - c }; }
function pose(anim, t) {
  const pp = T => (1 - Math.cos(2 * Math.PI * t / T)) / 2;
  const b = 1.2 * Math.sin(t * 1.6);
  const wall = x => `<path class="prop" d="M${x} 18V${G}"/>`;
  switch (anim) {
    case 'wallsit': return { sh: [73, 74 + b], hip: [74, 122], f: [[112, G], [119, G]], h: [[104, 121], [108, 122]], props: wall(60) };
    case 'walk': { const ph = 2 * Math.PI * t / 1.1, s = Math.sin(ph), c = Math.cos(ph);
      return { sh: [102, 71 + Math.abs(s) * 2], hip: [100, 111 + Math.abs(s) * 2], f: [[100 + 21 * s, G - 7 * Math.max(0, c)], [100 - 21 * s, G - 7 * Math.max(0, -c)]], h: [[102 - 19 * s, 110], [102 + 19 * s, 110]] }; }
    case 'bike': { const ph = 2 * Math.PI * t / 1.3, c = [100, 150];
      return { sh: [116, 72 + b * .5], head: [125, 56 + b * .5], hip: [86, 104], f: [[c[0] + 11 * Math.cos(ph), c[1] + 11 * Math.sin(ph)], [c[0] - 11 * Math.cos(ph), c[1] - 11 * Math.sin(ph)]], h: [[138, 100], [138, 100]],
        props: `<circle class="prop" cx="52" cy="148" r="22"/><circle class="prop" cx="152" cy="148" r="22"/><path class="prop" d="M52 148L86 112L100 150L52 148M86 112L132 112L152 148M132 112L138 100M78 108H94"/>` }; }
    case 'squat': { const s = pp(3.2);
      return { sh: mix([100, 72], [93, 92], s), hip: mix([98, 112], [78, 127], s), f: [[100, G], [107, G]], h: [mix([104, 116], [130, 94], s), mix([100, 116], [128, 96], s)], props: '<path class="prop" d="M52 96V136H84M56 136V170M82 136V170"/>' }; }
    case 'pushup': { const s = pp(3);
      return { sh: mix([110, 76], [125, 80], s), hip: mix([96, 114], [102, 115], s), headOff: [6, -17], f: [[84, G], [90, G]], h: [[148, 84], [148, 88]], props: wall(153) }; }
    case 'row': { const s = pp(2.6), h = mix([138, 96], [110, 98], s);
      return { sh: mix([100, 72], [97, 72], s), hip: [100, 112], f: [[95, G], [107, G]], h: [h, [h[0] + 2, h[1] + 2]], props: `<path class="prop" d="M166 60V${G}"/><path class="band" d="M${h[0]} ${h[1]}L166 96"/>` }; }
    case 'bridge': { const s = pp(3.2);
      return { sh: [62, 164], head: [45, 161], hip: mix([104, 163], [104, 139], s), f: [[140, G], [146, G]], h: [[92, 169], [96, 169]], ed: -1 }; }
    case 'calf': { const l = 8 * pp(2.2);
      return { sh: [100, 72 - l], hip: [100, 112 - l], f: [[97, G], [104, G]], h: [[103, 116 - l], [99, 116 - l]] }; }
    case 'grip': { const r = 5 + 3 * pp(1.6);
      return { sh: [100, 72 + b], hip: [100, 112], f: [[96, G], [105, G]], h: [[134, 96], [98, 116]], props: `<circle class="hot" cx="136" cy="96" r="${r.toFixed(1)}"/>` }; }
    case 'st_calf': return { sh: [124, 80 + b], hip: [102, 116], headOff: [6, -17], f: [[68, G], [112, G]], h: [[148, 84], [148, 88]], props: wall(153) };
    case 'st_ham': return { sh: [124, 100 + b], hip: [94, 110], headOff: [14, 8], f: [[98, G], [104, G]], h: [[122, 142], [126, 140]] };
    case 'st_chest': return { sh: [102, 72 + b], hip: [100, 112], f: [[96, G], [105, G]], h: [[78, 108], [80, 110]] };
    case 'st_up': return { sh: [100, 72 + b], hip: [100, 112], f: [[96, G], [105, G]], h: [[97, 26 + b], [104, 26 + b]], ed: -1 };
    default: return { sh: [100, 72 + b], hip: [100, 112], f: [[96, G], [105, G]], h: [[104, 116], [99, 116]] };
  }
}
function figSVG(anim, t) {
  if (anim === 'breath') { const s = breathState(t).s; return `<circle class="air" cx="100" cy="100" r="${(34 + 52 * s).toFixed(1)}" opacity=".35"/><circle class="air" cx="100" cy="100" r="${(22 + 40 * s).toFixed(1)}"/>`; }
  const p = pose(anim, t), head = p.head || [p.sh[0] + (p.headOff?.[0] ?? 1), p.sh[1] + (p.headOff?.[1] ?? -18)];
  const L = (a, b, cls) => `<path class="limb ${cls}" d="M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}"/>`;
  const leg = (f, cls) => { const k = ik(p.hip, f, 34, 34, -1); return L(p.hip, k, cls) + L(k, f, cls) + L(f, [f[0] + 9, f[1]], cls); };
  const arm = (h, cls) => { const e = ik(p.sh, h, 24, 24, p.ed ?? 1); return L(p.sh, e, cls) + L(e, h, cls); };
  return `<path class="floor" d="M14 ${G + 6}H186"/>${p.props || ''}${leg(p.f[1], 'back')}${arm(p.h[1], 'back')}${L(p.sh, p.hip, '')}${leg(p.f[0], '')}${arm(p.h[0], '')}<circle class="head" cx="${head[0].toFixed(1)}" cy="${head[1].toFixed(1)}" r="11"/>`;
}
const fig = (anim, live = true) => `<svg class="fig" viewBox="0 0 200 200" data-anim="${anim}" ${live ? '' : 'data-still="1"'} aria-hidden="true">${figSVG(anim, .8)}</svg>`;
const noMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let figClock = 0, lastFrame = 0, figPaused = false;
function frame(ts) {
  requestAnimationFrame(frame);
  if (ts - lastFrame < 33 || document.hidden) return;
  const dt = Math.min(.1, (ts - lastFrame) / 1000); lastFrame = ts;
  if (!figPaused) figClock += dt;
  for (const el of $$('svg.fig:not([data-still])')) {
    if (noMotion && el.dataset.anim !== 'breath') continue;
    el.innerHTML = figSVG(el.dataset.anim, el.dataset.t0 ? figClock - el.dataset.t0 : figClock);
  }
}
requestAnimationFrame(frame);

/* ---------- Sonido, vibración, avisos ---------- */
let actx;
function beep(freq = 880, dur = .15, when = 0) {
  if (!S.sound) return;
  try {
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + when;
    o.frequency.value = freq; o.connect(g); g.connect(actx.destination);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.25, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.start(t); o.stop(t + dur + .05);
  } catch (e) { /* sin audio */ }
}
const buzz = p => { try { navigator.vibrate?.(p); } catch (e) { /* sin vibración */ } };
let toastT;
function toast(msg) {
  $('.toast')?.remove();
  const el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = msg; document.body.append(el);
  clearTimeout(toastT); toastT = setTimeout(() => el.remove(), 4500);
}
const canNotify = () => 'Notification' in window;
async function notify(title, body, tag) {
  toast(`${title} · ${body}`); beep(660, .12); beep(880, .18, .16); buzz([120, 60, 120]);
  if (!canNotify() || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, tag, icon: 'icon.svg', badge: 'icon.svg', renotify: true });
    else new Notification(title, { body, tag });
  } catch (e) { /* aviso no disponible */ }
}
function slots() {
  const R = S.rem, c = calc(), k = dkey(), out = [], day = new Date().getDay();
  const tasks = tasksFor(), pending = tasks.filter(t => !(t.id in doneOn(k)));
  if (R.ex.on && R.ex.days.includes(day) && pending.length) out.push({ id: 'ex', at: hm(R.ex.time), title: 'Hora de moverte', body: pending.map(t => `${EX[t.id].name} (${t.total} min)`).join(' + ') });
  if (R.bp.on) [R.bp.t1, R.bp.t2].forEach((t, i) => t && out.push({ id: 'bp' + i, at: hm(t), title: 'Mide tu tensión', body: 'Siéntate 5 minutos en calma y anota la medida.' }));
  if (R.water.on && (S.water[k] || 0) < c.water) for (let m = hm(R.water.from); m <= hm(R.water.to); m += Math.max(30, +R.water.every)) out.push({ id: 'w' + m, at: m, title: 'Bebe agua', body: `Un vaso ahora. Llevas ${nf((S.water[k] || 0) / 1000)} de ${nf(c.water / 1000)} L.` });
  if (R.move.on) for (let m = hm(R.move.from); m <= hm(R.move.to); m += Math.max(30, +R.move.every)) out.push({ id: 'm' + m, at: m, title: 'Levántate un momento', body: 'Camina o estira 2 minutos. Tus arterias lo notan.' });
  const km = S.km[k] || 0;
  if (R.walk.on && km < c.kmGoal) out.push({ id: 'km', at: hm(R.walk.time), title: 'Tu recorrido de hoy', body: `Te faltan ${nf(c.kmGoal - km)} km para llegar a ${c.kmGoal} km.` });
  return out;
}
function checkReminders() {
  if (!S.profile) return;
  const k = dkey(), now = new Date(), m = now.getHours() * 60 + now.getMinutes();
  for (const key of Object.keys(S.fired)) if (!key.startsWith(k)) delete S.fired[key];
  const due = slots().filter(s => m >= s.at && m < s.at + 20 && !S.fired[k + s.id]);
  if (!due.length) return;
  due.forEach(s => { S.fired[k + s.id] = 1; });
  save();
  const s = due[due.length - 1]; notify(s.title, s.body, s.id.replace(/\d+/, ''));
}
function ics() {
  const R = S.rem, D = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'], today = dkey().replace(/-/g, ''), out = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Pulso Sano//ES'];
  const ev = (id, time, title, desc, rule = 'FREQ=DAILY') => out.push('BEGIN:VEVENT', `UID:${id}@pulsosano`, `DTSTAMP:${today}T000000Z`, `DTSTART:${today}T${time.replace(':', '')}00`, 'DURATION:PT10M', `RRULE:${rule}`,
    `SUMMARY:${title}`, `DESCRIPTION:${desc}`, 'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${title}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT');
  if (R.ex.on && R.ex.days.length) ev('ex', R.ex.time, 'Ejercicio cardiovascular', 'Abre Pulso Sano y haz la sesión de hoy.', 'FREQ=WEEKLY;BYDAY=' + R.ex.days.map(d => D[d]).join(','));
  if (R.bp.on) [R.bp.t1, R.bp.t2].forEach((t, i) => t && ev('bp' + i, t, 'Medir la tensión', '5 minutos sentado en calma antes de medir.'));
  if (R.water.on) for (let m = hm(R.water.from); m <= hm(R.water.to); m += Math.max(30, +R.water.every)) ev('w' + m, fmtHM(m), 'Beber un vaso de agua', 'Hidratación');
  if (R.move.on) for (let m = hm(R.move.from); m <= hm(R.move.to); m += Math.max(30, +R.move.every)) ev('m' + m, fmtHM(m), 'Levantarse y moverse 2 minutos', 'Pausa activa');
  if (R.walk.on) ev('km', R.walk.time, 'Revisar el recorrido de hoy', 'Completa tus kilómetros.');
  out.push('END:VCALENDAR'); return out.join('\r\n');
}
function download(name, text, type) {
  try {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  } catch (e) { toast('No se pudo descargar el archivo en este navegador.'); }
}

/* ---------- Tensión ---------- */
function bpClass(s, d) {
  if (s >= 180 || d >= 110) return { t: 'Hipertensión grado 3', c: 'crit', i: '▲▲' };
  if (s >= 160 || d >= 100) return { t: 'Hipertensión grado 2', c: 'crit', i: '▲' };
  if (s >= 140 || d >= 90) return { t: 'Hipertensión grado 1', c: 'serious', i: '▲' };
  if (s >= 130 || d >= 85) return { t: 'Normal-alta', c: 'warn', i: '●' };
  if (s < 90 || d < 60) return { t: 'Baja', c: 'warn', i: '▼' };
  if (s >= 120 || d >= 80) return { t: 'Normal', c: 'good', i: '✓' };
  return { t: 'Óptima', c: 'good', i: '✓' };
}
const bpSorted = () => [...S.bp].sort((a, b) => a.t - b.t);
const lastBP = () => bpSorted().at(-1);
function bpAvg(days) {
  const from = Date.now() - days * 864e5, r = S.bp.filter(x => x.t >= from);
  return r.length ? { s: Math.round(r.reduce((a, x) => a + x.s, 0) / r.length), d: Math.round(r.reduce((a, x) => a + x.d, 0) / r.length), n: r.length } : null;
}
function bpChart() {
  const from = bpRange ? Date.now() - bpRange * 864e5 : 0, data = bpSorted().filter(x => x.t >= from);
  if (data.length < 2) return `<p class="muted small">Con dos medidas o más verás aquí tu evolución.</p>`;
  const W = 340, H = 200, m = { l: 30, r: 62, t: 12, b: 24 };
  const lo = Math.floor((Math.min(...data.map(x => x.d), 80) - 8) / 10) * 10, hi = Math.ceil((Math.max(...data.map(x => x.s), 140) + 8) / 10) * 10;
  const t0 = data[0].t, t1 = data.at(-1).t, X = t => m.l + (t1 === t0 ? .5 : (t - t0) / (t1 - t0)) * (W - m.l - m.r), Y = v => m.t + (hi - v) / (hi - lo) * (H - m.t - m.b);
  let g = '';
  for (let v = lo; v <= hi; v += 20) g += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${m.l - 6}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`;
  const ref = (v, txt) => `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--ink-3)" stroke-width="1" stroke-dasharray="4 4"/><text x="${W - m.r + 6}" y="${Y(v) + 4}">${txt}</text>`;
  const line = (k, col) => `<path d="${data.map((x, i) => `${i ? 'L' : 'M'}${X(x.t).toFixed(1)} ${Y(x[k]).toFixed(1)}`).join('')}" fill="none" stroke="var(--${col})" stroke-width="2" stroke-linejoin="round"/>` +
    data.map(x => `<circle cx="${X(x.t).toFixed(1)}" cy="${Y(x[k]).toFixed(1)}" r="${data.length > 25 ? 2.5 : 4}" fill="var(--${col})" stroke="var(--surface)" stroke-width="2"/>`).join('');
  const d0 = new Date(t0), d1 = new Date(t1), df = d => `${d.getDate()}/${d.getMonth() + 1}`;
  return `<div class="legend"><span><i style="background:var(--sys)"></i>Sistólica (alta)</span><span><i style="background:var(--dia)"></i>Diastólica (baja)</span></div>
  <div class="chart" id="bpchart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución de la tensión arterial">${g}${ref(135, 'meta <135')}${ref(85, 'meta <85')}
  ${line('s', 'sys')}${line('d', 'dia')}<line id="xh" y1="${m.t}" y2="${H - m.b}" stroke="var(--ink-3)" stroke-width="1" visibility="hidden"/>
  <text x="${m.l}" y="${H - 6}">${df(d0)}</text><text x="${W - m.r}" y="${H - 6}" text-anchor="end">${df(d1)}</text></svg><div class="tip" hidden></div></div>`;
}
function wireChart() {
  const box = $('#bpchart'); if (!box) return;
  const from = bpRange ? Date.now() - bpRange * 864e5 : 0, data = bpSorted().filter(x => x.t >= from), svg = $('svg', box), tip = $('.tip', box), xh = $('#xh', box);
  const t0 = data[0].t, t1 = data.at(-1).t;
  const move = e => {
    const r = svg.getBoundingClientRect(), vx = (e.clientX - r.left) / r.width * 340, tt = t0 + clamp((vx - 30) / 248, 0, 1) * (t1 - t0);
    const x = data.reduce((a, b) => Math.abs(b.t - tt) < Math.abs(a.t - tt) ? b : a), px = 30 + (t1 === t0 ? .5 : (x.t - t0) / (t1 - t0)) * 248;
    xh.setAttribute('x1', px); xh.setAttribute('x2', px); xh.setAttribute('visibility', 'visible');
    tip.hidden = false; tip.style.left = clamp(px / 340 * 100, 22, 78) + '%'; tip.style.top = '18px';
    tip.textContent = `${new Date(x.t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} · ${x.s}/${x.d}${x.p ? ' · ' + x.p + ' lpm' : ''}`;
  };
  svg.addEventListener('pointermove', move); svg.addEventListener('pointerdown', move);
  svg.addEventListener('pointerleave', () => { tip.hidden = true; xh.setAttribute('visibility', 'hidden'); });
}

/* ---------- Dieta ---------- */
const MENU = [
  ['Avena con plátano, nueces y canela', 'Lentejas estofadas con verduras · ensalada de tomate', 'Yogur natural con fresas', 'Merluza al horno con calabacín y patata cocida'],
  ['Tostada integral con tomate, aceite de oliva y aguacate', 'Pollo a la plancha con arroz integral y brócoli', 'Un puñado de almendras sin sal', 'Crema de calabaza · tortilla francesa con espinacas'],
  ['Yogur natural con avena, kiwi y semillas', 'Garbanzos con espinacas · naranja', 'Manzana y 2 nueces', 'Salmón a la plancha con ensalada de remolacha'],
  ['Tostada integral con queso fresco y tomate', 'Pasta integral con verduras salteadas y atún al natural', 'Plátano', 'Pisto con huevo · rebanada de pan integral'],
  ['Batido de leche desnatada, plátano y avena', 'Alubias blancas con verduras · ensalada verde', 'Yogur natural con nueces', 'Sardinas al horno con tomate y patata cocida'],
  ['Tortilla francesa con tomate · pan integral', 'Arroz integral con verduras, pollo y limón', 'Fruta de temporada', 'Ensalada completa: hojas verdes, garbanzos, aguacate y huevo'],
  ['Pan integral con aceite, tomate y pavo bajo en sal', 'Dorada al horno con verduras asadas', 'Yogur con frutos rojos', 'Sopa de verduras casera sin pastilla · queso fresco'],
];
const FOOD_YES = ['Verduras y hortalizas', 'Fruta entera', 'Legumbres', 'Cereales integrales', 'Pescado azul', 'Frutos secos sin sal', 'Aceite de oliva virgen', 'Lácteos bajos en grasa', 'Hierbas, ajo, limón y especias'];
const FOOD_NO = ['Sal de mesa y pastillas de caldo', 'Embutidos y curados', 'Quesos curados', 'Conservas y encurtidos salados', 'Platos precocinados', 'Snacks salados', 'Bollería y azúcares', 'Refrescos', 'Alcohol'];

/* ---------- Vistas ---------- */
const ringSVG = (pct, size = 84) => { const r = 36, c = 2 * Math.PI * r; return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 84 84" aria-hidden="true"><circle class="trk" cx="42" cy="42" r="${r}"/><circle class="val" cx="42" cy="42" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - clamp(pct, 0, 1))}"/></svg>`; };
function taskRow(t, k = dkey()) {
  const done = t.id in doneOn(k), e = EX[t.id];
  return `<div class="task ${done ? 'done' : ''}"><div class="figbox">${fig(e.anim, false)}</div>
    <div class="t"><b>${e.name}</b><span class="small muted">${e.kind} · ${t.total} min</span></div>
    ${done ? '' : `<button class="play" data-open="${t.id}" data-min="${t.min || ''}" aria-label="Empezar ${e.name}">${I.play}</button>`}
    <button class="chk ${done ? 'on' : ''}" data-toggle="${t.id}" data-total="${t.total}" aria-label="${done ? 'Desmarcar' : 'Marcar hecho'} ${e.name}" aria-pressed="${done}">${I.check}</button></div>`;
}
function vHoy() {
  const p = S.profile, c = calc(), k = dkey(), tasks = tasksFor(), nDone = tasks.filter(t => t.id in doneOn(k)).length, w = weekStats(), bp = lastBP();
  const ml = S.water[k] || 0, glasses = Math.round(c.water / 250), km = S.km[k] || 0, cls = bp && bpClass(bp.s, bp.d);
  const h = new Date().getHours(), hi = h < 13 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
  return `<section class="hero"><div><div class="sub">${hi}${p.name ? ', ' + esc(p.name) : ''}</div><div class="big">${w.aer}<span style="font-size:1rem"> / 150 min</span></div>
      <div class="sub">de ejercicio aeróbico esta semana · racha de ${streak()} ${streak() === 1 ? 'día' : 'días'}</div></div>${ringSVG(w.aer / 150)}</section>
    <section class="card"><div class="row"><h2 class="grow">Hoy toca</h2><span class="pill ${nDone === tasks.length ? 'good' : 'brand'}">${nDone} de ${tasks.length}</span></div>
      ${tasks.map(t => taskRow(t)).join('')}</section>
    <section class="card"><div class="row"><h2 class="grow">Tensión</h2>${bp ? `<span class="pill ${cls.c}">${cls.i} ${cls.t}</span>` : ''}</div>
      ${bp ? `<div class="bpnow"><span class="v">${bp.s}/${bp.d}</span><span class="muted">mmHg${bp.p ? ` · ${bp.p} lpm` : ''}</span></div><p class="small muted">${new Date(bp.t).toLocaleString('es-ES', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}</p>` : '<p class="muted">Aún no hay medidas. Anota la primera para empezar el seguimiento.</p>'}
      <button class="btn" data-act="bp-add">${I.plus} Anotar tensión</button></section>
    <section class="card"><div class="row"><h2 class="grow">Agua</h2><span class="pill water">${nf(ml / 1000, 2)} / ${nf(c.water / 1000)} L</span></div>
      <div class="glasses" aria-hidden="true">${Array.from({ length: glasses }, (_, i) => `<i class="glass ${i < Math.round(ml / 250) ? 'on' : ''}"></i>`).join('')}</div>
      <div class="row"><button class="btn grow" data-act="water" data-ml="250">${I.plus} Un vaso (250 ml)</button><button class="btn ghost" data-act="water" data-ml="-250" aria-label="Quitar un vaso">−</button></div></section>
    <section class="card"><div class="row"><h2 class="grow">Recorrido</h2><span class="pill">${nf(km)} / ${c.kmGoal} km</span></div>
      <div class="bar"><i style="width:${clamp(km / c.kmGoal, 0, 1) * 100}%"></i></div>
      <div class="row wrap"><button class="btn grow" data-open="walk">${I.run} Caminar con GPS</button><button class="btn ghost" data-act="km" data-km="0.5">+0,5 km</button><button class="btn ghost" data-act="km" data-km="-0.5" aria-label="Quitar medio kilómetro">−</button></div></section>
    <section class="card"><h2>Logros</h2><div class="medals">${medals().map(m => `<div class="medal ${m.on ? 'on' : ''}"><b>${m.ic}</b>${m.t}</div>`).join('')}</div></section>`;
}
function medals() {
  const days = Object.keys(S.done).filter(k => Object.keys(S.done[k]).length).length, w = weekStats(), c = calc();
  return [{ ic: '1', t: 'Primera sesión', on: days >= 1 }, { ic: '7', t: 'Racha de 7 días', on: streak() >= 7 }, { ic: '150', t: 'Semana aeróbica', on: w.aer >= 150 }, { ic: '3×', t: 'Isométrico 3 días', on: w.iso >= 3 },
    { ic: '10', t: '10 medidas de tensión', on: S.bp.length >= 10 }, { ic: 'H₂O', t: 'Agua cumplida hoy', on: (S.water[dkey()] || 0) >= c.water }];
}
function vEj() {
  const c = calc();
  return `<section class="card flat"><div class="row"><div class="grow"><p class="eyebrow">Tu zona segura</p><h2 class="num">${c.z2[0]}–${c.z2[1]} lpm</h2></div><span class="pill brand">Zona 2</span></div>
    <p class="small muted">Entre el 60 y el 70 % de tu frecuencia máxima estimada (${c.fcm} lpm). Sin pulsómetro: debes poder hablar, pero no cantar.</p></section>
    ${Object.entries(EX).map(([id, e]) => `<button class="card excard" data-open="${id}"><div class="figbox">${fig(e.anim)}</div><div><span class="pill">${e.kind} · ${exMin(id)} min</span><h3 style="margin:6px 0 2px">${e.name}</h3><p>${e.why.split('.')[0]}.</p></div></button>`).join('')}
    <section class="card flat"><h3>Para y pide ayuda (112) si notas</h3><p class="small muted">Dolor opresivo en el pecho, falta de aire en reposo, pérdida de fuerza o habla, o un dolor de cabeza brusco e intenso. Mareo o dolor articular agudo: detén la sesión y descansa.</p></section>`;
}
function vBP() {
  const bp = lastBP(), a7 = bpAvg(7), a30 = bpAvg(30), list = bpSorted().reverse();
  const hi = bp && (bp.s >= 180 || bp.d >= 110);
  return `${hi ? `<div class="note crit"><b>Tu última medida es muy alta (${bp.s}/${bp.d}).</b> Descansa 5 minutos sentado y repite. Si sigue igual, llama a tu centro de salud. Con dolor en el pecho, falta de aire, visión borrosa o debilidad en un lado del cuerpo, llama al 112.</div>` : ''}
    <section class="card"><div class="row"><div class="grow"><p class="eyebrow">Última medida</p>${bp ? `<div class="bpnow"><span class="v">${bp.s}/${bp.d}</span><span class="muted">mmHg</span></div>` : '<p class="muted">Sin medidas todavía</p>'}</div>
      ${bp ? (c => `<span class="pill ${c.c}">${c.i} ${c.t}</span>`)(bpClass(bp.s, bp.d)) : ''}</div>
      <div class="grid2"><div class="note"><span class="eyebrow">Media 7 días</span><br><b class="num" style="font-size:1.2rem">${a7 ? `${a7.s}/${a7.d}` : '—'}</b></div><div class="note"><span class="eyebrow">Media 30 días</span><br><b class="num" style="font-size:1.2rem">${a30 ? `${a30.s}/${a30.d}` : '—'}</b></div></div>
      <button class="btn" data-act="bp-add">${I.plus} Anotar tensión</button></section>
    <section class="card"><div class="row"><h2 class="grow">Evolución</h2></div>
      <div class="seg" role="group" aria-label="Periodo">${[[7, '7 días'], [30, '30 días'], [90, '3 meses'], [0, 'Todo']].map(([d, t]) => `<button data-range="${d}" aria-pressed="${bpRange === d}">${t}</button>`).join('')}</div>${bpChart()}</section>
    <section class="card"><div class="row"><h2 class="grow">Historial</h2>${list.length ? '<button class="btn sm ghost" data-act="bp-csv">Exportar</button>' : ''}</div>
      <div class="list">${list.length ? list.slice(0, 40).map(x => { const c = bpClass(x.s, x.d); return `<div class="li"><div class="grow"><b class="num">${x.s}/${x.d}</b>${x.p ? ` <span class="muted small">${x.p} lpm</span>` : ''}<br><span class="small muted">${new Date(x.t).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}${x.n ? ' · ' + esc(x.n) : ''}</span></div><span class="pill ${c.c}">${c.i} ${c.t}</span><button class="x" data-del="${x.t}" aria-label="Borrar medida">×</button></div>`; }).join('') : '<p class="muted small">Tus medidas aparecerán aquí.</p>'}</div></section>
    <section class="card flat"><h3>Cómo medir bien</h3><p class="small muted">Sentado 5 minutos, espalda apoyada, pies en el suelo y brazo a la altura del corazón. Sin café, tabaco ni ejercicio en los 30 minutos previos. Haz dos medidas separadas un minuto y anota la segunda. En casa, el objetivo habitual es una media por debajo de 135/85 mmHg; tu médico puede fijar otro.</p></section>`;
}
function vDieta() {
  const c = calc(), m = MENU[dietDay], names = ['Desayuno', 'Comida', 'Merienda', 'Cena'];
  return `<section class="card"><div class="row"><svg class="plate" viewBox="0 0 120 120" role="img" aria-label="Plato: mitad verduras, un cuarto proteína, un cuarto cereal integral">
      <circle cx="60" cy="60" r="56" fill="var(--surface-2)"/><path d="M60 60V8A52 52 0 0 0 60 112Z" fill="var(--good)"/><path d="M60 60H112A52 52 0 0 0 60 8Z" fill="var(--dia)"/><path d="M60 60V112A52 52 0 0 0 112 60Z" fill="var(--warn)"/>
      <path d="M60 8V112M60 60H112" stroke="var(--surface)" stroke-width="3"/></svg>
      <div class="grow"><p class="eyebrow">Tu plato</p><h2>Patrón DASH mediterráneo</h2><p class="small muted" style="margin-top:6px"><b style="color:var(--good)">½</b> verduras · <b style="color:var(--dia)">¼</b> proteína (pescado, legumbre, pollo) · <b style="color:var(--warn)">¼</b> cereal integral</p></div></div>
      <p class="small muted">Seguir este patrón baja la tensión sistólica entre 5 y 11 mmHg. Su clave: mucho potasio de frutas y verduras, y poca sal.</p></section>
    <section class="grid3">
      <div class="card flat"><p class="eyebrow">Energía</p><b class="num" style="font-size:1.25rem">${c.kcal}</b><span class="small muted">kcal al día${c.lose ? ', para bajar peso poco a poco' : ''}</span></div>
      <div class="card flat"><p class="eyebrow">Sal</p><b class="num" style="font-size:1.25rem">&lt; 5 g</b><span class="small muted">una cucharadita, contando la oculta</span></div>
      <div class="card flat"><p class="eyebrow">Agua</p><b class="num" style="font-size:1.25rem">${nf(c.water / 1000)} L</b><span class="small muted">unos ${Math.round(c.water / 250)} vasos</span></div></section>
    <section class="card"><h2>Menú de la semana</h2><div class="chips" role="group" aria-label="Día">${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => `<button class="chip" data-dday="${i}" aria-pressed="${dietDay === i}">${d}</button>`).join('')}</div>
      <div class="meal">${m.map((x, i) => `<b>${names[i]}</b><span>${x}</span>`).join('')}</div>
      <p class="small muted">Cocina sin sal añadida y aliña con aceite de oliva, limón, ajo y especias. Bebe agua en las comidas.</p></section>
    <section class="card"><h3>Come a diario</h3><div class="chips">${FOOD_YES.map(f => `<span class="tag">${f}</span>`).join('')}</div>
      <h3>Limita o evita</h3><div class="chips">${FOOD_NO.map(f => `<span class="tag no">${f}</span>`).join('')}</div></section>
    <section class="card flat"><h3>Cinco reglas que más bajan la tensión</h3><ol class="small muted" style="margin:0;padding-left:20px;display:grid;gap:6px">
      <li>Retira el salero y lee etiquetas: más de 1 g de sal por 100 g es mucho.</li><li>Cinco raciones de fruta y verdura al día (potasio).</li><li>Legumbres 3–4 veces por semana y pescado azul 2 veces.</li>
      <li>Alcohol: cuanto menos, mejor. Lo ideal es cero.</li><li>${c.lose ? `Bajar a ${nf(c.goalKg)} kg (un 5 %) puede restar unos 5 mmHg.` : 'Mantén tu peso actual: está en rango saludable.'}</li></ol>
      <p class="small muted">Si tienes enfermedad renal o tomas diuréticos, IECA o ARA-II, consulta antes de aumentar el potasio o usar sal baja en sodio.</p></section>`;
}
function vPlan() {
  const seg = `<div class="seg" role="group" aria-label="Vista del plan">${[['dia', 'Día'], ['sem', 'Semana'], ['mes', 'Mes']].map(([k, t]) => `<button data-plan="${k}" aria-pressed="${planTab === k}">${t}</button>`).join('')}</div>`;
  const R = S.rem, c = calc(), today = new Date();
  if (planTab === 'dia') {
    const tasks = tasksFor(), rows = [];
    if (R.bp.t1) rows.push([hm(R.bp.t1), 'Medir la tensión', 'Antes de desayunar y de la medicación, tras 5 minutos sentado.']);
    rows.push([hm(R.bp.t1 || '08:00') + 20, 'Desayuno y primer vaso de agua', MENU[(today.getDay() + 6) % 7][0]]);
    rows.push([hm('11:00'), 'Pausa activa', 'Levántate cada hora: 2 minutos de paseo o estiramiento.']);
    rows.push([hm('14:00'), 'Comida', MENU[(today.getDay() + 6) % 7][1]]);
    rows.push([hm(R.ex.time), 'Sesión de ejercicio', tasks.map(t => `${EX[t.id].name} (${t.total} min)`).join(' + ')]);
    if (R.bp.t2) rows.push([hm(R.bp.t2), 'Medir la tensión', 'Antes de cenar o al menos 30 minutos después del ejercicio.']);
    rows.push([hm('21:00'), 'Cena ligera', MENU[(today.getDay() + 6) % 7][3]]);
    rows.push([hm('23:00'), 'Dormir 7–8 horas', 'Dormir poco sube la tensión. Pantallas fuera 30 minutos antes.']);
    rows.sort((a, b) => a[0] - b[0]);
    return seg + `<section class="card"><h2>${DAYS_L[today.getDay()]}</h2><div class="tl">${rows.map(r => `<time>${fmtHM(r[0])}</time><div><b>${r[1]}</b><p class="small muted">${r[2]}</p></div>`).join('')}</div>
      <p class="small muted">Agua repartida durante el día: ${nf(c.water / 1000)} L. Las horas salen de tus avisos.</p><button class="btn ghost" data-act="rem">${I.bell} Cambiar horarios y avisos</button></section>`;
  }
  if (planTab === 'sem') {
    const s = weekStart(), w = weekStats(); let plan = 0;
    const rows = Array.from({ length: 7 }, (_, i) => { const d = addDays(s, i), k = dkey(d), ts = tasksFor(d); ts.forEach(t => { if (t.id === 'walk' || t.id === 'bike') plan += t.total; });
      return `<div class="wk ${k === dkey() ? 'today' : ''}"><div class="d">${DAYS[d.getDay()]}<br><span class="small muted">${d.getDate()}</span></div><div class="chips">${ts.map(t => `<span class="pill ${t.id in doneOn(k) ? 'good' : ''}">${t.id in doneOn(k) ? '✓ ' : ''}${SHORT[t.id]} · ${t.total}′</span>`).join('')}</div></div>`; }).join('');
    return seg + `<section class="grid3"><div class="card flat"><p class="eyebrow">Aeróbico</p><b class="num" style="font-size:1.25rem">${w.aer}′</b><span class="small muted">plan: ${plan}′ · meta 150′</span></div>
      <div class="card flat"><p class="eyebrow">Isométrico</p><b class="num" style="font-size:1.25rem">${w.iso}/3</b><span class="small muted">sesiones</span></div>
      <div class="card flat"><p class="eyebrow">Fuerza</p><b class="num" style="font-size:1.25rem">${w.str}/2</b><span class="small muted">sesiones</span></div></section>
      <section class="card"><h2>Esta semana</h2><div>${rows}</div></section>`;
  }
  const y = today.getFullYear(), mo = today.getMonth(), first = new Date(y, mo, 1), n = new Date(y, mo + 1, 0).getDate(), off = (first.getDay() + 6) % 7, pw = progWeek(), L = S.profile.level;
  let cells = '', full = 0;
  for (let i = 0; i < off; i++) cells += '<i class="off"></i>';
  for (let d = 1; d <= n; d++) { const dt = new Date(y, mo, d), k = dkey(dt), nd = Object.keys(doneOn(k)).length, tot = tasksFor(dt).length, cl = nd >= tot ? 'full' : nd ? 'part' : ''; if (cl === 'full') full++;
    cells += `<i class="${cl} ${k === dkey() ? 'today' : ''}">${d}</i>`; }
  return seg + `<section class="card"><div class="row"><h2 class="grow">${(m => m[0].toUpperCase() + m.slice(1))(today.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }))}</h2><span class="pill good">${full} días completos</span></div>
      <div class="cal">${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => `<span>${d}</span>`).join('')}${cells}</div>
      <div class="legend"><span><i style="background:var(--good)"></i>Todo hecho</span><span><i style="background:var(--warn)"></i>Parte</span></div></section>
    <section class="card"><h2>Progresión de 4 semanas</h2><div class="scroll-x"><table class="prog"><tr><th>Semana</th><th>Isométrico</th><th>Aeróbico</th><th>Fuerza</th></tr>
      ${[1, 2, 3, 4].map(w => `<tr class="${w === pw ? 'cur' : ''}"><td>${w}${w === pw ? ' · ahora' : ''}</td><td>4 × ${mmss(PROG.hold[L][w - 1])}</td><td>${PROG.aer[L][w - 1]} min</td><td>${PROG.rounds[L][w - 1]} ${PROG.rounds[L][w - 1] === 1 ? 'ronda' : 'rondas'}</td></tr>`).join('')}</table></div>
      <p class="small muted">Desde la semana 4 se mantiene la dosis. El efecto sobre la tensión suele notarse entre las semanas 4 y 8.</p></section>
    <section class="card flat"><h3>Objetivos del mes</h3><ul class="small muted" style="margin:0;padding-left:20px;display:grid;gap:6px">
      <li>12 sesiones isométricas (3 por semana).</li><li>Llegar a 150 minutos aeróbicos semanales.</li><li>Una semana de medidas mañana y noche para enseñar a tu médico.</li>
      ${c.lose ? `<li>Bajar 1–2 kg: de ${nf(S.profile.weight)} hacia ${nf(c.goalKg)} kg en unos 3 meses.</li>` : ''}<li>Revisar el peso el día 1 y actualizarlo en tu perfil.</li></ul></section>`;
}
const TITLES = { hoy: 'Pulso Sano', ej: 'Ejercicios', bp: 'Tensión', dieta: 'Alimentación', plan: 'Tu plan' };
function render() {
  const app = $('#app');
  if (!S.profile) { $('.nav').hidden = true; app.innerHTML = vOnb(); return; }
  $('.nav').hidden = false;
  const view = { hoy: vHoy, ej: vEj, bp: vBP, dieta: vDieta, plan: vPlan }[tab]();
  app.innerHTML = `<header class="top"><div class="grow"><p class="eyebrow">${new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p><h1>${TITLES[tab]}</h1></div>
    <button class="iconbtn" data-act="rem" aria-label="Avisos">${I.bell}</button><button class="iconbtn" data-act="profile" aria-label="Perfil">${I.user}</button></header><main class="view">${view}</main>`;
  $$('.nav button').forEach(b => b.toggleAttribute('aria-current', false) || (b.dataset.tab === tab && b.setAttribute('aria-current', 'page')));
  if (tab === 'bp') wireChart();
}

/* ---------- Perfil / bienvenida ---------- */
function profileForm(p = {}) {
  return `<div class="field"><label for="f-name">Nombre (opcional)</label><input id="f-name" autocomplete="given-name" value="${esc(p.name || '')}"></div>
    <div class="field"><span class="lbl">Sexo</span><div class="seg" id="f-sex">${[['m', 'Hombre'], ['f', 'Mujer']].map(([v, t]) => `<button type="button" data-v="${v}" aria-pressed="${(p.sex || 'm') === v}">${t}</button>`).join('')}</div></div>
    <div class="grid3"><div class="field"><label for="f-age">Edad</label><input id="f-age" type="number" inputmode="numeric" min="18" max="100" required value="${p.age || ''}" placeholder="años"></div>
      <div class="field"><label for="f-weight">Peso</label><input id="f-weight" type="number" inputmode="decimal" step="0.1" min="35" max="250" required value="${p.weight || ''}" placeholder="kg"></div>
      <div class="field"><label for="f-height">Altura</label><input id="f-height" type="number" inputmode="numeric" min="120" max="230" required value="${p.height || ''}" placeholder="cm"></div></div>
    <div class="field"><span class="lbl">¿Cuánto te mueves ahora?</span><div class="seg" id="f-level">${[['ini', 'Poco'], ['med', 'Algo'], ['act', 'Bastante']].map(([v, t]) => `<button type="button" data-v="${v}" aria-pressed="${(p.level || 'ini') === v}">${t}</button>`).join('')}</div></div>
    <label class="row"><input type="checkbox" class="switch" id="f-knee" ${p.knee ? 'checked' : ''}><span class="grow">Tengo molestias de rodilla<br><span class="small muted">Cambia la sentadilla en pared por apretón de mano y prioriza la bici.</span></span></label>`;
}
function readProfile(root) {
  const v = id => $('#' + id, root).value, p = { name: v('f-name').trim(), sex: $('#f-sex [aria-pressed="true"]', root).dataset.v, age: +v('f-age'), weight: +v('f-weight'), height: +v('f-height'),
    level: $('#f-level [aria-pressed="true"]', root).dataset.v, knee: $('#f-knee', root).checked };
  if (!(p.age >= 18 && p.age <= 100) || !(p.weight >= 35 && p.weight <= 250) || !(p.height >= 120 && p.height <= 230)) { toast('Revisa edad (18–100), peso (35–250 kg) y altura (120–230 cm).'); return null; }
  return p;
}
function vOnb() {
  return `<form class="onb" id="onb"><svg class="logo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/><path d="M4.5 12H9l1.5-3 2.5 5 1.5-2h5"/></svg>
    <div><h1>Pulso Sano</h1><p class="muted" style="margin-top:6px">Ejercicio guiado, alimentación y seguimiento para mantener tu tensión estable. Cuéntanos sobre ti y preparamos tu plan.</p></div>
    <div class="card">${profileForm()}</div>
    <p class="small muted">Esta app orienta, no sustituye a tu médico. Si tu tensión supera 160/100, tienes una enfermedad del corazón o tomas medicación, consulta antes de empezar. Tus datos se guardan solo en este dispositivo.</p>
    <button class="btn block" type="submit">Crear mi plan</button></form>`;
}

/* ---------- Hojas ---------- */
function sheet(title, html) {
  closeSheet();
  const el = document.createElement('div'); el.className = 'scrim'; el.id = 'scrim';
  el.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="bar-top"><h2>${title}</h2><button class="iconbtn" data-act="close" aria-label="Cerrar">${I.x}</button></div>${html}</div>`;
  el.addEventListener('click', e => { if (e.target === el) closeSheet(); });
  document.body.append(el); return el;
}
const closeSheet = () => $('#scrim')?.remove();
function openEx(id, min) {
  const e = EX[id], total = exMin(id, min), bp = lastBP(), iso = e.kind === 'Isométrico';
  sheet(e.name, `<div class="card"><div style="height:200px;color:var(--brand)">${fig(e.anim)}</div><div class="row wrap"><span class="pill brand">${e.kind}</span><span class="pill">${total} min</span></div><p>${e.why}</p></div>
    <div class="card flat"><h3>Cómo se hace</h3><ol style="margin:0;padding-left:20px;display:grid;gap:6px">${e.steps.map(s => `<li>${s}</li>`).join('')}</ol><div class="note">${e.safe}</div></div>
    ${iso && bp && (bp.s >= 160 || bp.d >= 100) ? `<div class="note crit"><b>Tu última tensión fue ${bp.s}/${bp.d}.</b> Los isométricos la suben durante el esfuerzo. Con valores de 160/100 o más, habla con tu médico antes de hacerlos y elige hoy caminar o respirar.</div>` : ''}
    ${e.gps ? `<label class="row card flat" style="flex-direction:row"><input type="checkbox" class="switch" id="use-gps" checked><span class="grow">Medir recorrido con GPS<br><span class="small muted">Suma los kilómetros a tu día. Mantén la pantalla encendida.</span></span></label>` : ''}
    <button class="btn block" data-start="${id}" data-min="${min || ''}">${I.play} Empezar</button>`);
}
function openBP() {
  const now = new Date(), local = `${dkey(now)}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  sheet('Anotar tensión', `<form id="bpform" class="card"><div class="grid3">
      <div class="field"><label for="bp-s">Sistólica (alta)</label><input class="bignum" id="bp-s" type="number" inputmode="numeric" min="60" max="260" required placeholder="120"></div>
      <div class="field"><label for="bp-d">Diastólica (baja)</label><input class="bignum" id="bp-d" type="number" inputmode="numeric" min="30" max="160" required placeholder="80"></div>
      <div class="field"><label for="bp-p">Pulso (opcional)</label><input class="bignum" id="bp-p" type="number" inputmode="numeric" min="30" max="220" placeholder="70"></div></div>
    <div class="field"><label for="bp-t">Fecha y hora</label><input id="bp-t" type="datetime-local" value="${local}" max="${local}"></div>
    <div class="field"><label for="bp-n">Nota (opcional)</label><input id="bp-n" maxlength="60" placeholder="Después de caminar, con dolor de cabeza…"></div>
    <button class="btn block" type="submit">Guardar medida</button></form>`);
  $('#bp-s').focus();
}
function openProfile() {
  const c = calc();
  sheet('Tu perfil', `<div class="grid3"><div class="card flat"><p class="eyebrow">IMC</p><b class="num" style="font-size:1.25rem">${nf(c.bmi)}</b><span class="small muted">${c.bmiTxt}</span></div>
      <div class="card flat"><p class="eyebrow">FC máx.</p><b class="num" style="font-size:1.25rem">${c.fcm}</b><span class="small muted">lpm estimada</span></div>
      <div class="card flat"><p class="eyebrow">Zona 2</p><b class="num" style="font-size:1.25rem">${c.z2[0]}–${c.z2[1]}</b><span class="small muted">lpm</span></div></div>
    <form id="pform" class="card">${profileForm(S.profile)}<button class="btn block" type="submit">Guardar cambios</button></form>
    <div class="card flat"><label class="row"><input type="checkbox" class="switch" id="snd" ${S.sound ? 'checked' : ''}><span class="grow">Sonidos en ejercicios y avisos</span></label>
      <button class="btn line" data-act="restart">Reiniciar la progresión de 4 semanas</button><button class="btn danger" data-act="wipe">Borrar todos mis datos</button></div>
    <p class="small muted">Orientación general basada en guías de hipertensión (ESH 2023), dieta DASH y recomendaciones de actividad de la OMS. No sustituye el consejo de tu médico.</p>`);
}
function openRem() {
  const R = S.rem, perm = canNotify() ? Notification.permission : 'none';
  const tog = (k, title, sub, body) => `<div class="card"><label class="row"><span class="grow"><b>${title}</b><br><span class="small muted">${sub}</span></span><input type="checkbox" class="switch" data-rem="${k}.on" ${R[k].on ? 'checked' : ''}></label>${body}</div>`;
  const time = (path, label, val) => `<div class="field"><label for="r-${path}">${label}</label><input id="r-${path}" type="time" data-rem="${path}" value="${val}"></div>`;
  const every = (path, val) => `<div class="field"><label for="r-${path}">Cada</label><select id="r-${path}" data-rem="${path}">${[30, 45, 60, 90, 120].map(v => `<option value="${v}" ${+val === v ? 'selected' : ''}>${v} min</option>`).join('')}</select></div>`;
  sheet('Avisos', `<div class="card flat"><div class="row"><span class="grow"><b>Notificaciones del móvil</b><br><span class="small muted">${perm === 'granted' ? 'Activadas en este dispositivo.' : perm === 'denied' ? 'Bloqueadas. Actívalas en los ajustes del navegador para este sitio.' : perm === 'none' ? 'Este navegador no las admite aquí. Verás los avisos dentro de la app.' : 'Permite las notificaciones para recibir los avisos.'}</span></span>
      ${perm === 'default' ? '<button class="btn sm" data-act="perm">Permitir</button>' : `<span class="pill ${perm === 'granted' ? 'good' : 'warn'}">${perm === 'granted' ? '✓ Activas' : '● Sin permiso'}</span>`}</div>
      <button class="btn ghost sm" data-act="test">Probar un aviso</button>
      <p class="small muted">Los avisos suenan mientras la app está abierta o en segundo plano. Para que lleguen siempre, aunque la cierres, pásalos al calendario del móvil:</p>
      <button class="btn line" data-act="ics">${I.cal} Añadir avisos al calendario</button></div>
    ${tog('ex', 'Ejercicio', 'Te recuerda la sesión del día', `<div class="grid2">${time('ex.time', 'Hora', R.ex.time)}</div><div class="chips" role="group" aria-label="Días">${[1, 2, 3, 4, 5, 6, 0].map(d => `<button class="chip" data-remday="${d}" aria-pressed="${R.ex.days.includes(d)}">${DAYS[d]}</button>`).join('')}</div>`)}
    ${tog('water', 'Beber agua', 'Deja de avisar al llegar a tu objetivo', `<div class="grid3">${time('water.from', 'Desde', R.water.from)}${time('water.to', 'Hasta', R.water.to)}${every('water.every', R.water.every)}</div>`)}
    ${tog('bp', 'Medir la tensión', 'Mañana y noche, siempre a la misma hora', `<div class="grid2">${time('bp.t1', 'Mañana', R.bp.t1)}${time('bp.t2', 'Noche', R.bp.t2)}</div>`)}
    ${tog('walk', 'Recorrido diario', 'Avisa si aún no llegas a tus kilómetros', `<div class="grid2">${time('walk.time', 'Hora', R.walk.time)}</div>`)}
    ${tog('move', 'Pausas activas', 'Levántate si pasas mucho tiempo sentado', `<div class="grid3">${time('move.from', 'Desde', R.move.from)}${time('move.to', 'Hasta', R.move.to)}${every('move.every', R.move.every)}</div>`)}`);
}

/* ---------- Reproductor guiado ---------- */
let P = null;
function startEx(id, min, useGps) {
  closeSheet();
  const e = EX[id], phases = [{ label: 'Prepárate', secs: 8, type: 'prep', anim: e.build(params(), min)[0].anim, sub: e.name }, ...e.build(params(), min)];
  P = { id, e, phases, i: 0, left: phases[0].secs, endAt: 0, running: false, began: Date.now(), active: 0, lastBeep: -1, gps: null, km: 0, last: null, watch: null };
  const el = document.createElement('div'); el.className = 'player'; el.id = 'player';
  el.innerHTML = `<div class="head"><div class="grow"><p class="eyebrow">${e.kind}</p><h3>${e.name}</h3></div><button class="iconbtn" data-p="snd" aria-label="Sonido"></button><button class="iconbtn" data-p="exit" aria-label="Salir">${I.x}</button></div>
    <div class="dots">${phases.map(() => '<i></i>').join('')}</div>
    <div class="stage">${ringSVG(0, 100).replace('width="100" height="100"', '')}<svg class="fig" viewBox="0 0 200 200" aria-hidden="true"></svg></div>
    <div><p class="phase" aria-live="polite"></p><p class="small muted sub"></p></div><div class="clock" role="timer"></div><p class="cue"></p>
    ${useGps ? '<div class="gps"><div><b id="g-km">0,00</b><span class="small muted">km</span></div><div><b id="g-pace">—</b><span class="small muted">min/km</span></div><div><b id="g-st">…</b><span class="small muted">GPS</span></div></div>' : ''}
    <div class="ctl"><button class="btn ghost" data-p="done">Terminar</button><button class="main" data-p="toggle" aria-label="Iniciar o pausar"></button><button class="btn ghost" data-p="skip" aria-label="Saltar fase">${I.skip}</button></div>`;
  document.body.append(el);
  if (useGps) gpsStart();
  pPhase(); pToggle();
}
function pPhase() {
  const ph = P.phases[P.i], el = $('#player');
  P.left = ph.secs; P.lastBeep = -1;
  el.classList.toggle('work', ph.type === 'work');
  $('.phase', el).textContent = ph.label; $('.sub', el).textContent = ph.sub || '';
  const f = $('.fig', el); f.dataset.anim = ph.anim; f.dataset.t0 = figClock; f.innerHTML = figSVG(ph.anim, .8);
  $$('.dots i', el).forEach((d, i) => { d.className = i < P.i ? 'on' : i === P.i ? 'cur' : ''; });
  if (P.running) P.endAt = Date.now() + P.left * 1000;
  pDraw();
}
function pDraw() {
  const el = $('#player'); if (!el) return;
  const ph = P.phases[P.i];
  $('.clock', el).textContent = mmss(Math.ceil(P.left));
  const c = 2 * Math.PI * 36; $('.ring .val', el).setAttribute('stroke-dashoffset', c * (P.left / ph.secs));
  $('[data-p="toggle"]', el).innerHTML = P.running ? I.pause : I.play;
  $('[data-p="snd"]', el).innerHTML = S.sound ? '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9zM17 9l5 6M22 9l-5 6"/></svg>';
  let cue = '';
  if (ph.anim === 'breath' && ph.type === 'work') { const b = breathState(figClock - $('.fig', el).dataset.t0); cue = `${b.txt} ${Math.ceil(b.left)}`; }
  else if (ph.type === 'prep') cue = P.e.safe;
  else if (ph.type === 'rest') cue = 'Respira hondo y suelta los hombros.';
  else if (P.e.cues.length) cue = P.e.cues[Math.floor((ph.secs - P.left) / 12) % P.e.cues.length];
  if ((P.id === 'walk' || P.id === 'bike') && ph.type === 'work') { const z = calc().z2; cue += ` · ${z[0]}–${z[1]} lpm`; }
  $('.cue', el).textContent = cue;
  if (P.watch != null) { $('#g-km').textContent = nf(P.km, 2); const mins = P.active / 60; $('#g-pace').textContent = P.km > .05 ? nf(mins / P.km, 1) : '—'; }
}
let wakeLock = null;
async function pToggle() {
  P.running = !P.running; figPaused = !P.running;
  if (P.running) { P.endAt = Date.now() + P.left * 1000; beep(660, .1); try { wakeLock = await navigator.wakeLock?.request('screen'); } catch (e) { /* sin bloqueo de pantalla */ } }
  else { try { wakeLock?.release(); } catch (e) { /* nada */ } }
  pDraw();
}
function pTick() {
  if (!P || !P.running) return;
  const prev = P.left; P.left = Math.max(0, (P.endAt - Date.now()) / 1000); P.active += Math.min(1, prev - P.left);
  const sec = Math.ceil(P.left);
  if (sec <= 3 && sec > 0 && sec !== P.lastBeep) { P.lastBeep = sec; beep(700, .09); }
  if (P.left <= 0) return pNext();
  pDraw();
}
function pNext() {
  if (P.i >= P.phases.length - 1) return pFinish(true);
  P.i++; const ph = P.phases[P.i];
  beep(ph.type === 'work' ? 990 : 520, .3); buzz(ph.type === 'work' ? [200] : [80, 60, 80]);
  pPhase();
}
function pClose() { try { wakeLock?.release(); } catch (e) { /* nada */ } if (P?.watch != null) navigator.geolocation.clearWatch(P.watch); P = null; figPaused = false; $('#player')?.remove(); $('#confetti')?.remove(); render(); }
function pFinish(complete) {
  const mins = Math.max(1, Math.round(P.active / 60)), id = P.id, km = P.km, e = P.e;
  P.running = false; figPaused = false;
  if (!complete && P.active < 60 && km < .05) return pClose();
  setDone(id, Math.max(mins, doneOn(dkey())[id] || 0));
  if (km > 0) { S.km[dkey()] = Math.round(((S.km[dkey()] || 0) + km) * 100) / 100; save(); }
  if (P.watch != null) { navigator.geolocation.clearWatch(P.watch); P.watch = null; }
  beep(660, .15); beep(880, .15, .18); beep(1100, .3, .36); buzz([100, 60, 100, 60, 300]); confetti();
  const w = weekStats();
  $('#player').classList.remove('work');
  $('#player').innerHTML = `<div style="margin:auto;display:flex;flex-direction:column;gap:16px;align-items:center;max-width:420px">
    <div style="width:150px;height:150px;color:var(--brand)">${fig('st_up')}</div><h1>${complete ? '¡Sesión completada!' : 'Sesión guardada'}</h1>
    <p class="muted">${e.name} · ${mins} min${km > 0 ? ` · ${nf(km, 2)} km` : ''}</p>
    <div class="grid2" style="width:100%"><div class="card flat"><p class="eyebrow">Semana</p><b class="num" style="font-size:1.3rem">${w.aer}/150′</b><span class="small muted">aeróbico</span></div><div class="card flat"><p class="eyebrow">Racha</p><b class="num" style="font-size:1.3rem">${streak()}</b><span class="small muted">días seguidos</span></div></div>
    <p class="small muted">Bebe un vaso de agua. Si quieres medir tu tensión, espera 30 minutos en reposo.</p>
    <button class="btn block" data-p="exit">Hecho</button><button class="btn ghost block" data-p="water">${I.plus} Apuntar un vaso de agua</button></div>`;
}
function gpsStart() {
  const st = t => { const el = $('#g-st'); if (el) el.textContent = t; };
  if (!navigator.geolocation) return st('no');
  try {
    P.watch = navigator.geolocation.watchPosition(pos => {
      if (!P) return; const { latitude: la, longitude: lo, accuracy } = pos.coords; st(accuracy <= 30 ? 'ok' : 'débil');
      if (accuracy > 35 || !P.running) { if (!P.running) P.last = null; return; }
      if (P.last) { const R = 6371, r = Math.PI / 180, dLa = (la - P.last[0]) * r, dLo = (lo - P.last[1]) * r, a = Math.sin(dLa / 2) ** 2 + Math.cos(la * r) * Math.cos(P.last[0] * r) * Math.sin(dLo / 2) ** 2, d = 2 * R * Math.asin(Math.sqrt(a));
        const dt = (pos.timestamp - P.last[2]) / 1000; if (d < .004) return; if (dt > 0 && d / dt * 3600 < 25) P.km += d; }
      P.last = [la, lo, pos.timestamp];
    }, () => st('sin señal'), { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
  } catch (e) { st('no'); }
}
function confetti() {
  if (noMotion) return;
  const cv = document.createElement('canvas'); cv.id = 'confetti'; document.body.append(cv);
  const ctx = cv.getContext('2d'), W = cv.width = innerWidth, H = cv.height = innerHeight, css = getComputedStyle(document.documentElement);
  const cols = ['--brand', '--pulse', '--water', '--warn', '--good'].map(v => css.getPropertyValue(v).trim());
  const ps = Array.from({ length: 90 }, () => ({ x: W / 2, y: H * .35, vx: (Math.random() - .5) * 14, vy: -Math.random() * 13 - 3, s: 5 + Math.random() * 6, c: cols[Math.floor(Math.random() * cols.length)], r: Math.random() * 6 }));
  let n = 0; (function step() { ctx.clearRect(0, 0, W, H); for (const p of ps) { p.vy += .35; p.x += p.vx; p.y += p.vy; p.r += .2; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * .66); ctx.restore(); }
    if (++n < 150 && cv.isConnected) requestAnimationFrame(step); else cv.remove(); })();
}

/* ---------- Eventos ---------- */
let confirmKey = null;
document.addEventListener('click', e => {
  const t = e.target.closest('button, [data-open]'); if (!t) return;
  const d = t.dataset;
  if (t.closest('.seg') && d.v) { $$('button', t.closest('.seg')).forEach(b => b.setAttribute('aria-pressed', b === t)); return; }
  if (d.tab) { tab = d.tab; render(); scrollTo(0, 0); return; }
  if (d.open) return openEx(d.open, +d.min || undefined);
  if (d.start) return startEx(d.start, +d.min || undefined, !!$('#use-gps')?.checked);
  if (d.toggle) { const k = dkey(); if (d.toggle in doneOn(k)) { delete S.done[k][d.toggle]; save(); } else { setDone(d.toggle, +d.total); beep(880, .12); buzz(60); } return render(); }
  if (d.range != null) { bpRange = +d.range; return render(); }
  if (d.plan) { planTab = d.plan; return render(); }
  if (d.dday != null) { dietDay = +d.dday; return render(); }
  if (d.del) { S.bp = S.bp.filter(x => String(x.t) !== d.del); save(); return render(); }
  if (d.remday != null) { const a = S.rem.ex.days, v = +d.remday; S.rem.ex.days = a.includes(v) ? a.filter(x => x !== v) : [...a, v]; t.setAttribute('aria-pressed', S.rem.ex.days.includes(v)); return save(); }
  if (d.p) {
    if (d.p === 'toggle') return pToggle();
    if (d.p === 'skip') return pNext();
    if (d.p === 'done') return pFinish(false);
    if (d.p === 'snd') { S.sound = !S.sound; save(); return pDraw(); }
    if (d.p === 'water') { const k = dkey(); S.water[k] = (S.water[k] || 0) + 250; save(); t.disabled = true; return toast('Vaso apuntado.'); }
    if (d.p === 'exit') return pClose();
  }
  switch (d.act) {
    case 'close': return closeSheet();
    case 'bp-add': return openBP();
    case 'rem': return openRem();
    case 'profile': return openProfile();
    case 'water': { const k = dkey(), c = calc(), before = S.water[k] || 0; S.water[k] = Math.max(0, before + +d.ml); save(); if (before < c.water && S.water[k] >= c.water) toast('Objetivo de agua cumplido.'); return render(); }
    case 'km': { const k = dkey(); S.km[k] = Math.max(0, Math.round(((S.km[k] || 0) + +d.km) * 100) / 100); save(); return render(); }
    case 'perm': return Notification.requestPermission().then(() => openRem()).catch(() => openRem());
    case 'test': return notify('Pulso Sano', 'Así te llegarán los avisos.', 'test');
    case 'ics': download('pulso-sano-avisos.ics', ics(), 'text/calendar'); return toast('Abre el archivo descargado para añadir los avisos a tu calendario.');
    case 'bp-csv': { const csv = 'fecha;hora;sistolica;diastolica;pulso;nota\n' + bpSorted().map(x => { const dt = new Date(x.t); return [dkey(dt), `${pad(dt.getHours())}:${pad(dt.getMinutes())}`, x.s, x.d, x.p || '', (x.n || '').replace(/;/g, ',')].join(';'); }).join('\n');
      download('tension.csv', csv, 'text/csv'); navigator.clipboard?.writeText(csv).then(() => toast('Historial descargado y copiado al portapapeles.'), () => {}); return; }
    case 'restart': S.profile.start = dkey(); save(); closeSheet(); toast('Progresión reiniciada en la semana 1.'); return render();
    case 'wipe': if (confirmKey !== 'wipe') { confirmKey = 'wipe'; t.textContent = 'Pulsa otra vez para borrar todo'; return; }
      confirmKey = null; S = structuredClone(DEF); save(); closeSheet(); tab = 'hoy'; return render();
  }
});
document.addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target;
  if (f.id === 'onb' || f.id === 'pform') { const p = readProfile(f); if (!p) return; S.profile = Object.assign({ start: dkey() }, S.profile || {}, p); save(); closeSheet(); render(); if (f.id === 'onb') { toast('Plan creado. Activa los avisos en la campana.'); } return; }
  if (f.id === 'bpform') {
    const s = +$('#bp-s').value, d = +$('#bp-d').value, p = +$('#bp-p').value || null, t = new Date($('#bp-t').value).getTime() || Date.now();
    if (!(s >= 60 && s <= 260 && d >= 30 && d <= 160) || d >= s) return toast('Revisa los valores: la sistólica debe ser mayor que la diastólica.');
    S.bp.push({ t, s, d, p, n: $('#bp-n').value.trim() }); save(); closeSheet(); tab = 'bp'; render();
    const c = bpClass(s, d); toast(`${s}/${d} guardada · ${c.t}`);
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.rem) { const [a, b] = t.dataset.rem.split('.'); S.rem[a][b] = t.type === 'checkbox' ? t.checked : t.tagName === 'SELECT' ? +t.value : t.value; save(); }
  if (t.id === 'snd') { S.sound = t.checked; save(); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { checkReminders(); if (P?.running) navigator.wakeLock?.request('screen').then(w => { wakeLock = w; }).catch(() => {}); if (!P && !$('#scrim')) render(); } });

setInterval(pTick, 200);
setInterval(checkReminders, 20000);
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
render();
setTimeout(checkReminders, 1500);
