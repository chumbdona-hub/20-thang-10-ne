// Điểm khởi động React — loader.css được nạp sớm nhất trong chuỗi style.
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/loader.css";
import "./styles/base.css";
import "./styles/background.css";
import "./styles/gift-hero.css";
import "./styles/landscape.css";
import "./styles/letter-girls.css";
import "./styles/name-wish.css";
import "./styles/constellation.css";
import "./styles/garden.css";
import "./styles/wishes.css";
import "./styles/finale.css";
import "./styles/responsive.css";

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
}
