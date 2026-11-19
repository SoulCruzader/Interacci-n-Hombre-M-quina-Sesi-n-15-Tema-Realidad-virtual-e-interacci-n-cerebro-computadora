// =========================================================================
// Capa "dispositivo": simula el flujo de datos de una diadema EEG.
// En un caso real, aquí abrirías un WebSocket / Web Bluetooth / Serial
// hacia el hardware (p.ej. NeuroSky, Muse, OpenBCI) y emitirías eventos.
// =========================================================================
class SimulatedBCIDevice extends EventTarget {
    constructor() {
        super();
        this.connected = false;
        this._timer = null;
        // valores 0..1 con paseo aleatorio suave (estado mental)
        this.attention = 0.4;
        this.meditation = 0.5;
    }

    connect() {
        this.connected = true;
        // 10 Hz de muestreo, como muchos SDK de EEG de consumo
        this._timer = setInterval(() => this._tick(), 100);
        this.dispatchEvent(new Event('connect'));
    }

    disconnect() {
        this.connected = false;
        clearInterval(this._timer);
        this.dispatchEvent(new Event('disconnect'));
    }

    // genera nueva muestra (random walk acotado) y la emite
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

    // evento discreto: parpadeo detectado (artefacto EOG)
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

// mapea color frío→cálido según meditación (HSL: 200° azul → 20° naranja)
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

    // Meditación → color
    orb.setAttribute('color', meditationColor(meditation));

    // HUD 2D y 3D
    const a = Math.round(attention * 100), m = Math.round(meditation * 100);
    attnBar.style.width = a + '%'; attnV.textContent = a + '%';
    mediBar.style.width = m + '%'; mediV.textContent = m + '%';
    hud3d.setAttribute('value', `Atencion: ${a}%\nMeditacion: ${m}%`);
});

// Parpadeo → pulso visual + pequeño "salto" del usuario hacia delante
device.addEventListener('blink', () => {
    pulse.setAttribute('visible', true);
    pulse.setAttribute('scale', '0.5 0.5 0.5');
    pulse.setAttribute('animation__grow',
        'property: scale; to: 3 3 3; dur: 400; easing: easeOutQuad');
    pulse.setAttribute('animation__fade',
        'property: material.opacity; from: 0.8; to: 0; dur: 400');
    setTimeout(() => pulse.setAttribute('visible', false), 420);

    // teletransporte corto hacia el frente (interacción "manos libres")
    const p = rig.getAttribute('position');
    rig.setAttribute('animation__move',
        `property: position; to: ${p.x} ${p.y} ${p.z - 0.8}; dur: 300`);
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
    if (e.code === 'Space') { e.preventDefault(); device.blink(); }
});