// The four rooms, the 16 crafts, what each room keeps in its stash, the planner stages and the toolbox.
// One source of truth for labels, colours and icons across the app.

export const ROOMS = [
  {
    key: 'fabric', name: 'Fabric and thread', family: 'pink', tone: 'Pinks', art: '/art/room-fabric.webp',
    blurb: 'Dress forms, quilts, hoops and the mending basket.',
    alt: 'Painted sewing corner with a dress form, a patchwork quilt, embroidery hoops and a mending basket',
  },
  {
    key: 'yarn', name: 'Yarn and fibre', family: 'pur', tone: 'Purples', art: '/art/room-yarn.webp',
    blurb: 'Needles, hooks, cords and the little loom.',
    alt: 'Painted reading nook with a half-knitted lilac cardigan, a yarn basket, a crochet bunny, macrame and a small loom',
  },
  {
    key: 'paper', name: 'Paper and cutting', family: 'blu', tone: 'Blues', art: '/art/room-paper.webp',
    blurb: 'Albums, cards, stamps and the cutting machine.',
    alt: 'Painted paper-craft desk with a scrapbook, handmade cards, washi tape, stamps and a cutting machine',
  },
  {
    key: 'studio', name: 'Studio', family: 'grn', tone: 'Greens', art: '/art/room-studio.webp',
    blurb: 'Beads, candles, soap and everything else you make.',
    alt: 'Painted workbench with beads, candles in jars, soap curing on a rack and dried flowers',
  },
]

export const ROOM = Object.fromEntries(ROOMS.map((r) => [r.key, r]))

export const CRAFTS = [
  { slug: 'sewing', name: 'Sewing and dressmaking', short: 'Sewing', room: 'fabric', icon: 'i-sewing' },
  { slug: 'quilting', name: 'Quilting and patchwork', short: 'Quilting', room: 'fabric', icon: 'i-quilt' },
  { slug: 'embroidery', name: 'Embroidery and cross-stitch', short: 'Embroidery', room: 'fabric', icon: 'i-embroidery' },
  { slug: 'mending', name: 'Mending and sashiko', short: 'Mending', room: 'fabric', icon: 'i-mending' },
  { slug: 'cosplay', name: 'Cosplay and costume', short: 'Cosplay', room: 'fabric', icon: 'i-cosplay' },
  { slug: 'knitting', name: 'Knitting', short: 'Knitting', room: 'yarn', icon: 'i-knitting' },
  { slug: 'crochet', name: 'Crochet', short: 'Crochet', room: 'yarn', icon: 'i-crochet' },
  { slug: 'macrame', name: 'Macramé', short: 'Macramé', room: 'yarn', icon: 'i-macrame' },
  { slug: 'weaving', name: 'Weaving', short: 'Weaving', room: 'yarn', icon: 'i-weaving' },
  { slug: 'punch-needle', name: 'Punch needle', short: 'Punch needle', room: 'yarn', icon: 'i-punch' },
  { slug: 'scrapbooking', name: 'Scrapbooking', short: 'Scrapbooking', room: 'paper', icon: 'i-scrapbook' },
  { slug: 'cards', name: 'Card making and junk journals', short: 'Cards and journals', room: 'paper', icon: 'i-card' },
  { slug: 'cutting', name: 'Cutting machine projects', short: 'Cutting machine', room: 'paper', icon: 'i-cutting' },
  { slug: 'jewellery', name: 'Jewellery and beading', short: 'Jewellery', room: 'studio', icon: 'i-jewellery' },
  { slug: 'candles-soap', name: 'Candles and soap', short: 'Candles and soap', room: 'studio', icon: 'i-candle' },
  { slug: 'general', name: 'General crafts', short: 'General crafts', room: 'studio', icon: 'i-general' },
]

export const CRAFT = Object.fromEntries(CRAFTS.map((c) => [c.slug, c]))

export function craftsInRoom(room) {
  return CRAFTS.filter((c) => c.room === room)
}

export function familyOf(craftOrRoom) {
  if (!craftOrRoom) return 'pur'
  const room = ROOM[craftOrRoom] ? craftOrRoom : CRAFT[craftOrRoom]?.room
  return ROOM[room]?.family || 'pur'
}

export function roomOf(craft) {
  return CRAFT[craft]?.room || 'studio'
}

// Shared by every room
export const SHARED = ['Library', 'Makes journal', 'Stash', 'Planner', 'Shopping list', 'Toolbox']

