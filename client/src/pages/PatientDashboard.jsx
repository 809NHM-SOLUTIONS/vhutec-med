import { useState } from "react";
import {
  FiActivity,
  FiBell,
  FiCalendar,
  FiCheckCircle,
  FiChevronRight,
  FiClock,
  FiFileText,
  FiGrid,
  FiHeart,
  FiLogOut,
  FiMenu,
  FiMessageSquare,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";

import "./PatientDashboard.css";

const patient = {
  name: "Thabo Mokoena",
  fileNumber: "VH-2026-00421",
  dateOfBirth: "14 March 1998",
  gender: "Male",
  phone: "071 456 7821",
  email: "thabo.mokoena@example.com",
  bloodType: "O+",
};

const upcomingAppointment = {
  doctor: "Dr. Naledi Maseko",
  department: "General Medicine",
  date: "30 September 2026",
  time: "09:30",
  room: "Consultation Room 4",
  status: "Confirmed",
};

const appointments = [
  {
    id: 1,
    doctor: "Dr. Naledi Maseko",
    department: "General Medicine",
    date: "30 September 2026",
    time: "09:30",
    status: "Confirmed",
  },
  {
    id: 2,
    doctor: "Dr. Kabelo Dlamini",
    department: "Dental Care",
    date: "8 October 2026",
    time: "11:00",
    status: "Pending",
  },
  {
    id: 3,
    doctor: "Dr. Lerato Nkosi",
    department: "Dermatology",
    date: "17 September 2026",
    time: "14:00",
    status: "Completed",
  },
];

const prescriptions = [
  {
    medicine: "Amoxicillin 500mg",
    dosage: "1 capsule, 3 times daily",
    doctor: "Dr. Naledi Maseko",
  },
  {
    medicine: "Paracetamol 500mg",
    dosage: "2 tablets when required",
    doctor: "Dr. Naledi Maseko",
  },
];

const notifications = [
  {
    id: 1,
    title: "Appointment confirmed",
    message: "Your appointment with Dr. Naledi Maseko has been confirmed.",
    time: "20 minutes ago",
  },
  {
    id: 2,
    title: "Queue update",
    message: "You are currently number 4 in the consultation queue.",
    time: "1 hour ago",
  },
  {
    id: 3,
    title: "Prescription reminder",
    message: "Remember to collect your prescribed medication.",
    time: "Yesterday",
  },
];

function PatientDashboard() {
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { label: "Dashboard", icon: FiGrid },
    { label: "My Profile", icon: FiUser },
    { label: "Book Appointment", icon: FiCalendar },
    { label: "My Appointments", icon: FiFileText },
    { label: "Appointment History", icon: FiClock },
    { label: "Queue Status", icon: FiUsers },
    { label: "Notifications", icon: FiBell },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const handleNavigation = (label) => {
    setActiveSection(label);
    setSidebarOpen(false);
  };

  const [appointmentForm, setAppointmentForm] = useState({
  doctor: "",
  department: "",
  date: "",
  time: "",
  reason: "",
  type: "In-Person Consultation",
});

const [bookingSuccess, setBookingSuccess] = useState(false);

const handleAppointmentSubmit = (event) => {
  event.preventDefault();

  setBookingSuccess(true);

  setAppointmentForm({
    doctor: "",
    department: "",
    date: "",
    time: "",
    reason: "",
    type: "In-Person Consultation",
  });
};

  const renderProfileSection = () => (
  <section className="dashboard-section">
    <div className="section-page-header">
      <div>
        <span className="section-label">PATIENT PROFILE</span>
        <h2>My Profile</h2>
        <p>View your personal and healthcare information.</p>
      </div>
    </div>

    <div className="profile-page-card">
      <div className="profile-page-header">
        <div className="profile-page-avatar">TM</div>

        <div>
          <h3>{patient.name}</h3>
          <p>Patient · File Number {patient.fileNumber}</p>
        </div>
      </div>

      <div className="profile-information-grid">
        <div>
          <span>Full Name</span>
          <strong>{patient.name}</strong>
        </div>

        <div>
          <span>File Number</span>
          <strong>{patient.fileNumber}</strong>
        </div>

        <div>
          <span>Date of Birth</span>
          <strong>{patient.dateOfBirth}</strong>
        </div>

        <div>
          <span>Gender</span>
          <strong>{patient.gender}</strong>
        </div>

        <div>
          <span>Phone Number</span>
          <strong>{patient.phone}</strong>
        </div>

        <div>
          <span>Email Address</span>
          <strong>{patient.email}</strong>
        </div>

        <div>
          <span>Blood Type</span>
          <strong>{patient.bloodType}</strong>
        </div>
      </div>
    </div>
  </section>
);

const renderBookAppointmentSection = () => (
  <section className="dashboard-section">
    <div className="section-page-header">
      <h2>Book Appointment</h2>
      <p>Schedule an appointment with one of our healthcare professionals.</p>
    </div>

    {bookingSuccess && (
      <div className="booking-success">
        <FiCheckCircle />
        <div>
          <strong>Appointment request submitted</strong>
          <p>Your appointment has been recorded successfully.</p>
        </div>
        <button
          type="button"
          onClick={() => setBookingSuccess(false)}
          aria-label="Close success message"
        >
          <FiX />
        </button>
      </div>
    )}

    <div className="profile-page-card">
      <form className="appointment-form" onSubmit={handleAppointmentSubmit}>
        <div className="form-group">
          <label htmlFor="doctor">Doctor</label>
          <select
            id="doctor"
            value={appointmentForm.doctor}
            onChange={(event) =>
              setAppointmentForm({
                ...appointmentForm,
                doctor: event.target.value,
              })
            }
            required
          >
            <option value="">Select doctor</option>
            <option value="Dr. Naledi Maseko">Dr. Naledi Maseko</option>
            <option value="Dr. Kabelo Dlamini">Dr. Kabelo Dlamini</option>
            <option value="Dr. Lerato Nkosi">Dr. Lerato Nkosi</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="department">Department</label>
          <select
            id="department"
            value={appointmentForm.department}
            onChange={(event) =>
              setAppointmentForm({
                ...appointmentForm,
                department: event.target.value,
              })
            }
            required
          >
            <option value="">Select department</option>
            <option value="General Medicine">General Medicine</option>
            <option value="Dental Care">Dental Care</option>
            <option value="Dermatology">Dermatology</option>
            <option value="Cardiology">Cardiology</option>
            <option value="Paediatrics">Paediatrics</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="date">Preferred Date</label>
          <input
            id="date"
            type="date"
            value={appointmentForm.date}
            onChange={(event) =>
              setAppointmentForm({
                ...appointmentForm,
                date: event.target.value,
              })
            }
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="time">Preferred Time</label>
          <select
            id="time"
            value={appointmentForm.time}
            onChange={(event) =>
              setAppointmentForm({
                ...appointmentForm,
                time: event.target.value,
              })
            }
            required
          >
            <option value="">Select time</option>
            <option value="08:00">08:00</option>
            <option value="09:00">09:00</option>
            <option value="09:30">09:30</option>
            <option value="10:00">10:00</option>
            <option value="11:00">11:00</option>
            <option value="13:00">13:00</option>
            <option value="14:00">14:00</option>
            <option value="15:00">15:00</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="type">Appointment Type</label>
          <select
            id="type"
            value={appointmentForm.type}
            onChange={(event) =>
              setAppointmentForm({
                ...appointmentForm,
                type: event.target.value,
              })
            }
          >
            <option value="In-Person Consultation">
              In-Person Consultation
            </option>
            <option value="Follow-up Consultation">
              Follow-up Consultation
            </option>
            <option value="General Check-up">General Check-up</option>
          </select>
        </div>

        <div className="form-group form-group-full">
          <label htmlFor="reason">Reason for Visit</label>
          <textarea
            id="reason"
            rows="4"
            placeholder="Briefly describe the reason for your appointment..."
            value={appointmentForm.reason}
            onChange={(event) =>
              setAppointmentForm({
                ...appointmentForm,
                reason: event.target.value,
              })
            }
            required
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button">
            <FiCalendar />
            Request Appointment
          </button>
        </div>
      </form>
    </div>
  </section>
);

const renderMyAppointmentsSection = () => (
  <section className="dashboard-section">
    <div className="section-page-header">
      <h2>My Appointments</h2>
      <p>View and manage your upcoming and scheduled appointments.</p>
    </div>

    <div className="appointments-list-card">
      <div className="appointments-list-header">
        <div>
          <h3>Scheduled Appointments</h3>
          <p>Your current appointments with Vhutec Med.</p>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={() => handleNavigation("Book Appointment")}
        >
          <FiCalendar />
          Book Appointment
        </button>
      </div>

      <div className="appointments-table-wrapper">
        <table className="appointments-table">
          <thead>
            <tr>
              <th>Doctor</th>
              <th>Department</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {appointments
              .filter(
                (appointment) =>
                  appointment.status === "Confirmed" ||
                  appointment.status === "Pending"
              )
              .map((appointment, index) => (
                <tr key={index}>
                  <td>
                    <div className="doctor-cell">
                      <div className="doctor-avatar">
                        <FiUser />
                      </div>
                      <div>
                        <strong>{appointment.doctor}</strong>
                        <span>Vhutec Med</span>
                      </div>
                    </div>
                  </td>

                  <td>{appointment.department}</td>
                  <td>{appointment.date}</td>
                  <td>{appointment.time}</td>

                  <td>
                    <span
                      className={`status-badge ${
                        appointment.status === "Confirmed"
                          ? "status-confirmed"
                          : "status-pending"
                      }`}
                    >
                      {appointment.status}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  </section>
);

const renderAppointmentHistorySection = () => (
  <section className="dashboard-section">
    <div className="section-page-header">
      <h2>Appointment History</h2>
      <p>Review your previous appointments and consultations.</p>
    </div>

    <div className="appointments-list-card">
      <div className="appointments-list-header">
        <div>
          <h3>Previous Appointments</h3>
          <p>Your completed and cancelled appointments.</p>
        </div>
      </div>

      <div className="appointments-table-wrapper">
        <table className="appointments-table">
          <thead>
            <tr>
              <th>Doctor</th>
              <th>Department</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {appointments
              .filter(
                (appointment) =>
                  appointment.status === "Completed" ||
                  appointment.status === "Cancelled"
              )
              .map((appointment, index) => (
                <tr key={index}>
                  <td>
                    <div className="doctor-cell">
                      <div className="doctor-avatar">
                        <FiUser />
                      </div>

                      <div>
                        <strong>{appointment.doctor}</strong>
                        <span>Vhutec Med</span>
                      </div>
                    </div>
                  </td>

                  <td>{appointment.department}</td>
                  <td>{appointment.date}</td>
                  <td>{appointment.time}</td>

                  <td>
                    <span
                      className={`status-badge ${
                        appointment.status === "Completed"
                          ? "status-confirmed"
                          : "status-cancelled"
                      }`}
                    >
                      {appointment.status}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  </section>
);

const renderQueueStatusSection = () => (
  <section className="dashboard-section">
    <div className="section-page-header">
      <h2>Queue Status</h2>
      <p>View your current position in the patient queue.</p>
    </div>

    <div className="queue-page-grid">
      <div className="queue-main-card">
        <div className="queue-main-header">
          <div>
            <span className="queue-label">CURRENT QUEUE</span>
            <h3>General Medicine</h3>
            <p>Dr. Naledi Maseko · Consultation Room 4</p>
          </div>

          <span className="status-badge status-confirmed">
            In Queue
          </span>
        </div>

        <div className="queue-position">
          <div className="queue-position-number">04</div>

          <div>
            <span>Your Position</span>
            <strong>4th in queue</strong>
          </div>
        </div>

        <div className="queue-progress">
          <div className="queue-progress-header">
            <span>Queue progress</span>
            <strong>60%</strong>
          </div>

          <div className="queue-progress-bar">
            <div className="queue-progress-fill" />
          </div>
        </div>

        <div className="queue-details">
          <div>
            <FiUsers />
            <span>
              <strong>3</strong>
              Patients ahead
            </span>
          </div>

          <div>
            <FiClock />
            <span>
              <strong>25 min</strong>
              Estimated wait
            </span>
          </div>

          <div>
            <FiCalendar />
            <span>
              <strong>Today</strong>
              Appointment
            </span>
          </div>
        </div>
      </div>

      <div className="queue-info-card">
        <div className="queue-info-icon">
          <FiActivity />
        </div>

        <h3>Queue Information</h3>

        <p>
          Please remain available while you wait. The queue status
          will help you understand when your consultation is approaching.
        </p>

        <div className="queue-info-item">
          <span>Status</span>
          <strong>Waiting for doctor</strong>
        </div>

        <div className="queue-info-item">
          <span>Room</span>
          <strong>Consultation Room 4</strong>
        </div>

        <div className="queue-info-item">
          <span>Doctor</span>
          <strong>Dr. Naledi Maseko</strong>
        </div>
      </div>
    </div>
  </section>
);


const renderNotificationsSection = () => (
  <section className="dashboard-section">
    <div className="section-page-header">
      <h2>Notifications</h2>
      <p>Stay updated with your appointments, queue and prescriptions.</p>
    </div>

    <div className="notifications-page-card">
      <div className="notifications-page-header">
        <div>
          <h3>Recent Notifications</h3>
          <p>Your latest Vhutec Med updates.</p>
        </div>

        <span className="notification-count">
          {notifications.length} Notifications
        </span>
      </div>

      <div className="notifications-page-list">
        {notifications.map((notification, index) => (
          <div className="notification-page-item" key={index}>
            <div className="notification-page-icon">
              {index === 0 ? (
                <FiCalendar />
              ) : index === 1 ? (
                <FiUsers />
              ) : (
                <FiFileText />
              )}
            </div>

            <div className="notification-page-content">
              <strong>{notification.title}</strong>
              <p>{notification.message}</p>
              <span>{notification.time}</span>
            </div>

            <FiChevronRight className="notification-arrow" />
          </div>
        ))}
      </div>
    </div>
  </section>
);

  return (
    <div className="patient-dashboard">
      <aside className={`patient-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="patient-brand">
          <div className="patient-brand-icon">
  <img src="/images/logo/logo.jpeg" alt="Vhutec Med logo" />
</div>

          <div>
            <h2>Vhutec Med</h2>
            <span>Patient Portal</span>
          </div>

          <button
            className="sidebar-close"
            onClick={() => setSidebarOpen(false)}
          >
            <FiX />
          </button>
        </div>

        <nav className="patient-navigation">
          <p className="navigation-title">MAIN MENU</p>

          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                className={`navigation-item ${
                  activeSection === item.label ? "active" : ""
                }`}
                onClick={() => handleNavigation(item.label)}
              >
                <Icon />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <FiMessageSquare />
            <div>
              <strong>Need help?</strong>
              <span>Contact Vhutec Med support.</span>
            </div>
          </div>

          <button className="logout-button" onClick={handleLogout}>
            <FiLogOut />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        />
      )}

      <main className="patient-main">
        <header className="patient-header">
          <div className="header-left">
            <button
              className="mobile-menu-button"
              onClick={() => setSidebarOpen(true)}
            >
              <FiMenu />
            </button>

            <div>
              <p className="header-label">Patient Dashboard</p>
              <h1>Good morning, {patient.name.split(" ")[0]} 👋</h1>
            </div>
          </div>

          <div className="header-actions">
            <button className="notification-button">
              <FiBell />
              <span />
            </button>

            <div className="header-profile">
              <div className="profile-avatar">TM</div>
              <div>
                <strong>{patient.name}</strong>
                <span>Patient</span>
              </div>
            </div>
          </div>
        </header>

        <section className="dashboard-content">
            {activeSection === "My Profile" ? (
  renderProfileSection()
) : activeSection === "Book Appointment" ? (
  renderBookAppointmentSection()
) : activeSection === "My Appointments" ? (
  renderMyAppointmentsSection()
) : activeSection === "Appointment History" ? (
  renderAppointmentHistorySection()
) : activeSection === "Queue Status" ? (
  renderQueueStatusSection()
) : activeSection === "Notifications" ? (
  renderNotificationsSection()
) : (
  <>
          <div className="welcome-banner">
            <div>
              <span className="banner-label">WELCOME BACK</span>
              <h2>Your health, your priority.</h2>
              <p>
                Manage your appointments, track your queue and keep up with
                your healthcare information.
              </p>
            </div>

            <div className="banner-icon">
              <FiActivity />
            </div>
          </div>

          <div className="overview-grid">
            <div className="overview-card">
              <div className="overview-icon blue">
                <FiCalendar />
              </div>
              <div>
                <span>Upcoming Appointments</span>
                <strong>2</strong>
                <small>Next: 30 Sep 2026</small>
              </div>
            </div>

            <div className="overview-card">
              <div className="overview-icon green">
                <FiCheckCircle />
              </div>
              <div>
                <span>Completed Visits</span>
                <strong>8</strong>
                <small>All-time consultations</small>
              </div>
            </div>

            <div className="overview-card">
              <div className="overview-icon orange">
                <FiClock />
              </div>
              <div>
                <span>Queue Position</span>
                <strong>#4</strong>
                <small>Estimated wait: 25 min</small>
              </div>
            </div>

            <div className="overview-card">
              <div className="overview-icon purple">
                <FiFileText />
              </div>
              <div>
                <span>Active Prescriptions</span>
                <strong>2</strong>
                <small>Currently prescribed</small>
              </div>
            </div>
          </div>

          <div className="dashboard-columns">
            <section className="dashboard-card upcoming-card">
              <div className="card-header">
                <div>
                  <span className="section-label">NEXT APPOINTMENT</span>
                  <h3>Upcoming Appointment</h3>
                </div>

                <span className="status-badge confirmed">
                  {upcomingAppointment.status}
                </span>
              </div>

              <div className="appointment-main">
                <div className="doctor-avatar">NM</div>

                <div className="doctor-details">
                  <h4>{upcomingAppointment.doctor}</h4>
                  <p>{upcomingAppointment.department}</p>
                </div>
              </div>

              <div className="appointment-details">
                <div>
                  <FiCalendar />
                  <span>{upcomingAppointment.date}</span>
                </div>

                <div>
                  <FiClock />
                  <span>{upcomingAppointment.time}</span>
                </div>

                <div>
                  <FiActivity />
                  <span>{upcomingAppointment.room}</span>
                </div>
              </div>

              <button
                className="primary-button"
                onClick={() => handleNavigation("My Appointments")}
              >
                View Appointment
                <FiChevronRight />
              </button>
            </section>

            <section className="dashboard-card queue-card">
              <div className="card-header">
                <div>
                  <span className="section-label">LIVE QUEUE</span>
                  <h3>Queue Status</h3>
                </div>

                <span className="queue-live">
                  <span />
                  Live
                </span>
              </div>

              <div className="queue-position">
                <strong>#4</strong>
                <span>Your position</span>
              </div>

              <div className="queue-progress">
                <div className="queue-progress-bar">
                  <span />
                </div>
                <div className="queue-progress-labels">
                  <span>Checked in</span>
                  <span>Consultation</span>
                </div>
              </div>

              <div className="queue-info">
                <div>
                  <span>Patients ahead</span>
                  <strong>3</strong>
                </div>

                <div>
                  <span>Estimated wait</span>
                  <strong>25 min</strong>
                </div>
              </div>

              <button
                className="secondary-button"
                onClick={() => handleNavigation("Queue Status")}
              >
                View Queue
                <FiChevronRight />
              </button>
            </section>
          </div>

          <section className="dashboard-card">
            <div className="card-header">
              <div>
                <span className="section-label">APPOINTMENTS</span>
                <h3>My Appointments</h3>
              </div>

              <button
                className="text-button"
                onClick={() => handleNavigation("My Appointments")}
              >
                View all <FiChevronRight />
              </button>
            </div>

            <div className="appointments-table-wrapper">
              <table className="appointments-table">
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Department</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {appointments.map((appointment) => (
                    <tr key={appointment.id}>
                      <td>
                        <div className="table-doctor">
                          <div className="small-avatar">
                            {appointment.doctor
                              .split(" ")
                              .slice(1)
                              .map((name) => name[0])
                              .join("")}
                          </div>

                          <strong>{appointment.doctor}</strong>
                        </div>
                      </td>

                      <td>{appointment.department}</td>
                      <td>{appointment.date}</td>
                      <td>{appointment.time}</td>
                      <td>
                        <span
                          className={`status-badge ${appointment.status
                            .toLowerCase()
                            .replace(" ", "-")}`}
                        >
                          {appointment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="dashboard-columns bottom-grid">
            <section className="dashboard-card">
              <div className="card-header">
                <div>
                  <span className="section-label">MEDICATION</span>
                  <h3>Prescriptions</h3>
                </div>
              </div>

              <div className="prescription-list">
                {prescriptions.map((prescription) => (
                  <div className="prescription-item" key={prescription.medicine}>
                    <div className="prescription-icon">
                      <FiFileText />
                    </div>

                    <div>
                      <strong>{prescription.medicine}</strong>
                      <span>{prescription.dosage}</span>
                      <small>{prescription.doctor}</small>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="dashboard-card">
              <div className="card-header">
                <div>
                  <span className="section-label">UPDATES</span>
                  <h3>Notifications</h3>
                </div>

                <button
                  className="text-button"
                  onClick={() => handleNavigation("Notifications")}
                >
                  View all <FiChevronRight />
                </button>
              </div>

              <div className="notification-list">
                {notifications.map((notification) => (
                  <div className="notification-item" key={notification.id}>
                    <div className="notification-icon">
                      <FiBell />
                    </div>

                    <div>
                      <strong>{notification.title}</strong>
                      <p>{notification.message}</p>
                      <small>{notification.time}</small>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="profile-summary-card">
            <div className="profile-summary-avatar">TM</div>

            <div className="profile-summary-info">
              <span className="section-label">PATIENT PROFILE</span>
              <h3>{patient.name}</h3>
              <p>
                File Number: <strong>{patient.fileNumber}</strong>
              </p>
            </div>

            <div className="profile-summary-details">
              <div>
                <span>Date of Birth</span>
                <strong>{patient.dateOfBirth}</strong>
              </div>

              <div>
                <span>Gender</span>
                <strong>{patient.gender}</strong>
              </div>

              <div>
                <span>Blood Type</span>
                <strong>{patient.bloodType}</strong>
              </div>
            </div>

            <button
              className="secondary-button"
              onClick={() => handleNavigation("My Profile")}
            >
              View Profile
              <FiChevronRight />
            </button>
          </section>
                       </>
      )}
      </section>
    </main>
    </div>
  );
}

export default PatientDashboard;