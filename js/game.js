// js/game.js — Canvas 2D Game Engine

const Game = (() => {
  let canvas, ctx;
  let animId = null;
  let running = false;
  let paused = false;

  // Game state
  let state = {};

  // Config
  let cfg = {
    mode: 1,
    callsign: 'OPERATOR',
    onGameOver: null
  };

  const HEALTH_MAX = 100;

  function initState() {
    const now = Date.now();
    state = {
      score: 0,
      combo: 0,
      maxCombo: 0,
      health: HEALTH_MAX,
      words: [],        // falling word objects
      bullets: [],      // projectile objects
      particles: [],    // particle effects
      lockedWord: null, // currently targeted word
      lastSpawn: now + 2000, // 2 second grace period before first spawn
      spawnInterval: 3000,
      startTime: now + 2000, // elapsed timer also starts after grace
      elapsed: 0,
      totalKeystrokes: 0,
      correctKeystrokes: 0,
      wordsDestroyed: 0,
      wpm: 0,
      shakeTimer: 0,
      muzzleFlash: 0,
      turretAngle: -Math.PI / 2, // pointing up
      targetAngle: -Math.PI / 2,
      difficulty: 1,
      readyCountdown: 3, // 3-2-1 countdown display
    };
  }


  function getCanvasSize() {
    return { w: canvas.width, h: canvas.height };
  }

  function tankX() { return canvas.width / 2; }
  function tankY() { return canvas.height - 60; }

  // ── WORD OBJECTS ──────────────────────────────────────────────────────────
  let wordIdCounter = 0;
  function spawnWord() {
    const { w } = getCanvasSize();
    const mode = cfg.mode;
    const existingStartChars = state.words.map(wd => wd.text[0].toLowerCase());
    const text = getRandomWord(mode, existingStartChars);
    const isBonus = Math.random() < 0.12;

    if (isBonus) {
      const startChar = text[0].toLowerCase();
      // Add exclusion for other words with same start char while bonus is active
      state.words = state.words.filter(wd => wd.text[0].toLowerCase() !== startChar);
    }

    const minX = 60;
    const maxX = w - 60;
    const x = minX + Math.random() * (maxX - minX);
    const speed = (0.6 + Math.random() * 0.5) * state.difficulty * (isBonus ? 1.8 : 1);

    state.words.push({
      id: ++wordIdCounter,
      text,
      typed: 0,
      x,
      y: -20,
      speed,
      isBonus,
      active: true,
      opacity: 1,
      dying: false,
      dyingTimer: 0
    });

    if (isBonus) {
      AudioEngine.playRedBonusSpawn();
    }
  }

  // ── BULLETS ───────────────────────────────────────────────────────────────
  function spawnBullet(tx, ty) {
    const bx = tankX();
    const by = tankY() - 30;
    const dx = tx - bx;
    const dy = ty - by;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 18;
    state.bullets.push({
      x: bx, y: by,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      tx, ty,
      life: 1.0,
      hit: false
    });
  }

  // ── PARTICLES ─────────────────────────────────────────────────────────────
  function spawnParticles(x, y, color, count, spread = 4) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * spread;
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        decay: 0.03 + Math.random() * 0.04,
        color,
        size: 2 + Math.random() * 3
      });
    }
  }

  function spawnImpactSparks(x, y) {
    spawnParticles(x, y, '#00ff41', 6, 3);
    spawnParticles(x, y, '#ffffff', 3, 2);
  }

  function spawnExplosion(x, y, isBonus = false) {
    const col = isBonus ? '#ff2244' : '#ff8800';
    spawnParticles(x, y, col, 20, 6);
    spawnParticles(x, y, '#ffff00', 10, 4);
    spawnParticles(x, y, '#ffffff', 8, 3);
  }

  function spawnTankExplosion() {
    const bx = tankX(), by = tankY();
    for (let ring = 0; ring < 4; ring++) {
      setTimeout(() => {
        spawnParticles(bx + (Math.random()-0.5)*60, by + (Math.random()-0.5)*40,
          '#ff4400', 25, 8);
        spawnParticles(bx + (Math.random()-0.5)*40, by + (Math.random()-0.5)*30,
          '#ffaa00', 15, 6);
      }, ring * 180);
    }
  }

  // ── TURRET TARGETING ──────────────────────────────────────────────────────
  function updateTurretTarget() {
    const target = state.lockedWord;
    if (!target || !target.active) {
      state.targetAngle = -Math.PI / 2;
      return;
    }
    const dx = target.x - tankX();
    const dy = target.y - (tankY() - 30);
    state.targetAngle = Math.atan2(dy, dx);
  }

  function lerpAngle(a, b, t) {
    let diff = b - a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
  }

  // ── HANDLE KEYSTROKE ──────────────────────────────────────────────────────
  function handleKey(char) {
    if (!running || paused) return;
    state.totalKeystrokes++;

    // If locked onto a word, continue targeting it
    if (state.lockedWord && state.lockedWord.active) {
      const word = state.lockedWord;
      const expected = word.text[word.typed];
      if (char === expected) {
        state.correctKeystrokes++;
        word.typed++;
        AudioEngine.playLaserShot();
        state.muzzleFlash = 8;

        // Target the exact character position
        const charX = word.x;
        const charY = word.y;
        spawnBullet(charX, charY);

        if (word.typed >= word.text.length) {
          // Word destroyed!
          const baseScore = word.text.length * 10 * (word.isBonus ? 3.5 : 1);
          state.combo++;
          if (state.combo > state.maxCombo) state.maxCombo = state.combo;
          const comboMult = 1 + (state.combo - 1) * 0.1;
          state.score += Math.round(baseScore * comboMult);
          state.wordsDestroyed++;

          if (word.isBonus) {
            ExclusionManager.addExclusion(word.text[0], 3000);
          }

          word.dying = true;
          word.dyingTimer = 30;
          spawnExplosion(word.x, word.y, word.isBonus);
          AudioEngine.playWordDestroy();
          if (state.combo >= 3) AudioEngine.playCombo();

          state.lockedWord = null;
        }
      } else {
        // Wrong key — break combo
        state.combo = 0;
      }
      return;
    }

    // No lock — find target starting with char, lowest Y first
    const candidates = state.words.filter(
      w => w.active && !w.dying && w.text[0].toLowerCase() === char.toLowerCase()
    );

    if (candidates.length === 0) {
      state.combo = 0;
      return;
    }

    // Lock onto lowest (highest Y value) word
    candidates.sort((a, b) => b.y - a.y);
    const target = candidates[0];
    state.lockedWord = target;

    // Type first character
    const expected = target.text[0];
    if (char === expected || char.toLowerCase() === expected.toLowerCase()) {
      state.correctKeystrokes++;
      target.typed = 1;
      AudioEngine.playLaserShot();
      state.muzzleFlash = 8;
      spawnBullet(target.x, target.y);
      if (target.typed >= target.text.length) {
        destroyWord(target);
      }
    }
  }

  function destroyWord(word) {
    const baseScore = word.text.length * 10 * (word.isBonus ? 3.5 : 1);
    state.combo++;
    if (state.combo > state.maxCombo) state.maxCombo = state.combo;
    const comboMult = 1 + (state.combo - 1) * 0.1;
    state.score += Math.round(baseScore * comboMult);
    state.wordsDestroyed++;
    if (word.isBonus) ExclusionManager.addExclusion(word.text[0], 3000);
    word.dying = true;
    word.dyingTimer = 30;
    spawnExplosion(word.x, word.y, word.isBonus);
    AudioEngine.playWordDestroy();
    if (state.combo >= 3) AudioEngine.playCombo();
    state.lockedWord = null;
  }

  // ── UPDATE ────────────────────────────────────────────────────────────────
  function update(dt) {
    const now = Date.now();
    state.elapsed = Math.max(0, (now - state.startTime) / 1000);

    // Difficulty ramp
    state.difficulty = 1 + state.elapsed / 60 * 0.5 + state.wordsDestroyed / 20 * 0.3;
    state.spawnInterval = Math.max(1200, 3000 - state.difficulty * 400);


    // Spawn words
    if (now - state.lastSpawn > state.spawnInterval && state.words.filter(w => w.active).length < 8) {
      spawnWord();
      state.lastSpawn = now;
    }

    // Update word positions
    const { h } = getCanvasSize();
    const groundY = h - 80;

    for (let i = state.words.length - 1; i >= 0; i--) {
      const word = state.words[i];
      if (word.dying) {
        word.dyingTimer--;
        word.opacity = word.dyingTimer / 30;
        if (word.dyingTimer <= 0) {
          state.words.splice(i, 1);
          if (state.lockedWord === word) state.lockedWord = null;
        }
        continue;
      }
      if (!word.active) continue;
      word.y += word.speed * dt * 60;

      // Breach perimeter
      if (word.y >= groundY) {
        word.active = false;
        word.dying = true;
        word.dyingTimer = 20;
        const dmg = word.isBonus ? 30 : 20;
        state.health = Math.max(0, state.health - dmg);
        state.combo = 0;
        state.shakeTimer = 20;
        AudioEngine.playDamage();
        spawnExplosion(word.x, groundY, false);
        if (state.lockedWord === word) state.lockedWord = null;

        if (state.health <= 0) {
          state.health = 0;
          endGame();
          return;
        }
      }
    }

    // Update bullets
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const b = state.bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      b.life -= 0.04;

      // Check if reached target area
      const dx = b.x - b.tx;
      const dy = b.y - b.ty;
      if (Math.sqrt(dx * dx + dy * dy) < 15 || b.life <= 0) {
        if (!b.hit) {
          b.hit = true;
          spawnImpactSparks(b.x, b.y);
        }
        state.bullets.splice(i, 1);
      }
    }

    // Update particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life -= p.decay;
      if (p.life <= 0) state.particles.splice(i, 1);
    }

    // Update turret angle
    updateTurretTarget();
    state.turretAngle = lerpAngle(state.turretAngle, state.targetAngle, 0.12);

    // Muzzle flash
    if (state.muzzleFlash > 0) state.muzzleFlash--;
    if (state.shakeTimer > 0) state.shakeTimer--;

    // WPM (chars typed / 5 / minutes elapsed)
    const mins = Math.max(state.elapsed / 60, 0.01);
    state.wpm = Math.round((state.correctKeystrokes / 5) / mins);
  }

  function endGame() {
    running = false;
    spawnTankExplosion();
    AudioEngine.playGameOver();
    setTimeout(() => {
      if (cfg.onGameOver) {
        const accuracy = state.totalKeystrokes > 0
          ? Math.round((state.correctKeystrokes / state.totalKeystrokes) * 100) : 0;
        cfg.onGameOver({
          score: state.score,
          wpm: state.wpm,
          accuracy,
          words: state.wordsDestroyed,
          combo: state.maxCombo,
          mode: cfg.mode,
          elapsed: Math.round(state.elapsed)
        });
      }
    }, 1500);
  }

  // ── DRAW ──────────────────────────────────────────────────────────────────
  function drawBackground() {
    const { w, h } = getCanvasSize();
    ctx.fillStyle = '#020402';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(0,80,0,0.15)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Horizon glow
    const grad = ctx.createLinearGradient(0, h - 120, 0, h);
    grad.addColorStop(0, 'rgba(0,255,65,0)');
    grad.addColorStop(1, 'rgba(0,255,65,0.06)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, h - 120, w, 120);
  }

  function drawGroundLine() {
    const { w, h } = getCanvasSize();
    const groundY = h - 80;
    ctx.strokeStyle = '#00ff41';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00ff41';
    ctx.shadowBlur = 8;
    ctx.setLineDash([10, 6]);
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(w, groundY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    // PERIMETER label
    ctx.fillStyle = 'rgba(0,255,65,0.5)';
    ctx.font = '9px "Share Tech Mono", monospace';
    ctx.fillText('◄ DEFENSE PERIMETER ►', w / 2 - 80, groundY - 6);
  }

  function drawTank() {
    const bx = tankX(), by = tankY();
    ctx.save();

    // Screen shake
    if (state.shakeTimer > 0) {
      const shake = state.shakeTimer * 0.5;
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }

    // Tank tread base
    ctx.fillStyle = '#1a3a1a';
    ctx.strokeStyle = '#00ff41';
    ctx.lineWidth = 1.5;
    roundRect(ctx, bx - 45, by - 15, 90, 22, 4);
    ctx.fill();
    ctx.stroke();

    // Tread segments
    ctx.strokeStyle = 'rgba(0,200,50,0.4)';
    ctx.lineWidth = 1;
    for (let i = -40; i < 40; i += 10) {
      ctx.beginPath();
      ctx.moveTo(bx + i, by - 14);
      ctx.lineTo(bx + i, by + 6);
      ctx.stroke();
    }

    // Armor plates on hull
    ctx.fillStyle = '#0a2a0a';
    ctx.strokeStyle = '#00cc33';
    ctx.lineWidth = 1;
    roundRect(ctx, bx - 36, by - 22, 72, 12, 2);
    ctx.fill(); ctx.stroke();

    // Dome body
    ctx.fillStyle = '#0d2e0d';
    ctx.strokeStyle = '#00ff41';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bx, by - 22, 28, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Dome highlight
    const domeGrad = ctx.createRadialGradient(bx - 8, by - 32, 2, bx, by - 22, 28);
    domeGrad.addColorStop(0, 'rgba(0,255,65,0.15)');
    domeGrad.addColorStop(1, 'rgba(0,255,65,0)');
    ctx.fillStyle = domeGrad;
    ctx.beginPath();
    ctx.arc(bx, by - 22, 28, Math.PI, 0);
    ctx.closePath();
    ctx.fill();

    // Cannon barrel
    const angle = state.turretAngle;
    const barrelLen = 38;
    const barrelW = 6;
    ctx.save();
    ctx.translate(bx, by - 22);
    ctx.rotate(angle);
    ctx.fillStyle = '#1a4a1a';
    ctx.strokeStyle = '#00ff41';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-barrelW / 2, -barrelLen, barrelW, barrelLen);
    ctx.strokeRect(-barrelW / 2, -barrelLen, barrelW, barrelLen);

    // Barrel rings
    ctx.strokeStyle = 'rgba(0,255,65,0.5)';
    ctx.lineWidth = 1;
    [0.3, 0.6, 0.85].forEach(frac => {
      const ry = -barrelLen * frac;
      ctx.beginPath();
      ctx.moveTo(-barrelW / 2 - 2, ry);
      ctx.lineTo(barrelW / 2 + 2, ry);
      ctx.stroke();
    });

    // Muzzle flash
    if (state.muzzleFlash > 0) {
      const flash = state.muzzleFlash / 8;
      ctx.shadowColor = '#ffff00';
      ctx.shadowBlur = 20 * flash;
      ctx.fillStyle = `rgba(255,255,100,${flash})`;
      ctx.beginPath();
      ctx.arc(0, -barrelLen, 8 * flash, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Recoil effect
    if (state.muzzleFlash > 4) {
      ctx.strokeStyle = 'rgba(0,255,65,0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -barrelLen);
      ctx.lineTo(0, -barrelLen - 10);
      ctx.stroke();
    }

    ctx.restore();

    // Crosshair reticle on dome
    ctx.strokeStyle = 'rgba(0,255,65,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(bx, by - 22, 5, 0, Math.PI * 2);
    ctx.stroke();

    // Health indicator glow
    const healthPct = state.health / HEALTH_MAX;
    const hColor = healthPct > 0.5 ? '#00ff41' : healthPct > 0.25 ? '#ffaa00' : '#ff2244';
    ctx.shadowColor = hColor;
    ctx.shadowBlur = 6 * (1 - healthPct + 0.2);
    ctx.strokeStyle = hColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bx, by - 22, 30, Math.PI, Math.PI + Math.PI * healthPct);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  function drawWords() {
    state.words.forEach(word => {
      if (!word.active && !word.dying) return;

      const opacity = word.dying ? word.opacity : 1;
      const isLocked = state.lockedWord && state.lockedWord.id === word.id;
      const isBonus = word.isBonus;

      ctx.save();
      ctx.globalAlpha = opacity;

      const fontSize = isBonus ? 14 : 13;
      ctx.font = `${fontSize}px "Share Tech Mono", monospace`;

      // Measure full word width for centering
      let totalWidth = 0;
      for (let i = 0; i < word.text.length; i++) {
        totalWidth += ctx.measureText(word.text[i]).width;
      }

      let cx = word.x - totalWidth / 2;
      const cy = word.y;

      // Background box
      const pad = 5;
      const boxColor = isBonus ? 'rgba(80,0,20,0.85)' : 'rgba(0,20,0,0.85)';
      ctx.fillStyle = boxColor;
      ctx.fillRect(cx - pad, cy - fontSize - 2, totalWidth + pad * 2, fontSize + 8);

      // Border
      ctx.strokeStyle = isBonus ? '#ff2244' : (isLocked ? '#00ff41' : 'rgba(0,180,50,0.5)');
      ctx.lineWidth = isLocked ? 1.5 : 1;
      if (isBonus) {
        ctx.shadowColor = '#ff2244';
        ctx.shadowBlur = 10;
      } else if (isLocked) {
        ctx.shadowColor = '#00ff41';
        ctx.shadowBlur = 6;
      }
      ctx.strokeRect(cx - pad, cy - fontSize - 2, totalWidth + pad * 2, fontSize + 8);
      ctx.shadowBlur = 0;

      // Render each character
      for (let i = 0; i < word.text.length; i++) {
        const ch = word.text[i];
        const chWidth = ctx.measureText(ch).width;

        if (i < word.typed) {
          // Already typed: faded
          ctx.fillStyle = isBonus ? 'rgba(255,50,50,0.38)' : 'rgba(0,255,65,0.38)';
        } else if (i === word.typed && isLocked) {
          // Current target char: bright with glow
          ctx.shadowColor = isBonus ? '#ff8888' : '#00ff41';
          ctx.shadowBlur = 8;
          ctx.fillStyle = isBonus ? '#ff8888' : '#ffffff';

          // Cursor underline
          ctx.fillStyle = isBonus ? '#ff2244' : '#00ff41';
          ctx.fillRect(cx, cy + 2, chWidth, 2);
          ctx.fillStyle = isBonus ? '#ff8888' : '#ffffff';
        } else {
          // Untyped
          ctx.fillStyle = isBonus ? '#ff4455' : '#00ff41';
          ctx.shadowBlur = 0;
        }

        ctx.fillText(ch, cx, cy);
        ctx.shadowBlur = 0;
        cx += chWidth;
      }

      // Bonus star indicator
      if (isBonus) {
        ctx.fillStyle = '#ff2244';
        ctx.font = '10px "Share Tech Mono", monospace';
        ctx.fillText('★ BONUS', word.x - totalWidth / 2 - pad, cy - fontSize - 8);
      }

      ctx.restore();
    });
  }

  function drawBullets() {
    state.bullets.forEach(b => {
      ctx.save();
      ctx.globalAlpha = b.life;
      ctx.fillStyle = '#00ff41';
      ctx.shadowColor = '#00ff41';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();

      // Tracer line
      ctx.strokeStyle = 'rgba(0,255,65,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.vx * 3, b.y - b.vy * 3);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    });
  }

  function drawParticles() {
    state.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    });
  }

  function drawHUD() {
    const { w } = getCanvasSize();
    const healthPct = state.health / HEALTH_MAX;
    const hColor = healthPct > 0.5 ? '#00ff41' : healthPct > 0.25 ? '#ffaa00' : '#ff2244';
    const accuracy = state.totalKeystrokes > 0
      ? Math.round((state.correctKeystrokes / state.totalKeystrokes) * 100) : 100;

    ctx.save();
    ctx.fillStyle = 'rgba(0,10,0,0.9)';
    ctx.fillRect(0, 0, w, 38);
    ctx.strokeStyle = 'rgba(0,255,65,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, w, 38);

    ctx.font = '10px "Share Tech Mono", monospace';
    ctx.fillStyle = '#00ff41';

    // Score
    const scoreStr = String(state.score).padStart(6, '0');
    ctx.fillText(`SCORE:${scoreStr}`, 10, 25);

    // WPM
    ctx.fillText(`WPM:${state.wpm}`, 130, 25);

    // Accuracy
    ctx.fillText(`ACC:${accuracy}%`, 200, 25);

    // Combo
    if (state.combo > 1) {
      ctx.fillStyle = '#ffaa00';
      ctx.shadowColor = '#ffaa00';
      ctx.shadowBlur = 6;
      ctx.fillText(`x${state.combo}COMBO`, 285, 25);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#00ff41';
    } else {
      ctx.fillText(`COMBO:x${state.combo}`, 285, 25);
    }

    // Words destroyed
    ctx.fillText(`KILLS:${state.wordsDestroyed}`, 390, 25);

    // Health bar
    const barX = w - 180;
    const barW = 140;
    const barH = 12;
    const barY = 13;
    ctx.fillStyle = 'rgba(0,40,0,0.8)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = hColor;
    ctx.shadowColor = hColor;
    ctx.shadowBlur = 4;
    ctx.fillRect(barX, barY, barW * healthPct, barH);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#00ff41';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.fillStyle = '#ffffff';
    ctx.font = '8px "Share Tech Mono", monospace';
    ctx.fillText(`HULL:${state.health}%`, barX + barW + 4, barY + 9);

    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ── MAIN LOOP ─────────────────────────────────────────────────────────────
  let lastTime = 0;
  function loop(timestamp) {
    if (!running) return;
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;
    update(dt);
    draw();
    animId = requestAnimationFrame(loop);
  }

  function drawCountdown() {
    const now = Date.now();
    const graceEnd = state.startTime;
    const remaining = graceEnd - now;
    if (remaining <= 0) return;

    const { w, h } = getCanvasSize();
    const secs = Math.ceil(remaining / 1000);

    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;

    const label = secs <= 0 ? 'ENGAGE!' : String(secs);
    const pulse = 0.8 + 0.2 * Math.sin(now / 200);
    const fontSize = Math.floor(64 * pulse);
    ctx.font = `${fontSize}px "Press Start 2P", monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = secs <= 1 ? '#ff2244' : '#00ff41';
    ctx.shadowColor = secs <= 1 ? '#ff2244' : '#00ff41';
    ctx.shadowBlur = 30;
    ctx.fillText(label, w / 2, h / 2);
    ctx.shadowBlur = 0;

    ctx.font = '14px "Share Tech Mono", monospace';
    ctx.fillStyle = 'rgba(0,255,65,0.6)';
    ctx.fillText('HOSTILES INCOMING — PREPARE TURRET', w / 2, h / 2 + 50);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  function clamp(val, min, max) { return Math.min(max, Math.max(min, val)); }

  function draw() {
    drawBackground();
    drawGroundLine();
    drawParticles();
    drawBullets();
    drawWords();
    drawTank();
    drawHUD();
    drawCountdown();
  }


  // ── PUBLIC API ────────────────────────────────────────────────────────────
  function init(canvasEl, options = {}) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    cfg = { ...cfg, ...options };
  }

  function start() {
    if (animId) cancelAnimationFrame(animId);
    running = true;
    paused = false;
    initState();
    ExclusionManager.clear();
    lastTime = performance.now();
    animId = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (animId) { cancelAnimationFrame(animId); animId = null; }
  }

  function getStats() {
    const accuracy = state.totalKeystrokes > 0
      ? Math.round((state.correctKeystrokes / state.totalKeystrokes) * 100) : 100;
    return {
      score: state.score,
      wpm: state.wpm,
      accuracy,
      words: state.wordsDestroyed,
      combo: state.maxCombo,
      mode: cfg.mode,
      elapsed: Math.round(state.elapsed)
    };
  }

  return { init, start, stop, handleKey, getStats };
})();
