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
    case "corpse_farm": return "25 crédits fixes, + 10 crédits par ennemi mis hors de combat (compté automatiquement lors des matchs)";
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


const TERRITORY_MARKERS_4P = {
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
const TERRITORY_POLYGONS_4P = {
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

// ---- Carte à 5 joueurs (25 zones) ----
const TERRITORY_MARKERS_5P = {
  1: [945.9, 960.9],
  2: [927.9, 733.0],
  3: [927.9, 1182.6],
  4: [867.3, 508.7],
  5: [869.5, 1403.8],
  6: [781.2, 810.0],
  7: [779.2, 1113.2],
  8: [748.4, 1591.1],
  9: [748.1, 317.8],
  10: [669.4, 583.2],
  11: [667.2, 1335.1],
  12: [584.8, 958.5],
  13: [587.3, 235.6],
  14: [585.2, 1676.2],
  15: [504.5, 575.5],
  16: [505.4, 1340.9],
  17: [430.7, 288.6],
  18: [428.1, 1624.9],
  19: [389.8, 800.6],
  20: [390.7, 1118.0],
  21: [310.6, 453.2],
  22: [308.0, 1455.8],
  23: [235.0, 680.6],
  24: [233.9, 1230.6],
  25: [208.2, 960.2],
};

const TERRITORY_POLYGONS_5P = {
  1: [[1006.2,834.4], [868.4,872.1], [874.0,937.0], [869.8,1047.9], [1006.9,1088.4], [1013.9,986.5], [1013.9,927.2]],
  2: [[869.1,862.3], [1005.5,825.3], [998.4,718.6], [972.4,574.2], [965.4,574.9], [836.7,694.2], [855.7,768.1]],
  3: [[868.4,1057.7], [867.0,1072.3], [874.0,1084.2], [864.1,1090.5], [843.0,1218.8], [958.4,1336.0], [964.0,1336.0], [995.6,1209.8], [1006.2,1097.4]],
  4: [[831.8,682.3], [838.1,682.3], [966.1,563.7], [943.6,475.1], [870.5,310.5], [862.0,316.0], [772.0,520.5], [772.0,537.9], [814.9,614.7]],
  5: [[838.1,1231.4], [777.7,1384.2], [866.2,1596.3], [873.3,1597.7], [929.5,1479.8], [960.5,1349.3], [844.5,1231.4]],
  6: [[867.0,956.5], [861.3,858.1], [843.8,750.0], [838.1,748.6], [840.2,737.4], [811.4,628.6], [799.5,598.6], [793.1,597.9], [684.1,777.9], [683.4,787.0], [710.2,865.8], [722.8,955.8]],
  7: [[866.2,963.5], [718.6,965.6], [711.6,1050.0], [679.2,1132.3], [788.2,1327.7], [794.5,1327.0], [836.0,1211.2], [834.6,1192.3], [840.2,1188.8], [854.3,1110.7], [844.5,1076.5], [862.7,1046.5]],
  8: [[772.0,1389.8], [765.7,1390.5], [705.9,1467.2], [646.9,1495.8], [690.5,1789.5], [788.9,1714.2], [862.0,1610.9]],
  9: [[701.0,124.9], [694.7,124.9], [651.8,414.4], [708.8,452.1], [761.5,512.8], [767.1,512.8], [859.2,296.5], [802.3,204.4]],
  10: [[680.6,768.8], [790.3,581.9], [758.7,535.8], [760.1,523.3], [703.8,458.4], [653.9,424.9], [590.6,408.1], [587.1,706.0], [639.1,729.1], [675.0,768.8]],
  11: [[677.1,1150.5], [670.1,1151.9], [639.8,1189.5], [588.5,1211.2], [587.8,1503.5], [659.5,1484.0], [701.0,1460.9], [732.7,1426.0], [785.4,1344.4]],
  12: [[591.3,715.8], [544.2,729.1], [504.1,767.4], [471.8,847.7], [454.9,946.0], [470.4,1063.3], [502.0,1145.6], [537.2,1184.0], [580.1,1202.1], [634.9,1183.3], [668.7,1140.0], [705.2,1043.7], [714.4,955.8], [703.8,872.1], [672.9,779.3], [634.2,735.3]],
  13: [[688.4,115.8], [589.9,84.4], [552.7,85.8], [490.8,99.8], [526.6,408.1], [589.2,397.7], [644.1,410.9]],
  14: [[617.3,1823.7], [683.4,1797.2], [644.8,1498.6], [592.0,1511.2], [586.4,1520.2], [580.1,1513.3], [525.9,1503.5], [487.3,1808.4], [566.7,1827.9]],
  15: [[583.6,408.8], [531.6,415.8], [488.7,439.5], [431.0,494.0], [384.6,561.6], [497.8,757.0], [542.8,720.7], [580.1,708.1]],
  16: [[497.1,1159.5], [390.2,1355.6], [438.8,1430.2], [477.4,1472.8], [519.6,1493.0], [580.8,1504.9], [581.5,1211.2], [538.6,1194.4]],
  17: [[425.4,483.5], [483.7,433.3], [519.6,415.1], [483.7,104.7], [447.9,117.2], [406.4,142.3], [316.4,234.4]],
  18: [[422.6,1428.8], [315.7,1676.5], [400.1,1769.3], [435.9,1790.2], [479.5,1804.2], [518.2,1500.0], [475.3,1481.2], [429.6,1430.2]],
  19: [[383.9,581.9], [377.6,583.3], [352.3,648.8], [319.2,755.6], [308.0,836.5], [301.6,956.5], [446.5,954.4], [465.5,842.1], [493.6,771.6]],
  20: [[388.8,1336.7], [492.9,1143.5], [462.0,1060.5], [448.6,961.4], [302.3,963.5], [310.1,1091.9], [322.0,1174.9], [357.2,1278.8], [382.5,1336.7]],
  21: [[348.7,635.6], [374.8,563.0], [420.5,491.2], [312.9,251.9], [306.6,251.9], [248.9,356.5], [195.5,482.8], [341.7,634.9]],
  22: [[345.9,1271.2], [340.3,1271.2], [192.0,1422.6], [243.3,1553.0], [305.9,1659.8], [314.3,1654.9], [418.4,1419.8], [379.0,1357.7]],
  23: [[195.5,494.7], [189.8,494.7], [159.6,624.4], [138.5,775.1], [300.9,835.1], [312.9,749.3], [342.4,646.7]],
  24: [[196.9,1406.5], [339.6,1260.7], [314.3,1174.9], [302.3,1083.5], [137.1,1145.6], [162.4,1302.6], [189.8,1403.7]],
  25: [[143.4,1135.1], [300.9,1073.0], [292.5,962.1], [299.5,844.9], [138.5,785.6], [126.6,990.7], [137.1,1129.5]],
};

// Registre des cartes disponibles selon le nombre de joueurs. On choisit toujours la carte
// dont le palier est le plus proche en dessous (ou égal) du nombre de joueurs ; en dessous du
// plus petit palier connu (4), on utilise quand même celui-ci (pas de carte plus petite pour l'instant).
const MAP_REGISTRY = {
  4: { image: 'carte_underhive.jpg', markers: TERRITORY_MARKERS_4P, polygons: TERRITORY_POLYGONS_4P },
  5: { image: 'carte_5_joueurs.jpg', markers: TERRITORY_MARKERS_5P, polygons: TERRITORY_POLYGONS_5P }
  // 6: carte 30 zones à venir
};

let currentMapMarkers = TERRITORY_MARKERS_4P;
let currentMapPolygons = TERRITORY_POLYGONS_4P;
let currentMapImage = 'carte_underhive.jpg';

function selectMapForPlayerCount(count) {
  let tiers = Object.keys(MAP_REGISTRY).map(Number).sort((a, b) => a - b);
  let chosen = tiers[0];
  tiers.forEach(t => { if (t <= count) chosen = t; });
  let mapDef = MAP_REGISTRY[chosen];
  currentMapMarkers = mapDef.markers;
  currentMapPolygons = mapDef.polygons;
  currentMapImage = mapDef.image;
}


function initLeafletMap() {
  if (campaignMap !== null) {
    campaignMap.remove();
    campaignMap = null;
  }
  zoneLayers = {};

  // La campagne peut avoir été créée avec un nombre de joueurs différent de la session
  // précédente (rechargement d'une sauvegarde) : on s'assure d'utiliser la bonne carte.
  selectMapForPlayerCount(campaignData.players.length);

  const bounds = [[0, 0], [1080, 1920]];

  campaignMap = L.map('campaign-map-container', {
    crs: L.CRS.Simple,
    minZoom: -2,
    maxZoom: 2,
    zoomSnap: 0.1,
    maxBounds: bounds,
    maxBoundsViscosity: 1.0
  });

  L.imageOverlay(currentMapImage, bounds).addTo(campaignMap);

  // Territoires actuellement engagés dans un défi non résolu ce cycle (halo rouge permanent + icône)
  let contestedTerritoryIds = new Set();
  let curCycleData = campaignData.cycleChallenges[campaignData.phases[campaignData.currentPhaseIndex].id];
  if (curCycleData) {
    curCycleData.challenges.forEach(c => { if (!c.resolved) contestedTerritoryIds.add(c.territoryId); });
  }

  // Génération des zones cliquables (halo pulsant au survol, coloré selon le propriétaire)
  if (campaignData && campaignData.territories) {
    campaignData.territories.forEach(ter => {
      const shape = currentMapPolygons[ter.id];
      if (!shape) return;

      let ownerGang = campaignData.players.find(p => p.id === ter.ownerId);
      let colorHex = ownerGang ? getPlayerColorHex(ownerGang.color) : '#8a8a8a';
      let isContested = contestedTerritoryIds.has(ter.id);

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
      // Territoire en jeu : halo rouge marqué, visible même sans survol
      let contestedStyle = {
        color: '#ff2b2b',
        weight: 3,
        opacity: 0.9,
        fillColor: '#ff2b2b',
        fillOpacity: 0.38
      };

      const layer = L.polygon(shape, isContested ? contestedStyle : restStyle).addTo(campaignMap);
      zoneLayers[ter.id] = layer;

      layer.bindTooltip(ter.name, { direction: 'center', className: 'zone-tooltip', opacity: 0.95 });

      function applyContestedLook(el) {
        if (!el) return;
        el.style.filter = 'drop-shadow(0 0 7px #ff2b2b) drop-shadow(0 0 18px #ff2b2b)';
        el.classList.add('zone-halo-pulse');
      }
      function applyRestLook(el) {
        if (!el) return;
        el.style.filter = '';
        el.classList.remove('zone-halo-pulse');
      }

      if (isContested) {
        let el0 = layer.getElement();
        applyContestedLook(el0);
      }

      layer.on('mouseover', function () {
        // Au survol, un territoire en jeu révèle temporairement son apparence normale
        // (couleur du propriétaire ou neutre) ; un territoire non contesté s'illumine comme d'habitude.
        this.setStyle(isContested ? restStyle : hoverStyle);
        let el = this.getElement();
        if (isContested) {
          applyRestLook(el);
        } else if (el) {
          el.style.filter = `drop-shadow(0 0 6px ${colorHex}) drop-shadow(0 0 16px ${colorHex})`;
          el.classList.add('zone-halo-pulse');
        }
      });
      layer.on('mouseout', function () {
        this.setStyle(isContested ? contestedStyle : restStyle);
        let el = this.getElement();
        if (isContested) {
          applyContestedLook(el);
        } else {
          applyRestLook(el);
        }
      });
      layer.on('click', function () {
        showZoneInfoPanel(ter, ownerGang, colorHex);
      });

      // Point/icône au centre de la zone : épées croisées si territoire en jeu, sinon pastille colorée
      const pos = currentMapMarkers[ter.id];
      if (pos) {
        const dotIcon = isContested
          ? L.divIcon({
              className: 'zone-dot-icon',
              html: `<div style="
                background-color: #ff2b2b;
                width: 26px;
                height: 26px;
                border-radius: 50%;
                border: 2px solid #ffffff;
                box-shadow: 0 0 10px rgba(255,0,0,0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
              ">⚔️</div>`,
              iconSize: [26, 26],
              iconAnchor: [13, 13]
            })
          : L.divIcon({
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

function toggleMapFullscreen() {
  let el = document.getElementById('map-fullscreen-target');
  if (!document.fullscreenElement) {
    el.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen();
  }
}
document.addEventListener('fullscreenchange', () => {
  if (campaignMap) setTimeout(() => campaignMap.invalidateSize(), 100);
});

window.onload = loadCampaignData;
