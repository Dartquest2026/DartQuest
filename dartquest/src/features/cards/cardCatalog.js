export const PACK_PRICE = 500

export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'ultimate']
export const RARITY_LABELS = {
  common: 'Gewöhnlich',
  uncommon: 'Ungewöhnlich',
  rare: 'Selten',
  epic: 'Episch',
  legendary: 'Legendär',
  ultimate: 'Ultimativ',
}

export const CATEGORIES = ['player', 'darts', 'jersey', 'dartboard']
export const CATEGORY_LABELS = {
  player: 'Dartspieler',
  darts: 'Dartpfeile',
  jersey: 'Darttrikot',
  dartboard: 'Dartscheibe',
}

export const SERIES = [
  { id: 1, label: 'Serie 1', first: 'DQ-001', last: 'DQ-100' },
]

const rarityAccent = {
  common: '#c6ccd0',
  uncommon: '#42e695',
  rare: '#4aa5ff',
  epic: '#b768ff',
  legendary: '#ffd34c',
  ultimate: '#eaffff',
}

const categorySubtitle = {
  player: 'Fiktiver DartQuest-Spieler',
  darts: 'Fiktives Dreier-Dartset',
  jersey: 'Fiktives DartQuest-Trikot',
  dartboard: 'Fiktive Dartscheibe',
}

const categoryDescription = {
  player: 'Eine Charakterkarte aus dem DartQuest-Universum mit eigener Haltung, Aura und Arena-Stimmung.',
  darts: 'Ein vollständiges Set aus Barrel, Shaft und Flight, entworfen für die DartQuest-Sammlung.',
  jersey: 'Ein hochwertiges Trikotmotiv ohne reale Sponsoren, Markenlogos oder geschützte Designs.',
  dartboard: 'Ein Sammlerboard mit korrekter Zahlenfolge und zur Seltenheit passender Lichtstimmung.',
}

const rarityMood = {
  common: 'Graphit und Silber, ruhiges Studiolicht',
  uncommon: 'grüne Akzente, fokussiertes Neonlicht',
  rare: 'elektrisches Blau, klare Turnierbeleuchtung',
  epic: 'violette Energie, dramatische Arena',
  legendary: 'goldener Schimmer, Champion-Licht',
  ultimate: 'Platin, Weißgold und grüne Energie, ultimatives Finale',
}

const artworkVariations = {
  player: [
    'ruhige Wurfvorbereitung im Profil', 'offene Siegerpose mit drei Pfeilen', 'konzentrierter Blick entlang des Dartpfeils', 'dynamische Bewegung am Oche',
    'selbstbewusste Frontansicht', 'angespannte Checkout-Situation', 'gelassene Trainingspose', 'Jubel nach einem entscheidenden Doppel',
  ],
  darts: [
    'schlanke gerändelte Barrels und geometrische Flights', 'breite Ringgriffe und kantige Flights', 'feine Shark-Grips und matte Flights', 'glatte Torpedo-Barrels und transparente Flights',
    'präzise Fräsungen und aerodynamische Flights', 'kontrastreiche Metallsegmente und technische Flights',
  ],
  jersey: [
    'asymmetrische Linien und matter Funktionsstoff', 'radiale Dartboard-Nähte und glänzende Einsätze', 'klare Chevron-Flächen und strukturierte Ärmel',
    'feine Leiterbahnmuster und leuchtende Paspeln', 'kantige Schulterpartien und tonale Geometrie',
  ],
  dartboard: [
    'klassisches Graphit-Schwarz mit silbernem Draht', 'strenges Schwarz-Weiß mit hohem Kontrast', 'elektrisches Neon mit leuchtenden Segmentringen',
    'gefrorenes Eis und kristalline Oberflächen', 'glühende Lavaadern und dunkles Vulkangestein', 'Obsidian und graviertes Gold',
    'holografische Spektralfarben', 'kosmischer Nachthimmel und violette Energie', 'gebürstetes Platin und Weißgold',
    'smaragdgrüne Leiterbahnen', 'karmesinrote Arena-Beleuchtung', 'königliches Blau und Gold', 'matte Kohlefaser mit kupferfarbenem Spider',
    'weißer Marmor mit tiefschwarzen Segmenten', 'irisierendes Titan mit polarisiertem Licht',
  ],
}

