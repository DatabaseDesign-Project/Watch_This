import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import PasswordChange from "./pages/PasswordChange";
import PrivacyDelete from "./pages/PrivacyDelete";
import "./index.css";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/home" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/password" element={<PasswordChange />} />
        <Route path="/settings/privacy" element={<PrivacyDelete />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);