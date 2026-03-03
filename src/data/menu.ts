export interface MenuItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  isVeg: boolean;
  image: string;
  available: boolean;
}

export const categories = [
  "All",
  "Fresh Juices",
  "Milkshakes",
  "Special Milkshake",
  "Cold Coffee",
  "Burgers",
  "Sandwich",
  "Momos",
  "Noodles",
  "Fries",
  "Snacks",
  "Egg Items",
  "Bakery",
  "Desserts",
  "Hot Beverages",
] as const;

export type Category = (typeof categories)[number];

const unsplashImg = (query: string, idx: number) =>
  `https://images.unsplash.com/photo-${query}?w=400&h=300&fit=crop&q=80`;

export const menuItems: MenuItem[] = [
  // Fresh Juices
  { id: "fj1", name: "Fresh Lime", description: "Classic fresh lime juice", category: "Fresh Juices", price: 30, isVeg: true, image: unsplashImg("1622597467836-f3285f2131b8", 0), available: true },
  { id: "fj2", name: "Jaljeera", description: "Spiced lime cooler", category: "Fresh Juices", price: 30, isVeg: true, image: unsplashImg("1551024709-8f23befc6f87", 1), available: true },
  { id: "fj3", name: "Mint Lime", description: "Mint flavored lime juice", category: "Fresh Juices", price: 30, isVeg: true, image: unsplashImg("1556881286-fc6915169721", 2), available: true },
  { id: "fj4", name: "Watermelon Juice", description: "Fresh watermelon juice", category: "Fresh Juices", price: 50, isVeg: true, image: unsplashImg("1587049352851-8d4e89133924", 3), available: true },
  { id: "fj5", name: "Apple Juice", description: "Fresh apple juice", category: "Fresh Juices", price: 60, isVeg: true, image: unsplashImg("1576673442511-7e39b6545c87", 4), available: true },
  { id: "fj6", name: "Pomegranate Juice", description: "Fresh pomegranate juice", category: "Fresh Juices", price: 60, isVeg: true, image: unsplashImg("1600271886352-21b40a81f7e2", 5), available: true },
  { id: "fj7", name: "Papaya Juice", description: "Fresh papaya juice", category: "Fresh Juices", price: 50, isVeg: true, image: unsplashImg("1623065422902-30c0540cb0e0", 6), available: true },
  { id: "fj8", name: "Pineapple Juice", description: "Fresh pineapple juice", category: "Fresh Juices", price: 50, isVeg: true, image: unsplashImg("1589733955941-5eeaf752f6dd", 7), available: true },
  { id: "fj9", name: "Musk Melon Juice", description: "Fresh musk melon juice", category: "Fresh Juices", price: 50, isVeg: true, image: unsplashImg("1546173159-315724a31696", 8), available: true },

  // Milkshakes
  { id: "ms1", name: "Mango Shake", description: "Classic mango milkshake", category: "Milkshakes", price: 60, isVeg: true, image: unsplashImg("1553530666-ba11a7da3888", 9), available: true },
  { id: "ms2", name: "Apple Shake", description: "Apple milkshake", category: "Milkshakes", price: 60, isVeg: true, image: unsplashImg("1572490122747-3968b75cc699", 10), available: true },
  { id: "ms3", name: "Banana Shake", description: "Banana milkshake", category: "Milkshakes", price: 60, isVeg: true, image: unsplashImg("1577805947697-89e18249d767", 11), available: true },
  { id: "ms4", name: "Belgium Chocolate Shake", description: "Rich chocolate shake", category: "Milkshakes", price: 70, isVeg: true, image: unsplashImg("1572490122747-3968b75cc699", 12), available: true },
  { id: "ms5", name: "Strawberry Shake", description: "Strawberry milkshake", category: "Milkshakes", price: 60, isVeg: true, image: unsplashImg("1579954115563-e72bf1381629", 13), available: true },
  { id: "ms6", name: "Pista Shake", description: "Pista flavored milkshake", category: "Milkshakes", price: 60, isVeg: true, image: unsplashImg("1541658016709-82535e94bc69", 14), available: true },
  { id: "ms7", name: "Oreo Shake", description: "Oreo milkshake", category: "Milkshakes", price: 80, isVeg: true, image: unsplashImg("1563805042-7684c019e1cb", 15), available: true },
  { id: "ms8", name: "Ferrero Shake", description: "Ferrero chocolate shake", category: "Milkshakes", price: 70, isVeg: true, image: unsplashImg("1541658016709-82535e94bc69", 16), available: true },

  // Special Milkshake
  { id: "sm1", name: "Avil Milk", description: "Kerala special avil milk", category: "Special Milkshake", price: 70, isVeg: true, image: unsplashImg("1571658464-85dbee2e2dd5", 17), available: true },
  { id: "sm2", name: "Nutella Shake", description: "Nutella flavored shake", category: "Special Milkshake", price: 90, isVeg: true, image: unsplashImg("1568901839119-631418a3910d", 18), available: true },
  { id: "sm3", name: "Sharjah Shake", description: "Sharjah special milkshake", category: "Special Milkshake", price: 70, isVeg: true, image: unsplashImg("1577805947697-89e18249d767", 19), available: true },
  { id: "sm4", name: "KitKat Shake", description: "KitKat chocolate shake", category: "Special Milkshake", price: 80, isVeg: true, image: unsplashImg("1563805042-7684c019e1cb", 20), available: true },

  // Cold Coffee
  { id: "cc1", name: "Hard Rock Coffee", description: "Classic cold coffee", category: "Cold Coffee", price: 50, isVeg: true, image: unsplashImg("1461023058943-07fcbe16d735", 21), available: true },
  { id: "cc2", name: "Mud Coffee", description: "Chocolate cold coffee", category: "Cold Coffee", price: 80, isVeg: true, image: unsplashImg("1509042239860-f550ce710b93", 22), available: true },
  { id: "cc3", name: "Oreo Coffee", description: "Oreo cold coffee", category: "Cold Coffee", price: 80, isVeg: true, image: unsplashImg("1578314675249-a6910f80cc4e", 23), available: true },
  { id: "cc4", name: "Nutella Coffee", description: "Nutella cold coffee", category: "Cold Coffee", price: 80, isVeg: true, image: unsplashImg("1592663527359-cf6642f54cff", 24), available: true },

  // Burgers
  { id: "bg1", name: "Veg Burger", description: "Veg patty burger", category: "Burgers", price: 60, isVeg: true, image: unsplashImg("1550547660-d9450f859349", 25), available: true },
  { id: "bg2", name: "Veg Cheese Burger", description: "Veg burger with cheese", category: "Burgers", price: 70, isVeg: true, image: unsplashImg("1568901839119-631418a3910d", 26), available: true },
  { id: "bg3", name: "Chicken Burger", description: "Chicken patty burger", category: "Burgers", price: 80, isVeg: false, image: unsplashImg("1586190848861-99aa4a171e90", 27), available: true },
  { id: "bg4", name: "Chicken Cheese Burger", description: "Chicken burger with cheese", category: "Burgers", price: 90, isVeg: false, image: unsplashImg("1553979459-d2229ba7433b", 28), available: true },
  { id: "bg5", name: "Egg Burger", description: "Egg patty burger", category: "Burgers", price: 60, isVeg: false, image: unsplashImg("1571091718767-18b5b1457add", 29), available: true },

  // Sandwich
  { id: "sw1", name: "Butter Grill", description: "Butter grilled sandwich", category: "Sandwich", price: 40, isVeg: true, image: unsplashImg("1528735602780-2552fd46c7af", 30), available: true },
  { id: "sw2", name: "Veg Cheese Sandwich", description: "Veg cheese sandwich", category: "Sandwich", price: 70, isVeg: true, image: unsplashImg("1528735602780-2552fd46c7af", 31), available: true },
  { id: "sw3", name: "Paneer Sandwich", description: "Paneer grilled sandwich", category: "Sandwich", price: 80, isVeg: true, image: unsplashImg("1554433607-66b5a31b4766", 32), available: true },
  { id: "sw4", name: "Club Grill Sandwich", description: "Loaded club sandwich", category: "Sandwich", price: 130, isVeg: true, image: unsplashImg("1567234669003-dce7a7a88821", 33), available: true },
  { id: "sw5", name: "Chilli Cheese Sandwich", description: "Spicy cheese sandwich", category: "Sandwich", price: 70, isVeg: true, image: unsplashImg("1528735602780-2552fd46c7af", 34), available: true },
  { id: "sw6", name: "Chicken Sandwich", description: "Grilled chicken sandwich", category: "Sandwich", price: 90, isVeg: false, image: unsplashImg("1521390188846-e2a3a97453a0", 35), available: true },

  // Momos
  { id: "mo1", name: "Veg Momos (6 pcs)", description: "Steamed veg momos", category: "Momos", price: 70, isVeg: true, image: unsplashImg("1625220194771-7ebdea0b70b9", 36), available: true },
  { id: "mo2", name: "Chicken Momos (6 pcs)", description: "Steamed chicken momos", category: "Momos", price: 80, isVeg: false, image: unsplashImg("1534422298391-e4f8c172dddb", 37), available: true },
  { id: "mo3", name: "Fried Veg Momos (6 pcs)", description: "Fried veg momos", category: "Momos", price: 70, isVeg: true, image: unsplashImg("1625220194771-7ebdea0b70b9", 38), available: true },
  { id: "mo4", name: "Fried Paneer Momos (5 pcs)", description: "Fried paneer momos", category: "Momos", price: 70, isVeg: true, image: unsplashImg("1625220194771-7ebdea0b70b9", 39), available: true },

  // Noodles
  { id: "nd1", name: "Veg Noodles", description: "Stir fried veg noodles", category: "Noodles", price: 70, isVeg: true, image: unsplashImg("1569718212165-3a8278d5f624", 40), available: true },
  { id: "nd2", name: "Chicken Noodles", description: "Chicken noodles", category: "Noodles", price: 100, isVeg: false, image: unsplashImg("1612929633738-8fe44f7ec841", 41), available: true },
  { id: "nd3", name: "Egg Noodles", description: "Egg noodles", category: "Noodles", price: 80, isVeg: false, image: unsplashImg("1585032226651-759b368d7246", 42), available: true },

  // Fries
  { id: "fr1", name: "French Fries", description: "Salted crispy fries", category: "Fries", price: 60, isVeg: true, image: unsplashImg("1573080496219-bb080dd4f877", 43), available: true },
  { id: "fr2", name: "Peri Peri Fries", description: "Spicy fries", category: "Fries", price: 70, isVeg: true, image: unsplashImg("1630384060421-cb20d0e0649d", 44), available: true },
  { id: "fr3", name: "Cheese Fries", description: "Cheese loaded fries", category: "Fries", price: 70, isVeg: true, image: unsplashImg("1585109649174-837f4d0e8f07", 45), available: true },

  // Snacks
  { id: "sn1", name: "Chicken Nuggets (6 pcs)", description: "Crispy nuggets", category: "Snacks", price: 70, isVeg: false, image: unsplashImg("1562967914-01b114e022a5", 46), available: true },
  { id: "sn2", name: "Chicken Popcorn (6 pcs)", description: "Crispy popcorn chicken", category: "Snacks", price: 70, isVeg: false, image: unsplashImg("1562967914-01b114e022a5", 47), available: true },

  // Egg Items
  { id: "eg1", name: "Omelette", description: "Plain omelette", category: "Egg Items", price: 30, isVeg: false, image: unsplashImg("1510693206972-df098062cb71", 48), available: true },
  { id: "eg2", name: "Bread Omelette", description: "Omelette with bread", category: "Egg Items", price: 40, isVeg: false, image: unsplashImg("1525351484163-7529414344d8", 49), available: true },
  { id: "eg3", name: "Masala Omelette", description: "Spicy omelette", category: "Egg Items", price: 50, isVeg: false, image: unsplashImg("1510693206972-df098062cb71", 50), available: true },
  { id: "eg4", name: "Half Fry Omelette", description: "Half fry egg", category: "Egg Items", price: 40, isVeg: false, image: unsplashImg("1482049016688-2d3e1b311543", 51), available: true },

  // Bakery
  { id: "bk1", name: "Chocolate Cake Slice", description: "Chocolate cake slice", category: "Bakery", price: 80, isVeg: true, image: unsplashImg("1578985545062-69928b1d9587", 52), available: true },
  { id: "bk2", name: "Black Forest Pastry", description: "Black forest pastry", category: "Bakery", price: 70, isVeg: true, image: unsplashImg("1563729784474-d77dbb933a9e", 53), available: true },
  { id: "bk3", name: "Butter Cookies", description: "Fresh butter cookies", category: "Bakery", price: 50, isVeg: true, image: unsplashImg("1558961363-fa8fdf82db35", 54), available: true },
  { id: "bk4", name: "Chocolate Cookies", description: "Chocolate chip cookies", category: "Bakery", price: 60, isVeg: true, image: unsplashImg("1499636136210-6f4ee915583e", 55), available: true },

  // Desserts
  { id: "ds1", name: "Royal Falooda", description: "Falooda with ice cream", category: "Desserts", price: 120, isVeg: true, image: unsplashImg("1587563974553-3a6f35f3e3de", 56), available: true },
  { id: "ds2", name: "Gudbud Ice Cream", description: "Layered ice cream", category: "Desserts", price: 100, isVeg: true, image: unsplashImg("1563805042-7684c019e1cb", 57), available: true },

  // Hot Beverages
  { id: "hb1", name: "Filter Coffee", description: "South Indian filter coffee", category: "Hot Beverages", price: 15, isVeg: true, image: unsplashImg("1509042239860-f550ce710b93", 58), available: true },
  { id: "hb2", name: "Masala Tea", description: "Indian masala tea", category: "Hot Beverages", price: 15, isVeg: true, image: unsplashImg("1556679343-c7306c1976bc", 59), available: true },
];
