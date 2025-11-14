import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import Home from "./pages/Home";

// 프로필 / 설정
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import PasswordChange from "./pages/PasswordChange";
import PrivacyDelete from "./pages/PrivacyDelete";

// 검색 / 알림
import Search from "./pages/Search";
import Notification from "./pages/Notification";

import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/home" element={<Home />} />

        {/* 프로필 & 설정 */}
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/password" element={<PasswordChange />} />
        <Route path="/settings/privacy" element={<PrivacyDelete />} />

        {/* 검색 & 알림 */}
        <Route path="/search" element={<Search />} />
        <Route path="/notifications" element={<Notification />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);

