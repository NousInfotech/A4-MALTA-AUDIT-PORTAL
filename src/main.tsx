import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import setupLocatorUI from "@locator/runtime";

createRoot(document.getElementById("root")!).render(<App />);

if (process.env.NODE_ENV === "development") {
  setupLocatorUI();
}