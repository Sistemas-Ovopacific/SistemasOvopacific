// ============================================================
//  boot.js — Animación "Entrar a Otra Dimensión"
//  Portal vórtice + partículas interactivas
// ============================================================

(function () {
    'use strict';

    const bootScreen = document.getElementById('boot-screen');
    const bootBar    = document.getElementById('boot-bar');
    const bootLog    = document.getElementById('boot-log');
    const appCont    = document.getElementById('app-container');
    const canvas     = document.getElementById('tech-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // ── FASE 1: VÓRTICE DIMENSIONAL ──────────────────────────
    // Partículas que giran hacia el centro (efecto succión)
    let vortexDone = false;
    let appReady   = false;

    const VORTEX_PARTICLES = 300;
    const vortex = [];

    function randomVortexParticle(fromCenter = false) {
        const W = canvas.width, H = canvas.height;
        const angle = Math.random() * Math.PI * 2;
        const dist  = fromCenter
            ? Math.random() * 30        // aparecen cerca del centro
            : 200 + Math.random() * Math.max(W, H) * 0.7;

        const cx = W / 2, cy = H / 2;
        const speed = 1.5 + Math.random() * 3;
        const hue   = 220 + Math.random() * 50; // azul-indigo-violeta

        return {
            x: cx + Math.cos(angle) * dist,
            y: cy + Math.sin(angle) * dist,
            angle,
            dist,
            speed,
            hue,
            alpha: Math.random() * 0.7 + 0.3,
            r:     Math.random() * 2 + 0.5,
            spin:  (Math.random() - 0.5) * 0.04,
            trail: [],   // para el efecto estela
        };
    }

    for (let i = 0; i < VORTEX_PARTICLES; i++) {
        vortex.push(randomVortexParticle());
    }

    // Onda de destello central
    let flashRings = [];
    let flashTriggered = false;

    function addFlashRing() {
        flashRings.push({ r: 0, alpha: 0.8, speed: 12 });
    }

    // ── Animación del vórtice ───────────────────────────────
    let startTime = null;
    const VORTEX_DURATION = 2800; // ms del vórtice
    const FLASH_AT        = 2400; // ms cuando explota la luz

    function drawVortex(ts) {
        if (!startTime) startTime = ts;
        const elapsed = ts - startTime;
        const progress = Math.min(elapsed / VORTEX_DURATION, 1);

        const W = canvas.width, H = canvas.height;
        const cx = W / 2, cy = H / 2;

        // Fondo elegante que se mantiene en el tono violeta-azulado
        const bgAlpha = 0.18 + progress * 0.25;
        ctx.fillStyle = `rgba(18, 8, 52, ${bgAlpha})`;
        ctx.fillRect(0, 0, W, H);

        // Brillo central del portal — indigo/azul
        const portalGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80 + 120 * progress);
        portalGlow.addColorStop(0, `rgba(130, 110, 255, ${0.18 + progress * 0.38})`);
        portalGlow.addColorStop(0.4, `rgba(91, 94, 244, ${0.06 + progress * 0.18})`);
        portalGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = portalGlow;
        ctx.fillRect(0, 0, W, H);

        // Partículas del vórtice
        vortex.forEach(p => {
            // Guardar posición anterior en estela
            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > 12) p.trail.shift();

            // Mover: girar + acelerarse hacia el centro
            const pullForce = 0.012 + progress * 0.06;
            p.speed += pullForce;
            p.angle += p.spin + progress * 0.015;
            p.dist -= p.speed * (1 + progress * 2.5);

            p.x = cx + Math.cos(p.angle) * p.dist;
            p.y = cy + Math.sin(p.angle) * p.dist;

            // Renacer cuando llegan al centro
            if (p.dist < 4) {
                Object.assign(p, randomVortexParticle(true));
                p.trail = [];
                return;
            }

            // Dibujar estela con degradado
            if (p.trail.length > 1) {
                for (let i = 1; i < p.trail.length; i++) {
                    const t = i / p.trail.length;
                    ctx.beginPath();
                    ctx.moveTo(p.trail[i-1].x, p.trail[i-1].y);
                    ctx.lineTo(p.trail[i].x, p.trail[i].y);
                    ctx.strokeStyle = `hsla(${p.hue}, 80%, 70%, ${t * p.alpha * 0.8})`;
                    ctx.lineWidth = p.r * t;
                    ctx.stroke();
                }
            }

            // Punto principal
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, 80%, 75%, ${p.alpha})`;
            ctx.fill();
        });

        // Ondas de destello al explotar el portal
        if (!flashTriggered && elapsed > FLASH_AT) {
            flashTriggered = true;
            for (let i = 0; i < 5; i++) setTimeout(() => addFlashRing(), i * 80);
        }

        // Ondas de destello en tono indigo
        flashRings.forEach((ring, idx) => {
            ring.r     += ring.speed;
            ring.alpha -= 0.022;
            ring.speed *= 0.96;
            if (ring.alpha <= 0) { flashRings.splice(idx, 1); return; }
            ctx.beginPath();
            ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(165, 180, 252, ${ring.alpha})`;
            ctx.lineWidth = 3;
            ctx.stroke();
        });

        // Flash final — azulado-indigo, transiciona hacia el fondo de la app
        if (elapsed > FLASH_AT + 200) {
            const flashProgress = Math.min((elapsed - FLASH_AT - 200) / 400, 1);
            const flashAlpha = flashProgress < 0.5
                ? flashProgress * 2
                : 2 - flashProgress * 2;
            // El flash 'sale' hacia el color del fondo de la app
            ctx.fillStyle = `rgba(209, 217, 238, ${flashAlpha * 0.9})`;
            ctx.fillRect(0, 0, W, H);
        }

        if (elapsed < VORTEX_DURATION) {
            requestAnimationFrame(drawVortex);
        } else {
            // Vórtice terminado → desaparecer boot screen y comenzar partículas
            vortexDone = true;

            bootScreen.style.transition = 'opacity 0.6s ease';
            bootScreen.style.opacity = '0';
            setTimeout(() => {
                bootScreen.style.display = 'none';

                // Check if user is logged in
                let currentUser = sessionStorage.getItem('inv_currentUser');
                if (currentUser === 'undefined' || currentUser === 'null') currentUser = null;
                
                if (!currentUser) {
                    const loginScreen = document.getElementById('login-screen');
                    if (loginScreen) {
                        loginScreen.style.display = 'flex';
                        setTimeout(() => {
                            loginScreen.style.opacity = '1';
                            if (window.initLoginParticles) window.initLoginParticles();
                        }, 50);
                    }
                } else {
                    const landing = document.getElementById('landing-portal');
                    if (landing) {
                        landing.style.display = 'flex';
                        setTimeout(() => {
                            landing.style.opacity = '1';
                            if (window.initPortalParticles) window.initPortalParticles();
                        }, 50);
                    } else if (appCont) {
                        appCont.style.display = 'flex';
                        setTimeout(() => appCont.style.opacity = '1', 50);
                    }
                }
                startParticles();
            }, 600);
        }
    }

    // ── MENSAJES DE CARGA (sobre el vórtice) ──────────────────
    const bootMessages = [
        'Abriendo portal dimensional...',
        'Sincronizando matrices...',
        'Conectando con Google Sheets...',
        'Cargando módulos...',
        'Atravesando el umbral...',
        'Bienvenido ✓'
    ];

    let msgIdx = 0;
    function nextBootMsg() {
        if (msgIdx < bootMessages.length) {
            if (bootLog) bootLog.innerHTML = '<span>' + bootMessages[msgIdx] + '</span>';
            if (bootBar) bootBar.style.width = ((msgIdx + 1) / bootMessages.length * 100) + '%';
            msgIdx++;
            const delay = msgIdx === bootMessages.length ? 600 : 400 + Math.random() * 200;
            setTimeout(nextBootMsg, delay);
        }
    }

    // Dar un pequeño delay para que el usuario vea el vórtice primero
    setTimeout(nextBootMsg, 200);

    // Oscurecer el boot screen para mostrar mejor el canvas
    if (bootScreen) {
        bootScreen.style.background = 'rgba(8, 4, 22, 0.92)';
    }

    // Inicio del vórtice
    requestAnimationFrame(drawVortex);

    // ── FASE 2: PARTÍCULAS INTERACTIVAS (fondo normal) ────────
    const COLORS = [
        [91,  94,  244],
        [99,  102, 241],
        [129, 140, 248],
        [67,  56,  202],
        [139, 92,  246],
        [168, 85,  247],
        [79,  70,  229],
    ];

    const COUNT           = 160;
    const ATTRACT_RADIUS  = 180;
    const ATTRACT_FORCE   = 0.045;
    const FRICTION        = 0.87;
    const MAX_SPEED       = 4;

    const particles = [];

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, active: false };
    document.addEventListener('mousemove', e => {
        mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
    });

    function buildParticles() {
        particles.length = 0;
        for (let i = 0; i < COUNT; i++) {
            const color  = COLORS[Math.floor(Math.random() * COLORS.length)];
            const isLine = Math.random() < 0.28;
            particles.push({
                x:     Math.random() * canvas.width,
                y:     Math.random() * canvas.height,
                vx:    (Math.random() - 0.5) * 0.7,
                vy:    (Math.random() - 0.5) * 0.7,
                r:     isLine ? 0 : Math.random() * 2.5 + 1,
                alpha: Math.random() * 0.45 + 0.2,
                color, isLine,
                len:   isLine ? Math.random() * 12 + 5 : 0,
                angle: isLine ? Math.random() * Math.PI * 2 : 0,
                spin:  (Math.random() - 0.5) * 0.012,
            });
        }
    }

    function tickParticles() {
        if (!vortexDone) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const W = canvas.width, H = canvas.height;

        particles.forEach(p => {
            if (mouse.active) {
                const dx = mouse.x - p.x, dy = mouse.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < ATTRACT_RADIUS && dist > 1) {
                    const force = (1 - dist / ATTRACT_RADIUS) * ATTRACT_FORCE;
                    p.vx += (dx / dist) * force;
                    p.vy += (dy / dist) * force;
                }
            }

            p.vx *= FRICTION; p.vy *= FRICTION;

            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (speed > MAX_SPEED) { p.vx = (p.vx / speed) * MAX_SPEED; p.vy = (p.vy / speed) * MAX_SPEED; }

            p.x += p.vx; p.y += p.vy;

            if (p.x < -20)    { p.x = -20;    p.vx *= -0.5; }
            if (p.x > W + 20) { p.x = W + 20; p.vx *= -0.5; }
            if (p.y < -20)    { p.y = -20;    p.vy *= -0.5; }
            if (p.y > H + 20) { p.y = H + 20; p.vy *= -0.5; }

            if (p.isLine) p.angle += p.spin;

            const [r, g, b] = p.color;
            ctx.beginPath();
            if (p.isLine) {
                const cos = Math.cos(p.angle) * p.len * 0.5;
                const sin = Math.sin(p.angle) * p.len * 0.5;
                ctx.moveTo(p.x - cos, p.y - sin);
                ctx.lineTo(p.x + cos, p.y + sin);
                ctx.strokeStyle = `rgba(${r},${g},${b},${p.alpha})`;
                ctx.lineWidth = 1.2;
                ctx.stroke();
            } else {
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha})`;
                ctx.fill();
            }
        });

        // Líneas entre partículas cercanas
        const CONNECT_DIST = 80;
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[j].x - particles[i].x;
                const dy = particles[j].y - particles[i].y;
                const d  = Math.sqrt(dx * dx + dy * dy);
                if (d < CONNECT_DIST) {
                    const alpha = (1 - d / CONNECT_DIST) * 0.07;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(91,94,244,${alpha})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(tickParticles);
    }

    function startParticles() {
        buildParticles();
        requestAnimationFrame(tickParticles);
    }

}());
