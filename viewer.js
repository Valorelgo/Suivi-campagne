// ==========================================
// VIEWER — Suivi de Campagne (lecture seule)
// Lit le JSON exporté depuis l'application principale et affiche
// l'avancement de la campagne, sans aucune possibilité de modification.
// ==========================================

let campaignData = null;
let campaignMap = null;
let zoneLayers = {};

const COLOR_PALETTE = [
  { name: "Bleu", hex: "#3498db" },
  { name: "Jaune", hex: "#f1c40f" },
  { name: "Rouge", hex: "#e74c3c" },
  { name: "Violet", hex: "#9b59b6" },
  { name: "Orange", hex: "#e67e22" },
  { name: "Vert", hex: "#2ecc71" },
  { name: "Cyan", hex: "#00d2d3" },
  { name: "Turquoise", hex: "#1abc9c" },
  { name: "Ocre", hex: "#d35400" },
  { name: "Bordeaux", hex: "#8e44ad" },
  { name: "Noir", hex: "#34495e" },
  { name: "Gris", hex: "#95a5a6" }
];

// Registre global pour stocker plusieurs campagnes


const TERRITORY_TYPES = [
  { name: "Bullet den", type: "choice_15_100" },
  { name: "Rogue doc shop", type: "choice_15_90" },
  { name: "Mess Shack", type: "choice_15_45" },
  { name: "Drinking hole", type: "choice_15_30" },
  { name: "Fence hangout", type: "choice_15_50" },
  { name: "Bounty den", type: "fixed_25" },
  { name: "Generatorium", type: "fixed_15_rep" },
  { name: "Corpse farm", type: "corpse_farm" },
  { name: "Tunnels", type: "fixed_20" },
  { name: "Tech bazaar", type: "fixed_15" },
  { name: "Promethium cache", type: "choice_15_30" },
  { name: "Collapsed dome", type: "fixed_20" },
  { name: "Bone shrine", type: "fixed_25" },
  { name: "Mine workings", type: "choice_20_30" },
  { name: "Gambling den", type: "fixed_15_rep" },
  { name: "Synth still", type: "fixed_20" },
  { name: "Old ruins", type: "fixed_20" },
  { name: "Fighting pit", type: "fixed_25" }
];

// Tirage "sac à jetons" : mélange les 18 territoires, distribue dans l'ordre, se remélange
// automatiquement une fois vide. Garantit qu'aucun territoire ne revient en double tant que
// tous les autres ne sont pas sortis au moins une fois.


function getTerritoryTypeDescription(type) {
  switch (type) {
    case "custom_or_15": return "15 crédits, ou un revenu spécial au choix";
    case "choice_15_100": return "Choix entre 15 et 100 crédits";
    case "choice_15_90": return "Choix entre 15 et 90 crédits";
    case "choice_15_45": return "Choix entre 15 et 45 crédits";
    case "choice_15_30": return "Choix entre 15 et 30 crédits";
    case "choice_15_50": return "Choix entre 15 et 50 crédits";
    case "choice_20_30": return "Choix entre 20 et 30 crédits";
    case "corpse_farm": return "0 cr de base (+10 cr par ennemi mis hors de combat)";
    case "fixed_25": return "25 crédits fixes";
    case "fixed_20": return "20 crédits fixes";
    case "fixed_15": return "15 crédits fixes";
    case "fixed_15_rep": return "15 crédits + 1 réputation";
    default: return "Revenu fixe";
  }
}


function getPlayerColorHex(colorName) {
  let c = COLOR_PALETTE.find(x => x.name === colorName);
  return c ? c.hex : "#ffffff";
}


function getPlayerReputation(player) {
  let rep = player.baseReputation;
  let ownedTerritories = campaignData.territories.filter(t => t.ownerId === player.id);
  ownedTerritories.forEach(t => {
    if (t.name === "Generatorium" || t.name === "Gambling den") {
      rep += 1;
    }
  });
  return rep;
}


function getPlayerTerritories(playerId) {
  return campaignData.territories.filter(t => t.ownerId === playerId);
}


