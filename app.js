// Audio Synthesis Class (no external asset dependencies)
class SoundEffects {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  }

  playSuccess() {
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.exponentialRampToValueAtTime(1046.50, now + 0.15); // C6

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now); // E5
    osc2.frequency.exponentialRampToValueAtTime(1318.51, now + 0.15); // E6

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.3);
    osc2.start(now);
    osc2.stop(now + 0.3);
  }

  playError() {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(60, now + 0.25);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  playLevelUp() {
    const now = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // Arpeggio
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      
      gain.gain.setValueAtTime(0.1, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.2);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.2);
    });
  }
}

// Particle Engine for visual celebrations
class ParticleEngine {
  constructor() {
    this.particles = [];
  }

  spawn(x, y, count = 40, colors = ['#00f2fe', '#ff007f', '#10b981']) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 3;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 3, // slightly upward force
        radius: Math.random() * 5 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        life: 1
      });
    }
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12; // gravity effect
      p.alpha -= 0.015;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    this.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
}

// Main App Controller
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('sim-canvas');
  const ctx = canvas.getContext('2d');
  
  // Audio SFX instantiator
  let sfx;
  const initAudio = () => {
    if (!sfx) sfx = new SoundEffects();
  };

  // Elements
  const f1Range = document.getElementById('f1-range');
  const f2Range = document.getElementById('f2-range');
  const d1Range = document.getElementById('d1-range');
  const d2Range = document.getElementById('d2-range');

  const f1Val = document.getElementById('f1-val');
  const f2Val = document.getElementById('f2-val');
  const d1Val = document.getElementById('d1-val');
  const d2Val = document.getElementById('d2-val');

  const btnRandomise = document.getElementById('btn-randomise');
  const stateBadge = document.getElementById('state-badge');
  const themeBadge = document.getElementById('structure-theme-badge');

  // Worksheet Elements
  const worksheetForm = document.getElementById('worksheet-form');
  const cwInput = document.getElementById('cw-moment-input');
  const acwInput = document.getElementById('acw-moment-input');
  const stateSelect = document.getElementById('state-select');
  const comparisonSelect = document.getElementById('comparison-select');
  const btnSubmit = document.getElementById('btn-submit');
  const btnReveal = document.getElementById('btn-reveal');
  const solutionBox = document.getElementById('solution-box');

  const solCw = document.getElementById('sol-cw');
  const solAcw = document.getElementById('sol-acw');
  const solExplain = document.getElementById('sol-explain');

  // Gamification Elements
  const scoreValEl = document.getElementById('score-val');
  const streakValEl = document.getElementById('streak-val');
  const rankValEl = document.getElementById('rank-val');

  let score = 0;
  let streak = 0;

  // Simulation State
  let f1 = parseFloat(f1Range.value);
  let f2 = parseFloat(f2Range.value);
  let d1 = parseFloat(d1Range.value);
  let d2 = parseFloat(d2Range.value);

  // Pivot Offset & Shape Themes
  let pivotXOffset = 0; // horizontal offset from center (-150 to +150 px)
  const themes = ['Neon Cyberpunk', 'Industrial Steel', 'Classic Wood', 'Carbon Fiber'];
  let currentTheme = 'Neon Cyberpunk';

  // Physics animation variables
  let angle = 0; // current see-saw angle (radians)
  let angularVelocity = 0;
  const scaleMetersToPixels = 200; // 1 meter = 200 pixels

  // Particle Engine
  const pe = new ParticleEngine();

  // Ranks threshold
  const getRank = (score) => {
    if (score >= 1000) return 'Balance God 🌟';
    if (score >= 600) return 'Torque Titan ⚡';
    if (score >= 300) return 'Moment Master 🎓';
    return 'Novice Physicist 🧪';
  };

  // Setup / update inputs display
  const updateLabels = () => {
    f1Val.innerText = `${f1} N`;
    f2Val.innerText = `${f2} N`;
    d1Val.innerText = `${d1.toFixed(1)} m`;
    d2Val.innerText = `${d2.toFixed(1)} m`;
  };

  // Listeners for sliders
  const onSliderChange = () => {
    f1 = parseFloat(f1Range.value);
    f2 = parseFloat(f2Range.value);
    d1 = parseFloat(d1Range.value);
    d2 = parseFloat(d2Range.value);
    updateLabels();
    resetFeedback();
  };

  [f1Range, f2Range, d1Range, d2Range].forEach(slider => {
    slider.addEventListener('input', onSliderChange);
    slider.addEventListener('mousedown', initAudio);
    slider.addEventListener('touchstart', initAudio);
  });

  // Reset visual feedback on new inputs or changes
  const resetFeedback = () => {
    cwInput.parentElement.className = 'input-with-feedback';
    acwInput.parentElement.className = 'input-with-feedback';
    stateSelect.className = '';
    comparisonSelect.className = '';
    solutionBox.classList.add('hidden');
  };

  // Parse Moment Values and Units
  const parseMomentInput = (str) => {
    str = str.trim().toLowerCase();
    // Regex matches numbers (optionally floats) followed by optional spaces and unit
    const regex = /^([0-9]+(?:\.[0-9]+)?)\s*([a-z\.\-\s]+)?$/i;
    const match = str.match(regex);

    if (!match) return { val: NaN, unit: '' };

    const val = parseFloat(match[1]);
    const unitRaw = match[2] || '';
    // Normalize units
    let unit = '';
    const cleanUnit = unitRaw.replace(/[\s\.\-]/g, '');
    if (cleanUnit === 'nm') {
      unit = 'Nm';
    }

    return { val, unit };
  };

  // Submit Logic
  worksheetForm.addEventListener('submit', (e) => {
    e.preventDefault();
    initAudio();

    const expectedCW = parseFloat((f2 * d2).toFixed(2));
    const expectedACW = parseFloat((f1 * d1).toFixed(2));

    const parsedCW = parseMomentInput(cwInput.value);
    const parsedACW = parseMomentInput(acwInput.value);

    let isCorrect = true;

    // Validate CW Moment
    const cwOk = Math.abs(parsedCW.val - expectedCW) < 0.05 && parsedCW.unit === 'Nm';
    if (cwOk) {
      cwInput.parentElement.className = 'input-with-feedback input-correct';
    } else {
      cwInput.parentElement.className = 'input-with-feedback input-incorrect';
      isCorrect = false;
      if (Math.abs(parsedCW.val - expectedCW) < 0.05 && parsedCW.unit !== 'Nm') {
        cwInput.setCustomValidity("Value is correct, check your unit format (e.g. N m or Nm).");
        cwInput.reportValidity();
        setTimeout(() => cwInput.setCustomValidity(""), 3000);
      }
    }

    // Validate ACW Moment
    const acwOk = Math.abs(parsedACW.val - expectedACW) < 0.05 && parsedACW.unit === 'Nm';
    if (acwOk) {
      acwInput.parentElement.className = 'input-with-feedback input-correct';
    } else {
      acwInput.parentElement.className = 'input-with-feedback input-incorrect';
      isCorrect = false;
      if (Math.abs(parsedACW.val - expectedACW) < 0.05 && parsedACW.unit !== 'Nm') {
        acwInput.setCustomValidity("Value is correct, check your unit format (e.g. N m or Nm).");
        acwInput.reportValidity();
        setTimeout(() => acwInput.setCustomValidity(""), 3000);
      }
    }

    // Validate state and comparison select dropdowns
    let expectedState = 'balanced';
    let expectedComp = 'equal to';
    if (expectedCW > expectedACW) {
      expectedState = 'turning clockwise';
      expectedComp = 'greater than';
    } else if (expectedCW < expectedACW) {
      expectedState = 'turning anticlockwise';
      expectedComp = 'smaller than';
    }

    if (stateSelect.value === expectedState) {
      stateSelect.className = 'correct';
    } else {
      stateSelect.className = 'incorrect';
      isCorrect = false;
    }

    if (comparisonSelect.value === expectedComp) {
      comparisonSelect.className = 'correct';
    } else {
      comparisonSelect.className = 'incorrect';
      isCorrect = false;
    }

    if (isCorrect) {
      sfx.playSuccess();
      streak += 1;
      const points = 100 + (streak * 10);
      const oldRank = getRank(score);
      score += points;
      const newRank = getRank(score);

      scoreValEl.innerText = score;
      streakValEl.innerText = `🔥 ${streak}`;
      rankValEl.innerText = newRank;

      if (oldRank !== newRank) {
        sfx.playLevelUp();
        pe.spawn(canvas.width / 2, canvas.height / 2, 80, ['#10b981', '#f59e0b', '#00f2fe', '#ffffff']);
      } else {
        pe.spawn(canvas.width / 2, canvas.height / 2, 40);
      }

      // Briefly glow success
      const worksheetCard = document.querySelector('.worksheet');
      worksheetCard.classList.add('success-glow');
      setTimeout(() => worksheetCard.classList.remove('success-glow'), 800);
    } else {
      sfx.playError();
      streak = 0;
      streakValEl.innerText = `🔥 0`;
      
      const worksheetCard = document.querySelector('.worksheet');
      worksheetCard.classList.add('shake-animation');
      setTimeout(() => worksheetCard.classList.remove('shake-animation'), 300);
    }
  });

  // Reveal Solution Logic
  btnReveal.addEventListener('click', () => {
    initAudio();
    const expectedCW = parseFloat((f2 * d2).toFixed(2));
    const expectedACW = parseFloat((f1 * d1).toFixed(2));
    
    solCw.innerText = `${expectedCW} N m (calculated as ${f2} N × ${d2.toFixed(1)} m)`;
    solAcw.innerText = `${expectedACW} N m (calculated as ${f1} N × ${d1.toFixed(1)} m)`;

    let actionWord = 'balanced';
    let compWord = 'equal to';
    if (expectedCW > expectedACW) {
      actionWord = 'rotate clockwise ↻';
      compWord = 'greater than';
    } else if (expectedCW < expectedACW) {
      actionWord = 'rotate anticlockwise ↺';
      compWord = 'smaller than';
    }

    solExplain.innerText = `The clockwise moment of ${expectedCW} N m is ${compWord} the anticlockwise moment of ${expectedACW} N m. Therefore, the structure will be ${actionWord}.`;
    solutionBox.classList.remove('hidden');
  });

  // Randomise scenario logic
  btnRandomise.addEventListener('click', () => {
    initAudio();
    // Randomise values
    f1Range.value = Math.floor(Math.random() * 20) + 1;
    f2Range.value = Math.floor(Math.random() * 20) + 1;
    d1Range.value = (Math.floor(Math.random() * 10) + 1) / 10;
    d2Range.value = (Math.floor(Math.random() * 10) + 1) / 10;

    f1 = parseFloat(f1Range.value);
    f2 = parseFloat(f2Range.value);
    d1 = parseFloat(d1Range.value);
    d2 = parseFloat(d2Range.value);

    // Randomise pivot position in between forces
    pivotXOffset = Math.floor(Math.random() * 260) - 130; // offset between -130 and 130 px

    // Randomise design theme
    currentTheme = themes[Math.floor(Math.random() * themes.length)];
    themeBadge.innerText = currentTheme;

    // Reset forms & updates labels
    cwInput.value = '';
    acwInput.value = '';
    stateSelect.value = '';
    comparisonSelect.value = '';
    updateLabels();
    resetFeedback();

    // Spawn tiny decorative randomized spark on layout shift
    pe.spawn(canvas.width / 2 + pivotXOffset, canvas.height - 100, 20);
  });

  // Setup loop for physics and canvas draw
  const loop = () => {
    updatePhysics();
    drawScene();
    requestAnimationFrame(loop);
  };

  const updatePhysics = () => {
    const acwMoment = f1 * d1;
    const cwMoment = f2 * d2;
    
    // Net torque
    const netTorque = cwMoment - acwMoment;

    // Safe rotation angles
    let targetAngle = 0;
    const maxTilt = 18 * Math.PI / 180; // max tilt 18 degrees

    if (netTorque > 0.01) {
      targetAngle = maxTilt;
      stateBadge.className = 'state-badge cw';
      stateBadge.innerText = 'TILT CLOCKWISE';
    } else if (netTorque < -0.01) {
      targetAngle = -maxTilt;
      stateBadge.className = 'state-badge acw';
      stateBadge.innerText = 'TILT ANTICLOCKWISE';
    } else {
      targetAngle = 0;
      stateBadge.className = 'state-badge balanced';
      stateBadge.innerText = 'BALANCED';
    }

    // Dynamic see-saw simulation with smooth spring-damper reaction
    const springConstant = 0.08;
    const damping = 0.85;

    const angleDiff = targetAngle - angle;
    const springForce = angleDiff * springConstant;

    angularVelocity += springForce;
    angularVelocity *= damping;
    angle += angularVelocity;

    // Update floating celebration particles
    pe.update();
  };

  const drawScene = () => {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pivotX = canvas.width / 2 + pivotXOffset;
    const pivotY = canvas.height - 130;

    // Grid lines for dark techno look
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw pivot base ground level line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, canvas.height - 30);
    ctx.lineTo(canvas.width - 40, canvas.height - 30);
    ctx.stroke();

    // 1. Draw Pivot (placed below beam, stationary)
    ctx.save();
    if (currentTheme === 'Neon Cyberpunk') {
      // Glow laser hinge
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#10b981';
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(pivotX - 30, canvas.height - 30);
      ctx.lineTo(pivotX + 30, canvas.height - 30);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, 8, 0, Math.PI * 2);
      ctx.fill();
    } else if (currentTheme === 'Industrial Steel') {
      ctx.fillStyle = '#4b5563';
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(pivotX - 35, canvas.height - 30);
      ctx.lineTo(pivotX + 35, canvas.height - 30);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#9ca3af';
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (currentTheme === 'Classic Wood') {
      ctx.fillStyle = '#854d0e';
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(pivotX - 25, canvas.height - 30);
      ctx.lineTo(pivotX + 25, canvas.height - 30);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#a16207';
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (currentTheme === 'Carbon Fiber') {
      ctx.fillStyle = '#1f2937';
      ctx.strokeStyle = '#00f2fe';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(pivotX - 30, canvas.height - 30);
      ctx.lineTo(pivotX + 30, canvas.height - 30);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#374151';
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 2. Draw Beam structure (tilted by angle about pivot point)
    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.rotate(angle);

    const beamHalfLength = Math.max(d1, d2) * scaleMetersToPixels + 60;
    
    // Draw beam base shape based on current style
    ctx.save();
    if (currentTheme === 'Neon Cyberpunk') {
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00f2fe';
      ctx.strokeStyle = '#00f2fe';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-beamHalfLength, 0);
      ctx.lineTo(beamHalfLength, 0);
      ctx.stroke();

      ctx.fillStyle = 'rgba(0, 242, 254, 0.1)';
      ctx.fillRect(-beamHalfLength, -8, beamHalfLength * 2, 16);
    } else if (currentTheme === 'Industrial Steel') {
      ctx.fillStyle = '#6b7280';
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 4;
      ctx.fillRect(-beamHalfLength, -12, beamHalfLength * 2, 24);
      ctx.strokeRect(-beamHalfLength, -12, beamHalfLength * 2, 24);

      // Truss details
      ctx.strokeStyle = '#4b5563';
      ctx.lineWidth = 2;
      for (let offset = -beamHalfLength + 20; offset < beamHalfLength; offset += 40) {
        ctx.beginPath();
        ctx.moveTo(offset, -12);
        ctx.lineTo(offset + 20, 12);
        ctx.stroke();
      }
    } else if (currentTheme === 'Classic Wood') {
      ctx.fillStyle = '#b45309';
      ctx.fillRect(-beamHalfLength, -10, beamHalfLength * 2, 20);
      // Wood grain lines
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-beamHalfLength, -4, beamHalfLength * 2, 2);
      ctx.fillRect(-beamHalfLength + 40, 3, beamHalfLength - 20, 1);
    } else if (currentTheme === 'Carbon Fiber') {
      ctx.fillStyle = '#111827';
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 3;
      ctx.fillRect(-beamHalfLength, -8, beamHalfLength * 2, 16);
      ctx.strokeRect(-beamHalfLength, -8, beamHalfLength * 2, 16);

      // Tech cyan circles at ends
      ctx.fillStyle = '#00f2fe';
      ctx.beginPath();
      ctx.arc(-beamHalfLength, 0, 5, 0, Math.PI*2);
      ctx.arc(beamHalfLength, 0, 5, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();

    // 3. Draw Forces on the beam (left & right side)
    const leftForceX = -d1 * scaleMetersToPixels;
    const rightForceX = d2 * scaleMetersToPixels;

    // LEFT FORCE (F1)
    ctx.save();
    ctx.translate(leftForceX, 0);
    // Draw force application point dot
    ctx.fillStyle = varColor('--color-left');
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    // Draw Hanging Weight Box/Sphere proportional to F1 size
    const weightRadius = 12 + f1 * 1.2;
    ctx.save();
    ctx.rotate(-angle); // Keep hanging weight vertically aligned (gravity)
    
    // Draw rope linking beam to weight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 25);
    ctx.stroke();

    // Draw the Weight block
    ctx.fillStyle = 'rgba(0, 242, 254, 0.85)';
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00f2fe';
    ctx.fillRect(-weightRadius/2, 25, weightRadius, weightRadius);
    ctx.strokeRect(-weightRadius/2, 25, weightRadius, weightRadius);

    // Label on the weight
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0b0f19';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${f1}N`, 0, 25 + weightRadius/2 + 4);
    ctx.restore();

    // Draw downward vector arrow for Force (F1)
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 70);
    ctx.stroke();
    // Arrow tip
    ctx.fillStyle = '#00f2fe';
    ctx.beginPath();
    ctx.moveTo(-7, 60);
    ctx.lineTo(7, 60);
    ctx.lineTo(0, 73);
    ctx.closePath();
    ctx.fill();
    
    // Force Label text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px var(--font-display)';
    ctx.textAlign = 'right';
    ctx.fillText(`F₁ = ${f1} N`, -12, 55);
    ctx.restore();

    // RIGHT FORCE (F2)
    ctx.save();
    ctx.translate(rightForceX, 0);
    // Draw force application point dot
    ctx.fillStyle = varColor('--color-right');
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    // Draw Hanging Weight Box/Sphere proportional to F2 size
    const weightRadius2 = 12 + f2 * 1.2;
    ctx.save();
    ctx.rotate(-angle); // Keep hanging weight vertically aligned (gravity)
    
    // Draw rope linking beam to weight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 25);
    ctx.stroke();

    // Draw the Weight block
    ctx.fillStyle = 'rgba(255, 0, 127, 0.85)';
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ff007f';
    ctx.fillRect(-weightRadius2/2, 25, weightRadius2, weightRadius2);
    ctx.strokeRect(-weightRadius2/2, 25, weightRadius2, weightRadius2);

    // Label on the weight
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0b0f19';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${f2}N`, 0, 25 + weightRadius2/2 + 4);
    ctx.restore();

    // Draw downward vector arrow for Force (F2)
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 70);
    ctx.stroke();
    // Arrow tip
    ctx.fillStyle = '#ff007f';
    ctx.beginPath();
    ctx.moveTo(-7, 60);
    ctx.lineTo(7, 60);
    ctx.lineTo(0, 73);
    ctx.closePath();
    ctx.fill();

    // Force Label text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px var(--font-display)';
    ctx.textAlign = 'left';
    ctx.fillText(`F₂ = ${f2} N`, 12, 55);
    ctx.restore();

    // 4. Draw distance indicators along the beam
    // Left Distance Line (d1)
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(leftForceX, -22);
    ctx.lineTo(0, -22);
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash

    // Draw tiny arrows on distance lines
    ctx.fillStyle = '#00f2fe';
    ctx.beginPath();
    ctx.moveTo(leftForceX, -22);
    ctx.lineTo(leftForceX + 6, -26);
    ctx.lineTo(leftForceX + 6, -18);
    ctx.closePath();
    ctx.moveTo(0, -22);
    ctx.lineTo(-6, -26);
    ctx.lineTo(-6, -18);
    ctx.closePath();
    ctx.fill();

    // Distance 1 Label text
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 13px var(--font-body)';
    ctx.textAlign = 'center';
    ctx.fillText(`d₁ = ${d1.toFixed(1)} m`, leftForceX / 2, -32);

    // Right Distance Line (d2)
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(rightForceX, -22);
    ctx.stroke();
    ctx.setLineDash([]); // Reset

    // Draw arrows
    ctx.fillStyle = '#ff007f';
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(6, -26);
    ctx.lineTo(6, -18);
    ctx.closePath();
    ctx.moveTo(rightForceX, -22);
    ctx.lineTo(rightForceX - 6, -26);
    ctx.lineTo(rightForceX - 6, -18);
    ctx.closePath();
    ctx.fill();

    // Distance 2 Label text
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 13px var(--font-body)';
    ctx.textAlign = 'center';
    ctx.fillText(`d₂ = ${d2.toFixed(1)} m`, rightForceX / 2, -32);

    ctx.restore(); // Restore tilt/translate matrix

    // 5. Draw Celebration Particles on top of the world coordinates
    pe.draw(ctx);
  };

  // Helper helper to fetch CSS variable color value
  const varColor = (name) => {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  };

  // Run updates once to populate visuals
  updateLabels();

  // Start loop
  loop();
});
