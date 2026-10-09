/**
 * Local/staging sample data: the 7 categories from SPEC §1.5 and 20 products.
 * Idempotent — safe to run repeatedly (upserts by slug). Never run against production.
 * Images are generated SVG placeholders until real product photos are uploaded.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../src/config/env.js';
import { prisma } from '../src/lib/prisma.js';

if (config.isProduction) {
  console.error('Refusing to seed: NODE_ENV is production');
  process.exit(1);
}

const categories = [
  { slug: 'earrings', name: 'Earrings', description: 'Jhumkas, studs, drops and chandbalis' },
  { slug: 'necklace', name: 'Necklace', description: 'Chokers, chains and pendants' },
  { slug: 'necklace-sets', name: 'Necklace Sets', description: 'Necklaces with matching earrings' },
  { slug: 'bangles', name: 'Bangles', description: 'Kadas and bangle sets' },
  { slug: 'rings', name: 'Rings', description: 'Cocktail and everyday rings' },
  { slug: 'bracelets', name: 'Bracelets', description: 'Chain and cuff bracelets' },
  { slug: 'other', name: 'Other', description: 'Maang tikkas, anklets and more' },
] as const;

type CategorySlug = (typeof categories)[number]['slug'];

interface SeedProduct {
  slug: string;
  name: string;
  category: CategorySlug;
  price: number; // paise
  compareAtPrice?: number;
  material: string;
  colour?: string;
  stock: number;
  featured?: boolean;
}

// Materials are described honestly: these are imitation pieces (SPEC §1.1).
const products: SeedProduct[] = [
  { slug: 'kundan-jhumka-earrings', name: 'Kundan Jhumka Earrings', category: 'earrings', price: 129_900, compareAtPrice: 199_900, material: 'Brass alloy, gold-tone plating, kundan stones', colour: 'Gold', stock: 25, featured: true },
  { slug: 'pearl-drop-earrings', name: 'Pearl Drop Earrings', category: 'earrings', price: 79_900, compareAtPrice: 119_900, material: 'Alloy, gold-tone plating, faux pearls', colour: 'White', stock: 40, featured: true },
  { slug: 'oxidised-chandbali-earrings', name: 'Oxidised Chandbali Earrings', category: 'earrings', price: 59_900, material: 'Alloy, oxidised silver-tone finish', colour: 'Silver-tone', stock: 30 },
  { slug: 'american-diamond-studs', name: 'American Diamond Studs', category: 'earrings', price: 49_900, compareAtPrice: 69_900, material: 'Brass alloy, rhodium-tone plating, cubic zirconia', colour: 'Silver-tone', stock: 3 },
  { slug: 'temple-choker-necklace', name: 'Temple Choker Necklace', category: 'necklace', price: 249_900, compareAtPrice: 349_900, material: 'Brass alloy, antique gold-tone plating', colour: 'Gold', stock: 12, featured: true },
  { slug: 'layered-chain-necklace', name: 'Layered Chain Necklace', category: 'necklace', price: 89_900, material: 'Alloy, gold-tone plating', colour: 'Gold', stock: 20 },
  { slug: 'emerald-pendant-necklace', name: 'Emerald-tone Pendant Necklace', category: 'necklace', price: 109_900, compareAtPrice: 149_900, material: 'Brass alloy, gold-tone plating, green glass stones', colour: 'Green', stock: 0 },
  { slug: 'bridal-kundan-necklace-set', name: 'Bridal Kundan Necklace Set', category: 'necklace-sets', price: 499_900, compareAtPrice: 749_900, material: 'Brass alloy, gold-tone plating, kundan stones, faux pearls', colour: 'Gold', stock: 6, featured: true },
  { slug: 'ruby-tone-necklace-set', name: 'Ruby-tone Necklace Set', category: 'necklace-sets', price: 299_900, compareAtPrice: 399_900, material: 'Alloy, gold-tone plating, red glass stones', colour: 'Red', stock: 10 },
  { slug: 'minimal-pearl-necklace-set', name: 'Minimal Pearl Necklace Set', category: 'necklace-sets', price: 149_900, material: 'Alloy, faux pearls', colour: 'White', stock: 15 },
  { slug: 'antique-gold-tone-kada', name: 'Antique Gold-tone Kada', category: 'bangles', price: 139_900, compareAtPrice: 179_900, material: 'Brass alloy, antique gold-tone plating', colour: 'Gold', stock: 18, featured: true },
  { slug: 'glass-bangle-set', name: 'Glass Bangle Set (12 pcs)', category: 'bangles', price: 39_900, material: 'Glass with gold-tone foil', colour: 'Maroon', stock: 50 },
  { slug: 'stone-studded-bangles', name: 'Stone-studded Bangles (Pair)', category: 'bangles', price: 99_900, material: 'Alloy, gold-tone plating, cubic zirconia', colour: 'Gold', stock: 4 },
  { slug: 'cocktail-statement-ring', name: 'Cocktail Statement Ring', category: 'rings', price: 59_900, compareAtPrice: 89_900, material: 'Brass alloy, gold-tone plating, glass stone', colour: 'Blue', stock: 22, featured: true },
  { slug: 'adjustable-floral-ring', name: 'Adjustable Floral Ring', category: 'rings', price: 34_900, material: 'Alloy, rose-gold-tone plating', colour: 'Rose gold', stock: 35 },
  { slug: 'oxidised-toe-ring-pair', name: 'Oxidised Toe Ring Pair', category: 'rings', price: 24_900, material: 'Alloy, oxidised silver-tone finish', colour: 'Silver-tone', stock: 40 },
  { slug: 'charm-chain-bracelet', name: 'Charm Chain Bracelet', category: 'bracelets', price: 54_900, material: 'Alloy, gold-tone plating', colour: 'Gold', stock: 28, featured: true },
  { slug: 'kundan-cuff-bracelet', name: 'Kundan Cuff Bracelet', category: 'bracelets', price: 119_900, compareAtPrice: 159_900, material: 'Brass alloy, gold-tone plating, kundan stones', colour: 'Gold', stock: 9 },
  { slug: 'kundan-maang-tikka', name: 'Kundan Maang Tikka', category: 'other', price: 69_900, compareAtPrice: 99_900, material: 'Brass alloy, gold-tone plating, kundan stones', colour: 'Gold', stock: 14 },
  { slug: 'ghungroo-anklet-pair', name: 'Ghungroo Anklet Pair', category: 'other', price: 44_900, material: 'Alloy, oxidised silver-tone finish', colour: 'Silver-tone', stock: 20 },
];

const escapeXml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function placeholderSvg(name: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <rect width="800" height="800" fill="#f8f1e7"/>
  <circle cx="400" cy="340" r="150" fill="none" stroke="#c9a24a" stroke-width="10"/>
  <text x="400" y="600" font-family="Georgia, serif" font-size="40" fill="#6b1d2a" text-anchor="middle">${escapeXml(name)}</text>
</svg>`;
}

async function main() {
  const seedDir = path.resolve(config.UPLOAD_DIR, 'seed');
  await mkdir(seedDir, { recursive: true });

  const categoryIds = new Map<string, string>();
  for (const category of categories) {
    const row = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description },
      create: category,
    });
    categoryIds.set(category.slug, row.id);
  }

  for (const p of products) {
    const data = {
      name: p.name,
      description: `${p.name} — imitation jewellery. ${p.material}. Not real gold or silver.`,
      categoryId: categoryIds.get(p.category)!,
      price: p.price,
      compareAtPrice: p.compareAtPrice ?? null,
      material: p.material,
      colour: p.colour ?? null,
      careInstructions: 'Keep away from water, perfume and moisture. Store in a dry pouch.',
      stockQuantity: p.stock,
      isFeatured: p.featured ?? false,
    };
    const product = await prisma.product.upsert({ where: { slug: p.slug }, update: data, create: { ...data, slug: p.slug } });

    await writeFile(path.join(seedDir, `${p.slug}.svg`), placeholderSvg(p.name));
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: `${config.PUBLIC_UPLOADS_URL}/seed/${p.slug}.svg`,
        altText: p.name,
        sortOrder: 0,
      },
    });
  }

  console.log(`Seeded ${categories.length} categories and ${products.length} products.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
