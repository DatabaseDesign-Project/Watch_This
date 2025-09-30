import { useState } from "react";
import { Button } from "./components/Button";
import { AuthModal } from "./components/AuthModal";
import { MobileStatusBar } from "./components/MobileStatusBar";

function App() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);

  return (
    <div className="fullscreen">
      <div className="mobile-container">
        <MobileStatusBar />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            padding: "0 1.5rem 5rem",
          }}
        >
          {/* 로고 */}
          <div style={{ marginBottom: "4rem", textAlign: "center" }}>
            <div style={{ width: "188px", height: "209px", margin: "0 auto" }}>
            </div>
          </div>

          {/* 버튼 영역 */}
          <div
            style={{
              width: "100%",
              maxWidth: "280px",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <Button
              type="button"
              onClick={() => {
                console.log("회원가입 모달 열기"); // 클릭 확인 로그
                setIsSignupModalOpen(true);
              }}
              className="btn-primary"
            >
              시작하기
            </Button>

            <Button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="btn-outline"
            >
              로그인
            </Button>
          </div>
        </div>

        {/* 모달 */}
        <AuthModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          type="login"
        />
        <AuthModal
          isOpen={isSignupModalOpen}
          onClose={() => setIsSignupModalOpen(false)}
          type="signup"
        />
      </div>
    </div>
  );
}

export default App;
