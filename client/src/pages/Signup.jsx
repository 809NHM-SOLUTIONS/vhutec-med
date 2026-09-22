import { Link } from "react-router-dom";
import {
  FiArrowLeft,
  FiLock,
  FiMail,
  FiPhone,
  FiUser,
} from "react-icons/fi";
import "./Auth.css";

function Signup() {
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
            <span className="section-label">GET STARTED</span>

            <h1>Create your account</h1>

            <p>
              Create your Vhutec Med account and manage your healthcare
              journey more easily.
            </p>
          </div>

          <form className="auth-form">

            <div className="form-row">

              <div className="form-group">
                <label htmlFor="firstName">First name</label>

                <div className="input-wrapper">
                  <FiUser />

                  <input
                    id="firstName"
                    type="text"
                    placeholder="First name"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="lastName">Last name</label>

                <div className="input-wrapper">
                  <FiUser />

                  <input
                    id="lastName"
                    type="text"
                    placeholder="Last name"
                    required
                  />
                </div>
              </div>

            </div>

            <div className="form-group">
              <label htmlFor="signupEmail">Email address</label>

              <div className="input-wrapper">
                <FiMail />

                <input
                  id="signupEmail"
                  type="email"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone number</label>

              <div className="input-wrapper">
                <FiPhone />

                <input
                  id="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="signupPassword">Password</label>

              <div className="input-wrapper">
                <FiLock />

                <input
                  id="signupPassword"
                  type="password"
                  placeholder="Create a password"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">
                Confirm password
              </label>

              <div className="input-wrapper">
                <FiLock />

                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  required
                />
              </div>
            </div>

            <button type="submit" className="auth-submit">
              Create Account
            </button>

          </form>

          <div className="auth-footer">
            <span>Already have an account?</span>

            <Link to="/login">
              Login
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Signup;