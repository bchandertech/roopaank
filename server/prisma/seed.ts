import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import type { Occasion } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const img = (label: string) => `https://placehold.co/600x600?text=${encodeURIComponent(label)}`;
const slugify = (s: string) => s.toLowerCase().replace(/\s+/g, "-");

const categories = [
  "Earrings",
  "Necklaces",
  "Bangles",
  "Rings",
  "Jewellery Sets",
  "Hair Accessories",
  "Oxidised Jewellery",
  "Western Jewellery",
  "Kids Jewellery",
  "Gift Sets",
].map((name, i) => ({ name, slug: slugify(name), sortOrder: i + 1 }));

interface SeedProduct {
  name: string;
  category: string;
  price: number;
  originalPrice: number;
  occasion: Occasion;
  description: string;
}

const products: SeedProduct[] = [
  { name: "Multicolor Jhumka Earrings", category: "earrings", price: 199, originalPrice: 499, occasion: "FESTIVE", description: "Vibrant multicolor jhumkas that add a festive touch to any ethnic outfit." },
  { name: "Pearl Drop Earrings", category: "earrings", price: 149, originalPrice: 399, occasion: "PARTY", description: "Elegant pearl drop earrings with a lightweight, all-day comfortable fit." },
  { name: "Oxidised Jhumka Earrings", category: "oxidised-jewellery", price: 129, originalPrice: 349, occasion: "DAILY_WEAR", description: "Classic oxidised silver-look jhumkas with intricate detailing." },
  { name: "Trendy Necklace Set", category: "jewellery-sets", price: 299, originalPrice: 699, occasion: "PARTY", description: "A statement necklace with matching earrings, perfect for parties and get-togethers." },
  { name: "Designer Bangles Set", category: "bangles", price: 249, originalPrice: 599, occasion: "FESTIVE", description: "A set of designer bangles with a rich gold finish for festive occasions." },
  { name: "Statement Ring", category: "rings", price: 99, originalPrice: 249, occasion: "PARTY", description: "An adjustable statement ring that stands out on its own." },
  { name: "Korean Style Earrings", category: "western-jewellery", price: 149, originalPrice: 349, occasion: "DAILY_WEAR", description: "Minimal, chic Korean-style earrings for everyday looks." },
  { name: "Layered Necklace", category: "necklaces", price: 199, originalPrice: 499, occasion: "OFFICE", description: "A delicate layered necklace that pairs well with office and casual wear." },
  { name: "Bow Hair Clip Set", category: "hair-accessories", price: 99, originalPrice: 249, occasion: "DAILY_WEAR", description: "A pack of cute bow hair clips in assorted colours." },
  { name: "Colourful Beaded Bracelet", category: "kids-jewellery", price: 129, originalPrice: 299, occasion: "DAILY_WEAR", description: "A stretchable beaded bracelet in playful colours." },
  { name: "Minimal Ring Set", category: "rings", price: 149, originalPrice: 349, occasion: "OFFICE", description: "A stackable set of minimal rings for a subtle, everyday look." },
  { name: "Scrunchies Pack", category: "hair-accessories", price: 99, originalPrice: 199, occasion: "DAILY_WEAR", description: "A soft, colourful pack of scrunchies that are gentle on hair." },
];

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword) throw new Error("SEED_ADMIN_PASSWORD is not set");
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@roopaank.com";

  const categoryIds = new Map<string, string>();
  for (const c of categories) {
    const category = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, sortOrder: c.sortOrder },
      create: { ...c, image: img(c.name) },
    });
    categoryIds.set(c.slug, category.id);
  }

  for (const [i, p] of products.entries()) {
    const slug = slugify(p.name);
    const categoryId = categoryIds.get(p.category);
    if (!categoryId) throw new Error(`Unknown category slug: ${p.category}`);
    const data = {
      name: p.name,
      description: p.description,
      price: p.price,
      originalPrice: p.originalPrice,
      categoryId,
      occasion: p.occasion,
      isBestSeller: i < 6,
    };
    await prisma.product.upsert({
      where: { slug },
      update: data,
      create: { ...data, slug, stock: 50, image: img(p.name) },
    });
  }

  // Empty update: never overwrite an existing admin's password on re-run.
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Roopaank Admin",
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: "ADMIN",
    },
  });

  console.log(`Seeded ${categories.length} categories, ${products.length} products, admin ${adminEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