const TERRITORY_MARKERS = {
  1:  [809, 417],   // Settlement
  2:  [867, 690],   // Bullet den
  3:  [272, 704],   // Rogue doc shop
  4:  [863, 1291],  // Mess Shack
  5:  [794, 1539],  // Drinking hole
  6:  [580, 215],  // Fence hangout
  7:  [572, 468],   // Bounty den
  8:  [662, 694],   // Generatorium
  9:  [718, 958],   // Corpse farm
  10: [673, 1247],  // Tunnels
  11: [588, 1470],  // Tech bazaar
  12: [588, 1703],  // Promethium cache
  13: [422, 955],   // Collapsed dome
  14: [575, 954],   // Bone shrine
  15: [468, 1225],   // Mine workings
  16: [386, 297],  // Gambling den
  17: [274, 1219],  // Synth still
  18: [264, 957],  // Old ruins
  19: [296, 1436],   // Fighting pit
  20: [385, 1604]   // Power Station
};

// Contours réels de chaque zone (halo au survol sur la carte), même repère [Y, X]


const TERRITORY_POLYGONS = {
  1: [[770.6,593.7], [943.6,494.7], [885.9,337.0], [785.4,196.0], [671.5,353.0]],
  2: [[950.6,754.9], [952.7,716.5], [940.1,720.7], [939.4,712.3], [945.7,706.0], [975.2,705.3], [979.5,697.0], [974.5,687.9], [950.6,685.8], [950.6,590.9], [940.8,509.3], [777.7,602.1], [781.2,658.6], [777.0,699.8], [819.8,796.7]],
  3: [[340.3,838.6], [397.3,768.1], [357.2,715.8], [354.4,617.4], [199.0,572.8], [191.3,793.3], [307.3,814.2]],
  4: [[915.5,1500.0], [940.1,1391.2], [949.9,1380.0], [950.6,1308.8], [937.3,1305.3], [937.3,1278.8], [949.9,1277.4], [947.1,1162.3], [823.4,1125.3], [780.5,1214.0], [781.2,1316.5], [772.7,1340.2]],
  5: [[912.7,1519.5], [763.6,1353.5], [668.0,1567.0], [780.5,1726.0], [862.0,1629.1]],
  6: [[775.5,187.7], [697.5,129.8], [612.4,98.4], [533.0,94.9], [450.0,119.3], [503.4,330.0], [602.6,348.8], [660.2,344.0]],
  7: [[708.0,470.2], [660.2,361.4], [597.7,363.5], [495.7,344.0], [424.7,486.3], [504.1,557.4], [542.1,572.8], [584.3,573.5], [613.8,566.5], [632.8,555.3]],
  8: [[715.8,488.4], [632.8,574.2], [578.0,590.2], [578.0,793.3], [602.6,798.1], [658.8,842.1], [702.4,778.6], [694.7,759.1], [709.5,740.9], [707.3,723.5], [722.1,716.5], [746.7,683.7], [746.7,676.0], [728.4,688.6], [689.8,623.0], [720.7,579.8], [707.3,564.4], [676.4,561.6], [666.6,549.8], [710.9,494.7], [717.9,495.3], [741.1,545.6]],
  9: [[772.0,1202.1], [812.1,1114.2], [770.6,1060.5], [770.6,857.4], [810.7,799.5], [769.9,709.5], [663.7,856.0], [663.7,1053.5]],
  10: [[713.7,1438.6], [765.7,1313.7], [765.0,1214.0], [663.0,1073.7], [590.6,1126.0], [590.6,1328.4], [635.6,1350.0], [674.3,1386.3]],
  11: [[704.5,1455.3], [663.7,1396.7], [628.6,1364.0], [606.8,1350.0], [583.6,1343.7], [522.4,1344.4], [492.9,1352.1], [417.7,1415.6], [483.0,1551.6], [618.8,1546.7], [657.4,1557.9]],
  12: [[776.2,1734.4], [660.9,1572.6], [614.5,1557.9], [485.2,1562.8], [415.5,1786.0], [507.7,1821.6], [605.4,1826.5], [698.9,1791.6]],
  13: [[400.1,768.8], [342.4,842.1], [373.4,884.0], [375.5,1036.7], [341.0,1077.2], [392.3,1147.0], [483.0,1049.3], [483.0,870.7]],
  14: [[585.0,805.8], [563.2,805.1], [546.3,810.7], [501.3,843.5], [490.1,862.3], [490.8,1061.9], [499.9,1075.1], [540.7,1105.8], [568.8,1115.6], [599.8,1108.6], [642.7,1077.2], [654.6,1059.8], [651.1,1031.2], [654.6,858.8], [635.6,836.5]],
  15: [[480.9,1074.4], [374.8,1190.9], [368.4,1204.9], [367.7,1301.2], [413.4,1398.8], [487.3,1337.4], [516.1,1329.1], [562.5,1327.7], [562.5,1127.4], [521.7,1110.0]],
  16: [[426.1,447.2], [484.5,332.1], [435.2,127.0], [388.8,155.6], [345.2,196.0], [285.5,279.8]],
  17: [[341.0,1081.4], [316.4,1105.1], [190.5,1125.3], [194.8,1324.9], [353.0,1299.8], [355.8,1193.0], [392.3,1149.1]],
  18: [[302.3,825.3], [194.8,806.5], [195.5,1112.8], [306.6,1093.3], [329.1,1076.5], [360.0,1038.1], [360.7,884.7], [328.4,842.8]],
  19: [[263.7,1598.4], [423.3,1457.4], [355.8,1310.9], [198.3,1334.0], [218.7,1474.9]],
  20: [[425.4,1467.9], [269.3,1607.4], [296.7,1659.8], [329.8,1705.8], [365.6,1744.2], [405.7,1775.6], [469.7,1564.2]],
};


