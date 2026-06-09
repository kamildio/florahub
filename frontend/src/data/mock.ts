import type { Category, City, Order, Product, Seller } from '@/lib/types'

export const cities: City[] = [
  { id: 'c1', slug: 'shymkent', name: { kk: 'Шымкент', ru: 'Шымкент', en: 'Shymkent' }, active: true, primary: true },
  { id: 'c2', slug: 'almaty', name: { kk: 'Алматы', ru: 'Алматы', en: 'Almaty' }, active: true },
  { id: 'c3', slug: 'astana', name: { kk: 'Астана', ru: 'Астана', en: 'Astana' }, active: true },
  { id: 'c4', slug: 'taraz', name: { kk: 'Тараз', ru: 'Тараз', en: 'Taraz' }, active: false },
]

export const categories: Category[] = [
  { id: 'cat1', slug: 'bouquets', name: { kk: 'Гүл шоқтары', ru: 'Букеты', en: 'Bouquets' }, icon: 'Flower2' },
  { id: 'cat2', slug: 'roses', name: { kk: 'Раушан гүлдері', ru: 'Розы', en: 'Roses' }, icon: 'Flower' },
  { id: 'cat3', slug: 'boxes', name: { kk: 'Қораптағы гүлдер', ru: 'Цветы в коробке', en: 'Flowers in a box' }, icon: 'Package' },
  { id: 'cat4', slug: 'wedding', name: { kk: 'Той', ru: 'Свадебные', en: 'Wedding' }, icon: 'Heart' },
  { id: 'cat5', slug: 'birthday', name: { kk: 'Туған күн', ru: 'День рождения', en: 'Birthday' }, icon: 'Gift' },
  { id: 'cat6', slug: 'plants', name: { kk: 'Бөлме өсімдіктері', ru: 'Растения', en: 'Plants' }, icon: 'Sprout' },
]

export const sellers: Seller[] = [
  { id: 's1', name: 'Studio Bloom', rating: 4.9, reviews: 482, city: 'c1', since: 2021, verified: true },
  { id: 's2', name: 'Pion & Co', rating: 4.8, reviews: 311, city: 'c1', since: 2022, verified: true },
  { id: 's3', name: 'Roza House', rating: 4.7, reviews: 198, city: 'c2', since: 2020, verified: true },
  { id: 's4', name: 'Green Garden', rating: 4.6, reviews: 142, city: 'c1', since: 2023, verified: false },
]

