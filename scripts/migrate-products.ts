import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import axios from "axios";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const unsplashImg = (query: string, idx: number) =>
  `https://images.unsplash.com/photo-${query}?w=400&h=300&fit=crop&q=80`;

const menuItems = [
  { id: "fj1", name: "Fresh Lime", description: "Classic fresh lime juice", category: "Fresh Juices", price: 30, foodType: "veg", image: unsplashImg("1622597467836-f3285f2131b8", 0) },
  { id: "fj2", name: "Jaljeera", description: "Spiced lime cooler", category: "Fresh Juices", price: 30, foodType: "veg", image: unsplashImg("1551024709-8f23befc6f87", 1) },
  { id: "fj3", name: "Mint Lime", description: "Mint flavored lime juice", category: "Fresh Juices", price: 30, foodType: "veg", image: unsplashImg("1556881286-fc6915169721", 2) },
  { id: "fj4", name: "Watermelon Juice", description: "Fresh watermelon juice", category: "Fresh Juices", price: 50, foodType: "veg", image: unsplashImg("1587049352851-8d4e89133924", 3) },
  { id: "fj5", name: "Apple Juice", description: "Fresh apple juice", category: "Fresh Juices", price: 60, foodType: "veg", image: unsplashImg("1576673442511-7e39b6545c87", 4) },
  { id: "fj6", name: "Pomegranate Juice", description: "Fresh pomegranate juice", category: "Fresh Juices", price: 60, foodType: "veg", image: unsplashImg("1600271886352-21b40a81f7e2", 5) },
  { id: "fj7", name: "Papaya Juice", description: "Fresh papaya juice", category: "Fresh Juices", price: 50, foodType: "veg", image: unsplashImg("1623065422902-30c0540cb0e0", 6) },
  { id: "fj8", name: "Pineapple Juice", description: "Fresh pineapple juice", category: "Fresh Juices", price: 50, foodType: "veg", image: unsplashImg("1589733955941-5eeaf752f6dd", 7) },
  { id: "fj9", name: "Musk Melon Juice", description: "Fresh musk melon juice", category: "Fresh Juices", price: 50, foodType: "veg", image: unsplashImg("1546173159-315724a31696", 8) },
  { id: "ms1", name: "Mango Shake", description: "Classic mango milkshake", category: "Milkshakes", price: 60, foodType: "veg", image: unsplashImg("1553530666-ba11a7da3888", 9) },
  { id: "ms2", name: "Chocolate Shake", description: "Rich chocolate milkshake", category: "Milkshakes", price: 70, foodType: "veg", image: unsplashImg("1572490178981-5931f343d5ec", 10) },
  { id: "ms3", name: "Strawberry Shake", description: "Fresh strawberry milkshake", category: "Milkshakes", price: 70, foodType: "veg", image: unsplashImg("1553531386-3e9c9e4b9b1c", 11) },
  { id: "ms4", name: "Banana Shake", description: "Creamy banana milkshake", category: "Milkshakes", price: 60, foodType: "veg", image: unsplashImg("1578840155886-2735c5a19312", 12) },
  { id: "ms5", name: "Vanilla Shake", description: "Classic vanilla milkshake", category: "Milkshakes", price: 60, foodType: "veg", image: unsplashImg("1579954115545-a95591f28bfc", 13) },
  { id: "ms6", name: "Butterscotch Shake", description: "Butterscotch flavor milkshake", category: "Milkshakes", price: 80, foodType: "veg", image: unsplashImg("1488477181946-6428a0291777", 14) },
  { id: "sp1", name: "Oreo Shake", description: "Oreo cookie milkshake", category: "Special Milkshake", price: 100, foodType: "veg", image: unsplashImg("1579956360261-d7d67ad7e26d", 15) },
  { id: "sp2", "name": "Brownie Shake", description: "Chocolate brownie milkshake", category: "Special Milkshake", price: 120, foodType: "veg", image: unsplashImg("1620916566396-ee5d8391e7ad", 16) },
  { id: "sp3", name: "Choco Lava Shake", description: "Molten chocolate shake", category: "Special Milkshake", price: 130, foodType: "veg", image: unsplashImg("1551024506-f5d3e5e7e2b6", 17) },
  { id: "cc1", name: "Cold Coffee", description: "Iced coffee", category: "Cold Coffee", price: 50, foodType: "veg", image: unsplashImg("1461023057058-a4b3a4e4c3e5", 18) },
  { id: "cc2", name: "Chocolate Cold Coffee", description: "Chocolate iced coffee", category: "Cold Coffee", price: 60, foodType: "veg", image: unsplashImg("1517701550927-30cf4ba2d56d", 19) },
  { id: "bg1", name: "Veg Burger", description: "Vegetable burger", category: "Burgers", price: 80, foodType: "veg", image: unsplashImg("1568901346375-3f7406b65f48", 20) },
  { id: "bg2", name: "Cheese Burger", description: "Cheese patty burger", category: "Burgers", price: 100, foodType: "veg", image: unsplashImg("1561758033-7a6d08e5c9c8", 21) },
  { id: "bg3", name: "Chicken Burger", description: "Grilled chicken burger", category: "Burgers", price: 120, foodType: "nonveg", image: unsplashImg("1550547660-d94526f4a8b9", 22) },
  { id: "sg1", name: "Veg Sandwich", description: "Vegetable sandwich", category: "Sandwich", price: 50, foodType: "veg", image: unsplashImg("1528735603400-78dc03b1e64a", 23) },
  { id: "sg2", name: "Cheese Sandwich", description: "Grilled cheese sandwich", category: "Sandwich", price: 70, foodType: "veg", image: unsplashImg("1483070558465-3cc25476f7b0", 24) },
  { id: "sg3", name: "Chicken Sandwich", description: "Grilled chicken sandwich", category: "Non Veg Sandwich", price: 100, foodType: "nonveg", image: unsplashImg("1600891964095-7e7e92f6a31b", 25) },
  { id: "mm1", name: "Plain Maggi", description: "Classic masala maggi", category: "Maggie", price: 40, foodType: "veg", image: unsplashImg("1585032226659-74d1c266867b", 26) },
  { id: "mm2", name: "Veg Maggi", description: "Vegetable maggi", category: "Maggie", price: 50, foodType: "veg", image: unsplashImg("1603133874075-b07b004f3fc8", 27) },
  { id: "mm3", name: "Chicken Maggi", description: "Chicken maggi", category: "Non Veg Maggi", price: 80, foodType: "nonveg", image: unsplashImg("1626645732433-21b4a1e53c7e", 28) },
  { id: "fr1", name: "French Fries", description: "Crispy fries", category: "Fries", price: 60, foodType: "veg", image: unsplashImg("1573080496219-bb0809f5f8ae", 29) },
  { id: "fr2", name: "Peri Peri Fries", description: "Spicy peri peri fries", category: "Fries", price: 80, foodType: "veg", image: unsplashImg("1630384062098-6f2de9fe5d3e", 30) },
  { id: "sn1", name: "Nachos", description: "Crispy nachos with cheese", category: "Snacks", price: 100, foodType: "veg", image: unsplashImg("1513454682974-7f3b273f1f2c", 31) },
  { id: "sn2", name: "Spring Roll", description: "Vegetable spring rolls", category: "Snacks", price: 60, foodType: "veg", image: unsplashImg("1544025162-d76694265947", 32) },
  { id: "sn3", name: "Samosa", description: "Crispy samosa", category: "Snacks", price: 30, foodType: "veg", image: unsplashImg("1601051525945-7b0b0f1f5a2e", 33) },
  { id: "mo1", name: "Veg Momo", description: "Vegetable momos", category: "Momos", price: 60, foodType: "veg", image: unsplashImg("1534422298393-70964a2bc4c5", 34) },
  { id: "mo2", name: "Chicken Momo", description: "Chicken momos", category: "Momos", price: 80, foodType: "nonveg", image: unsplashImg("1626804134846-d3b3b01a9021", 35) },
  { id: "no1", name: "Veg Noodles", description: "Stir fried veg noodles", category: "Noodles", price: 70, foodType: "veg", image: unsplashImg("1555122072-6a6f21c4b29c", 36) },
  { id: "no2", name: "Chicken Noodles", description: "Stir fried chicken noodles", category: "Noodles", price: 90, foodType: "nonveg", image: unsplashImg("1612929625812-37b50b27e94b", 37) },
  { id: "ei1", name: "Boiled Egg", description: "Simple boiled egg", category: "Egg Items", price: 15, foodType: "egg", image: unsplashImg("1586350977771-b3f0b5f3bbb3", 38) },
  { id: "ei2", name: "Omelette", description: "Plain omelette", category: "Egg Items", price: 30, foodType: "egg", image: unsplashImg("1525351484163-7529414340b5", 39) },
  { id: "ei3", name: "Bread Omelette", description: "Bread with omelette", category: "Egg Items", price: 40, foodType: "egg", image: unsplashImg("1608039829573-5106b3a36472", 40) },
  { id: "bk1", name: "Chocolate Croissant", description: "Buttery croissant", category: "Bakery", price: 60, foodType: "veg", image: unsplashImg("1555507036-19330e4d4a53", 41) },
  { id: "bk2", name: "Donut", description: "Glazed donut", category: "Bakery", price: 40, foodType: "veg", image: unsplashImg("1551024601-564d8d714895", 42) },
  { id: "ds1", name: "Ice Cream", description: "Vanilla ice cream", category: "Desserts", price: 50, foodType: "veg", image: unsplashImg("1497034825429-c343d7c6a368", 43) },
  { id: "ds2", name: "Brownie", description: "Chocolate brownie", category: "Desserts", price: 80, foodType: "veg", image: unsplashImg("1564355812964-9c3ac2a5980a", 44) },
  { id: "ds3", name: "Waffle", description: "Belgian waffle", category: "Desserts", price: 100, foodType: "veg", image: unsplashImg("1562376552-0cdd3a1c452b", 45) },
  { id: "hb1", name: "Coffee", description: "Hot coffee", category: "Hot Beverages", price: 40, foodType: "veg", image: unsplashImg("1509042239860-a550ed8eb5b9", 46) },
  { id: "hb2", name: "Tea", description: "Masala chai", category: "Hot Beverages", price: 25, foodType: "veg", image: unsplashImg("1556679343-cda59c8b6b75", 47) },
  { id: "hb3", name: "Hot Chocolate", description: "Hot chocolate drink", category: "Hot Beverages", price: 60, foodType: "veg", image: unsplashImg("1542999498-b4c7c42a7b4f", 48) },
];