function renderTriumphs() {
  let container = document.getElementById('triumphs-container');
  if (campaignData.players.length === 0) return;

  const categories = [
    { icon: "👑", title: "Dominator", value: p => getPlayerTerritories(p.id).length, format: v => `${v} terr.` },
    { icon: "💀", title: "Slaughterer", value: p => p.enemiesOOA, format: v => `${v} mis hors de combat` },
    { icon: "💰", title: "Creditor", value: p => p.credits + p.gangRating, format: v => `${v} cr de richesse` },
    { icon: "⚔️", title: "Warmonger", value: p => p.battlesPlayed, format: v => `${v} parties` },
    { icon: "⚡", title: "Powerbroker", value: p => getPlayerReputation(p), format: v => `${v} rep` }
  ];

  container.innerHTML = categories.map(cat => {
    let ranked = [...campaignData.players].sort((a, b) => cat.value(b) - cat.value(a));
    let leader = ranked[0];
    let othersHTML = ranked.slice(1).map(p =>
      `<div class="triumph-other-row">${p.gangName} — ${cat.format(cat.value(p))}</div>`
    ).join('');

    return `
      <div class="triumph-card">
        <div class="triumph-title">${cat.icon} ${cat.title}</div>
        <div class="triumph-leader">${leader.gangName} (${cat.format(cat.value(leader))})</div>
        <div class="triumph-others">${othersHTML}</div>
      </div>
    `;
  }).join('');
}