// Curated Unsplash flower photos; a gradient fallback renders if a URL fails.
const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`

export const products: Product[] = [
  {
    id: 'p1', slug: 'spring-tenderness',
    name: { kk: 'Көктем нәзіктігі', ru: 'Весенняя нежность', en: 'Spring Tenderness' },
    description: {
      kk: 'Пионтәрізді раушан гүлдері, эустома және маусымдық көктем гүлдерінен жасалған нәзік шоқ.',
      ru: 'Нежный букет из пионовидных роз, эустомы и сезонных весенних цветов в пастельной гамме.',
      en: 'A delicate bouquet of peony roses, lisianthus and seasonal spring flowers in pastel tones.',
    },
    price: 18900, oldPrice: 22000, image: img('photo-1490750967868-88aa4486c946'),
    categoryId: 'cat1', sellerId: 's1', cityIds: ['c1', 'c2'], rating: 4.9, reviews: 124,
    tags: ['bestseller', 'sale'], inStock: true,
  },
  {
    id: 'p2', slug: 'red-passion-51',
    name: { kk: 'Қызыл құмарлық, 51 раушан', ru: 'Красная страсть, 51 роза', en: 'Red Passion, 51 roses' },
    description: {
      kk: '51 эквадорлық қызыл раушаннан жасалған классикалық шоқ — сезімнің символы.',
      ru: 'Классический букет из 51 эквадорской красной розы — символ сильных чувств.',
      en: 'A classic bouquet of 51 Ecuadorian red roses — a symbol of strong feelings.',
    },
    price: 32500, image: img('photo-1487070183336-b863922373d4'),
    categoryId: 'cat2', sellerId: 's2', cityIds: ['c1'], rating: 4.8, reviews: 89,
    tags: ['premium'], inStock: true,
  },
  {
    id: 'p3', slug: 'peony-cloud',
    name: { kk: 'Пион бұлты', ru: 'Пионовое облако', en: 'Peony Cloud' },
    description: {
      kk: 'Маусымдық ақ-қызғылт пиондар — мерекеге де, жай көңіл-күйге де.',
      ru: 'Сезонные бело-розовые пионы — для праздника и просто хорошего настроения.',
      en: 'Seasonal white-and-pink peonies — for a celebration or simply a good mood.',
    },
    price: 24900, image: img('photo-1457089328109-e5d9bd499191'),
    categoryId: 'cat1', sellerId: 's1', cityIds: ['c1', 'c3'], rating: 5.0, reviews: 67,
    tags: ['new', 'bestseller'], inStock: true,
  },
  {
    id: 'p4', slug: 'sunny-box',
    name: { kk: 'Күн қорабы', ru: 'Солнечная коробка', en: 'Sunny Box' },
    description: {
      kk: 'Күнбағыс, хризантема және раушан гүлдері бар шляпа-қорап.',
      ru: 'Шляпная коробка с подсолнухами, хризантемами и кустовыми розами.',
      en: 'A hat box with sunflowers, chrysanthemums and spray roses.',
    },
    price: 16500, image: img('photo-1563241527-3004b7be0ffd'),
    categoryId: 'cat3', sellerId: 's3', cityIds: ['c1', 'c2'], rating: 4.7, reviews: 53,
    tags: ['new'], inStock: true,
  },
  {
    id: 'p5', slug: 'white-wedding',
    name: { kk: 'Ақ той', ru: 'Белая свадьба', en: 'White Wedding' },
    description: {
      kk: 'Аққудай таза раушан, фрезия және гипсофиладан жасалған салтанатты шоқ.',
      ru: 'Свадебный букет невесты из белоснежных роз, фрезии и гипсофилы.',
      en: 'A bridal bouquet of snow-white roses, freesia and gypsophila.',
    },
    price: 28900, image: img('photo-1519378058457-4c29a0a2efac'),
    categoryId: 'cat4', sellerId: 's2', cityIds: ['c1'], rating: 4.9, reviews: 41,
    tags: ['premium'], inStock: true,
  },
  {
    id: 'p6', slug: 'birthday-confetti',
    name: { kk: 'Туған күн конфетти', ru: 'Праздничное конфетти', en: 'Birthday Confetti' },
    description: {
      kk: 'Әртүрлі түсті гербер, раушан және альстромериядан жасалған көңілді шоқ.',
      ru: 'Яркий микс из разноцветных гербер, роз и альстромерий для дня рождения.',
      en: 'A bright mix of multicolored gerberas, roses and alstroemeria for a birthday.',
    },
    price: 14900, image: img('photo-1508610048659-a06b669e3321'),
    categoryId: 'cat5', sellerId: 's4', cityIds: ['c1', 'c2', 'c3'], rating: 4.6, reviews: 38,
    tags: ['bestseller'], inStock: true,
  },
  {
    id: 'p7', slug: 'lavender-dream',
    name: { kk: 'Лаванда арманы', ru: 'Лавандовый сон', en: 'Lavender Dream' },
    description: {
      kk: 'Лаванда, эустома және көк гортензиядан жасалған хош иісті шоқ.',
      ru: 'Ароматный букет из лаванды, эустомы и голубой гортензии.',
      en: 'A fragrant bouquet of lavender, lisianthus and blue hydrangea.',
    },
    price: 21500, image: img('photo-1468327768560-75b778cbb551'),
    categoryId: 'cat1', sellerId: 's1', cityIds: ['c1'], rating: 4.8, reviews: 29,
    tags: ['new'], inStock: true,
  },
  {
    id: 'p8', slug: 'monstera-plant',
    name: { kk: 'Монстера', ru: 'Монстера в кашпо', en: 'Monstera in a pot' },
    description: {
      kk: 'Үй мен кеңсеге арналған сәнді монстера өсімдігі керамикалық кашподе.',
      ru: 'Стильная монстера в керамическом кашпо для дома и офиса.',
      en: 'A stylish monstera plant in a ceramic pot for home or office.',
    },
    price: 12900, image: img('photo-1614594975525-e45190c55d0b'),
    categoryId: 'cat6', sellerId: 's4', cityIds: ['c1', 'c2'], rating: 4.5, reviews: 22,
    tags: [], inStock: true,
  },
  {
    id: 'p9', slug: 'pink-tulips-25',
    name: { kk: '25 қызғалдақ', ru: '25 розовых тюльпанов', en: '25 Pink Tulips' },
    description: {
      kk: 'Көктемнің символы — 25 нәзік қызғылт қызғалдақ.',
      ru: 'Символ весны — 25 нежных розовых тюльпанов в крафтовой упаковке.',
      en: 'A symbol of spring — 25 tender pink tulips in craft wrapping.',
    },
    price: 11900, image: img('photo-1520763185298-1b434c919102'),
    categoryId: 'cat1', sellerId: 's3', cityIds: ['c1', 'c2', 'c3'], rating: 4.7, reviews: 64,
    tags: ['sale'], oldPrice: 13900, inStock: true,
  },
  {
    id: 'p10', slug: 'white-roses-box',
    name: { kk: 'Ақ раушан қорабы', ru: 'Белые розы в коробке', en: 'White Roses Box' },
    description: {
      kk: '29 ақ раушан элегантты қорапта — сабырлы әрі салтанатты.',
      ru: '29 белых роз в элегантной коробке — сдержанно и торжественно.',
      en: '29 white roses in an elegant box — understated and festive.',
    },
    price: 26500, image: img('photo-1561181286-d3fee7d55364'),
    categoryId: 'cat3', sellerId: 's2', cityIds: ['c1'], rating: 4.9, reviews: 31,
    tags: ['premium', 'new'], inStock: true,
  },
  {
    id: 'p11', slug: 'autumn-warmth',
    name: { kk: 'Күз жылуы', ru: 'Осеннее тепло', en: 'Autumn Warmth' },
    description: {
      kk: 'Қызғылт сары раушан, эвкалипт және маусымдық жасылдан жасалған жылы шоқ.',
      ru: 'Тёплый букет из оранжевых роз, эвкалипта и сезонной зелени.',
      en: 'A warm bouquet of orange roses, eucalyptus and seasonal greenery.',
    },
    price: 19900, image: img('photo-1599733589046-75e7bcc5e3c4'),
    categoryId: 'cat1', sellerId: 's1', cityIds: ['c1', 'c2'], rating: 4.8, reviews: 27,
    tags: [], inStock: true,
  },
  {
    id: 'p12', slug: 'mono-hydrangea',
    name: { kk: 'Гортензия моношоғы', ru: 'Моно из гортензий', en: 'Hydrangea Mono' },
    description: {
      kk: 'Бес көк гортензиядан жасалған көлемді моношоқ.',
      ru: 'Объёмный монобукет из пяти голубых гортензий.',
      en: 'A voluminous mono bouquet of five blue hydrangeas.',
    },
    price: 22900, image: img('photo-1563241527-3004b7be0ffd'),
    categoryId: 'cat2', sellerId: 's3', cityIds: ['c2', 'c3'], rating: 4.6, reviews: 18,
    tags: [], inStock: false,
  },
]

// Seed orders for the demo customer (phone +7 777 123 45 67).
export const seedOrders: Order[] = [
  {
    id: 'o1', number: 'FH-100482', createdAt: '2026-06-09T14:20:00',
    status: 'delivering', total: 18900, cityId: 'c1', sellerId: 's1',
    items: [{ product: products[0], quantity: 1 }],
    recipient: { name: 'Айгерим', phone: '+77011234567', address: 'Шымкент, мкр. Нурсат, д. 12, кв. 45' },
    deliveryAt: '2026-06-10T16:00:00',
    timeline: [
      { status: 'pending', at: '2026-06-09T14:20:00' },
      { status: 'accepted', at: '2026-06-09T14:35:00', note: 'Studio Bloom' },
      { status: 'assembling', at: '2026-06-10T14:10:00' },
      { status: 'delivering', at: '2026-06-10T15:05:00', note: '+7 707 555 22 11' },
    ],
  },
  {
    id: 'o2', number: 'FH-100311', createdAt: '2026-05-28T10:05:00',
    status: 'completed', total: 32500, cityId: 'c1', sellerId: 's2',
    items: [{ product: products[1], quantity: 1 }],
    recipient: { name: 'Данияр', phone: '+77019998877', address: 'Шымкент, пр. Тауке хана, 25' },
    deliveryAt: '2026-05-28T18:00:00',
    timeline: [
      { status: 'pending', at: '2026-05-28T10:05:00' },
      { status: 'accepted', at: '2026-05-28T10:12:00' },
      { status: 'assembling', at: '2026-05-28T16:00:00' },
      { status: 'delivering', at: '2026-05-28T17:10:00' },
      { status: 'completed', at: '2026-05-28T17:58:00' },
    ],
  },
  {
    id: 'o3', number: 'FH-099840', createdAt: '2026-05-12T09:30:00',
    status: 'completed', total: 26800, cityId: 'c1', sellerId: 's1',
    items: [{ product: products[8], quantity: 1 }, { product: products[5], quantity: 1 }],
    recipient: { name: 'Гульнара', phone: '+77051112233', address: 'Шымкент, ул. Байтурсынова, 7' },
    deliveryAt: '2026-05-12T12:00:00',
    timeline: [
      { status: 'pending', at: '2026-05-12T09:30:00' },
      { status: 'completed', at: '2026-05-12T11:50:00' },
    ],
  },
]

// Incoming orders shown in the seller dashboard.
export const sellerIncoming: Order[] = [
  {
    id: 'so1', number: 'FH-100501', createdAt: '2026-06-10T09:15:00',
    status: 'pending', total: 24900, cityId: 'c1', sellerId: 's1',
    items: [{ product: products[2], quantity: 1 }],
    recipient: { name: 'Мадина', phone: '+77013334455', address: 'Шымкент, мкр. Самал-2, д. 5' },
    deliveryAt: '2026-06-10T18:00:00',
    timeline: [{ status: 'pending', at: '2026-06-10T09:15:00' }],
  },
  {
    id: 'so2', number: 'FH-100499', createdAt: '2026-06-10T08:40:00',
    status: 'accepted', total: 21500, cityId: 'c1', sellerId: 's1',
    items: [{ product: products[6], quantity: 1 }],
    recipient: { name: 'Ержан', phone: '+77017778899', address: 'Шымкент, пр. Республики, 18' },
    deliveryAt: '2026-06-10T15:30:00',
    timeline: [
      { status: 'pending', at: '2026-06-10T08:40:00' },
      { status: 'accepted', at: '2026-06-10T08:52:00' },
    ],
  },
]
