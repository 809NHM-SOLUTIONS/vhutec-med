import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

const API_URL = "http://localhost:5000";

function VerifyEmail() {
    const [searchParams] = useSearchParams();

    const [status, setStatus] = useState("verifying");
    const [message, setMessage] = useState("");

    useEffect(() => {
        const token = searchParams.get("token");

        if (!token) {
            setStatus("error");
            setMessage("Verification token is missing.");
            return;
        }

        const verifyEmail = async () => {
            try {
                const response = await fetch(
                    `${API_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`
                );

                const data = await response.json();

                if (!response.ok) {
                    setStatus("error");
                    setMessage(
                        data.message || "Unable to verify your email address."
                    );
                    return;
                }

                setStatus("success");
                setMessage(data.message);
            } catch (error) {
                console.error("Email verification error:", error);

                setStatus("error");
                setMessage(
                    "Unable to connect to the server. Please try again later."
                );
            }
        };

        verifyEmail();
    }, [searchParams]);

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "20px",
                background: "#f5f8f8"
            }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: "500px",
                    background: "#ffffff",
                    borderRadius: "16px",
                    padding: "40px",
                    textAlign: "center",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.08)"
                }}
            >
                {status === "verifying" && (
                    <>
                        <h2>Verifying Your Email</h2>

                        <p>
                            Please wait while we verify your email address...
                        </p>
                    </>
                )}

                {status === "success" && (
                    <>
                        <h2>Email Verified Successfully!</h2>

                        <p>{message}</p>

                        <Link
                            to="/login"
                            style={{
                                display: "inline-block",
                                marginTop: "20px",
                                padding: "12px 24px",
                                background: "#0f766e",
                                color: "#ffffff",
                                textDecoration: "none",
                                borderRadius: "8px",
                                fontWeight: "bold"
                            }}
                        >
                            Go to Login
                        </Link>
                    </>
                )}

                {status === "error" && (
                    <>
                        <h2>Email Verification Failed</h2>

                        <p>{message}</p>

                        <Link
                            to="/login"
                            style={{
                                display: "inline-block",
                                marginTop: "20px",
                                padding: "12px 24px",
                                background: "#0f766e",
                                color: "#ffffff",
                                textDecoration: "none",
                                borderRadius: "8px",
                                fontWeight: "bold"
                            }}
                        >
                            Go to Login
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}

export default VerifyEmail;