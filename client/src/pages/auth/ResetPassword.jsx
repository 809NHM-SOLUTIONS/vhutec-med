import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiLock,
  FiEye,
  FiEyeOff,
  FiCheckCircle,
} from "react-icons/fi";
import "./Auth.css";

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!token) {
      setError(
        "This password reset link is invalid or missing."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "http://localhost:5000/api/auth/reset-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            password,
            confirmPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.message ||
            "Unable to reset your password. Please try again."
        );
        return;
      }

      setSuccess(data.message);

      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        navigate("/login");
      }, 2500);
    } catch (error) {
      console.error("Reset password error:", error);

      setError(
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <Link to="/login" className="auth-back">
          <FiArrowLeft />
          Back to login
        </Link>

        <div className="auth-card">
          <div className="auth-logo">
            <img
              src="/images/logo/logo.jpeg"
              alt="Vhutec Med Logo"
            />
          </div>

          <div className="auth-heading">
            <span className="section-label">
              PASSWORD RESET
            </span>

            <h1>Create a new password</h1>

            <p>
              Choose a strong password for your Vhutec Med
              account.
            </p>
          </div>

          {success && (
            <div className="auth-success">
              <FiCheckCircle />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {!success && (
            <form
              className="auth-form"
              onSubmit={handleSubmit}
            >
              <div className="form-group">
                <label htmlFor="password">
                  New password
                </label>

                <div className="input-wrapper">
                  

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your new password"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    autoComplete="new-password"
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {/* {showPassword ? (
                      <FiEyeOff />
                    ) : (
                      <FiEye />
                    )} */}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">
                  Confirm new password
                </label>

                <div className="input-wrapper">
                  

                  <input
                    id="confirmPassword"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    autoComplete="new-password"
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowConfirmPassword(
                        !showConfirmPassword
                      )
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                   
                  </button>
                </div>
              </div>

              <div className="password-requirements">
                <span>Password must contain:</span>

                <ul>
                  <li>At least 8 characters</li>
                  <li>At least one uppercase letter</li>
                  <li>At least one lowercase letter</li>
                  <li>At least one number</li>
                </ul>
              </div>

              <button
                type="submit"
                className="auth-submit"
                disabled={loading}
              >
                {loading
                  ? "Resetting password..."
                  : "Reset Password"}
              </button>
            </form>
          )}

          <div className="auth-footer">
            <span>Remember your password?</span>
            <Link to="/login">Back to Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;