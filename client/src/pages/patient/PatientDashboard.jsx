import { useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiBell,
  FiCalendar,
  FiCheckCircle,
  FiChevronRight,
  FiClock,
  FiFileText,
  FiGrid,
  FiLogOut,
  FiMenu,
  FiMessageSquare,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";

import {
  fetchMyProfile,
  fetchDepartments,
  fetchDoctors,
  fetchMyAppointments,
  createAppointment,
} from "../../api/api";

import "./PatientDashboard.css";

// Appointment.status is CANCELLED/COMPLETED => history, everything else => upcoming/active.
const HISTORY_STATUSES = ["COMPLETED", "CANCELLED"];

const TIME_SLOTS = [
  "08:00",
  "09:00",
  "09:30",
  "10:00",
  "11:00",
  "13:00",
  "14:00",
  "15:00",
];

function formatDateDisplay(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function calculateAge(dateString) {
  if (!dateString) return "";

  const birthDate = new Date(dateString);
  if (Number.isNaN(birthDate.getTime())) return "";

  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();

  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

function statusBadgeClass(status) {
  switch (status) {
    case "CONFIRMED":
    case "CHECKED_IN":
    case "IN_PROGRESS":
    case "COMPLETED":
      return "status-confirmed";
    case "PENDING":
      return "status-pending";
    case "CANCELLED":
      return "status-cancelled";
    default:
      return "status-pending";
  }
}

function statusLabel(status) {
  if (!status) return "";
  return status
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function PatientDashboard() {
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ---- Logged-in patient profile ----
  const [patient, setPatient] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");

  // ---- Reference data for booking ----
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [referenceDataLoading, setReferenceDataLoading] = useState(true);
  const [referenceDataError, setReferenceDataError] = useState("");

  // ---- This patient's appointments ----
  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState("");

  const loadProfile = async () => {
    try {
      setProfileLoading(true);
      setProfileError("");
      const result = await fetchMyProfile();
      setPatient(result.data);
    } catch (error) {
      console.error("Failed to load profile:", error);
      setProfileError(error.message || "Unable to load your profile.");
    } finally {
      setProfileLoading(false);
    }
  };

  const loadAppointments = async () => {
    try {
      setAppointmentsLoading(true);
      setAppointmentsError("");
      const result = await fetchMyAppointments();
      setAppointments(result.data || []);
    } catch (error) {
      console.error("Failed to load appointments:", error);
      setAppointmentsError(error.message || "Unable to load your appointments.");
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const loadReferenceData = async () => {
    try {
      setReferenceDataLoading(true);
      setReferenceDataError("");

      const [departmentsRes, doctorsRes] = await Promise.all([
        fetchDepartments(),
        fetchDoctors(),
      ]);

      setDepartments(departmentsRes.data || []);
      setDoctors(doctorsRes.data || []);
    } catch (error) {
      console.error("Failed to load booking reference data:", error);
      setReferenceDataError(
        error.message || "Unable to load departments and doctors."
      );
    } finally {
      setReferenceDataLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    loadReferenceData();
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // ---- Booking form ----
  const [appointmentForm, setAppointmentForm] = useState({
    departmentId: "",
    doctorId: "",
    date: "",
    time: "",
    reason: "",
  });

  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);

  const availableDoctors = useMemo(() => {
    if (!appointmentForm.departmentId) return [];

    const deptId = Number(appointmentForm.departmentId);

    // Each doctor from GET /api/doctors already carries its own
    // department assignments: departments: [{ departmentId, department }]
    return doctors.filter((doctor) =>
      (doctor.departments || []).some(
        (assignment) => Number(assignment.departmentId) === deptId
      )
    );
  }, [appointmentForm.departmentId, doctors]);

  const handleDepartmentChange = (event) => {
    setAppointmentForm({
      ...appointmentForm,
      departmentId: event.target.value,
      doctorId: "", // reset doctor when department changes
    });
  };

  const handleAppointmentSubmit = async (event) => {
    event.preventDefault();

    setBookingError("");
    setBookingSuccess(false);

    const { departmentId, doctorId, date, time, reason } = appointmentForm;

    if (!departmentId || !doctorId || !date || !time || !reason.trim()) {
      setBookingError("Please fill in every field before submitting.");
      return;
    }

    try {
      setBookingLoading(true);

      await createAppointment({
        departmentId: Number(departmentId),
        doctorId: Number(doctorId),
        date,
        timeSlot: time,
        reason: reason.trim(),
      });

      setBookingSuccess(true);

      setAppointmentForm({
        departmentId: "",
        doctorId: "",
        date: "",
        time: "",
        reason: "",
      });

      // Refresh so the new booking shows up immediately.
      loadAppointments();
    } catch (error) {
      console.error("Booking error:", error);
      setBookingError(
        error.message || "Unable to submit your appointment. Please try again."
      );
    } finally {
      setBookingLoading(false);
    }
  };

  const upcomingAppointments = appointments.filter(
    (appointment) => !HISTORY_STATUSES.includes(appointment.status)
  );

  const historyAppointments = appointments.filter((appointment) =>
    HISTORY_STATUSES.includes(appointment.status)
  );

  const nextAppointment = useMemo(() => {
    const sorted = [...upcomingAppointments].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    return sorted[0] || null;
  }, [upcomingAppointments]);

  const patientFullName = patient
    ? `${patient.firstName} ${patient.lastName}`
    : "";

  const patientInitials = patient
    ? `${patient.firstName?.[0] || ""}${patient.lastName?.[0] || ""}`.toUpperCase()
    : "";

  const renderProfileSection = () => (
    <section className="dashboard-section">
      <div className="section-page-header">
        <div>
          <span className="section-label">PATIENT PROFILE</span>
          <h2>My Profile</h2>
          <p>View your personal and healthcare information.</p>
        </div>
      </div>

      {profileLoading && <p>Loading your profile...</p>}
      {profileError && <div className="auth-error">{profileError}</div>}

      {patient && (
        <div className="profile-page-card">
          <div className="profile-page-header">
            <div className="profile-page-avatar">{patientInitials}</div>

            <div>
              <h3>{patientFullName}</h3>
              <p>Patient · ID {patient.patientNumber}</p>
            </div>
          </div>

          <div className="profile-information-grid">
  <div>
    <span>Full Name</span>
    <strong>{patientFullName}</strong>
  </div>

  <div>
    <span>National ID Number</span>
    <strong>{patient.idNumber}</strong>
  </div>

<div className="profile-detail">
    <span>Patient Number</span>
    <strong>{patient.patientNumber || "Not assigned"}</strong>
</div>

  <div>
    <span>Date of Birth</span>
    <strong>{formatDateDisplay(patient.dob)}</strong>
  </div>

  <div>
    <span>Age</span>
    <strong>{calculateAge(patient.dob)} years</strong>
  </div>

  <div>
    <span>Phone Number</span>
    <strong>{patient.phone}</strong>
  </div>

  <div>
    <span>Email Address</span>
    <strong>{patient.user?.email}</strong>
  </div>

  <div>
    <span>Address</span>
    <strong>{patient.address}</strong>
  </div>
</div>
        </div>
      )}
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
            <p>
              Your appointment has been recorded successfully and is now{" "}
              <strong>Pending</strong> confirmation.
            </p>
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

      {bookingError && <div className="auth-error">{bookingError}</div>}

      {referenceDataError && (
        <div className="auth-error">{referenceDataError}</div>
      )}

      <div className="profile-page-card">
        {referenceDataLoading ? (
          <p>Loading departments and doctors...</p>
        ) : (
          <form className="appointment-form" onSubmit={handleAppointmentSubmit}>
            <div className="form-group">
              <label htmlFor="department">Department</label>
              <select
                id="department"
                value={appointmentForm.departmentId}
                onChange={handleDepartmentChange}
                required
              >
                <option value="">Select department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="doctor">Doctor</label>
              <select
                id="doctor"
                value={appointmentForm.doctorId}
                onChange={(event) =>
                  setAppointmentForm({
                    ...appointmentForm,
                    doctorId: event.target.value,
                  })
                }
                disabled={!appointmentForm.departmentId}
                required
              >
                <option value="">
                  {appointmentForm.departmentId
                    ? "Select doctor"
                    : "Select a department first"}
                </option>
                {availableDoctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    Dr. {doctor.firstName} {doctor.lastName} ({doctor.speciality})
                  </option>
                ))}
              </select>
              {appointmentForm.departmentId &&
                availableDoctors.length === 0 && (
                  <small>No doctors are currently assigned to this department.</small>
                )}
            </div>

            <div className="form-group">
              <label htmlFor="date">Preferred Date</label>
              <input
                id="date"
                type="date"
                value={appointmentForm.date}
                min={new Date().toISOString().split("T")[0]}
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
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
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
              <button
                type="submit"
                className="primary-button"
                disabled={bookingLoading}
              >
                <FiCalendar />
                {bookingLoading ? "Submitting..." : "Request Appointment"}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );

  const renderAppointmentsTable = (list) => (
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
          {list.length === 0 ? (
            <tr>
              <td colSpan={5}>No appointments to show.</td>
            </tr>
          ) : (
            list.map((appointment) => (
              <tr key={appointment.id}>
                <td>
                  <div className="doctor-cell">
                    <div className="doctor-avatar">
                      <FiUser />
                    </div>
                    <div>
                      <strong>
                        Dr. {appointment.doctor?.firstName}{" "}
                        {appointment.doctor?.lastName}
                      </strong>
                      <span>Vhutec Med</span>
                    </div>
                  </div>
                </td>

                <td>{appointment.department?.name}</td>
                <td>{formatDateDisplay(appointment.date)}</td>
                <td>{appointment.timeSlot}</td>

                <td>
                  <span className={`status-badge ${statusBadgeClass(appointment.status)}`}>
                    {statusLabel(appointment.status)}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
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

        {appointmentsLoading ? (
          <p>Loading appointments...</p>
        ) : appointmentsError ? (
          <div className="auth-error">{appointmentsError}</div>
        ) : (
          renderAppointmentsTable(upcomingAppointments)
        )}
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

        {appointmentsLoading ? (
          <p>Loading appointments...</p>
        ) : appointmentsError ? (
          <div className="auth-error">{appointmentsError}</div>
        ) : (
          renderAppointmentsTable(historyAppointments)
        )}
      </div>
    </section>
  );

  // NOTE: Queue Status and Notifications below are NOT wired to the backend
  // yet — there's no "current queue position" or "notifications" endpoint
  // in the API surface you've shown me, so these remain placeholder/demo
  // views for now rather than something I'd guess at faking convincingly.
  const renderQueueStatusSection = () => (
    <section className="dashboard-section">
      <div className="section-page-header">
        <h2>Queue Status</h2>
        <p>View your current position in the patient queue.</p>
      </div>

      <div className="queue-page-grid">
        <div className="queue-info-card">
          <div className="queue-info-icon">
            <FiActivity />
          </div>

          <h3>Queue Information</h3>

          <p>
            Live queue position isn't connected to the backend yet — this
            will show your real position once the Queue API is wired up.
          </p>
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
            <p>
              Notifications aren't connected to the backend yet — nothing
              to show here for now.
            </p>
          </div>
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
              <h1>
                Good day{patient ? `, ${patient.firstName}` : ""} 👋
              </h1>
            </div>
          </div>

          <div className="header-actions">
            <button className="notification-button">
              <FiBell />
              <span />
            </button>

            <div className="header-profile">
              <div className="profile-avatar">{patientInitials}</div>
              <div>
                <strong>{patientFullName}</strong>
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
                    <strong>{upcomingAppointments.length}</strong>
                    <small>
                      {nextAppointment
                        ? `Next: ${formatDateDisplay(nextAppointment.date)}`
                        : "No upcoming appointments"}
                    </small>
                  </div>
                </div>

                <div className="overview-card">
                  <div className="overview-icon green">
                    <FiCheckCircle />
                  </div>
                  <div>
                    <span>Completed Visits</span>
                    <strong>
                      {
                        appointments.filter((a) => a.status === "COMPLETED")
                          .length
                      }
                    </strong>
                    <small>All-time consultations</small>
                  </div>
                </div>

                <div className="overview-card">
                  <div className="overview-icon purple">
                    <FiFileText />
                  </div>
                  <div>
                    <span>Total Appointments</span>
                    <strong>{appointments.length}</strong>
                    <small>All bookings on record</small>
                  </div>
                </div>
              </div>

              {nextAppointment && (
                <div className="dashboard-columns">
                  <section className="dashboard-card upcoming-card">
                    <div className="card-header">
                      <div>
                        <span className="section-label">NEXT APPOINTMENT</span>
                        <h3>Upcoming Appointment</h3>
                      </div>

                      <span
                        className={`status-badge ${statusBadgeClass(
                          nextAppointment.status
                        )}`}
                      >
                        {statusLabel(nextAppointment.status)}
                      </span>
                    </div>

                    <div className="appointment-main">
                      <div className="doctor-avatar">
                        {nextAppointment.doctor?.firstName?.[0]}
                        {nextAppointment.doctor?.lastName?.[0]}
                      </div>

                      <div className="doctor-details">
                        <h4>
                          Dr. {nextAppointment.doctor?.firstName}{" "}
                          {nextAppointment.doctor?.lastName}
                        </h4>
                        <p>{nextAppointment.department?.name}</p>
                      </div>
                    </div>

                    <div className="appointment-details">
                      <div>
                        <FiCalendar />
                        <span>{formatDateDisplay(nextAppointment.date)}</span>
                      </div>

                      <div>
                        <FiClock />
                        <span>{nextAppointment.timeSlot}</span>
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
                </div>
              )}

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

                {appointmentsLoading ? (
                  <p>Loading appointments...</p>
                ) : (
                  renderAppointmentsTable(appointments.slice(0, 5))
                )}
              </section>

              {patient && (
                <section className="profile-summary-card">
                  <div className="profile-summary-avatar">
                    {patientInitials}
                  </div>

                  <div className="profile-summary-info">
                    <span className="section-label">PATIENT PROFILE</span>
                    <h3>{patientFullName}</h3>
                    <p>
                      
                        National ID: <strong>{patient.idNumber}</strong>
                      
                    </p>
                  </div>

                  <div className="profile-summary-details">
                    <div>
                      <span>Date of Birth</span>
                      <strong>{formatDateDisplay(patient.dob)}</strong>
                    </div>

                    <div>
                      <span>Age</span>
                      <strong>{calculateAge(patient.dob)} years</strong>
                    </div>

                    <div>
                      <span>Phone</span>
                      <strong>{patient.phone}</strong>
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
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default PatientDashboard;