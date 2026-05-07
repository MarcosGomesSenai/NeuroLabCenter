// CARROSSEL DA ÁREA PRINCIPAL
let slideAtual = 0;
const totalSlides = 3;

function atualizarCarrossel() {
  const track = document.getElementById('carouselTrack');
  const dots = document.querySelectorAll('.dot');

  if (!track) return;

  track.style.transform = `translateX(-${slideAtual * 100}%)`;
  dots.forEach((dot, index) => dot.classList.toggle('active', index === slideAtual));
}

function mudarSlide(direcao) {
  slideAtual += direcao;
  if (slideAtual < 0) slideAtual = totalSlides - 1;
  if (slideAtual >= totalSlides) slideAtual = 0;
  atualizarCarrossel();
}

function irParaSlide(numero) {
  slideAtual = numero;
  atualizarCarrossel();
}

setInterval(() => mudarSlide(1), 4500);

// FUNDO ANIMADO COM MOUSE
const canvas = document.getElementById('bgCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let particles = [];
let mouse = { x: null, y: null };

function resizeCanvas() {
  if (!canvas) return;
  const hero = document.querySelector('.hero');
  canvas.width = window.innerWidth;
  canvas.height = hero ? hero.offsetHeight : 600;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

window.addEventListener('mousemove', function(e) {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});

class Particle {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 3 + 1;
    this.speedX = Math.random() * 1 - 0.5;
    this.speedY = Math.random() * 1 - 0.5;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;

    if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
    if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;

    if (mouse.x !== null && mouse.y !== null) {
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 130) {
        this.x -= dx * 0.012;
        this.y -= dy * 0.012;
      }
    }
  }

  draw() {
    ctx.fillStyle = 'rgba(0,116,118,0.42)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function initParticles() {
  if (!canvas) return;
  particles = [];
  for (let i = 0; i < 120; i++) particles.push(new Particle());
}

function ligarPontos() {
  for (let a = 0; a < particles.length; a++) {
    for (let b = a; b < particles.length; b++) {
      const dx = particles[a].x - particles[b].x;
      const dy = particles[a].y - particles[b].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 95) {
        ctx.strokeStyle = `rgba(72,163,167,${1 - dist / 95})`;
        ctx.lineWidth = 0.45;
        ctx.beginPath();
        ctx.moveTo(particles[a].x, particles[a].y);
        ctx.lineTo(particles[b].x, particles[b].y);
        ctx.stroke();
      }
    }
  }
}

function animateParticles() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => { p.update(); p.draw(); });
  ligarPontos();
  requestAnimationFrame(animateParticles);
}

initParticles();
animateParticles();

/* ============================================================
   NEUROLAB UX REFRESH - navegacao, calendario e modulos
   ============================================================ */
window.NLUX = {
  calendarOffset: 0,
  selectedDateISO: '',
  selectedSlot: '',
  portalTab: 'historico'
};

