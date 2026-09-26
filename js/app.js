// js/app.js — State machine, screen transitions, keyboard routing

const App = (() => {
  // ── STATE ─────────────────────────────────────────────────────────────────
  let currentScreen = null;
  let selectedMode = 1;
  let callsign = '';
  let aspect = 'auto';
  let crtOn = true;
  let lastResult = null;
  let confettiParticles = [];
  let confettiAnim = null;

  // ── INIT ──────────────────────────────────────────────────────────────────
  function init() {
    AudioEngine.init();
    loadPrefs();
    applyAspect();
    applyCRT();
    bindHeader();
    bindResize();

    // Determine start screen
    callsign = Storage.getCallsign();
    if (callsign && callsign.trim()) {
      showScreen('settings');
    } else {
      showScreen('login');
    }
  }

  function loadPrefs() {
    selectedMode = Storage.getMode();
    aspect = Storage.getAspect();
    crtOn = Storage.getCRT();
    const muted = Storage.getMuted();
    AudioEngine.setMuted(muted);
    updateMuteBtn(muted);
    updateCRTBtn(crtOn);
    updateAspectBtn(aspect);
  }

  // ── HEADER BINDINGS ───────────────────────────────────────────────────────
  function bindHeader() {
    const btnCRT = document.getElementById('btn-crt');
    const btnMute = document.getElementById('btn-mute');
    const btnAspect = document.getElementById('btn-aspect');
    const btnCallsign = document.getElementById('btn-callsign');

    if (btnCRT) btnCRT.addEventListener('click', () => {
      AudioEngine.playUIClick();
      crtOn = !crtOn;
      Storage.setCRT(crtOn);
      applyCRT();
      updateCRTBtn(crtOn);
    });

    if (btnMute) btnMute.addEventListener('click', () => {
      const muted = !AudioEngine.isMuted();
      AudioEngine.setMuted(muted);
      Storage.setMuted(muted);
      updateMuteBtn(muted);
      AudioEngine.playUIClick();
    });

    if (btnAspect) btnAspect.addEventListener('click', () => {
      AudioEngine.playUIClick();
      const modes = ['auto', '16:9', '4:3'];
      const idx = modes.indexOf(aspect);
      aspect = modes[(idx + 1) % modes.length];
      Storage.setAspect(aspect);
      applyAspect();
      updateAspectBtn(aspect);
    });

    if (btnCallsign) btnCallsign.addEventListener('click', () => {
      AudioEngine.playUIClick();
      showScreen('login');
    });
  }

  function updateMuteBtn(muted) {
    const btn = document.getElementById('btn-mute');
    if (btn) btn.textContent = muted ? '[AUDIO:OFF]' : '[AUDIO:ON]';
  }

  function updateCRTBtn(on) {
    const btn = document.getElementById('btn-crt');
    if (btn) btn.textContent = on ? '[CRT:ON]' : '[CRT:OFF]';
  }

  function updateAspectBtn(a) {
    const btn = document.getElementById('btn-aspect');
    if (btn) {
      const labels = { 'auto': '[AUTO]', '16:9': '[16:9]', '4:3': '[4:3]' };
      btn.textContent = labels[a] || '[AUTO]';
    }
  }

  // ── ASPECT RATIO ──────────────────────────────────────────────────────────
  function applyAspect() {
    const root = document.getElementById('app-root');
    if (!root) return;
    root.className = root.className.replace(/aspect-\S+/g, '').trim();
    if (aspect === '16:9') root.classList.add('aspect-16-9');
    else if (aspect === '4:3') root.classList.add('aspect-4-3');
    else root.classList.add('aspect-auto');
    resizeCanvas();
  }

  function bindResize() {
    window.addEventListener('resize', () => { applyAspect(); });
  }

  function resizeCanvas() {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    // Use the screens area container for sizing
    const screensEl = document.getElementById('screens');
    const rect = screensEl ? screensEl.getBoundingClientRect() : null;
    if (rect && rect.width > 0 && rect.height > 0) {
      canvas.width = Math.floor(rect.width);
      canvas.height = Math.floor(rect.height);
    } else {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight - 60;
    }
  }

  // ── CRT ───────────────────────────────────────────────────────────────────
  function applyCRT() {
    const overlay = document.getElementById('crt-overlay');
    if (overlay) overlay.style.display = crtOn ? 'block' : 'none';
    const scanlines = document.getElementById('scanlines');
    if (scanlines) scanlines.style.display = crtOn ? 'block' : 'none';
  }

  // ── SCREENS ───────────────────────────────────────────────────────────────
  function showScreen(name) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`screen-${name}`);
    if (target) {
      target.classList.add('active');
      currentScreen = name;
    }

    // Update header callsign display
    const hdrCallsign = document.getElementById('hdr-callsign');
    if (hdrCallsign) hdrCallsign.textContent = `OPR:${callsign || '???'}`;

    if (name === 'login') setupLogin();
    else if (name === 'settings') setupSettings();
    else if (name === 'instructions') setupInstructions();
    else if (name === 'game') setupGame();
    else if (name === 'result') setupResult();
    else if (name === 'records') setupRecords();
  }

  // ── LOGIN ─────────────────────────────────────────────────────────────────
  function setupLogin() {
    const input = document.getElementById('callsign-input');
    const btn = document.getElementById('callsign-submit');
    const err = document.getElementById('callsign-error');
    if (input) {
      input.value = callsign || '';
      input.focus();
    }
    if (err) err.textContent = '';

    function submit() {
      const val = input ? input.value.trim().toUpperCase() : '';
      if (!val || val.length < 2) {
        if (err) err.textContent = '[ ERROR: CALLSIGN MUST BE 2+ CHARACTERS ]';
        return;
      }
      if (val.length > 16) {
        if (err) err.textContent = '[ ERROR: CALLSIGN MAX 16 CHARACTERS ]';
        return;
      }
      callsign = val;
      Storage.setCallsign(callsign);
      AudioEngine.playUIClick();
      showScreen('settings');
    }

    if (btn) btn.onclick = submit;
    if (input) input.onkeydown = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
    };
  }

  // ── SETTINGS ─────────────────────────────────────────────────────────────
  function setupSettings() {
    renderModeCards();
    renderCharMatrix();
    renderAspectButtons();
    renderSampleBar();
    bindSettingsNav();
    updateAspectBtns();
  }

  function renderModeCards() {
    const grid = document.getElementById('mode-cards');
    if (!grid) return;
    const modes = [
      { id: 1, name: 'ALPHA', label: 'MODE 1 [ALPHA]', desc: 'Lowercase only', sample: 'tank · radar · infantry' },
      { id: 2, name: 'BRAVO', label: 'MODE 2 [BRAVO]', desc: 'Lower + Upper', sample: 'Tank · RadarX · DeltaForce' },
      { id: 3, name: 'CHARLIE', label: 'MODE 3 [CHARLIE]', desc: 'Lower + Upper + Numbers', sample: 'Squad5 · Tank99 · v2.0' },
      { id: 4, name: 'DELTA', label: 'MODE 4 [DELTA]', desc: 'Lower + Upper + Nums + Specials', sample: '[tank-01] · (8+9) · !alert!' }
    ];

    grid.innerHTML = modes.map(m => `
      <div class="mode-card ${selectedMode === m.id ? 'active' : ''}" data-mode="${m.id}" id="mcard-${m.id}" tabindex="0" role="button">
        <div class="mode-card-header">${m.label}</div>
        <div class="mode-card-desc">${m.desc}</div>
        <div class="mode-card-sample">${m.sample}</div>
        <div class="mode-card-indicator">${selectedMode === m.id ? '◄ SELECTED ►' : '[ SELECT ]'}</div>
      </div>
    `).join('');

    grid.querySelectorAll('.mode-card').forEach(card => {
      card.addEventListener('click', () => {
        AudioEngine.playUIClick();
        selectedMode = parseInt(card.dataset.mode);
        Storage.setMode(selectedMode);
        renderModeCards();
        renderCharMatrix();
        renderSampleBar();
      });
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
      });
    });
  }

  function renderCharMatrix() {
    const matrix = document.getElementById('char-matrix');
    if (!matrix) return;
    const checks = [
      { id: 'chk-upper', label: 'UPPERCASE', enabled: selectedMode >= 2 },
      { id: 'chk-nums', label: 'NUMBERS', enabled: selectedMode >= 3 },
      { id: 'chk-special', label: 'SPECIALS', enabled: selectedMode >= 4 }
    ];
    matrix.innerHTML = checks.map(c => `
      <label class="matrix-toggle ${c.enabled ? 'on' : 'off'}">
        <input type="checkbox" ${c.enabled ? 'checked' : ''} data-toggle="${c.id}" />
        <span class="toggle-box">${c.enabled ? '■' : '□'}</span>
        <span>${c.label}</span>
      </label>
    `).join('');

    matrix.querySelectorAll('input[type=checkbox]').forEach(chk => {
      chk.addEventListener('change', () => {
        AudioEngine.playUIClick();
        const upper = matrix.querySelector('[data-toggle=chk-upper]').checked;
        const nums = matrix.querySelector('[data-toggle=chk-nums]').checked;
        const special = matrix.querySelector('[data-toggle=chk-special]').checked;
        if (special) selectedMode = 4;
        else if (nums) selectedMode = 3;
        else if (upper) selectedMode = 2;
        else selectedMode = 1;
        Storage.setMode(selectedMode);
        renderModeCards();
        renderCharMatrix();
        renderSampleBar();
      });
    });
  }

  function renderSampleBar() {
    const bar = document.getElementById('sample-bar');
    if (!bar) return;
    const words = getSampleWords(selectedMode);
    bar.innerHTML = words.map(w => `<span class="sample-word">${w}</span>`).join('');
  }

  function renderAspectButtons() {
    const container = document.getElementById('aspect-btns');
    if (!container) return;
    const opts = [
      { val: 'auto', label: 'AUTO [SCREEN FIT]' },
      { val: '16:9', label: '16:9 [WIDESCREEN]' },
      { val: '4:3', label: '4:3 [CLASSIC CRT]' }
    ];
    container.innerHTML = opts.map(o => `
      <button class="aspect-btn ${aspect === o.val ? 'active' : ''}" data-aspect="${o.val}">${o.label}</button>
    `).join('');

    container.querySelectorAll('.aspect-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        AudioEngine.playUIClick();
        aspect = btn.dataset.aspect;
        Storage.setAspect(aspect);
        applyAspect();
        updateAspectBtn(aspect);
        renderAspectButtons();
      });
    });
  }

  function updateAspectBtns() {
    document.querySelectorAll('.aspect-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.aspect === aspect);
    });
  }

  function bindSettingsNav() {
    const btn = document.getElementById('settings-proceed');
    if (btn) btn.onclick = () => {
      AudioEngine.playUIClick();
      showScreen('instructions');
    };
  }

  // ── INSTRUCTIONS ──────────────────────────────────────────────────────────
  function setupInstructions() {
    const btn = document.getElementById('instructions-proceed');
    if (btn) btn.onclick = () => {
      AudioEngine.playUIClick();
      showScreen('game');
    };
    document.getElementById('instr-mode-display').textContent =
      `MODE ${selectedMode} [${['ALPHA','BRAVO','CHARLIE','DELTA'][selectedMode-1]}]`;
  }

  // ── GAME ──────────────────────────────────────────────────────────────────
  function setupGame() {
    setTimeout(() => {
      resizeCanvas();
      const canvas = document.getElementById('game-canvas');
      Game.init(canvas, {
        mode: selectedMode,
        callsign,
        onGameOver: handleGameOver
      });
      Game.start();
    }, 100);
  }

  function handleGameOver(result) {
    lastResult = result;
    const isNewRecord = Storage.saveRecord(result.mode, result);
    result.isNewRecord = isNewRecord;
    Storage.addHistory(result);
    showScreen('result');
    if (isNewRecord) {
      AudioEngine.playVictoryFanfare();
      startConfetti();
    }
  }

  // ── RESULT ────────────────────────────────────────────────────────────────
  function setupResult() {
    if (!lastResult) return;
    const r = lastResult;
    const modeName = ['ALPHA','BRAVO','CHARLIE','DELTA'][r.mode - 1];
    const prevRecord = Storage.getRecord(r.mode);

    document.getElementById('res-score').textContent = String(r.score).padStart(6,'0');
    document.getElementById('res-wpm').textContent = r.wpm;
    document.getElementById('res-acc').textContent = r.accuracy + '%';
    document.getElementById('res-words').textContent = r.words;
    document.getElementById('res-combo').textContent = 'x' + r.combo;
    document.getElementById('res-mode').textContent = `MODE ${r.mode} [${modeName}]`;

    const banner = document.getElementById('record-banner');
    const delta = document.getElementById('record-delta');

    if (r.isNewRecord) {
      if (banner) { banner.style.display = 'block'; banner.classList.add('flash'); }
      if (delta) delta.style.display = 'none';
    } else {
      if (banner) banner.style.display = 'none';
      if (delta && prevRecord) {
        const scoreDiff = prevRecord.score - r.score;
        const wpmDiff = prevRecord.wpm - r.wpm;
        delta.textContent = `PERSONAL BEST: ${String(prevRecord.score).padStart(6,'0')} | NEED +${scoreDiff} PTS, +${wpmDiff} WPM TO SURPASS`;
        delta.style.display = 'block';
      }
    }

    const playBtn = document.getElementById('res-play-again');
    const recBtn = document.getElementById('res-records');
    if (playBtn) playBtn.onclick = () => { AudioEngine.playUIClick(); stopConfetti(); showScreen('game'); };
    if (recBtn) recBtn.onclick = () => { AudioEngine.playUIClick(); stopConfetti(); showScreen('records'); };
  }

  // ── RECORDS ───────────────────────────────────────────────────────────────
  function setupRecords() {
    renderLifetimeStats();
    renderModeBests();
    renderHistoryTable('all');
    bindRecordsNav();
  }

  function renderLifetimeStats() {
    const stats = Storage.getLifetimeStats();
    const el = document.getElementById('lifetime-stats');
    if (!el) return;
    el.innerHTML = `
      <div class="stat-cell"><div class="stat-label">BEST SCORE</div><div class="stat-value">${String(stats.bestScore).padStart(6,'0')}</div></div>
      <div class="stat-cell"><div class="stat-label">MAX WPM</div><div class="stat-value">${stats.bestWpm}</div></div>
      <div class="stat-cell"><div class="stat-label">PEAK ACC</div><div class="stat-value">${stats.bestAcc}%</div></div>
      <div class="stat-cell"><div class="stat-label">WORDS DESTROYED</div><div class="stat-value">${stats.totalWords}</div></div>
    `;
  }

  function renderModeBests() {
    const container = document.getElementById('mode-bests');
    if (!container) return;
    const records = Storage.getRecords();
    const modeNames = ['ALPHA','BRAVO','CHARLIE','DELTA'];
    container.innerHTML = [1,2,3,4].map(m => {
      const rec = records[m];
      return `
        <div class="mode-best-card">
          <div class="mb-label">MODE ${m} [${modeNames[m-1]}]</div>
          <div class="mb-score">${rec ? String(rec.score).padStart(6,'0') : '------'}</div>
          <div class="mb-wpm">${rec ? rec.wpm + ' WPM' : '-- WPM'}</div>
          <div class="mb-acc">${rec ? rec.accuracy + '% ACC' : '--% ACC'}</div>
        </div>
      `;
    }).join('');
  }

  function renderHistoryTable(filterMode) {
    const tbody = document.getElementById('history-tbody');
    if (!tbody) return;
    let history = Storage.getHistory();
    const records = Storage.getRecords();

    if (filterMode !== 'all') {
      const modeNum = parseInt(filterMode);
      history = history.filter(h => h.mode === modeNum);
    }

    if (history.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="no-data">[ NO FLIGHT LOGS FOR THIS FILTER ]</td></tr>';
      return;
    }

    tbody.innerHTML = history.map(h => {
      const modeRec = records[h.mode];
      const isPB = modeRec && h.score === modeRec.score && h.timestamp === modeRec.timestamp;
      const date = new Date(h.timestamp);
      const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
      const modeNames = ['','ALPHA','BRAVO','CHARLIE','DELTA'];
      return `
        <tr class="${isPB ? 'pb-row' : ''}">
          <td>${dateStr}</td>
          <td><span class="mode-badge mode-${h.mode}">M${h.mode}</span></td>
          <td>${String(h.score).padStart(6,'0')} ${isPB ? '<span class="pb-star">★ PB</span>' : ''}</td>
          <td>${h.wpm}</td>
          <td>${h.accuracy}%</td>
          <td>x${h.combo}</td>
          <td>${h.words}</td>
        </tr>
      `;
    }).join('');
  }

  function bindRecordsNav() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
      btn.onclick = () => {
        AudioEngine.playUIClick();
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderHistoryTable(btn.dataset.filter);
      };
    });

    const purgeBtn = document.getElementById('purge-btn');
    const purgeConfirm = document.getElementById('purge-confirm');
    const purgeYes = document.getElementById('purge-yes');
    const purgeNo = document.getElementById('purge-no');

    if (purgeBtn) purgeBtn.onclick = () => {
      AudioEngine.playUIClick();
      if (purgeConfirm) purgeConfirm.style.display = 'flex';
    };
    if (purgeYes) purgeYes.onclick = () => {
      AudioEngine.playUIClick();
      Storage.purgeHistory();
      if (purgeConfirm) purgeConfirm.style.display = 'none';
      renderLifetimeStats();
      renderModeBests();
      renderHistoryTable('all');
    };
    if (purgeNo) purgeNo.onclick = () => {
      AudioEngine.playUIClick();
      if (purgeConfirm) purgeConfirm.style.display = 'none';
    };

    const backBtn = document.getElementById('records-back');
    if (backBtn) backBtn.onclick = () => {
      AudioEngine.playUIClick();
      if (lastResult) showScreen('result');
      else showScreen('settings');
    };
  }

  // ── CONFETTI ──────────────────────────────────────────────────────────────
  function startConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    canvas.style.display = 'block';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const cctx = canvas.getContext('2d');
    confettiParticles = [];
    const colors = ['#00ff41','#ff2244','#ffaa00','#00ccff','#ff00ff','#ffffff'];
    for (let i = 0; i < 120; i++) {
      confettiParticles.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 4,
        vy: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 6,
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.2,
        life: 1.0
      });
    }

    function animateConfetti() {
      cctx.clearRect(0, 0, canvas.width, canvas.height);
      confettiParticles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        p.rot += p.rotV;
        if (p.y > canvas.height) { p.y = -20; p.x = Math.random() * canvas.width; }
        cctx.save();
        cctx.translate(p.x, p.y);
        cctx.rotate(p.rot);
        cctx.globalAlpha = 0.9;
        cctx.fillStyle = p.color;
        cctx.shadowColor = p.color;
        cctx.shadowBlur = 4;
        cctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        cctx.restore();
      });
      confettiAnim = requestAnimationFrame(animateConfetti);
    }
    animateConfetti();
  }

  function stopConfetti() {
    if (confettiAnim) { cancelAnimationFrame(confettiAnim); confettiAnim = null; }
    const canvas = document.getElementById('confetti-canvas');
    if (canvas) canvas.style.display = 'none';
  }

  // ── GLOBAL KEYBOARD ───────────────────────────────────────────────────────
  function bindGlobalKeys() {
    document.addEventListener('keydown', (e) => {
      AudioEngine.resume();

      if (currentScreen === 'game') {
        if (e.key === 'Escape') {
          e.preventDefault();
          Game.stop();
          const stats = Game.getStats();
          lastResult = stats;
          Storage.saveRecord(stats.mode, stats);
          Storage.addHistory(stats);
          showScreen('result');
          return;
        }
        // Pass keystrokes to game
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault();
          Game.handleKey(e.key);
        }
        return;
      }

      if (currentScreen === 'login') {
        // Allow normal typing in input
        return;
      }

      if (currentScreen === 'settings') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          document.getElementById('settings-proceed')?.click();
        }
        return;
      }

      if (currentScreen === 'instructions') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          document.getElementById('instructions-proceed')?.click();
        }
        return;
      }

      if (currentScreen === 'result') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          document.getElementById('res-play-again')?.click();
        }
        if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          document.getElementById('res-records')?.click();
        }
        return;
      }

      if (currentScreen === 'records') {
        if (e.key === 'Escape' || e.key === 'Backspace') {
          e.preventDefault();
          document.getElementById('records-back')?.click();
        }
        return;
      }
    });
  }

  return { init, showScreen, bindGlobalKeys };
})();

window.addEventListener('DOMContentLoaded', () => {
  App.init();
  App.bindGlobalKeys();
});
