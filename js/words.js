// js/words.js — Word dictionaries for all 4 arsenal modes

const WORD_BANKS = {
  1: [
    'tank','radar','artillery','infantry','recon','delta','bravo','foxtrot','sierra','tango',
    'alpha','echo','squad','armor','bunker','field','flank','rifle','patrol','sector',
    'target','turret','breach','cover','deploy','engage','flare','grid','haste','intel',
    'jungle','kilo','lance','march','north','oscar','point','quiet','rally','storm',
    'uniform','victor','whiskey','xray','yankee','zulu','attack','blast','charge','defend',
    'eagle','falcon','ghost','hunter','iron','jetty','knife','laser','mike','nova',
    'orbit','pilot','quest','raven','scout','troop','unit','valor','wave','zone',
    'ammo','base','camp','dusk','fire','gate','hawk','icon','jump','keep',
    'lift','mine','node','open','push','quit','rook','safe','trap','uplink',
    'vent','west','axis','bolt','crew','drop','edge','ford','grip','hold',
    'impact','jolt','karma','lure','mist','nail','oath','pact','rage','slash',
    'thrust','ultra','vault','ward','xenon','yield','zero','arc','bay','cut',
    'deny','emit','flux','graze','hex','inert','jab','keen','loop','mark',
    'nova','optic','pulse','quake','rush','surge','tear','urge','void','wake'
  ],
  2: [
    'Tank','RadarX','DeltaForce','BravoTeam','FoxTrot','SierraBase','TangoDown',
    'AlphaStrike','EchoSquad','GhostUnit','IronFist','JetPatrol','KnifeEdge',
    'LaserMark','MikeNova','NorthStar','OscarTrap','PilotWave','RavenClaw',
    'StormWard','TurretFire','UniformX','ValorPact','WhistleKey','XrayZero',
    'YankeeGrid','ZuluBase','ArmorBolt','BlastCrew','ChargeNode','DefendLine',
    'EagleEye','FalconDive','GridLock','HawkNest','IntelDrop','JumpGate',
    'KeenSight','LureMine','MistCover','NailGrip','OathKeep','PushEdge',
    'QuakeRush','RageFlux','SafeZone','TrapAxis','UrgePulse','VaultWest',
    'WakeOptic','XenonArc','YieldBay','ZeroMark','tank','radar','artillery',
    'infantry','recon','squad','armor','bunker','field','patrol','sector',
    'blast','charge','defend','scout','valor','attack','cover','intel',
    'AlphaGrid','BravoX','CharlieFox','DeltaV','EchoBase','FoxtrotK',
    'GhostStar','HunterX','IronClad','JetStream','KeepSafe','LanceDrop',
    'MarkerX','NodeBase','OpticFire','PulseWave','QuietRun','RifleTeam',
    'SectorX','TroopY','UplinkZ','VectorX','WardBase','XrayTeam','ZuluTeam'
  ],
  3: [
    'Squad5','Tank99','v2.0','Alpha7','Bravo3','Charlie9','Delta42','Echo11',
    'Foxtrot8','Ghost13','Hunter6','Iron99','Jet7','Kilo21','Lance5','Mike4',
    'Nova88','Orbit3','Pilot9','Quest42','Raven7','Scout12','Tango5','Unit3',
    'Valor9','Wave21','Xray7','Yankee3','Zulu9','Armor5','Base12','Camp7',
    'Deploy9','Eagle3','Falcon5','Grid7','Hawk12','Intel3','Jump9','Keep5',
    'Laser7','Mark3','Node5','Oscar9','Push7','Quiet3','Rally5','Storm7',
    'Trap9','Uplink3','Vector5','Ward7','Zone3','Arc9','Bolt5','Crew7',
    'Drop3','Edge9','Fire5','Gate7','Hold3','Impact9','Jolt5','Karma7',
    'Loop3','Mine9','Nail5','Oath7','Pact3','Rage9','Rush5','Surge7',
    'Tear3','Ultra9','Vault5','Wake7','Axis3','Bay9','Cut5','Deny7',
    'tank','radar','artillery','squad','armor','bunker','field','patrol',
    'Squad1','Alpha2','Bravo4','Charlie6','Delta8','Echo10','Fox21','Ghost31',
    'Hunter41','Iron51','Jet61','Kilo71','Lance81','Mike91','Nova01','Orbit11'
  ],
  4: [
    '[tank-01]','(8+9)','{cmd-9}','!alert!','[radar-X]','(fire+2)','!delta!',
    '{unit-7}','[alpha-3]','(blast*4)','!bravo!','{echo-5}','[ghost-X]',
    '(hunt+7)','!iron!','{jet-3}','[knife-9]','(laser*2)','!mike!',
    '{nova-8}','[orbit-4]','(pulse+6)','!quiet!','{raven-2}','[scout-7]',
    '(tango*3)','!ultra!','{valor-5}','[wake-9]','(xray+1)','!yankee!',
    '{zero-4}','[armor-2]','(bolt*8)','!crew!','{drop-6}','[edge-3]',
    '(fire+9)','!gate!','{hold-4}','[impact-7]','(jolt*2)','!karma!',
    '{loop-5}','[mine-8]','(nail+3)','!oath!','{pact-6}','[rage-1]',
    '(rush*7)','!surge!','{tear-4}','[ultra-9]','(vault+2)','!wake!',
    '{axis-5}','[bay-8]','(cut*3)','!deny!','{emit-6}','[flux-1]',
    '(grip+7)','!hex!','{inert-4}','[jab-9]','(keen*2)','!lure!',
    '{mist-5}','[nova-8]','(optic+3)','!pulse!','{quake-6}','[slash-1]',
    '(thrust*7)','!urge!','{void-4}','[west-9]','(xenon+2)','!yield!',
    '{zero-5}','[arc-8]','(bay*3)','!cut!','{deny-6}','[emit-1]',
    'Squad5','Tank99','v2.0','Alpha7','DeltaForce','RadarX','[iron-99]',
    '(9*3+1)','!chaos!','{link-0}','[mode-4]','(x+y*z)','!fire!',
    '{data-7}','[unit-42]','(cmd+run)','!storm!','{blitz-3}','[hawk-21]'
  ]
};

const ExclusionManager = {
  excludedChars: new Map(),
  addExclusion(char, durationMs = 3000) {
    this.excludedChars.set(char.toLowerCase(), Date.now() + durationMs);
  },
  isExcluded(char) {
    const c = char.toLowerCase();
    if (!this.excludedChars.has(c)) return false;
    if (Date.now() > this.excludedChars.get(c)) {
      this.excludedChars.delete(c);
      return false;
    }
    return true;
  },
  clear() { this.excludedChars.clear(); }
};

function getWordBank(mode) { return WORD_BANKS[mode] || WORD_BANKS[1]; }

function getRandomWord(mode, excludeStartChars = []) {
  const bank = getWordBank(mode);
  const filtered = bank.filter(w => {
    const firstChar = w[0].toLowerCase();
    return !excludeStartChars.includes(firstChar) && !ExclusionManager.isExcluded(firstChar);
  });
  if (filtered.length === 0) return bank[Math.floor(Math.random() * bank.length)];
  return filtered[Math.floor(Math.random() * filtered.length)];
}

function getSampleWords(mode) {
  const bank = getWordBank(mode);
  const samples = [];
  const seen = new Set();
  let attempts = 0;
  while (samples.length < 6 && attempts < 100) {
    const w = bank[Math.floor(Math.random() * bank.length)];
    if (!seen.has(w)) { seen.add(w); samples.push(w); }
    attempts++;
  }
  return samples;
}
