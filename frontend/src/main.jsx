import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import Home from "./pages/home/Home";

// 프로필 / 설정
import Profile from "./pages/mypage/Profile";
import Settings from "./pages/mypage/Settings";
import PasswordChange from "./pages/mypage/PasswordChange";
import PrivacyDelete from "./pages/mypage/PrivacyDelete";

// 검색 / 알림
import Search from "./pages/search/Search";
import MovieDetailPage from "./pages/search/MovieDetailPage";
import Notification from "./pages/notification/Notification";
import FriendRequest from "./pages/notification/FriendRequest";

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
        <Route path="/friend-request" element={<FriendRequest />} />

        {/* 영화 */}
        <Route path="/movie/:id" element={<MovieDetailPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);

