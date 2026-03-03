import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log(
  "%c🍕 Food Factory POS v1.0.0",
  "color: #ea580c; font-size: 20px; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);"
);
console.log(
  "%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  "color: #ea580c;"
);
console.log(
  "%c👨‍💻 Developed by Mallikarjun Haralalli",
  "color: #6b7280; font-size: 14px;"
);
console.log(
  "%c🏢 Food Factory – The Quality Taste",
  "color: #6b7280; font-size: 14px;"
);
console.log(
  "%c🌐 https://foodfactoryonline.com",
  "color: #16a34a; font-size: 12px; font-weight: 500;"
);
console.log(
  "%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  "color: #ea580c;"
);

createRoot(document.getElementById("root")!).render(<App />);
