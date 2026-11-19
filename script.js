// =========================================================================
// Capa "dispositivo": simula el flujo de datos de una diadema EEG.
// =========================================================================
class SimulatedBCIDevice extends EventTarget {
    constructor() {
        super();
        this.connected = false;
        this._timer = null;
        this.attention = 0.4;
        this.meditation = 0.5;
    }

    connect() {
        if (this.connected) return;
        this.connected = true;
        this._timer = setInterval(() => this._tick(), 100);
        this.dispatchEvent(new Event('connect'));
    }

    disconnect() {
        if (!this.connected) return;
        this.connected = false;
        clearInterval(this._timer);
        this._timer = null;
        this.dispatchEvent(new Event('disconnect'));
    }

    _tick() {
        this.attention = this._walk(this.attention);
        this.meditation = this._walk(this.meditation);
        this.dispatchEvent(new CustomEvent('data', {
            detail: { attention: this.attention, meditation: this.meditation }
        }));
    }

    _walk(v) {
        v += (Math.random() - 0.5) * 0.12;
        return Math.max(0, Math.min(1, v));
    }

    blink() {
        if (!this.connected) return;
        this.dispatchEvent(new Event('blink'));
    }
}

// =========================================================================
// Capa "aplicación VR": consume los eventos y actualiza la escena.
// =========================================================================
const device = new SimulatedBCIDevice();

const orb = document.querySelector('#orb');
const pulse = document.querySelector('#pulse');
const rig = document.querySelector('#rig');
const hud3d = document.querySelector('#hud3d');
const attnBar = document.querySelector('#attn span');
const mediBar = document.querySelector('#medi span');
const attnV = document.querySelector('#attn-v');
const mediV = document.querySelector('#medi-v');
const statusEl = document.querySelector('#status');
const connectBtn = document.querySelector('#connect');
const blinkBtn = document.querySelector('#blink');
const cube = document.querySelector('#cube');
const star = document.querySelector('#star');
const starParts = document.querySelectorAll('.star-part');

function setStarGlow(intensity) {
    starParts.forEach((part) => {
        part.setAttribute('material', 'emissiveIntensity', intensity);
    });
}

function meditationColor(m) {
    const hue = 200 - m * 180;
    return `hsl(${hue}, 80%, 55%)`;
}

device.addEventListener('data', (e) => {
    const { attention, meditation } = e.detail;

    // Atención → altura y tamaño de la esfera
    const y = 1.0 + attention * 1.8;
    const r = 0.4 + attention * 0.6;
    orb.setAttribute('position', { x: 0, y, z: -3 });
    orb.setAttribute('radius', r);
    pulse.setAttribute('position', { x: 0, y, z: -3 });

    // Meditación → color de la esfera
    orb.setAttribute('color', meditationColor(meditation));

    // HUD 2D y 3D
    const a = Math.round(attention * 100);
    const m = Math.round(meditation * 100);
    attnBar.style.width = a + '%';
    attnV.textContent = a + '%';
    mediBar.style.width = m + '%';
    mediV.textContent = m + '%';
    hud3d.setAttribute('value', `Atencion: ${a}%\nMeditacion: ${m}%`);

    // Cubo → color por meditación y rotación sobre su propio eje Y
    cube.setAttribute('color', meditationColor(meditation));
    const cubeRot = cube.getAttribute('rotation');
    cube.setAttribute('rotation', {
        x: cubeRot.x,
        y: (cubeRot.y + 1.2 + meditation * 2.5) % 360,
        z: cubeRot.z
    });

    // Estrella → altura y nivel de iluminación según atención
    const starY = 1.2 + attention * 1.5;
    const glowIntensity = 0.2 + attention * 1.6;
    star.setAttribute('position', { x: 2.2, y: starY, z: -3 });
    setStarGlow(glowIntensity);
});

// Parpadeo → pulso visual, salto del usuario y destello de la estrella
device.addEventListener('blink', () => {
    pulse.setAttribute('visible', true);
    pulse.setAttribute('scale', '0.5 0.5 0.5');
    pulse.setAttribute('animation__grow',
        'property: scale; to: 3 3 3; dur: 400; easing: easeOutQuad');
    pulse.setAttribute('animation__fade',
        'property: material.opacity; from: 0.8; to: 0; dur: 400');
    setTimeout(() => pulse.setAttribute('visible', false), 420);

    const p = rig.getAttribute('position');
    rig.setAttribute('animation__move',
        `property: position; to: ${p.x} ${p.y} ${p.z - 0.8}; dur: 300`);

    star.setAttribute('animation__blink',
        'property: scale; from: 0.7 0.7 0.7; to: 1.2 1.2 1.2; dur: 250; dir: alternate; loop: 1');

    setStarGlow(3.0);
    setTimeout(() => {
        setStarGlow(0.2 + device.attention * 1.6);
    }, 350);
});

// --- Conexión / desconexión ---
connectBtn.addEventListener('click', () => {
    if (device.connected) {
        device.disconnect();
    } else {
        device.connect();
    }
});

device.addEventListener('connect', () => {
    connectBtn.textContent = 'Desconectar dispositivo';
    connectBtn.classList.add('off');
    blinkBtn.classList.remove('off');
    statusEl.querySelector('b').textContent = 'conectado';
});

device.addEventListener('disconnect', () => {
    connectBtn.textContent = 'Conectar dispositivo';
    connectBtn.classList.remove('off');
    blinkBtn.classList.add('off');
    statusEl.querySelector('b').textContent = 'desconectado';
});

// --- Disparar parpadeo: botón o tecla Espacio ---
blinkBtn.addEventListener('click', () => device.blink());
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        device.blink();
    }
});