const CLOUDINARY_CLOUD_NAME = "da6en2k2j";
const CLOUDINARY_UPLOAD_PRESET = "foodfactory";

async function uploadToCloudinary(imageUrl: string): Promise<string> {
  try {
    const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data, "binary");
    
    const formData = new FormData();
    const blob = new Blob([buffer]);
    formData.append("file", blob, "image.jpg");
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const uploadResponse = await axios.post(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );

    return uploadResponse.data.secure_url;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    return imageUrl;
  }
}

async function migrateProducts() {
  console.log("Starting product migration...");
  
  const categories = [...new Set(menuItems.map(item => item.category))];
  
  // Create categories
  for (const cat of categories) {
    const emoji = getCategoryEmoji(cat);
    await prisma.category.upsert({
      where: { name: cat },
      update: {},
      create: { name: cat, emoji },
    });
    console.log(`Created/updated category: ${cat}`);
  }

  // Migrate products
  for (const item of menuItems) {
    console.log(`Migrating: ${item.name}`);
    
    let imageUrl = item.image;
    try {
      imageUrl = await uploadToCloudinary(item.image);
      console.log(`  -> Uploaded to Cloudinary: ${imageUrl.substring(0, 50)}...`);
    } catch (e) {
      console.log(`  -> Using original URL`);
    }

    await prisma.product.upsert({
      where: { id: item.id },
      update: {
        name: item.name,
        description: item.description,
        category: item.category,
        price: item.price,
        foodType: item.foodType,
        image: imageUrl,
        available: true,
      },
      create: {
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
        price: item.price,
        foodType: item.foodType,
        image: imageUrl,
        available: true,
      },
    });
    
    console.log(`  Saved to Supabase: ${item.name}`);
  }

  console.log("\nMigration complete!");
  const count = await prisma.product.count();
  console.log(`Total products in database: ${count}`);
}

function getCategoryEmoji(category: string): string {
  const emojiMap: Record<string, string> = {
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
  };
  return emojiMap[category] || "🍴";
}

migrateProducts()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
