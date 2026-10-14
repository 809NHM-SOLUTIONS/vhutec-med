
import { useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiMail } from "react-icons/fi";
import "./Auth.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [notRegistered, setNotRegistered] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setNotRegistered(false);

    try {
      setLoading(true);

      const response = await fetch(
        "http://localhost:5000/api/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.registered === false) {
          setNotRegistered(true);
          return;
        }

        setError(
          data.message ||
            "Unable to process your request. Please try again."
        );

        return;
      }

      setSuccess(data.message);
      setEmail("");
    } catch (error) {
      console.error("Forgot password error:", error);

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
              ACCOUNT RECOVERY
            </span>

            <h1>Forgot your password?</h1>

            <p>
              Enter your email address and we'll send you a
              secure link to reset your password.
            </p>
          </div>

          {success && (
            <div className="auth-success">
              {success}
            </div>
          )}

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {notRegistered && (
            <div className="auth-not-registered">
              <div className="auth-not-registered-content">
                <h3>Account not found</h3>

                <p>
                  We couldn't find a registered patient account
                  with this email address.
                </p>

                <p>
                  If you haven't registered yet, you can create
                  your patient account below.
                </p>

                <Link
                  to="/signup"
                  className="auth-submit auth-register-button"
                >
                  Register as a Patient
                </Link>
              </div>
            </div>
          )}

          {!success && !notRegistered && (
            <form
              className="auth-form"
              onSubmit={handleSubmit}
            >
              <div className="form-group">
                <label htmlFor="email">
                  Email address
                </label>

                <div className="input-wrapper">
                  

                  <input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="auth-submit"
                disabled={loading}
              >
                {loading
                  ? "Sending..."
                  : "Send Reset Link"}
              </button>
            </form>
          )}

          <div className="auth-footer">
            <span>Remember your password?</span>

            <Link to="/login">
              Back to Login
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