function renderChallenges() {
  let container = document.getElementById('challenges-container');
  if (!container) return;
  let phase = campaignData.phases[campaignData.currentPhaseIndex];

  if (phase.type === 'pause') {
    container.innerHTML = `<p style="color:#888; font-size:13px;">Pas de défis pendant la Phase de Pause.</p>`;
    return;
  }

  let cycleData = campaignData.cycleChallenges ? campaignData.cycleChallenges[phase.id] : null;

  if (!cycleData) {
    container.innerHTML = `<p style="color:#888; font-size:13px;">Les défis de ce cycle n'ont pas encore été déclarés.</p>`;
    return;
  }

  let total = cycleData.challenges.length;
  let done = cycleData.challenges.filter(c => c.resolved).length;

  let html = `<p style="font-size:14px;"><strong style="color:var(--accent-cyan);">${done}/${total}</strong> défis réalisés</p>`;

  cycleData.challenges.forEach(ch => {
    let attacker = campaignData.players.find(p => p.id === ch.attackerId);
    let defender = campaignData.players.find(p => p.id === ch.defenderId);
    let terr = campaignData.territories.find(t => t.id === ch.territoryId);
    let winnerName = ch.result && ch.result.winnerId ? (campaignData.players.find(p => p.id === ch.result.winnerId)?.gangName) : null;
    let statusText = !ch.resolved
      ? 'En attente'
      : (ch.resolutionType === 'unplayed' ? 'Non réalisé' : 'Match joué') + ' — ' + (winnerName ? winnerName + ' vainqueur' : 'Égalité');

    html += `
      <div style="background:#181818; padding:8px 10px; border-radius:4px; margin-bottom:6px; font-size:13px; border-left:4px solid ${ch.resolved ? '#2ecc71' : 'var(--accent-orange)'};">
        <strong>${attacker ? attacker.gangName : '?'}</strong> vs <strong>${defender ? defender.gangName : '?'}</strong> — ${terr ? terr.name : '?'}
        ${!ch.mandatory ? ' <small style="color:#888;">(supplémentaire)</small>' : ''}
        <br><small style="color:${ch.resolved ? '#2ecc71' : '#e67e22'};">${statusText}</small>
      </div>
    `;
  });

  html += `<button class="btn" style="width:100%; margin-top:6px;" onclick="openChallengesHistoryModal()">📜 Historique des Défis Passés</button>`;

  container.innerHTML = html;
}

function renderGangsStatus() {
  let container = document.getElementById('gangs-status-container');
  container.innerHTML = campaignData.players.map(p => {
    let terrs = getPlayerTerritories(p.id);
    let colorHex = getPlayerColorHex(p.color);
    let totalWealth = p.credits + p.gangRating;

    return `
      <div class="gang-card" style="border-top-color: ${colorHex};">
        <div class="gang-header">
          <strong style="color:${colorHex}; font-size:16px;">${p.gangName}</strong>
          <small>${p.name} (${p.gangType})</small>
        </div>
        <div class="gang-metrics">
          <strong>Crédits en caisse :</strong> <span style="color:var(--accent-cyan);">${p.credits} cr</span><br>
          <strong>Gang Rating :</strong> ${p.gangRating} cr | <strong>Richesse du Gang :</strong> <span style="color:#f39c12; font-weight:bold;">${totalWealth} cr</span><br>
          <strong>Réputation :</strong> ${getPlayerReputation(p)} (Base: ${p.baseReputation})<br>
          <strong>Parties Jouées :</strong> ${p.battlesPlayed} | <strong>Ennemis mis hors de combat :</strong> ${p.enemiesOOA}<br>
          <strong>Territoires (${terrs.length}) :</strong> ${terrs.map(t => `<span class="territory-chip" title="${getTerritoryTypeDescription(t.type)}" onclick="showTerritoryBonusInfo(${t.id})">${t.name}</span>`).join(', ') || 'Aucun'}
        </div>
      </div>
    `;
  }).join('');
}

function showTerritoryBonusInfo(territoryId) {
  let t = campaignData.territories.find(x => x.id === territoryId);
  if (!t) return;
  let owner = campaignData.players.find(p => p.id === t.ownerId);
  let colorHex = owner ? getPlayerColorHex(owner.color) : '#8a8a8a';
  let html = `
    <p style="font-size:15px; color:${colorHex};"><strong>${t.name}</strong></p>
    <p><strong>Bonus :</strong> ${getTerritoryTypeDescription(t.type)}</p>
    <p style="color:#888; font-size:13px;"><strong>Propriétaire :</strong> ${owner ? owner.gangName : 'Neutre / Libre'}</p>
    <small style="color:#666;">Secteur N° ${t.id}</small>
  `;
  openModal("🏷️ Détails du Territoire", html);
}