const colorPalettes = [
  'Graphit, Schwarz und gebürstetes Silber', 'Tiefschwarz und Smaragdgrün', 'Anthrazit und elektrisches Blau',
  'Schwarz, Eisblau und Weiß', 'Dunkelrot, Kupfer und Glut-Orange', 'Violett, Magenta und kaltes Blau',
  'Obsidian, Gold und warmes Bernstein', 'Platin, Weißgold und prismatische Reflexe', 'Petrol, Cyan und dunkles Chrom',
  'Waldgrün, Carbon und dezentes Messing',
]

const perspectives = {
  player: ['Halbfigur frontal auf Augenhöhe', 'Dreiviertelansicht von leicht unten', 'Seitenprofil mit Blick zum Board', 'dynamische Nahaufnahme aus Oche-Perspektive', 'Ganzkörperansicht mit sichtbarer Wurflinie'],
  darts: ['symmetrische Frontansicht als Fächer', 'leichte Draufsicht mit diagonalem Verlauf', 'tiefe Produktperspektive mit Spitzen im Vordergrund', 'schwebende Dreiecksformation', 'parallele Studioanordnung mit leichter Drehung'],
  jersey: ['frontale Produktansicht mit angedeuteter Rückseite', 'Dreiviertelansicht auf unsichtbarer Schneiderpuppe', 'schwebende Vorder- und Rückansicht', 'leichte Untersicht mit plastischem Faltenwurf', 'symmetrische Katalogansicht auf Augenhöhe'],
  dartboard: ['exakt frontale, zentrierte Gesamtansicht', 'nahezu frontal mit minimaler plastischer Tiefe', 'zentrierte Produktansicht mit sichtbarem Außenring'],
}

const materials = {
  player: ['matter Funktionsstoff mit feinen Carbon-Einsätzen', 'strukturierter Performance-Stoff mit metallischen Paspeln', 'atmungsaktives Gewebe mit tonalen geometrischen Nähten', 'seidiger Sportstoff mit matten Schulterpanelen'],
  darts: ['Tungsten-artige Barrels, eloxierte Shafts und bedruckungsfreie Flights', 'gebürstetes Metall, gefräste Ringgriffe und matte Flights', 'dunkles Titan-Finish, Shark-Grip und transparente Flights', 'poliertes Metall, Axialfräsung und Carbon-artige Shafts', 'Messing-Finish, gerändelte Griffzonen und robuste Flights'],
  jersey: ['matter Funktionsstoff mit Mesh-Seitenzonen', 'strukturierter Mikrofaserstoff mit glänzenden Paspeln', 'Carbon-artiges Gewebe mit gummierten Details', 'leichter Performance-Stoff mit geprägtem Muster', 'seidiger Stoff mit metallisch wirkenden Einsätzen'],
  dartboard: ['dichte Sisalstruktur und präziser Metall-Spider', 'matte Verbundoberfläche und eingelassener Draht', 'kristalline Segmenttextur und hochglänzender Spider', 'vulkanische Steintextur und glühende Metallringe', 'polierte Metalloberfläche und fein gravierte Segmente'],
}

const rarityEffects = {
  common: 'dezente Studioreflexe, keine Energiepartikel',
  uncommon: 'sanfter grüner Randglanz und wenige Lichtpartikel',
  rare: 'elektrische blaue Lichtadern und kontrollierter Nebel',
  epic: 'violette oder dunkelrote Energie, Funken und dramatischer Kontrast',
  legendary: 'goldene Partikel, Lichtstrahlen und hochwertiger metallischer Schimmer',
  ultimate: 'starke Platinenergie, prismatische Lichtbrechung und schwebende Lichtpartikel',
}

