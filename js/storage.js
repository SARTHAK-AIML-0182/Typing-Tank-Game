// js/storage.js — localStorage engine

const Storage = (() => {
  const KEYS = {
    CALLSIGN: 'tt_callsign',
    MODE: 'tt_mode',
    ASPECT: 'tt_aspect',
    MUTED: 'tt_muted',
    CRT: 'tt_crt',
    RECORDS: 'tt_records',
    HISTORY: 'tt_history'
  };

  function get(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v !== null ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  }

  function set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }

  function remove(key) {
    try { localStorage.removeItem(key); } catch {}
  }

  // Callsign
  function getCallsign() { return get(KEYS.CALLSIGN, null); }
  function setCallsign(name) { set(KEYS.CALLSIGN, name); }

  // Mode
  function getMode() { return get(KEYS.MODE, 1); }
  function setMode(m) { set(KEYS.MODE, m); }

  // Aspect ratio
  function getAspect() { return get(KEYS.ASPECT, 'auto'); }
  function setAspect(a) { set(KEYS.ASPECT, a); }

  // Audio
  function getMuted() { return get(KEYS.MUTED, false); }
  function setMuted(v) { set(KEYS.MUTED, v); }

  // CRT
  function getCRT() { return get(KEYS.CRT, true); }
  function setCRT(v) { set(KEYS.CRT, v); }

  // Records: { mode -> { score, wpm, accuracy, combo, words } }
  function getRecords() { return get(KEYS.RECORDS, {}); }

  function getRecord(mode) {
    const records = getRecords();
    return records[mode] || null;
  }

  function saveRecord(mode, attempt) {
    const records = getRecords();
    const existing = records[mode];
    let isNewRecord = false;
    if (!existing || attempt.score > existing.score) {
      records[mode] = { ...attempt, timestamp: Date.now() };
      set(KEYS.RECORDS, records);
      isNewRecord = true;
    }
    return isNewRecord;
  }

  // History: array of attempt objects
  function getHistory() { return get(KEYS.HISTORY, []); }

  function addHistory(attempt) {
    const history = getHistory();
    history.unshift({ ...attempt, timestamp: Date.now() });
    // Keep last 200 entries
    if (history.length > 200) history.length = 200;
    set(KEYS.HISTORY, history);
  }

  function purgeHistory() {
    remove(KEYS.HISTORY);
    remove(KEYS.RECORDS);
  }

  function getLifetimeStats() {
    const history = getHistory();
    const records = getRecords();
    let bestScore = 0, bestWpm = 0, bestAcc = 0, totalWords = 0;
    history.forEach(h => {
      if (h.score > bestScore) bestScore = h.score;
      if (h.wpm > bestWpm) bestWpm = h.wpm;
      if (h.accuracy > bestAcc) bestAcc = h.accuracy;
      totalWords += (h.words || 0);
    });
    return { bestScore, bestWpm, bestAcc, totalWords };
  }

  return {
    getCallsign, setCallsign,
    getMode, setMode,
    getAspect, setAspect,
    getMuted, setMuted,
    getCRT, setCRT,
    getRecord, saveRecord,
    getHistory, addHistory, purgeHistory,
    getLifetimeStats,
    getRecords
  };
})();