// ==========================================
// 4. SAISIE DE MATCH
// ==========================================


function renderMatchesHistory() {
  let container = document.getElementById('matches-history-list');
  if (!campaignData.matchesHistory || campaignData.matchesHistory.length === 0) {
    container.innerHTML = "<p style='color:#888;'>Aucune partie enregistrée.</p>";
    return;
  }
  container.innerHTML = campaignData.matchesHistory.map((m) => `
    <div style="background:#181818; padding:10px 12px; border-radius:4px; margin-bottom:8px; font-size:13px; border-left:4px solid var(--accent-purple);">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <strong>[${m.phaseName || 'Cycle N/A'}] ${m.p1Name} vs ${m.p2Name}</strong>
      </div>
      <div style="color:#aaa; font-size:12px; margin-top:4px;">
        ${m.date} — Territoire : <em>${m.territoryName}</em> — <strong>Vainqueur : ${m.winnerName}</strong>
      </div>
    </div>
  `).join('');
}

function openChallengesHistoryModal() {
  let activePhases = campaignData.phases.filter(ph => ph.type !== 'pause' && campaignData.cycleChallenges[ph.id]);
  let html = '';
  if (activePhases.length === 0) {
    html = `<p style="color:#888;">Aucun défi déclaré pour l'instant.</p>`;
  }
  activePhases.forEach(ph => {
    let cycleData = campaignData.cycleChallenges[ph.id];
    html += `<h4 style="color:var(--accent-purple); margin-top:12px;">${ph.name}</h4>`;
    cycleData.challenges.forEach(ch => {
      let attacker = campaignData.players.find(p => p.id === ch.attackerId);
      let defender = campaignData.players.find(p => p.id === ch.defenderId);
      let terr = campaignData.territories.find(t => t.id === ch.territoryId);
      let winnerName = ch.result && ch.result.winnerId ? (campaignData.players.find(p => p.id === ch.result.winnerId)?.gangName) : null;
      let statusText = !ch.resolved
        ? 'Non résolu'
        : (ch.resolutionType === 'unplayed' ? 'Non réalisé' : 'Match joué') + ' — ' + (winnerName ? winnerName + ' vainqueur' : 'Égalité');
      html += `
        <div style="background:#181818; padding:8px 10px; border-radius:4px; margin-bottom:6px; font-size:13px;">
          <strong>${attacker ? attacker.gangName : '?'}</strong> vs <strong>${defender ? defender.gangName : '?'}</strong> — ${terr ? terr.name : '?'}
          ${!ch.mandatory ? ' <small style="color:#888;">(supplémentaire)</small>' : ''}
          <br><small style="color:${ch.resolved ? '#2ecc71' : '#e67e22'};">${statusText}</small>
        </div>
      `;
    });
  });
  openModal("📜 Historique des Défis", html);
}


function openModal(title, bodyHTML) {
  document.getElementById('modal-title').innerText = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-overlay').classList.remove('hidden');
}


function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// ==========================================
// 7. SAUVEGARDE, EXPORT & IMPORT JSON
// ==========================================