const playerNames = [
  ['Der Rookie', 'common'], ['Ruhige Hand', 'common'], ['Der Vereinswerfer', 'common'], ['Feierabend-Spieler', 'common'], ['Die Einsteigerin', 'common'],
  ['Der Punktesammler', 'common'], ['Doppel-Lehrling', 'common'], ['Der Trainingspartner', 'common'], ['Board-Neuling', 'common'], ['Der Herausforderer', 'common'],
  ['Präzisions-Talent', 'uncommon'], ['Die Fokus-Spielerin', 'uncommon'], ['Triple-Sucher', 'uncommon'], ['Der Comeback-Spieler', 'uncommon'], ['Doppeljägerin', 'uncommon'],
  ['Der Taktiker', 'uncommon'], ['Captain Checkout', 'uncommon'], ['Die Konstante', 'uncommon'], ['Der Finisher', 'uncommon'], ['Board Commander', 'rare'],
  ['Ice Queen', 'rare'], ['The Machine', 'rare'], ['Night Thrower', 'rare'], ['Der Präzisions-Profi', 'rare'], ['Die Triple-Jägerin', 'rare'],
  ['Checkout-König', 'rare'], ['Bullseye Hunter', 'rare'], ['Der Unbeugsame', 'epic'], ['Queen of Doubles', 'epic'], ['Der 180er-Jäger', 'epic'],
  ['Crimson Arrow', 'epic'], ['Emerald Striker', 'epic'], ['Der Arenakönig', 'epic'], ['Phantom des Oche', 'epic'], ['Doppel-Meister', 'legendary'],
  ['Bullseye-Legende', 'legendary'], ['Die Unbesiegte', 'legendary'], ['Champion der Welten', 'legendary'], ['DartQuest Gamemaster', 'ultimate'], ['Der ewige Weltmeister', 'ultimate'],
]

const dartNames = [
  ['Starter Brass', 'common'], ['Training Grip', 'common'], ['Straight Barrel', 'common'], ['Soft Touch', 'common'], ['Classic Silver', 'common'],
  ['Green Starter', 'common'], ['Black Beginner', 'common'], ['Copper Flight', 'common'], ['Precision Ring', 'uncommon'], ['Double Grip', 'uncommon'],
  ['Midnight Steel', 'uncommon'], ['Emerald Point', 'uncommon'], ['Arctic Grip', 'uncommon'], ['Redline Barrel', 'uncommon'], ['Carbon Hunter', 'rare'],
  ['Blue Thunder', 'rare'], ['Golden Checkout', 'rare'], ['Triple Force', 'rare'], ['Ice Needle', 'rare'], ['Venom Strike', 'epic'],
  ['Plasma Dart', 'epic'], ['Dragon Barrel', 'epic'], ['Royal Precision', 'legendary'], ['Bullseye Sovereign', 'legendary'], ['Eternal Arrow', 'ultimate'],
]

const jerseyNames = [
  ['Vereinsgrün', 'common'], ['Rookie Black', 'common'], ['Training Blue', 'common'], ['Classic Red', 'common'], ['Board Gray', 'common'],
  ['Checkout Green', 'common'], ['Double Line', 'uncommon'], ['Triple Pattern', 'uncommon'], ['Neon Oche', 'uncommon'], ['Arctic Player', 'uncommon'],
  ['Crimson Team', 'uncommon'], ['Emerald League', 'rare'], ['Midnight Champion', 'rare'], ['Golden Checkout', 'rare'], ['Electric Bull', 'rare'],
  ['Purple Phantom', 'epic'], ['Inferno League', 'epic'], ['Royal DartQuest', 'epic'], ['Legendäres Gold', 'legendary'], ['Weltmeister-Platin', 'legendary'],
]

const boardNames = [
  ['Training Board', 'common'], ['Classic Board', 'common'], ['Vereinsboard', 'common'], ['Starter Bull', 'common'], ['Green Practice', 'uncommon'],
  ['Precision Wire', 'uncommon'], ['Midnight Board', 'uncommon'], ['Tournament Green', 'rare'], ['Arctic Bull', 'rare'], ['Crimson Arena', 'rare'],
  ['Neon Challenge', 'epic'], ['Dragon Board', 'epic'], ['Royal Championship', 'epic'], ['Golden Bullseye', 'legendary'], ['Eternal DartQuest Board', 'legendary'],
]

const sourceGroups = [
  ['player', playerNames],
  ['darts', dartNames],
  ['jersey', jerseyNames],
  ['dartboard', boardNames],
]

function idFor(collectionNumber) {
  return `DQ-${String(collectionNumber).padStart(3, '0')}`
}

const seriesOneImageOverrides = Object.freeze({
  'DQ-001': '/assets/cards/series-1/DQ-001-v2.webp',
  'DQ-002': '/assets/cards/series-1/DQ-002-v2.webp',
  // The supplied third V2 asset is currently a PNG with this exact filename.
  'DQ-003': '/assets/cards/series-1/DQ-003-v2.webp.png',
  'DQ-004': '/assets/cards/series-1/DQ-004-v2.webp',
})