// What each room's stash holds, and which fields each kind asks for
export const STASH_KINDS = {
  fabric: [
    { key: 'fabric', label: 'Fabric', unit: 'm', fields: ['colour', 'fibre', 'material', 'width_cm', 'quantity', 'weight_gsm', 'stretch_pct', 'location'] },
    { key: 'thread', label: 'Thread', unit: 'each', fields: ['colour', 'fibre', 'quantity', 'location'] },
    { key: 'notion', label: 'Notions', unit: 'each', fields: ['colour', 'material', 'quantity', 'location'] },
    { key: 'interfacing', label: 'Interfacing', unit: 'm', fields: ['material', 'width_cm', 'quantity', 'location'] },
  ],
  yarn: [
    { key: 'yarn', label: 'Yarn', unit: 'balls', fields: ['colour', 'fibre', 'yarn_weight', 'metres_per_unit', 'quantity', 'dye_lot', 'location'] },
    { key: 'cord', label: 'Cord', unit: 'm', fields: ['colour', 'fibre', 'material', 'quantity', 'location'] },
    { key: 'fibre', label: 'Fibre', unit: 'g', fields: ['colour', 'fibre', 'quantity', 'location'] },
    { key: 'tool', label: 'Needles and hooks', unit: 'each', fields: ['material', 'quantity', 'location'] },
  ],
  paper: [
    { key: 'paper', label: 'Paper', unit: 'sheets', fields: ['colour', 'material', 'quantity', 'location'] },
    { key: 'embellishment', label: 'Embellishments', unit: 'each', fields: ['colour', 'material', 'quantity', 'location'] },
    { key: 'stamp', label: 'Stamps and dies', unit: 'each', fields: ['material', 'quantity', 'location'] },
    { key: 'vinyl', label: 'Vinyl', unit: 'sheets', fields: ['colour', 'material', 'quantity', 'location'] },
  ],
  studio: [
    { key: 'bead', label: 'Beads and findings', unit: 'each', fields: ['colour', 'material', 'quantity', 'location'] },
    { key: 'wax', label: 'Wax', unit: 'g', fields: ['material', 'quantity', 'location'] },
    { key: 'oil', label: 'Oils', unit: 'ml', fields: ['material', 'quantity', 'location'] },
    { key: 'fragrance', label: 'Fragrance', unit: 'ml', fields: ['material', 'quantity', 'location'] },
    { key: 'other', label: 'Supplies', unit: 'each', fields: ['colour', 'material', 'quantity', 'location'] },
  ],
}

export const STASH_KIND = Object.fromEntries(
  Object.entries(STASH_KINDS).flatMap(([room, kinds]) => kinds.map((k) => [k.key, { ...k, room }])),
)

export const FIELD_LABELS = {
  colour: 'Colour', fibre: 'Fibre', material: 'Type', width_cm: 'Width (cm)', quantity: 'How much',
  weight_gsm: 'Weight (gsm)', stretch_pct: 'Stretch (%)', yarn_weight: 'Yarn weight',
  metres_per_unit: 'Metres per ball', dye_lot: 'Dye lot', location: 'Where it lives',
}

export const UNITS = ['m', 'yd', 'cm', 'g', 'balls', 'skeins', 'sheets', 'each', 'ml']

export const YARN_WEIGHTS = ['Lace', 'Fingering', 'Sport', 'DK', 'Worsted', 'Aran', 'Chunky', 'Super chunky']

// Planner stages. Labels follow the craft: sewing is cut and sewn, everything else is prepped and made.
export const STAGES = ['daydream', 'planned', 'cut', 'making', 'finished', 'loved']

export function stageLabel(stage, craft) {
  const sewn = ['sewing', 'quilting', 'cosplay'].includes(craft)
  const labels = {
    daydream: 'Daydream',
    planned: 'Planned',
    cut: sewn ? 'Cut' : 'Prepped',
    making: sewn ? 'Sewing' : 'Making',
    finished: 'Finished',
    loved: craft === 'sewing' || craft === 'knitting' || craft === 'crochet' ? 'Worn and loved' : 'Loved',
  }
  return labels[stage] || stage
}

// Each room's own tools. "ready" tools live in the toolbox today; the rest are listed so the room shows its plan.
export const TOOLS = {
  fabric: [
    { key: 'size', name: 'Size picker with a between-sizes flag', ready: true, where: 'Every pattern card' },
    { key: 'convert', name: 'Metres, yards, centimetres and inches', ready: true },
    { key: 'width', name: 'Fabric width swap', ready: true },
    { key: 'circle', name: 'Circle skirt calculator', ready: true },
    { key: 'bias', name: 'Bias binding calculator', ready: true },
    { key: 'stretch', name: 'Stretch test', ready: true },
    { key: 'quilt', name: 'Quilt backing calculator', ready: true },
    { key: 'files', name: 'Print at home, A0 copyshop and projector files together', ready: true, where: 'Every pattern card' },
    { key: 'repair', name: 'Repair log', ready: true, where: 'Makes journal' },
  ],
  yarn: [
    { key: 'counter', name: 'Row and stitch counters', ready: true },
    { key: 'gauge', name: 'Tension (gauge) calculator', ready: true },
    { key: 'swap', name: 'Yarn swaps by weight and length', ready: true },
    { key: 'hooks', name: 'Hook and needle sizes', ready: true },
    { key: 'terms', name: 'US and UK crochet terms', ready: true },
    { key: 'cord', name: 'Macramé cord length', ready: true },
  ],
  paper: [
    { key: 'paper', name: 'Paper sizes', ready: true },
    { key: 'occasions', name: 'Birthdays and occasions', ready: true, where: 'Planner due dates' },
    { key: 'cutfiles', name: 'Cut-file library', ready: true, where: 'Library, as pattern files' },
  ],
  studio: [
    { key: 'beads', name: 'Bead count for a strand', ready: true },
    { key: 'fragrance', name: 'Fragrance load for candles', ready: true },
    { key: 'batch', name: 'Batch log with curing dates', ready: true, where: 'Makes journal' },
    { key: 'lye', name: 'Soap lye calculator', ready: false, note: 'Held back until it is checked against published values' },
  ],
}

export const SNAP_TYPES = [
  { key: 'envelope', label: 'Pattern envelope', hint: 'The back of a paper pattern envelope, or the front for the cover.' },
  { key: 'fabric', label: 'Fabric bolt or label', hint: 'The end of the bolt or the selvedge label.' },
  { key: 'yarn', label: 'Yarn ball band', hint: 'The paper band around a ball or skein.' },
  { key: 'notion', label: 'Notion, bead or paper pack', hint: 'Any packet label.' },
]
