require("dotenv").config();
const XLSX = require("xlsx");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");
const path = require("path");
const fs = require("fs");

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=400&h=300&fit=crop";

const CATEGORY_EMOJI = {
  "Fresh Juices": "🍊",
  "Milkshakes": "🥤",
  "Special Milkshake": "🍨",
  "Cold Coffee": "☕",
  "Burgers": "🍔",
  "Sandwich": "🥪",
  "Non Veg Sandwich": "🥪",
  "Momos": "🥟",
  "Noodles": "🍜",
  "Fries": "🍟",
  "Snacks": "🍿",
  "Egg Items": "🥚",
  "Bakery": "🥐",
  "Desserts": "🍰",
  "Hot Beverages": "🍵",
  "Maggie": "🍜",
  "Non Veg Maggi": "🍜",
  "Lassi": "🥛",
  "Smoothie": "🧃",
  "Falooda": "🍹",
  "Mojito": "🍸",
  "Health Drinks": "💚",
  "Soda": "🥤",
  "Omelettes": "🍳",
  "Fresh Juice": "🍊",
  "Food Factory Special": "⭐",
};

function generateDescription(name, category) {
  const lowerCategory = category.toLowerCase();
  
  if (lowerCategory.includes("juice")) {
    return `Fresh and refreshing ${name}, made with premium quality fruits. Perfect for a healthy start to your day!`;
  }
  if (lowerCategory.includes("shake") || lowerCategory.includes("milkshake")) {
    return `Creamy and delicious ${name}, made with real ice cream and premium ingredients. A perfect treat for any time!`;
  }
  if (lowerCategory.includes("coffee")) {
    return `Rich and aromatic ${name}, brewed to perfection. Perfect for coffee lovers!`;
  }
  if (lowerCategory.includes("burger")) {
    return `Juicy and tasty ${name}, made with fresh ingredients and special sauce. A delight for burger lovers!`;
  }
  if (lowerCategory.includes("sandwich")) {
    return `Crispy and delicious ${name}, packed with fresh vegetables and tangy sauces. Perfect snack anytime!`;
  }
  if (lowerCategory.includes("maggie") || lowerCategory.includes("noodles")) {
    return `Authentic ${name}, cooked to perfection with special masala. A comfort food loved by all!`;
  }
  if (lowerCategory.includes("momo")) {
    return `Steamed to perfection ${name}, served with spicy chutney. A popular street food delight!`;
  }
  if (lowerCategory.includes("fries")) {
    return `Crispy golden ${name}, seasoned to perfection. Perfect companion for any meal!`;
  }
  if (lowerCategory.includes("snack")) {
    return `Tasty ${name}, perfect for satisfying your hunger. A popular choice among all age groups!`;
  }
  if (lowerCategory.includes("egg")) {
    return `Protein-rich ${name}, cooked to perfection. A healthy and delicious choice!`;
  }
  if (lowerCategory.includes("bakery")) {
    return `Freshly baked ${name}, made with premium ingredients. Perfect for tea time or breakfast!`;
  }
  if (lowerCategory.includes("dessert")) {
    return `Sweet and delicious ${name}, made with love. A perfect ending to your meal!`;
  }
  if (lowerCategory.includes("lassi") || lowerCategory.includes("mojito") || lowerCategory.includes("smoothie") || lowerCategory.includes("falooda") || lowerCategory.includes("soda") || lowerCategory.includes("health")) {
    return `Refreshing ${name}, made with fresh ingredients. Perfect to cool down or warm up!`;
  }
  
  return `Delicious ${name}, made with fresh ingredients. A must-try from our menu!`;
}

function determineFoodType(name, category, isVeg) {
  const lowerName = name.toLowerCase();
  const lowerCategory = category.toLowerCase();
  
  if (lowerCategory.includes("non veg") || lowerCategory.includes("nonveg") || lowerName.includes("chicken") || lowerName.includes("mutton") || lowerName.includes("egg")) {
    if (lowerCategory.includes("omelette") || lowerName.includes("boiled egg")) {
      return "egg";
    }
    return "nonveg";
  }
  
  if (isVeg === false) return "nonveg";
  return "veg";
}

async function migrateFromExcel() {
  console.log("=== MIGRATING FROM EXCEL FILE ===\n");

  try {
    // Clear existing data
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
    console.log("✓ Cleared existing data\n");

    // Read Excel file
    const filePath = path.join(process.cwd(), "public", "Food_Factory_Zomato_Updated_Menu.xlsx");
    
    if (!fs.existsSync(filePath)) {
      console.error("Excel file not found at:", filePath);
      return;
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Found ${data.length} products in Excel file\n`);

    // Get unique categories
    const categories = new Set();
    for (const row of data) {
      if (row.category) {
        categories.add(row.category);
      }
    }

    // Create categories
    for (const cat of categories) {
      const emoji = CATEGORY_EMOJI[cat] || "🍴";
      await prisma.category.upsert({
        where: { name: cat },
        update: {},
        create: { name: cat, emoji },
      });
      console.log(`Created category: ${cat} ${emoji}`);
    }
    console.log(`\n✓ Created ${categories.size} categories\n`);

    // Migrate products
    let migrated = 0;
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      if (!row.name || row.name.toString().trim() === "") {
        console.log(`Skipping row ${i + 1} - no name`);
        continue;
      }

      const category = row.category || "Uncategorized";
      const foodType = determineFoodType(row.name, category, row.isVeg);
      const description = row.description || generateDescription(row.name, category);
      
      await prisma.product.create({
        data: {
          id: `prod_${i + 1}`,
          name: row.name.toString().trim(),
          description: description,
          category: category,
          price: parseFloat(row.price) || 0,
          foodType: foodType,
          isVeg: row.isVeg !== false,
          available: row.available !== false,
          image: row.image || PLACEHOLDER_IMAGE,
        },
      });

      migrated++;
      if (migrated % 20 === 0) {
        console.log(`Migrated ${migrated}/${data.length}...`);
      }
    }

    console.log("\n=== MIGRATION COMPLETE ===");
    console.log(`Total products migrated: ${migrated}`);
    console.log(`Total categories: ${categories.size}`);

    // Verify
    const count = await prisma.product.count();
    console.log(`\nVerification - Products in Supabase: ${count}`);

    // Delete Excel file
    fs.unlinkSync(filePath);
    console.log("\n✓ Deleted Excel file");

  } catch (error) {
    console.error("Migration failed:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

migrateFromExcel();