function imageForCard(id) {
  return seriesOneImageOverrides[id] ?? `/assets/cards/series-1/${id}.webp`
}

function makePrompt(card) {
  const variations = artworkVariations[card.category]
  const variation = variations[(card.collectionNumber - 1) % variations.length]
  const palette = colorPalettes[(card.collectionNumber * 3) % colorPalettes.length]
  const perspectiveList = perspectives[card.category]
  const materialList = materials[card.category]
  const perspective = perspectiveList[(card.collectionNumber * 5 + 1) % perspectiveList.length]
  const material = materialList[(card.collectionNumber * 7 + 2) % materialList.length]
  const base = `Individuelles zentrales Motiv für ${card.id}, ${CATEGORY_LABELS[card.category]} "${card.name}". Motiv: ${variation}. Farbwelt: ${palette}. Pose oder Perspektive: ${perspective}. Material: ${material}. Seltenheit ${RARITY_LABELS[card.rarity]}: ${rarityMood[card.rarity]}, ${rarityEffects[card.rarity]}. Hochwertiges realistisches Mobile-Game-Sammelkartenmotiv im Hochformat, Motiv ohne Kartenrahmen und ohne Text`
  if (card.category === 'player') return `${base}, fiktive vielfältige Person mit Dartpfeilen, individuelle Pose, schwarz-grünes DartQuest-Trikot, Dart-Arena im Hintergrund, keine reale Person, keine fremden Logos.`
  if (card.category === 'darts') return `${base}, vollständiges Dreier-Set mit Barrel, Shaft und Flight, klares Produktmotiv, Metall- und Lichteffekte passend zur Seltenheit, keine echten Marken, keine geschützten Produktdesigns.`
  if (card.category === 'jersey') return `${base}, Vorderseite und Rückseite eines fiktiven Darttrikots angedeutet, keine Sponsoren, keine realen Logos, sauberer Studiohintergrund.`
  return `${base}, Dartscheibe mit korrekter Zahlenfolge 20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5, keine falsche Zahlenanordnung, keine realen Marken.`
}

export const CARD_CATALOG = Object.freeze(sourceGroups.flatMap(([category, items], groupIndex) => {
  const start = sourceGroups.slice(0, groupIndex).reduce((sum, [, groupItems]) => sum + groupItems.length, 0)
  return items.map(([name, rarity], index) => {
    const collectionNumber = start + index + 1
    const id = idFor(collectionNumber)
    const image = imageForCard(id)
    const card = {
      id,
      collectionNumber,
      series: 1,
      category,
      name,
      subtitle: categorySubtitle[category],
      description: categoryDescription[category],
      rarity,
      image,
      artwork: image,
      accentColor: rarityAccent[rarity],
    }
    return Object.freeze({ ...card, artworkPrompt: makePrompt(card) })
  })
}))

export function getCardById(id) {
  return CARD_CATALOG.find((card) => card.id === id) ?? null
}

export function getCollectionSize(series = 1) {
  return CARD_CATALOG.filter((card) => card.series === series).length
}

export function rarityIndex(rarity) {
  return Math.max(0, RARITIES.indexOf(rarity))
}

const weights = { common: 45, uncommon: 28, rare: 16, epic: 7, legendary: 3, ultimate: 1 }

function pickRarity(random, minimumRare = false) {
  const pool = RARITIES.filter((rarity) => !minimumRare || rarityIndex(rarity) >= rarityIndex('rare'))
  const total = pool.reduce((sum, rarity) => sum + weights[rarity], 0)
  let roll = random() * total
  for (const rarity of pool) {
    roll -= weights[rarity]
    if (roll <= 0) return rarity
  }
  return pool.at(-1)
}

export function openFiveCardPack(random = Math.random, options = {}) {
  const series = options.series ?? 1
  const availableCards = CARD_CATALOG.filter((card) => card.series === series)
  return Array.from({ length: 5 }, (_, index) => {
    const rarity = pickRarity(random, index === 4)
    const candidates = availableCards.filter((card) => card.rarity === rarity)
    const fallback = candidates.length ? candidates : availableCards
    return fallback[Math.floor(random() * fallback.length)]
  })
}
