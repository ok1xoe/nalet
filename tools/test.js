// Testy hry Nálet nad krajinou v Node (bez prohlížeče). Spuštění: node tools/test.js [složka-pro-PNG]
const path = require('path');
const fs = require('fs');
const H = require('/Users/hyman/EngetoAcademy/TizenOS/_kit/headless.js');
const root = path.join(__dirname, '..');
const outDir = process.argv[2] || '/tmp';
let fails = 0;
function ok(c, msg) { if (!c) { fails++; console.log('CHYBA: ' + msg); } else { console.log('ok: ' + msg); } }

function fresh() {
    const g = H.load([path.join(root, 'js/speccy.js'), path.join(root, 'js/game.js')]);
    return { g, G: g.sandbox.GAME };
}
function tap(g, code, n) { g.key(code, true); g.step(n || 2); g.key(code, false); g.step(1); }

// 1) title -> play, bez NaN
let { g, G } = fresh();
ok(G.state === 'title', 'start na titulní obrazovce');
g.step(30);
g.png(path.join(outDir, 'title.png'), 3);
tap(g, 32);
ok(G.state === 'play', 'mezerník spustí hru');
g.step(200);
ok(!g.hasNaN(G), 'žádné NaN po 200 tickách');

// 2) dosažitelnost: intervalová analýza průchodnosti krajiny pro nejvyšší rychlost
{
    const fl = [], ce = [];
    // získáme krajinu zkouškou přes ship: použijeme GAME.floor/ceil, pokud jsou; jinak přes vzorkování
    const gm = g.sandbox.GAME;
    ok(typeof gm.dbgTerrain === 'function', 'dbgTerrain k dispozici');
    const T = gm.dbgTerrain();
    let lo = T.ceil[0] + 1, hi = T.floor[0] - 7, minGap = 999, bad = -1;
    const maxStep = 1.6 * 4 / 1.5 * 0.9;      // svislý posun na sloupec při max. rychlosti scrollu
    for (let c = 0; c < 1800; c++) {
        const a = T.ceil[c] + 1, b = T.floor[c] - 7;
        minGap = Math.min(minGap, T.floor[c] - T.ceil[c]);
        lo = Math.max(lo - maxStep, a); hi = Math.min(hi + maxStep, b);
        if (lo > hi) { bad = c; break; }
    }
    ok(bad < 0, 'krajina je průchodná po celé délce (sloupec ' + bad + '), min. průlet ' + minGap + ' px');
}

// 3) bot: leť s nekonečným palivem a nesmrtelností vůči nepřátelům; ověř průlet všemi fázemi až k bossovi
function botTick(g, G) {
    const s = G.ship, T = G.dbgTerrain();
    const wx = G.scrollX + s.sx;
    let top = 0, bot = 999;
    for (let c = Math.floor(wx / 4) - 1; c <= Math.floor((wx + 60) / 4); c++) { top = Math.max(top, T.ceil[c]); bot = Math.min(bot, T.floor[c]); }
    const target = Math.min((top + bot) / 2 - 3, bot - 16);
    const ty = Math.max(top + 4, target);
    g.Z.input[s.sy < ty - 2 ? 'press' : 'release']('down');
    g.Z.input[s.sy > ty + 2 ? 'press' : 'release']('up');
    g.Z.input.press('fire');
    if (G.t % 25 === 0) { g.Z.input.press('alt'); } else { g.Z.input.release('alt'); }
}
{
    ({ g, G } = fresh());
    G.cheat.inf = true; G.cheat.god = true;
    tap(g, 32);
    let shots = 0, maxPhase = 0, died = 0;
    for (let i = 0; i < 9000 && G.scrollX < 7200; i++) {
        botTick(g, G);
        g.step(1);
        maxPhase = Math.max(maxPhase, G.phase);
        if (G.state === 'dying') { died++; g.step(100); }
        if (i === 1500) { g.png(path.join(outDir, 'play1.png'), 3); }
        if (i === 3300) { g.png(path.join(outDir, 'play2.png'), 3); }
        if (i === 5200) { g.png(path.join(outDir, 'play3.png'), 3); }
    }
    ok(!g.hasNaN(G), 'žádné NaN po průletu');
    ok(maxPhase === 5, 'bot proletěl všemi 6 fázemi (fáze ' + (maxPhase + 1) + ', smrtí: ' + died + ')');
    ok(G.scrollX >= 7200, 'dosažena základna (boss)');
    // boss: míření na jádro
    let hit0 = G.boss.hp;
    for (let i = 0; i < 4000 && G.state === 'play'; i++) {
        const b = G.boss;
        const ty = b.cy + 6 - 3;
        g.Z.input[G.ship.sy < ty - 1 ? 'press' : 'release']('down');
        g.Z.input[G.ship.sy > ty + 1 ? 'press' : 'release']('up');
        g.Z.input.press('fire'); g.Z.input.press('right');
        g.step(1);
        if (i === 400) { g.png(path.join(outDir, 'boss.png'), 3); }
        if (G.boss.dying > 0) { break; }
    }
    ok(G.boss.hp < hit0, 'boss utrpěl poškození (' + hit0 + ' -> ' + G.boss.hp + ')');
    ok(G.boss.hp <= 0, 'boss zničen');
    g.Z.input.release('fire'); g.Z.input.release('right'); g.Z.input.release('up'); g.Z.input.release('down'); g.Z.input.release('alt');
    g.step(400);
    ok(G.state === 'play' && G.kolo === 2 && G.scrollX < 700, 'po bossovi začíná 2. kolo (stav ' + G.state + ', kolo ' + G.kolo + ')');
    ok(!g.hasNaN(G), 'žádné NaN po bossovi');
}

