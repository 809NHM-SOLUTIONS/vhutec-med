import { Link } from "react-router-dom";
import { FiArrowLeft, FiLock, FiMail } from "react-icons/fi";
import "./Auth.css";

function Login() {
  return (
    <div className="auth-page">
      <div className="auth-container">

        <Link to="/" className="auth-back">
          <FiArrowLeft />
          Back to home
        </Link>

        <div className="auth-card">

          <div className="auth-logo">
            <img
              src="/images/logo/logo.jpeg"
              alt="Vhutec Med Logo"
            />
          </div>

          <div className="auth-heading">
            <span className="section-label">WELCOME BACK</span>

            <h1>Login to Vhutec Med</h1>

            <p>
              Access your appointments, queue information and healthcare
              services.
            </p>
          </div>

          <form className="auth-form">

            <div className="form-group">
              <label htmlFor="email">Email address</label>

              <div className="input-wrapper">
                <FiMail />

                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>

              <div className="input-wrapper">
                <FiLock />

                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <div className="auth-options">
              <label className="remember-option">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>

              <a href="#forgot-password">
                Forgot password?
              </a>
            </div>

            <button type="submit" className="auth-submit">
              Login
            </button>

          </form>

          <div className="auth-footer">
            <span>Don't have an account?</span>

            <Link to="/signup">
              Sign Up
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Login;