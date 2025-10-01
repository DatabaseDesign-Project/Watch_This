import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "./Button";
import { Input } from "./Input";
import { Label } from "./Label";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export function AuthModal({ isOpen, onClose, type }) {
    const isSignup = type === "signup";
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = isSignup ? "/api/users/signup" : "/api/users/login";
            const body = {
                email: e.target.email.value,
                password: e.target.password.value,
            };
            if (isSignup) {
                body.nickname = e.target.nickname.value;
            }

            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.detail || "요청 실패");
                navigate("/"); // 실패 시 루트로
                return;
            }

            if (isSignup) {
                alert("회원가입 성공! 로그인 해주세요.");
                navigate("/"); // 회원가입은 루트(로그인 화면)로
            } else {
                alert(`환영합니다, ${data.nickname}님!`);
                navigate("/home"); // 로그인은 Home 페이지로
            }
        } catch (err) {
            console.error(err);
            alert("네트워크 오류 발생");
            navigate("/");
        } finally {
            setLoading(false);
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* 배경 */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="modal-backdrop"
                    />

                    {/* 모달 본문 */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "tween", duration: 0.3 }}
                        className="modal"
                    >
                        {/* 헤더 */}
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "1.5rem",
                            }}
                        >
                            <h2 style={{ fontSize: "24px", color: "var(--color-primary)" }}>
                                {isSignup ? "회원가입" : "로그인"}
                            </h2>
                            <Button
                                type="button"
                                onClick={onClose}
                                style={{ backgroundColor: "transparent" }}
                            >
                                <X style={{ width: "20px", height: "20px" }} />
                            </Button>
                        </div>

                        {/* 폼 */}
                        <form
                            onSubmit={handleSubmit}
                            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
                        >
                            {isSignup && (
                                <div>
                                    <Label htmlFor="nickname">닉네임</Label>
                                    <Input
                                        id="nickname"
                                        name="nickname"
                                        type="text"
                                        placeholder="닉네임을 입력하세요"
                                    />
                                </div>
                            )}

                            <div>
                                <Label htmlFor="email">이메일</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="이메일을 입력하세요"
                                />
                            </div>

                            <div>
                                <Label htmlFor="password">비밀번호</Label>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    placeholder="비밀번호를 입력하세요"
                                />
                            </div>

                            {isSignup && (
                                <div>
                                    <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                                    <Input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        placeholder="비밀번호를 다시 입력하세요"
                                    />
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="btn-primary"
                                style={{ marginTop: "1.5rem" }}
                                disabled={loading}
                            >
                                {loading
                                    ? "처리 중..."
                                    : isSignup
                                    ? "회원가입"
                                    : "로그인"}
                            </Button>

                            {!isSignup && (
                                <div style={{ textAlign: "center", marginTop: "1rem" }}>
                                    <button
                                        type="button"
                                        style={{
                                            background: "transparent",
                                            border: "none",
                                            fontSize: "0.875rem",
                                            color: "var(--btn-color-Ghost)",
                                        }}
                                    >
                                        비밀번호를 잊으셨나요?
                                    </button>
                                </div>
                            )}
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