function initLeafletMap() {
  if (campaignMap !== null) {
    campaignMap.remove();
    campaignMap = null;
  }
  zoneLayers = {};

  const bounds = [[0, 0], [1080, 1920]];

  campaignMap = L.map('campaign-map-container', {
    crs: L.CRS.Simple,
    minZoom: -2,
    maxZoom: 2,
    zoomSnap: 0.1,
    maxBounds: bounds,
    maxBoundsViscosity: 1.0
  });

  L.imageOverlay('carte_underhive.jpg', bounds).addTo(campaignMap);

  // Génération des zones cliquables (halo pulsant au survol, coloré selon le propriétaire)
  if (campaignData && campaignData.territories) {
    campaignData.territories.forEach(ter => {
      const shape = TERRITORY_POLYGONS[ter.id];
      if (!shape) return;

      let ownerGang = campaignData.players.find(p => p.id === ter.ownerId);
      let colorHex = ownerGang ? getPlayerColorHex(ownerGang.color) : '#8a8a8a';
      let restStyle = {
        color: colorHex,
        weight: 2,
        opacity: 0.55,
        fillColor: colorHex,
        fillOpacity: ownerGang ? 0.16 : 0.06
      };
      let hoverStyle = {
        weight: 3,
        opacity: 1,
        fillOpacity: ownerGang ? 0.4 : 0.22
      };

      const layer = L.polygon(shape, restStyle).addTo(campaignMap);
      zoneLayers[ter.id] = layer;

      layer.bindTooltip(ter.name, { direction: 'center', className: 'zone-tooltip', opacity: 0.95 });

      layer.on('mouseover', function () {
        this.setStyle(hoverStyle);
        let el = this.getElement();
        if (el) {
          el.style.filter = `drop-shadow(0 0 6px ${colorHex}) drop-shadow(0 0 16px ${colorHex})`;
          el.classList.add('zone-halo-pulse');
        }
      });
      layer.on('mouseout', function () {
        this.setStyle(restStyle);
        let el = this.getElement();
        if (el) {
          el.style.filter = '';
          el.classList.remove('zone-halo-pulse');
        }
      });
      layer.on('click', function () {
        showZoneInfoPanel(ter, ownerGang, colorHex);
      });

      // Point coloré au centre de la zone (repère rapide, en plus du halo au survol)
      const pos = TERRITORY_MARKERS[ter.id];
      if (pos) {
        const dotIcon = L.divIcon({
          className: 'zone-dot-icon',
          html: `<div style="
            background-color: ${colorHex};
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border: 2px solid #ffffff;
            box-shadow: 0 0 6px rgba(0,0,0,0.9);
          "></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });
        const dot = L.marker(pos, { icon: dotIcon, interactive: true }).addTo(campaignMap);
        dot.on('mouseover', () => layer.fire('mouseover'));
        dot.on('mouseout', () => layer.fire('mouseout'));
        dot.on('click', () => showZoneInfoPanel(ter, ownerGang, colorHex));
      }
    });
  }

  campaignMap.invalidateSize();
  campaignMap.fitBounds(bounds);
}


function showZoneInfoPanel(ter, ownerGang, colorHex) {
  let panel = document.getElementById('zone-info-panel');
  if (!panel) return;

  let ownerText = ownerGang
    ? `<strong style="color:${colorHex}">${ownerGang.gangName}</strong> (${ownerGang.name})`
    : '<em>Neutre / Libre</em>';

  panel.innerHTML = `
    <button class="zone-info-close" onclick="closeZoneInfoPanel()">✕</button>
    <h4 style="margin:0 0 6px 0; color:${colorHex};">${ter.name}</h4>
    <p style="margin:0 0 4px 0; font-size:13px;"><strong>Bonus :</strong> ${getTerritoryTypeDescription(ter.type)}</p>
    <p style="margin:0; font-size:13px;"><strong>Propriétaire :</strong> ${ownerText}</p>
    <small style="color:#777;">Secteur N° ${ter.id}</small>
  `;
  panel.classList.remove('hidden');
}


function closeZoneInfoPanel() {
  let panel = document.getElementById('zone-info-panel');
  if (panel) panel.classList.add('hidden');
}

// Colonnes latérales de la carte : joueurs à gauche, territoires (triés par n° de secteur) à droite


function renderMapSidebars() {
  const playersBox = document.getElementById('map-players-sidebar');
  const territoriesBox = document.getElementById('map-territories-sidebar');
  if (!playersBox || !territoriesBox || !campaignData) return;

  // --- Colonne joueurs ---
  let playersHTML = `<h4 class="map-sidebar-title">Joueurs</h4>`;
  campaignData.players.forEach(p => {
    let colorHex = getPlayerColorHex(p.color);
    playersHTML += `
      <div class="map-sidebar-row" onmouseenter="highlightPlayerTerritories('${p.id}')" onmouseleave="unhighlightPlayerTerritories('${p.id}')">
        <span class="map-sidebar-dot" style="background:${colorHex};"></span>
        <span><strong>${p.gangName}</strong><br><small style="color:#888;">${p.name}</small></span>
      </div>
    `;
  });
  playersBox.innerHTML = playersHTML;

  // --- Colonne territoires (les 20 secteurs, triés par n°) ---
  let sortedTerritories = [...campaignData.territories].sort((a, b) => a.id - b.id);
  let territoriesHTML = `<h4 class="map-sidebar-title">Territoires</h4>`;
  sortedTerritories.forEach(ter => {
    let ownerGang = campaignData.players.find(p => p.id === ter.ownerId);
    let colorHex = ownerGang ? getPlayerColorHex(ownerGang.color) : '#8a8a8a';
    territoriesHTML += `
      <div class="map-sidebar-row" style="cursor:pointer;"
        onmouseenter="highlightZone(${ter.id})" onmouseleave="unhighlightZone(${ter.id})"
        onclick="handleTerritoryRowClick(${ter.id})">
        <span class="map-sidebar-dot" style="background:${colorHex};"></span>
        <span><small style="color:#888;">N°${ter.id}</small> ${ter.name}</span>
      </div>
    `;
  });
  territoriesBox.innerHTML = territoriesHTML;
}


function handleTerritoryRowClick(id) {
  let ter = campaignData.territories.find(t => t.id === id);
  if (!ter) return;
  let ownerGang = campaignData.players.find(p => p.id === ter.ownerId);
  let colorHex = ownerGang ? getPlayerColorHex(ownerGang.color) : '#8a8a8a';
  showZoneInfoPanel(ter, ownerGang, colorHex);
}


function highlightZone(id) {
  let layer = zoneLayers[id];
  if (layer) layer.fire('mouseover');
}

function unhighlightZone(id) {
  let layer = zoneLayers[id];
  if (layer) layer.fire('mouseout');
}

function highlightPlayerTerritories(playerId) {
  campaignData.territories.filter(t => t.ownerId === playerId).forEach(t => highlightZone(t.id));
}

function unhighlightPlayerTerritories(playerId) {
  campaignData.territories.filter(t => t.ownerId === playerId).forEach(t => unhighlightZone(t.id));
}


function renderAll() {
  let phase = campaignData.phases[campaignData.currentPhaseIndex];
  document.getElementById('campaign-name-display').innerText = campaignData.name || 'Campagne Sous-Monde';
  document.getElementById('current-phase-display').innerText = `Phase : ${phase.name}`;
  document.getElementById('phase-title').innerText = phase.name;

  let desc = "";
  if (phase.type === "occupation") desc = "Les joueurs s'affrontent pour conquérir les territoires neutres encore disponibles.";
  else if (phase.type === "pause") desc = "Phase de repos : pas d'affrontements durant cette phase.";
  else if (phase.type === "conquest") desc = "Les joueurs peuvent tenter de capturer les territoires déjà contrôlés par leurs adversaires.";
  document.getElementById('phase-desc').innerText = desc;

  renderTriumphs();
  renderChallenges();
  renderGangsStatus();
  renderMatchesHistory();
  initLeafletMap();
  renderMapSidebars();
}

async function loadCampaignData() {
  try {
    const res = await fetch('campagne_necromunda.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    campaignData = await res.json();
    if (!campaignData.cycleChallenges) campaignData.cycleChallenges = {};
    renderAll();
  } catch (err) {
    document.getElementById('app-container').innerHTML = `
      <div class="card">
        <h2>⚠️ Impossible de charger les données de la campagne</h2>
        <p>Vérifie que le fichier <code>campagne_necromunda.json</code> est bien présent à côté de cette page (exporté depuis l'application principale via le bouton "💾 Exporter JSON").</p>
        <p style="color:#888; font-size:12px;">Détail technique : ${err.message}</p>
      </div>
    `;
  }
}

window.onload = loadCampaignData;
