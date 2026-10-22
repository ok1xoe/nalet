// Nálet nad krajinou - boční scrolling nálet ve stylu Scramble / Penetrator (vlastní grafika a texty).
(function () {
    'use strict';

    var COLW = 4, PHC = 320, NCOL = 1900, ARENA_COL = 1800, LOCK = ARENA_COL * COLW, TOP = 17, SCRH = 192;
    var NAMES = ['HORY', 'JESKYNĚ', 'MĚSTO', 'HORSKÝ PRŮSMYK', 'HLUBOKÁ JESKYNĚ', 'ZÁKLADNA'];
    var FILL = [4, 3, 1, 6, 2, 7], EDGE = [12, 11, 9, 14, 10, 15];
    var UFOP = [1, 0, 0, 1, 0, 1], METP = [0, 0, 1, 1, 0, 1], RM = [1, 1.1, 0.6, 1.5, 1.3, 1.2];
    var FUEL_MAX = 100, FUEL_TANK = 20, DRAIN = 0.05, HI = 'nalet';
    var SHIP_W = 14, SHIP_H = 6, SX_MAX = 186;

    // ---------- Sprity
    var SHIP = [
        '....cc........',
        'ww..cccc......',
        'wwwwwwwwwwwc..',
        'wwwwwwwwwwwwwc',
        '.rwwwwwwwwww..',
        '..r.rrrr......'
    ];
    var SHIP_PAL = { w: 15, c: 13, r: 10 };
    var ROCKET = [
        '...ww...',
        '..wwww..',
        '..wwww..',
        '..wrww..',
        '..wwww..',
        '..rrrr..',
        '..wwww..',
        '..wwww..',
        '.rwwwwr.',
        '.rwwwwr.',
        'rr....rr'
    ];
    var ROCKET_PAL = { w: 15, r: 10 };
    var FUEL = [
        '..yyyyyyyy..',
        '.yrrrrrrrry.',
        'yrwwrrwrwrry',
        'yrwrrrwrwrry',
        'yrwwrrwrwrry',
        'yrwrrrwrwrry',
        'yrwrrrrwwrry',
        'yrrrrrrrrrry',
        '.yrrrrrrrry.',
        '..yyyyyyyy..'
    ];
    var FUEL_PAL = { y: 14, r: 2, w: 15 };
    var RADAR = [
        '.....cc.....',
        '...ccwwcc...',
        '..cwwwwwwc..',
        '.cwwwwwwwwc.',
        '..cccccccc..',
        '.....gg.....',
        '.....gg.....',
        '....gggg....',
        '...gggggg...',
        '..gggggggg..'
    ];
    var RADAR_PAL = { c: 13, w: 15, g: 11 };
    var UFO = [
        '....wwww....',
        '..wwwwwwww..',
        'mmmmmmmmmmmm',
        '.mymymymymy.',
        '..mm....mm..'
    ];
    var UFO_PAL = { w: 15, m: 11, y: 14 };
    var METEOR = [
        '..oo..',
        '.oyyo.',
        'oyyyyo',
        'oyyyyo',
        '.oyyo.',
        '..oo..'
    ];
    var METEOR_PAL = { o: 10, y: 14 };
    var SPEC = { rocket: { w: 8, h: 11 }, fuel: { w: 12, h: 10 }, radar: { w: 12, h: 10 }, build: { w: 12, h: 0 } };

    // ---------- Stav
    var G = window.GAME = {
        state: 'title', t: 0, score: 0, hi: 0, lives: 3, fuel: FUEL_MAX, kolo: 1, speed: 0.9,
        scrollX: 0, ship: { sx: 40, sy: 80 }, bullets: [], bombs: [], ufos: [], meteors: [], eshots: [], parts: [],
        objs: [], banner: 0, bannerTxt: '', phase: 0, invuln: 0, fireCd: 0, bombCd: 0, cause: '',
        ufoT: 60, metT: 80, nextLife: 10000, boss: null, cp: 0, stateT: 0, cheat: { inf: false, god: false }
    };
    var floorY = new Int16Array(NCOL + 80), ceilY = new Int16Array(NCOL + 80);
    var stars = [];
    (function () { var r = Z.rng(77); for (var i = 0; i < 40; i++) { stars.push({ x: r() * 256, y: 18 + r() * 150, k: 0.1 + r() * 0.3, c: r() < 0.5 ? 7 : (r() < 0.5 ? 13 : 15) }); } })();

    function phaseOf(col) { return Math.min(5, (col / PHC) | 0); }

    // ---------- Generování krajiny
    function buildLevel() {
        var r = Z.rng(20261022);
        function rr(a, b) { return a + r() * (b - a); }
        var cps = [], col = 0, w = 90, ctr = 100;
        while (col < NCOL + 60) {
            var ph = phaseOf(col), f, c = TOP, sp;
            if (ph === 0 || ph === 3) {
                f = rr(ph === 0 ? 112 : 100, ph === 0 ? 182 : 184); sp = rr(9, 15);
            } else if (ph === 1 || ph === 4) {
                var wlo = ph === 1 ? 78 : 64, whi = ph === 1 ? 112 : 92;
                w = Z.clamp(w + rr(-26, 26), wlo, whi);
                ctr = Z.clamp(ctr + rr(-34, 34), 72, 124);
                c = Math.max(21, ctr - w / 2); f = Math.min(186, ctr + w / 2); sp = rr(12, 18);
            } else if (ph === 2) {
                f = rr(158, 176); sp = rr(18, 28);
            } else {
                f = col >= 1780 ? 168 : rr(160, 174); sp = rr(14, 22);
            }
            cps.push({ c: col, f: f, ce: c });
            col += Math.max(1, sp | 0);
        }
        for (var i = 0; i < cps.length - 1; i++) {
            var a = cps[i], b = cps[i + 1];
            for (var k = a.c; k < b.c && k < floorY.length; k++) {
                var t = (k - a.c) / (b.c - a.c);
                floorY[k] = Math.round(a.f + (b.f - a.f) * t);
                ceilY[k] = Math.round(a.ce + (b.ce - a.ce) * t);
            }
        }
        var last = cps[cps.length - 1].c;
        for (var q = last; q < floorY.length; q++) { floorY[q] = 168; ceilY[q] = TOP; }
        // arena: pevná rovina
        for (var z = 1790; z < floorY.length; z++) { floorY[z] = 168; ceilY[z] = TOP; }

        G.objs = []; var objs = G.objs;
        function place(c0, type) {
            var s = SPEC[type], flat = 0, q2;
            for (q2 = c0; q2 < c0 + 4; q2++) { flat = Math.max(flat, floorY[q2]); }
            for (q2 = c0; q2 < c0 + 4; q2++) { floorY[q2] = flat; }
            var h = s.h || (12 + 4 * ((r() * 7) | 0));
            objs.push({ t: type, wx: c0 * COLW + 2 + (16 - 4 - s.w) / 2, y: flat - h, y0: flat - h, w: s.w, h: h, alive: true, st: 0, vy: 0, col: (r() * 3) | 0 });
        }
        var WT = [
            { rocket: 0.7, radar: 0.3 }, { rocket: 0.6, radar: 0.4 }, { build: 0.6, radar: 0.15, rocket: 0.25 },
            { rocket: 0.75, radar: 0.25 }, { rocket: 0.65, radar: 0.35 }, { build: 0.4, radar: 0.25, rocket: 0.35 }
        ];
        var GAPS = [[8, 16], [7, 14], [4, 10], [6, 12], [6, 12], [5, 11]];
        for (var p = 0; p < 6; p++) {
            var c0 = p === 0 ? 40 : p * PHC + 20, end = p === 5 ? 1790 : (p + 1) * PHC - 8, sinceFuel = 40;
            while (c0 < end) {
                var type;
                if (sinceFuel >= 70) { type = 'fuel'; sinceFuel = 0; } else {
                    var x = r(), acc = 0, wts = WT[p];
                    type = 'rocket';
                    for (var key in wts) { acc += wts[key]; if (x <= acc) { type = key; break; } }
                }
                place(c0, type);
                var adv = 4 + ((rr(GAPS[p][0], GAPS[p][1])) | 0);
                c0 += adv; sinceFuel += adv;
            }
        }
        objs.sort(function (a, b) { return a.wx - b.wx; });
    }
    buildLevel();

    function floorAt(wx) { return floorY[Z.clamp(Math.floor(wx / COLW), 0, floorY.length - 1)]; }
    function ceilAt(wx) { return ceilY[Z.clamp(Math.floor(wx / COLW), 0, ceilY.length - 1)]; }

    // ---------- Efekty
    function boom(wx, y, n, cols) {
        for (var i = 0; i < n; i++) {
            var a = Math.random() * 6.283, s = 0.3 + Math.random() * 1.5;
            G.parts.push({ wx: wx, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 14 + (Math.random() * 22) | 0, col: cols[(Math.random() * cols.length) | 0] });
        }
    }
    var FIRE = [10, 14, 15, 6];

    function addScore(n) {
        G.score += n;
        if (G.score >= G.nextLife) { G.nextLife += 10000; G.lives = Math.min(9, G.lives + 1); Z.snd.win(); }
    }

    // ---------- Průběh hry
    function newGame() {
        G.score = 0; G.lives = 3; G.kolo = 1; G.nextLife = 10000;
        startKolo();
    }
    function startKolo() {
        G.speed = Math.min(1.5, 0.9 + 0.1 * (G.kolo - 1));
        buildLevel();
        G.boss = { x: 206, y: 100, w: 44, h: 68, hp: 30, maxhp: 30, cy: 130, fireT: 90, n: 0, active: false, dying: 0, dead: false };
        G.scrollX = 0; G.cp = 0; G.fuel = FUEL_MAX;
        resetField();
        placeShip(0);
        G.invuln = 60; G.state = 'play'; G.stateT = 0; G.phase = -1; G.banner = 0;
    }
    function resetField() {
        G.bullets = []; G.bombs = []; G.ufos = []; G.meteors = []; G.eshots = []; G.parts = [];
        G.ufoT = 80; G.metT = 100; G.fireCd = 0; G.bombCd = 0;
    }
    function placeShip(cp) {
        var c0 = Math.floor((cp + 40) / COLW), top = 0, bot = 999;
        for (var c = c0; c < c0 + 5; c++) { top = Math.max(top, ceilY[c]); bot = Math.min(bot, floorY[c]); }
        G.ship.sx = 40; G.ship.sy = Math.round((top + bot) / 2 - SHIP_H / 2);
    }
    function die(cause) {
        if (G.state !== 'play') { return; }
        G.state = 'dying'; G.stateT = 0; G.cause = cause;
        G.lives--;
        boom(G.scrollX + G.ship.sx + 7, G.ship.sy + 3, 40, FIRE);
        Z.snd.die();
    }
    function respawn() {
        var cp = G.cp;
        G.scrollX = cp; G.fuel = FUEL_MAX;
        for (var i = 0; i < G.objs.length; i++) {
            var o = G.objs[i];
            if (o.wx >= cp) { o.alive = true; o.st = 0; o.vy = 0; o.y = o.y0; }
        }
        G.boss.active = false;
        resetField(); placeShip(cp);
        G.invuln = 120; G.state = 'play'; G.stateT = 0; G.phase = -1;
    }
    function gameOver() {
        G.state = 'over'; G.stateT = 0;
        G.hi = Z.hi.submit(HI, G.score);
        Z.snd.over();
    }

    function killObj(o, byBomb) {
        if (!o.alive) { return; }
        o.alive = false;
        var cx = o.wx + o.w / 2, cy = o.y + o.h / 2;
        boom(cx, cy, o.t === 'fuel' ? 26 : 14, FIRE);
        if (o.t === 'fuel') {
            addScore(150); G.fuel = Math.min(FUEL_MAX, G.fuel + FUEL_TANK); Z.snd.coin();
        } else {
            addScore(o.t === 'rocket' ? (o.st ? 80 : 50) : o.t === 'radar' ? 100 : 60);
            Z.snd.boom();
        }
    }
    function blast(wx, y) {
        boom(wx, y, 18, FIRE); Z.snd.boom();
        var i;
        for (i = 0; i < G.objs.length; i++) {
            var o = G.objs[i];
            if (o.alive && Z.hit(wx - 13, y - 13, 26, 26, o.wx, o.y, o.w, o.h)) { killObj(o, true); }
        }
        for (i = 0; i < G.ufos.length; i++) {
            var u = G.ufos[i];
            if (u.alive && Z.hit(wx - 13, y - 13, 26, 26, u.wx, u.y, 12, 5)) { killUfo(u); }
        }
        for (i = 0; i < G.meteors.length; i++) {
            var m = G.meteors[i];
            if (m.alive && Z.hit(wx - 13, y - 13, 26, 26, m.wx, m.y, 6, 6)) { killMeteor(m); }
        }
    }
    function killUfo(u) { u.alive = false; addScore(100); boom(u.wx + 6, u.y + 2, 14, FIRE); Z.snd.boom(); }
    function killMeteor(m) { m.alive = false; addScore(50); boom(m.wx + 3, m.y + 3, 10, FIRE); Z.snd.boom(); }

    function hurtBoss(d) {
        var b = G.boss;
        if (b.hp <= 0) { return; }
        b.hp -= d; addScore(20);
        b.flash = 4;
        if (b.hp <= 0) {
            b.hp = 0; b.dying = 150; G.eshots = [];
            addScore(3000 + Math.round(G.fuel) * 10);
            Z.snd.win();
        }
    }

    // ---------- Tick
    function tick() {
        G.t++;
        Z.pauseOk = G.state === 'play' || G.state === 'dying';
        if (G.state === 'title') {
            G.scrollX = (G.scrollX + 0.6) % 1100;
            G.hi = Z.hi.get(HI);
            if (Z.input.hit('fire') || Z.input.hit('alt')) { newGame(); }
            return;
        }
        G.stateT++;
        if (G.state === 'over') {
            updParts();
            if (G.stateT > 90 && (Z.input.hit('fire') || Z.input.hit('alt'))) { G.state = 'title'; G.scrollX = 0; G.t = 0; }
            return;
        }
        if (G.state === 'dying') {
            updParts();
            if (G.stateT > 80) {
                if (G.lives <= 0) { gameOver(); } else { respawn(); }
            }
            return;
        }
        if (G.state === 'clear') {
            updParts();
            if (G.stateT > 220) { G.kolo++; G.lives = Math.min(9, G.lives + 1); startKolo(); }
            return;
        }
        play();
    }

    function play() {
        var s = G.ship, i, j;
        var boss = G.boss;
        // posun krajiny
        var bossFight = G.scrollX >= LOCK;
        if (!bossFight) {
            G.scrollX = Math.min(LOCK, G.scrollX + G.speed);
            if (G.scrollX >= LOCK) { boss.active = true; boss.fireT = 100; G.banner = 120; G.bannerTxt = 'POZOR: OPEVNĚNÍ!'; }
        }
        var wxS = G.scrollX + s.sx;
        // fáze (nápis, kontrolní bod)
        var ph = phaseOf(Math.floor((G.scrollX + 40) / COLW));
        if (ph !== G.phase) {
            G.phase = ph;
            if (!boss.active) { G.banner = 110; G.bannerTxt = 'FÁZE ' + (ph + 1) + ': ' + NAMES[ph]; }
            G.cp = ph * PHC * COLW;
        }
        if (G.scrollX >= LOCK - 300) { G.cp = Math.max(G.cp, LOCK - 400); }
        if (G.banner > 0) { G.banner--; }
        if (G.invuln > 0) { G.invuln--; }

        // ovládání lodi
        var sp = 1.6;
        if (boss.dying > 0) {
            boss.dying--;
            if (boss.dying % 6 === 0) {
                boom(G.scrollX + boss.x + Math.random() * boss.w, boss.y + Math.random() * boss.h, 14, FIRE);
                Z.snd.boom();
            }
            if (boss.dying === 0) { boss.dead = true; G.state = 'clear'; G.stateT = 0; }
        }
        if (Z.input.down('left')) { s.sx -= 1.3; }
        if (Z.input.down('right')) { s.sx += 1.3; }
        if (Z.input.down('up')) { s.sy -= sp; }
        if (Z.input.down('down')) { s.sy += sp; }
        s.sx = Z.clamp(s.sx, 2, SX_MAX);
        s.sy = Z.clamp(s.sy, TOP + 1, SCRH - SHIP_H - 1);

        // palivo
        if (!boss.active && !G.cheat.inf) {
            G.fuel -= DRAIN;
            if (G.fuel < 20 && G.t % 40 === 0) { Z.snd.tick(); }
            if (G.fuel <= 0) { G.fuel = 0; die('DOŠLO PALIVO'); return; }
        }

        // střelba
        if (G.fireCd > 0) { G.fireCd--; }
        if (G.bombCd > 0) { G.bombCd--; }
        if (Z.input.down('fire') && G.fireCd === 0 && G.bullets.length < 5) {
            G.bullets.push({ sx: s.sx + 14, y: s.sy + 2 });
            G.fireCd = 9; Z.snd.shoot();
        }
        if (Z.input.hit('alt') && G.bombCd === 0 && G.bombs.length < 3) {
            G.bombs.push({ sx: s.sx + 6, y: s.sy + 6, vx: 1.5, vy: 0.3 });
            G.bombCd = 14; Z.snd.beep(520, 0.12, 160, 0.03);
        }

        // střely
        for (i = G.bullets.length - 1; i >= 0; i--) {
            var b = G.bullets[i], gone = false;
            for (var step = 0; step < 4 && !gone; step++) {
                b.sx += 1;
                var bw = G.scrollX + b.sx;
                if (b.sx > 256 || b.y >= floorAt(bw) || b.y <= ceilAt(bw)) { gone = true; break; }
                for (j = 0; j < G.objs.length; j++) {
                    var o = G.objs[j];
                    if (o.alive && bw >= o.wx && bw <= o.wx + o.w && b.y >= o.y && b.y <= o.y + o.h) { killObj(o); gone = true; break; }
                }
                if (gone) { break; }
                for (j = 0; j < G.ufos.length; j++) {
                    var u = G.ufos[j];
                    if (u.alive && Z.hit(bw, b.y, 2, 1, u.wx, u.y, 12, 5)) { killUfo(u); gone = true; break; }
                }
                if (gone) { break; }
                for (j = 0; j < G.meteors.length; j++) {
                    var m = G.meteors[j];
                    if (m.alive && Z.hit(bw, b.y, 2, 1, m.wx, m.y, 6, 6)) { killMeteor(m); gone = true; break; }
                }
                if (gone) { break; }
                for (j = 0; j < G.eshots.length; j++) {
                    var es = G.eshots[j];
                    if (Math.abs(es.x - b.sx) < 3 && Math.abs(es.y - b.y) < 3) { es.dead = true; gone = true; addScore(10); break; }
                }
                if (gone) { break; }
                if (boss.active && boss.hp > 0 && b.sx >= boss.x && b.y >= boss.y && b.y <= boss.y + boss.h) {
                    if (b.y >= boss.cy && b.y <= boss.cy + 12) { hurtBoss(1); boom(G.scrollX + b.sx, b.y, 5, FIRE); Z.snd.hit(); } else { boom(G.scrollX + b.sx, b.y, 2, [15, 13]); }
                    gone = true;
                }
            }
            if (gone) { G.bullets.splice(i, 1); }
        }
        // bomby
        for (i = G.bombs.length - 1; i >= 0; i--) {
            var bo = G.bombs[i];
            bo.sx += bo.vx; bo.y += bo.vy; bo.vy += 0.06;
            var bwx = G.scrollX + bo.sx + 1, hitB = false;
            if (bo.y + 4 >= floorAt(bwx) || bo.y > SCRH || bo.sx > 258) { hitB = true; }
            for (j = 0; j < G.objs.length && !hitB; j++) {
                var o2 = G.objs[j];
                if (o2.alive && Z.hit(bwx - 1, bo.y, 3, 4, o2.wx, o2.y, o2.w, o2.h)) { hitB = true; }
            }
            for (j = 0; j < G.ufos.length && !hitB; j++) {
                var u2 = G.ufos[j];
                if (u2.alive && Z.hit(bwx - 1, bo.y, 3, 4, u2.wx, u2.y, 12, 5)) { hitB = true; }
            }
            if (boss.active && boss.hp > 0 && bo.sx + 3 >= boss.x && bo.y + 4 >= boss.y && bo.y <= boss.y + boss.h) {
                hurtBoss(3); hitB = true; boom(G.scrollX + bo.sx, bo.y, 16, FIRE); Z.snd.boom();
                G.bombs.splice(i, 1); continue;
            }
            if (hitB) {
                if (bo.sx < 258 && bo.y < SCRH) { blast(bwx, Math.min(bo.y + 3, floorAt(bwx))); }
                G.bombs.splice(i, 1);
            }
        }

        // předměty: rakety
        for (i = 0; i < G.objs.length; i++) {
            var ob = G.objs[i];
            var osx = ob.wx - G.scrollX;
            if (osx > 280) { break; }
            if (!ob.alive || ob.t !== 'rocket') { continue; }
            if (osx < -20) { continue; }
            if (!ob.st) {
                if (osx < 215 && osx > 20 && Math.abs(osx - s.sx) < 150 && Math.random() < 0.011 * RM[phaseOf(Math.floor(ob.wx / COLW))] * (1 + 0.35 * (G.kolo - 1))) {
                    ob.st = 1; ob.vy = -0.2; Z.snd.beep(180, 0.3, 700, 0.02);
                }
            } else {
                ob.vy = Math.max(-2.3, ob.vy - 0.035);
                ob.y += ob.vy;
                if (ob.y < TOP || ob.y < ceilAt(ob.wx + 4)) { ob.alive = false; boom(ob.wx + 4, ob.y + 4, 8, FIRE); }
            }
        }
        // UFO a meteority
        if (!boss.active || boss.hp > 0) {
            var cph = phaseOf(Math.floor((G.scrollX + 256) / COLW));
            if (UFOP[cph] && !boss.active && --G.ufoT <= 0) {
                G.ufoT = Math.max(40, (80 + Math.random() * 40) / (1 + 0.15 * (G.kolo - 1)));
                var swx = G.scrollX + 270, hi = Math.min(140, floorAt(swx) - 34);
                if (hi > 30) {
                    var y0 = 28 + Math.random() * (hi - 28);
                    G.ufos.push({ wx: swx, y0: y0, y: y0, t: Math.random() * 6, alive: true });
                }
            }
            if (METP[cph] && !boss.active && --G.metT <= 0) {
                G.metT = Math.max(30, (70 + Math.random() * 50) / (1 + 0.15 * (G.kolo - 1)));
                G.meteors.push({ wx: G.scrollX + 70 + Math.random() * 220, y: TOP, vx: -0.6, vy: 1.4 + Math.random() * 0.4, alive: true });
            }
        }
        for (i = G.ufos.length - 1; i >= 0; i--) {
            var uf = G.ufos[i];
            uf.t += 0.07; uf.wx -= 0.8; uf.y = uf.y0 + Math.sin(uf.t) * 16;
            if (!uf.alive || uf.wx - G.scrollX < -20 || uf.y + 5 >= floorAt(uf.wx + 6) || uf.y <= ceilAt(uf.wx + 6)) { G.ufos.splice(i, 1); }
        }
        for (i = G.meteors.length - 1; i >= 0; i--) {
            var me = G.meteors[i];
            me.wx += me.vx; me.y += me.vy;
            if (me.alive && me.y + 6 >= floorAt(me.wx + 3)) { me.alive = false; boom(me.wx + 3, me.y + 3, 8, FIRE); }
            if (!me.alive || me.wx - G.scrollX < -20) { G.meteors.splice(i, 1); }
        }

        // boss
        if (boss.active && boss.hp > 0) {
            boss.cy = 112 + 20 * (1 + Math.sin(G.t * 0.035));
            if (boss.flash > 0) { boss.flash--; }
            if (--boss.fireT <= 0) {
                boss.fireT = boss.hp < 15 ? 42 : 62;
                boss.n++;
                var mx = boss.x - 4, my = boss.cy + 6;
                var ang = Math.atan2(s.sy + 3 - my, s.sx + 7 - mx);
                var shots = boss.n % 3 === 0 ? [-0.3, 0, 0.3] : [0];
                for (i = 0; i < shots.length; i++) {
                    G.eshots.push({ x: mx, y: my, vx: Math.cos(ang + shots[i]) * 1.7, vy: Math.sin(ang + shots[i]) * 1.7 });
                }
                Z.snd.beep(240, 0.15, 100, 0.03);
            }
        }
        for (i = G.eshots.length - 1; i >= 0; i--) {
            var e = G.eshots[i];
            e.x += e.vx; e.y += e.vy;
            if (e.dead || e.x < -4 || e.x > 260 || e.y < TOP || e.y > SCRH) { G.eshots.splice(i, 1); }
        }

        updParts();

        // srážky lodi
        if (G.state !== 'play') { return; }
        var sbx = wxS + 1, sby = s.sy + 1, sbw = SHIP_W - 2, sbh = SHIP_H - 1;
        for (var c = Math.floor(sbx / COLW); c <= Math.floor((sbx + sbw) / COLW); c++) {
            if (sby + sbh > floorY[c] || sby < ceilY[c]) { die('NÁRAZ DO TERÉNU'); return; }
        }
        if (G.invuln > 0 || G.cheat.god) { return; }
        for (i = 0; i < G.objs.length; i++) {
            var ox = G.objs[i];
            if (ox.wx - G.scrollX > 280) { break; }
            if (ox.alive && Z.hit(sbx, sby, sbw, sbh, ox.wx, ox.y, ox.w, ox.h)) { die('NÁRAZ'); return; }
        }
        for (i = 0; i < G.ufos.length; i++) {
            if (Z.hit(sbx, sby, sbw, sbh, G.ufos[i].wx, G.ufos[i].y, 12, 5)) { die('SRÁŽKA S UFO'); return; }
        }
        for (i = 0; i < G.meteors.length; i++) {
            if (Z.hit(sbx, sby, sbw, sbh, G.meteors[i].wx, G.meteors[i].y, 6, 6)) { die('METEORIT'); return; }
        }
        for (i = 0; i < G.eshots.length; i++) {
            if (Z.hit(s.sx + 1, sby, sbw, sbh, G.eshots[i].x - 1, G.eshots[i].y - 1, 3, 3)) { die('ZASAŽEN'); return; }
        }
    }

    function updParts() {
        for (var i = G.parts.length - 1; i >= 0; i--) {
            var p = G.parts[i];
            p.wx += p.vx; p.y += p.vy; p.vy += 0.02;
            if (--p.life <= 0) { G.parts.splice(i, 1); }
        }
    }

    // ---------- Kreslení
    function drawStars() {
        for (var i = 0; i < stars.length; i++) {
            var s = stars[i], x = ((s.x - G.scrollX * s.k) % 256 + 256) % 256;
            Z.pix(x, s.y, s.c);
        }
    }
    function drawTerrain() {
        var c0 = Math.floor(G.scrollX / COLW);
        for (var i = 0; i <= 65; i++) {
            var col = c0 + i;
            if (col >= floorY.length) { break; }
            var x0 = Math.round(col * COLW - G.scrollX), x1 = Math.round((col + 1) * COLW - G.scrollX), w = x1 - x0;
            if (w <= 0) { continue; }
            var ph = phaseOf(col), f = floorY[col], ce = ceilY[col], fill = FILL[ph], ed = EDGE[ph];
            Z.rect(x0, f, w, SCRH - f, fill);
            Z.rect(x0, f, w, 2, ed);
            for (var yy = f + 8 + ((col & 1) ? 4 : 0); yy < SCRH; yy += 8) { Z.rect(x0, yy, w, 1, 0); }
            if (ce > TOP) {
                Z.rect(x0, TOP, w, ce - TOP, fill);
                Z.rect(x0, ce - 2, w, 2, ed);
                for (var y2 = TOP + 3 + ((col & 1) ? 4 : 0); y2 < ce - 3; y2 += 8) { Z.rect(x0, y2, w, 1, 0); }
            }
        }
    }
    function drawObjs() {
        for (var i = 0; i < G.objs.length; i++) {
            var o = G.objs[i], sx = Math.round(o.wx - G.scrollX);
            if (sx > 260) { break; }
            if (!o.alive || sx < -16) { continue; }
            var y = Math.round(o.y);
            if (o.t === 'rocket') {
                Z.spriteC(sx, y, ROCKET, ROCKET_PAL);
                if (o.st) { Z.rect(sx + 3, y + 11, 2, 3 + (G.t & 3), 14); Z.rect(sx + 3, y + 11, 2, 1, 15); }
            } else if (o.t === 'fuel') {
                Z.spriteC(sx, y, FUEL, FUEL_PAL);
            } else if (o.t === 'radar') {
                Z.spriteC(sx, y, RADAR, RADAR_PAL);
                if ((G.t >> 4) & 1) { Z.pix(sx + 5, y - 1, 10); Z.pix(sx + 6, y - 1, 10); }
            } else {
                var bc = [13, 11, 14][o.col];
                Z.rect(sx, y, o.w, o.h, bc);
                Z.rect(sx, y, o.w, 1, 15);
                for (var wy = y + 4; wy < y + o.h - 3; wy += 5) { Z.rect(sx + 2, wy, 2, 2, 1); Z.rect(sx + 8, wy, 2, 2, 1); }
            }
        }
    }
    function drawShip() {
        var s = G.ship, x = Math.round(s.sx), y = Math.round(s.sy);
        if (G.invuln > 0 && (G.t >> 2) & 1) { return; }
        Z.spriteC(x, y, SHIP, SHIP_PAL);
        Z.pix(x - 1, y + 2, (G.t & 2) ? 14 : 10); Z.pix(x - 2, y + 3, (G.t & 1) ? 10 : 14);
    }
    function drawBoss() {
        var b = G.boss;
        if (!b.active || b.dead) { return; }
        var x = b.x, y = b.y, alive = b.hp > 0;
        Z.rect(x, y, b.w, b.h, 1);
        Z.frame(x, y, b.w, b.h, 9);
        Z.rect(x + 14, y + 6, b.w - 18, b.h - 12, 3);
        Z.frame(x + 14, y + 6, b.w - 18, b.h - 12, 11);
        for (var k = 0; k < 4; k++) { Z.rect(x + 20, y + 12 + k * 14, b.w - 30, 2, 13); }
        // štěrbina s jádrem
        Z.rect(x, y + 6, 14, b.h - 12, 0);
        Z.frame(x, y + 6, 14, b.h - 12, 15);
        // hlavně
        Z.rect(x - 6, y + 4, 8, 4, 13); Z.rect(x - 6, y + b.h - 8, 8, 4, 13);
        Z.rect(x + 8, y - 8, 28, 8, 9); Z.rect(x + 14, y - 12, 6, 4, 15);
        if (alive) {
            Z.rect(x + 1, b.cy, 12, 12, b.flash > 0 ? 15 : ((G.t >> 3) & 1 ? 10 : 14));
            Z.frame(x + 1, b.cy, 12, 12, 15);
            // ukazatel života
            Z.rect(x, y - 16, b.w, 3, 2);
            Z.rect(x, y - 16, Math.round(b.w * b.hp / b.maxhp), 3, 12);
        }
    }
    function drawHud() {
        Z.rect(0, 0, 256, 16, 0);
        Z.rect(0, 16, 256, 1, 8 + 1);
        Z.text(2, -1, 'SKÓRE ' + Z.pad(G.score, 6), 15);
        Z.text(254, -1, 'REKORD ' + Z.pad(Math.max(G.hi, G.score), 6), 14, { align: 'right' });
        Z.text(2, 7, 'PALIVO', 13);
        var fw = Math.round(60 * G.fuel / FUEL_MAX), fc = G.fuel < 20 ? (((G.t >> 3) & 1) ? 10 : 2) : G.fuel < 40 ? 14 : 12;
        Z.rect(40, 9, 62, 6, 1); Z.rect(41, 10, fw, 4, fc);
        Z.spriteC(108, 9, SHIP, SHIP_PAL);
        // zmenšená ikona: jen text s počtem životů
        Z.text(124, 7, 'X' + G.lives, 15);
        for (var i = 0; i < 6; i++) {
            var cur = i === Math.max(0, G.phase);
            Z.rect(150 + i * 10, 9, 8, 6, cur ? EDGE[i] : FILL[i]);
            if (cur) { Z.frame(149 + i * 10, 8, 10, 8, 15); }
        }
        Z.text(254, 7, 'KOLO ' + G.kolo, 11, { align: 'right' });
    }
    function drawOverlay() {
        if (G.banner > 0 && G.state === 'play') {
            Z.text(128, 44, G.bannerTxt, (G.banner >> 3) & 1 ? 14 : 15, { align: 'center', scale: 1 });
        }
    }
    function panel(x, y, w, h) { Z.rect(x, y, w, h, 0); Z.frame(x, y, w, h, 15); Z.frame(x + 2, y + 2, w - 4, h - 4, 11); }

    function drawWorld() {
        drawStars(); drawTerrain(); drawObjs();
        var i;
        for (i = 0; i < G.ufos.length; i++) { Z.spriteC(Math.round(G.ufos[i].wx - G.scrollX), Math.round(G.ufos[i].y), UFO, UFO_PAL); }
        for (i = 0; i < G.meteors.length; i++) {
            var m = G.meteors[i], mx = Math.round(m.wx - G.scrollX), my = Math.round(m.y);
            Z.spriteC(mx, my, METEOR, METEOR_PAL);
            Z.pix(mx + 7, my - 1, 6); Z.pix(mx + 8, my - 2, 10); Z.pix(mx + 9, my - 3, 10);
        }
        drawBoss();
        for (i = 0; i < G.bullets.length; i++) { Z.rect(G.bullets[i].sx, G.bullets[i].y, 4, 1, 14); }
        for (i = 0; i < G.bombs.length; i++) { Z.rect(Math.round(G.bombs[i].sx), Math.round(G.bombs[i].y), 3, 4, 15); Z.pix(G.bombs[i].sx + 1, G.bombs[i].y, 10); }
        for (i = 0; i < G.eshots.length; i++) { Z.rect(G.eshots[i].x - 1, G.eshots[i].y - 1, 3, 3, (G.t & 2) ? 14 : 10); }
        if (G.state === 'play' || (G.state === 'clear')) { drawShip(); }
        for (i = 0; i < G.parts.length; i++) {
            var p = G.parts[i]; Z.pix(p.wx - G.scrollX, p.y, p.life < 6 ? 2 : p.col);
            if (p.life > 14) { Z.pix(p.wx - G.scrollX + 1, p.y, p.col); }
        }
    }

    function drawTitle() {
        drawStars(); drawTerrain(); drawObjs();
        panel(8, 6, 240, 124);
        Z.text(128, 12, 'NÁLET', 14, { align: 'center', scale: 4 });
        Z.text(128, 46, 'NAD KRAJINOU', 10, { align: 'center', scale: 2 });
        var L = [
            'ŠIPKY / WASD ... LET',
            'MEZERNÍK / Z ... STŘELBA VPŘED',
            'X / V / C ... BOMBA DOLŮ',
            'SESTŘEL NÁDRŽ = DOPLNĚNÍ PALIVA',
            'LET NAD 6 FÁZEMI, ZNIČ ZÁKLADNU',
            'P PAUZA   M ZVUK'
        ];
        for (var i = 0; i < L.length; i++) { Z.text(128, 70 + i * 9, L[i], i === 3 ? 12 : 15, { align: 'center' }); }
        Z.text(128, 136, 'REKORD ' + Z.pad(G.hi, 6), 14, { align: 'center' });
        Z.spriteCS(8 + Math.round(Math.sin(G.t * 0.03) * 4), 136 + Math.round(Math.sin(G.t * 0.05) * 3), SHIP, SHIP_PAL, 2);
        if ((G.t >> 5) & 1) { Z.text(128, 148, 'STISKNI OHEŇ', 15, { align: 'center', scale: 2 }); }
        Z.border = 0;
    }

    function draw() {
        Z.cls(0, 7);
        Z.border = 0;
        if (G.state === 'title') { drawTitle(); return; }
        drawWorld();
        drawHud();
        drawOverlay();
        if (G.state === 'dying' && G.stateT > 20) {
            Z.text(128, 70, G.cause, 10, { align: 'center', scale: 1 });
        }
        if (G.state === 'clear') {
            panel(28, 56, 200, 64);
            Z.text(128, 64, 'ZÁKLADNA ZNIČENA!', 14, { align: 'center', scale: 1 });
            Z.text(128, 78, 'BONUS ZA PALIVO A ZÁKLAD', 15, { align: 'center' });
            Z.text(128, 92, 'DALŠÍ KOLO JE RYCHLEJŠÍ', 13, { align: 'center' });
            Z.text(128, 104, 'ZÍSKÁVÁŠ ŽIVOT', 12, { align: 'center' });
        }
        if (G.state === 'over') {
            panel(44, 56, 168, 64);
            Z.text(128, 64, 'KONEC HRY', 10, { align: 'center', scale: 2 });
            Z.text(128, 86, 'SKÓRE ' + Z.pad(G.score, 6), 15, { align: 'center' });
            Z.text(128, 96, 'REKORD ' + Z.pad(G.hi, 6), 14, { align: 'center' });
            if (G.stateT > 90 && ((G.t >> 5) & 1)) { Z.text(128, 108, 'STISKNI OHEŇ', 13, { align: 'center' }); }
        }
    }

    Z.init({
        title: 'Nálet nad krajinou',
        touch: [
            { act: 'left', label: '◀' }, { act: 'up', label: '▲' }, { act: 'down', label: '▼' }, { act: 'right', label: '▶' },
            { act: 'alt', label: 'BOMBA' }, { act: 'fire', label: 'OHEŇ', cls: 'big' }
        ]
    });
    G.hi = Z.hi.get(HI);
    G.dbgTerrain = function () { return { floor: floorY, ceil: ceilY }; };
    Z.run({ tick: tick, draw: draw });
})();