// 4) smrt, životy, konec hry, rekord, návrat na titulní obrazovku
{
    ({ g, G } = fresh());
    tap(g, 32);
    const lives0 = G.lives;
    g.step(5);
    G.ship.sy = 185;                      // zabořit do země
    g.step(3);
    ok(G.state === 'dying' && G.lives === lives0 - 1, 'srážka s terénem = smrt, ubyl život');
    g.step(100);
    ok(G.state === 'play', 'po smrti oživení (kontrolní bod)');
    // palivo
    G.fuel = 0.02; g.step(3);
    ok(G.state === 'dying' && /PALIVO/.test(G.cause), 'došlo palivo = smrt');
    g.step(100);
    // konec
    G.score = 1234;
    G.lives = 1; G.ship.sy = 185; g.step(3);
    g.step(100);
    ok(G.state === 'over', 'konec hry po ztrátě posledního života');
    ok(g.Z.hi.get('nalet') === 1234, 'rekord uložen');
    g.png(path.join(outDir, 'over.png'), 3);
    g.step(100); tap(g, 32);
    ok(G.state === 'title', 'návrat na titulní obrazovku');
}

// 5) sestřel nádrže doplní palivo, bomba ničí cíle
{
    ({ g, G } = fresh());
    tap(g, 32);
    const T = G.dbgTerrain();
    const clear = (o, dist) => { for (let c = Math.floor((o.wx - dist) / 4); c <= Math.floor(o.wx / 4); c++) { if (T.floor[c] < o.y + o.h - 1) return false; } return true; };
    const o = G.objs.find(x => x.t === 'fuel' && x.wx > 400 && clear(x, 130));
    G.scrollX = o.wx - 120; G.fuel = 50; G.speed = 0;
    G.ship.sx = 40; G.ship.sy = o.y + 3;
    G.cheat.god = true;
    g.Z.input.press('fire');
    for (let i = 0; i < 80 && o.alive; i++) { G.ship.sy = o.y + 3; g.step(1); }
    g.Z.input.release('fire');
    ok(!o.alive && G.fuel > 60, 'sestřel nádrže doplnil palivo (' + G.fuel.toFixed(1) + ')');
    const r = G.objs.find(x => x.t === 'rocket' && x.alive && x.wx > G.scrollX + 100 && clear(x, 100));
    G.fuel = 100;
    for (let i = 0; i < 200 && r.alive; i++) {
        r.st = 0; r.y = r.y0;
        if (i % 25 === 0) { g.Z.input.press('alt'); } else { g.Z.input.release('alt'); }
        G.scrollX = r.wx - 86; G.ship.sx = 30; G.ship.sy = r.y - 50;
        g.step(1);
    }
    ok(!r.alive, 'bomba zničila raketu na zemi');
}
// 6) vzhled titulní obrazovky a nespadnutí po delší hře bez vstupu (poctivý bot jen pro statistiku)
{
    ({ g, G } = fresh());
    tap(g, 32);
    for (let i = 0; i < 12000 && G.state !== 'title'; i++) {
        botTick(g, G); g.step(1);
        if (G.state === 'dying') { g.step(100); }
        if (G.state === 'over') { g.step(100); tap(g, 32); break; }
    }
    ok(!g.hasNaN(G), 'poctivý bot: bez NaN (skóre ' + G.score + ', fáze ' + (G.phase + 1) + ', kolo ' + G.kolo + ')');
}
console.log(fails ? ('SELHÁNÍ: ' + fails) : 'VŠE V POŘÁDKU');
process.exit(fails ? 1 : 0);
