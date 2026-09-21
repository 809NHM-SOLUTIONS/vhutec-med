import {
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiHeart,
  FiMenu,
  FiShield,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { useState } from "react";
import "./App.css";

function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="vhutec-app">
      
      <header className="navbar">
        <div className="nav-container">
          <a href="#home" className="brand">
            
            <div className="brand-icon">
  <img src="\images\logo\logo.jpeg" alt="Vhutec Med Logo" />
</div>

            <div className="brand-text">
              <span>Vhutec</span>
              <strong>Med</strong>
            </div>
          </a>

          <nav className={`nav-links ${menuOpen ? "nav-links-open" : ""}`}>
            <a href="#home" onClick={() => setMenuOpen(false)}>
              Home
            </a>

            <a href="#services" onClick={() => setMenuOpen(false)}>
              Services
            </a>

            <a href="#how-it-works" onClick={() => setMenuOpen(false)}>
              How It Works
            </a>

            <a href="#about" onClick={() => setMenuOpen(false)}>
              About
            </a>

            <a href="#contact" onClick={() => setMenuOpen(false)}>
              Contact
            </a>

            <button className="nav-login mobile-login">
              Login
            </button>
          </nav>

          <div className="nav-actions">
            <button className="nav-login desktop-login">
              Login
            </button>

            <button
              className="menu-button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle navigation menu"
            >
              {menuOpen ? <FiX /> : <FiMenu />}
            </button>
          </div>
        </div>
      </header>

      <main>
        
        <section className="hero-section" id="home">
          <div className="hero-container">
            <div className="hero-content">
              <div className="hero-badge">
                <span className="badge-dot" />
                Healthcare made simpler
              </div>

              <h1>
                Your health.
                <br />
                <span>Your time.</span>
                <br />
                Your care.
              </h1>

              <p className="hero-description">
                Vhutec Med makes it easier to manage your healthcare journey.
                Book appointments, check in, track your queue and stay
                connected with your care team.
              </p>

              <div className="hero-buttons">
                <button className="primary-button">
                  Book an Appointment
                  <FiArrowRight />
                </button>

                <button className="secondary-button">
                  Get Started
                </button>
              </div>

              <div className="hero-trust">
                <div className="trust-item">
                  <FiCheckCircle />
                  <span>Easy appointments</span>
                </div>

                <div className="trust-item">
                  <FiCheckCircle />
                  <span>Real-time queue tracking</span>
                </div>
              </div>
            </div>

            <div className="hero-visual">
              <div className="visual-glow" />

              <div className="medical-card main-medical-card">
                <div className="medical-card-top">
                  <div className="medical-card-icon">
                    <FiHeart />
                  </div>

                  <div>
                    <span className="small-label">Vhutec Med</span>
                    <h3>Your care, connected</h3>
                  </div>
                </div>

                <div className="health-line">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>

                <div className="appointment-preview">
                  <div className="preview-icon">
                    <FiCalendar />
                  </div>

                  <div>
                    <span>Next appointment</span>
                    <strong>General Medicine</strong>
                  </div>

                  <FiArrowRight className="preview-arrow" />
                </div>
              </div>

              <div className="floating-card queue-card">
                <div className="floating-icon">
                  <FiClock />
                </div>

                <div>
                  <span>Patient Queue</span>
                  <strong>Your turn is coming</strong>
                </div>
              </div>

              <div className="floating-card care-card">
                <div className="floating-icon">
                  <FiUsers />
                </div>

                <div>
                  <span>Care Team</span>
                  <strong>Connected</strong>
                </div>
              </div>

              <div className="visual-circle circle-one" />
              <div className="visual-circle circle-two" />
            </div>
          </div>
        </section>

        
        <section className="services-section" id="services">
          <div className="section-container">
            <div className="section-heading">
              <span className="section-label">OUR SERVICES</span>

              <h2>
                Everything you need for a
                <span> smoother healthcare experience.</span>
              </h2>

              <p>
                One simple platform designed to make appointments and
                patient management easier.
              </p>
            </div>

            <div className="services-grid">
              <article className="service-card">
                <div className="service-icon">
                  <FiCalendar />
                </div>

                <h3>Appointments</h3>

                <p>
                  Book and manage your medical appointments without
                  unnecessary waiting.
                </p>

                <a href="#contact">
                  Learn more <FiArrowRight />
                </a>
              </article>

              <article className="service-card featured-service">
                <div className="service-icon">
                  <FiClock />
                </div>

                <h3>Patient Queue</h3>

                <p>
                  Know where you are in the queue and spend less time
                  wondering when your turn will come.
                </p>

                <a href="#contact">
                  Learn more <FiArrowRight />
                </a>
              </article>

              <article className="service-card">
                <div className="service-icon">
                  <FiUsers />
                </div>

                <h3>Healthcare Teams</h3>

                <p>
                  Keep patients, doctors and reception staff connected
                  through one system.
                </p>

                <a href="#contact">
                  Learn more <FiArrowRight />
                </a>
              </article>

              <article className="service-card">
                <div className="service-icon">
                  <FiShield />
                </div>

                <h3>Secure Records</h3>

                <p>
                  Keep important healthcare information organized with
                  secure access and role-based management.
                </p>

                <a href="#contact">
                  Learn more <FiArrowRight />
                </a>
              </article>
            </div>
          </div>
        </section>

        
        <section className="steps-section" id="how-it-works">
          <div className="section-container">
            <div className="section-heading centered-heading">
              <span className="section-label">HOW IT WORKS</span>

              <h2>
                Healthcare without
                <span> unnecessary complexity.</span>
              </h2>

              <p>
                From booking to consultation, Vhutec Med keeps the process
                simple.
              </p>
            </div>

            <div className="steps-grid">
              <div className="step">
                <div className="step-number">01</div>

                <h3>Create your account</h3>

                <p>
                  Register as a patient and provide your basic information.
                </p>
              </div>

              <div className="step-line" />

              <div className="step">
                <div className="step-number">02</div>

                <h3>Book an appointment</h3>

                <p>
                  Select your doctor, department, date and available time.
                </p>
              </div>

              <div className="step-line" />

              <div className="step">
                <div className="step-number">03</div>

                <h3>Check in</h3>

                <p>
                  Check in for your appointment and receive your queue
                  position.
                </p>
              </div>

              <div className="step-line" />

              <div className="step">
                <div className="step-number">04</div>

                <h3>See your doctor</h3>

                <p>
                  Follow your queue and meet your healthcare professional.
                </p>
              </div>
            </div>
          </div>
        </section>

        
        <section className="about-section" id="about">
          <div className="section-container about-container">
            <div className="about-visual">
              <div className="about-main-card">
                <FiHeart />
                <strong>Vhutec Med</strong>
                <span>Healthcare management made simpler.</span>
              </div>

              <div className="about-small-card">
                <FiCheckCircle />
                <div>
                  <strong>Connected care</strong>
                  <span>One platform</span>
                </div>
              </div>
            </div>

            <div className="about-content">
              <span className="section-label">ABOUT VHUTEC MED</span>

              <h2>
                Technology that puts the
                <span> patient experience first.</span>
              </h2>

              <p>
                Vhutec Med is a healthcare appointment and patient queue
                management platform designed to connect patients and
                healthcare teams through a simple digital experience.
              </p>

              <p>
                Our goal is to reduce unnecessary waiting, improve
                appointment management and give healthcare teams the tools
                they need to manage patient journeys more efficiently.
              </p>

              <button className="primary-button">
                Learn More
                <FiArrowRight />
              </button>
            </div>
          </div>
        </section>

        
        <section className="cta-section" id="contact">
          <div className="cta-container">
            <div>
              <span className="section-label">GET STARTED</span>

              <h2>
                A simpler way to manage
                <span> your healthcare.</span>
              </h2>

              <p>
                Start your healthcare journey with Vhutec Med.
              </p>
            </div>

            <button className="cta-button">
              Get Started
              <FiArrowRight />
            </button>
          </div>
        </section>
      </main>

      
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-brand">
            <a href="#home" className="brand">
              <div className="brand-icon">
  <img src="/images/logo/logo.jpeg" alt="Vhutec Med Logo" />
</div>

              <div className="brand-text">
                <span>Vhutec</span>
                <strong>Med</strong>
              </div>
            </a>

            <p>
              Healthcare appointment and patient queue management,
              made simpler.
            </p>
          </div>

          <div className="footer-column">
            <h4>Platform</h4>
            <a href="#services">Services</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#about">About</a>
          </div>

          <div className="footer-column">
            <h4>Access</h4>
            <a href="#home">Patient Login</a>
            <a href="#home">Doctor Login</a>
            <a href="#home">Staff Login</a>
          </div>

          <div className="footer-column">
            <h4>Contact</h4>
            <a href="mailto:vhutheluresources@gmail.com">
              Email us
            </a>
            <span>Mpumalanga, South Africa</span>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 Vhutec Med. All rights reserved.</span>
          <span>Powered by Vhuthelu Resources</span>
        </div>
      </footer>
    </div>
  );
}

export default App;