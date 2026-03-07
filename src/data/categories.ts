export interface CategoryConfig {
  name: string;
  emoji: string;
}

export const DEFAULT_CATEGORIES: CategoryConfig[] = [
  { name: "Fresh Juice", emoji: "🍊" },
  { name: "Fruite Milk Shake", emoji: "🥤" },
  { name: "Food Factory Special", emoji: "🧋" },
  { name: "Soda", emoji: "🥤" },
  { name: "Lassi", emoji: "🥛" },
  { name: "Smoothie", emoji: "🍹" },
  { name: "Falooda", emoji: "🍜" },
  { name: "Mojito", emoji: "🍃" },
  { name: "Health Drinks", emoji: "💪" },
  { name: "Sandwich", emoji: "🥪" },
  { name: "Non Veg Sandwich", emoji: "🥪" },
  { name: "Maggie", emoji: "🍜" },
  { name: "Non Veg Maggi", emoji: "🍜" },
  { name: "Milkshakes", emoji: "🥤" },
  { name: "Special Milkshake", emoji: "🧋" },
  { name: "Cold Coffee", emoji: "☕" },
  { name: "Burgers", emoji: "🍔" },
  { name: "Momos", emoji: "🥟" },
  { name: "Noodles", emoji: "🍜" },
  { name: "Fries", emoji: "🍟" },
  { name: "Snacks", emoji: "🍿" },
  { name: "Omelettes", emoji: "🥚" },
  { name: "Bakery", emoji: "🍰" },
  { name: "Desserts", emoji: "🍨" },
  { name: "Hot Beverages", emoji: "🍵" },
  { name: "Juice", emoji: "🧃" },
  { name: "Coffee", emoji: "☕" },
  { name: "Tea", emoji: "🍵" },
  { name: "Shake", emoji: "🥤" },
  { name: "Milk Shake", emoji: "🥤" },
  { name: "Ice Cream", emoji: "🍦" },
  { name: "Fresh Juices", emoji: "🍊" },
  { name: "Rolls", emoji: "🌯" },
{ name: "Shawarma", emoji: "🥙" },
{ name: "Burgers", emoji: "🍔" },
{ name: "Pasta", emoji: "🍝" },
];

export const CATEGORY_EMOJI_MAP: Record<string, string> = DEFAULT_CATEGORIES.reduce((acc, cat) => {
  acc[cat.name] = cat.emoji;
  return acc;
}, {} as Record<string, string>);

export const AVAILABLE_EMOJIS = [
  "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅",
  "🥤", "🧋", "🍹", "🍺", "🍻", "🥂", "🍷", "🥃", "🍸", "🍵", "☕", "🧃", "🥛", "🍼",
  "🍔", "🍟", "🍕", "🌭", "🥪", "🌮", "🌯", "🫔", "🥙", "🧆", "🥚", "🥘", "🍳", "🥣",
  "🍜", "🍝", "🍣", "🍱", "🥟", "🥠", "🥡", "🍤", "🍢", "🍡", "🍧", "🍨", "🍦", "🥧",
  "🧇", "🥐", "🥖", "🥨", "🥯", "🥞", "🧈", "🍞", "🥙", "🥗", "🥘", "🫕", "🍝",
  "🍰", "🧁", "🎂", "🍮", "🍭", "🍬", "🍫", "🍿", "🍩", "🍪", "🌰", "🥜", "🍯",
  "🥎", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉", "🎱", "🪀", "🏓", "🏸", "🥊", "🥋",
  "🎯", "🪁", "🎣", "🤿", "🥅", "⛳", "🪀", "🛹", "🛼", "🛷", "⛸", "🥌",
  "🎿", "⛷", "🏂", "🪂", "🏋️", "🤼", "🤸", "⛹️", "🤺", "🤾", "🏌️", "🏇", "🧘",
  "🏄", "🏊", "🤽", "🚣", "🧗", "🚵", "🚴", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️",
  "🎗️", "🎫", "🎟️", "🎪", "🤹", "🎭", "🩰", "🎸", "🎺", "🎷", "🎻", "🥁", "🎹",
  "🎼", "🎤", "🎧", "🎚️", "🎛️", "🎧", "📻", "🎬", "🎨", "🎭", "🎪", "🎯",
  "💪", "🧠", "🫀", "🫁", "🦷", "🦴", "👁️", "👂", "👃", "👄", "💋", "👅",
  "⭐", "🌟", "✨", "💫", "⚡", "🔥", "💥", "💢", "💦", "💨", "🕳️", "🌈",
  "☀️", "🌤️", "⛅", "🌥️", "☁️", "🌦️", "🌧️", "⛈️", "🌩️", "🌨️", "❄️", "🌪️",
  "🌊", "💰", "💵", "💴", "💶", "💷", "💸", "💳", "🧾", "💹", "💱", "💲",
  "📱", "💻", "🖥️", "🖨️", "⌨️", "🖱️", "💾", "💿", "📀", "📼", "📷", "📸",
  "📹", "🎥", "📽️", "🎞️", "📞", "☎️", "📟", "📠", "📺", "📻", "🎙️", "🎚️",
  "🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚",
  "🏠", "🏡", "🏢", "🏣", "🏤", "🏥", "🏦", "🏨", "🏩", "🏪", "🏫", "🏬",
  "🛒", "🛍️", "🎁", "🎈", "🎏", "🎀", "🪄", "🪅", "🎊", "🎉", "🎎", "🏮",
  "🧧", "✉️", "📩", "📨", "📧", "💌", "📥", "📤", "📦", "🏷️", "📪", "📫",
];

export function getCategoryEmoji(category: string): string {
  return CATEGORY_EMOJI_MAP[category] || "🍴";
}
