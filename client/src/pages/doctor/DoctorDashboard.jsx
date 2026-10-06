import { useState } from "react";
import {
  FiActivity,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiGrid,
  FiLogOut,
  FiMenu,
  FiMessageSquare,
  FiUserCheck,
  FiUsers,
} from "react-icons/fi";

import "./DoctorDashboard.css";

const DoctorDashboard = () => {
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { label: "Dashboard", icon: FiGrid },
    { label: "Appointments", icon: FiCalendar },
    { label: "Patients", icon: FiUsers },
    { label: "Queue", icon: FiClock },
    { label: "Consultations", icon: FiUserCheck },
    { label: "Medical Records", icon: FiFileText },
    { label: "Notifications", icon: FiMessageSquare },
  ];

  const patients = [
    {
      initials: "TM",
      patient: "Thabo Mokoena",
      fileNumber: "VH-2026-00421",
      reason: "General consultation",
      status: "Waiting",
    },
    {
      initials: "LM",
      patient: "Lerato Dlamini",
      fileNumber: "VH-2026-00436",
      reason: "Follow-up consultation",
      status: "Checked In",
    },
    {
      initials: "MN",
      patient: "Mpho Nkosi",
      fileNumber: "VH-2026-00452",
      reason: "Routine consultation",
      status: "Waiting",
    },
    {
      initials: "KM",
      patient: "Karabo Molefe",
      fileNumber: "VH-2026-00467",
      reason: "General consultation",
      status: "Waiting",
    },
  ];

  const appointments = [
    {
      patient: "Thabo Mokoena",
      time: "09:30",
      type: "General Medicine",
      status: "Confirmed",
    },
    {
      patient: "Lerato Dlamini",
      time: "10:30",
      type: "Follow-up",
      status: "Confirmed",
    },
    {
      patient: "Mpho Nkosi",
      time: "11:00",
      type: "Routine Consultation",
      status: "Pending",
    },
    {
      patient: "Karabo Molefe",
      time: "13:30",
      type: "General Medicine",
      status: "Confirmed",
    },
  ];

  const activities = [
    {
      icon: FiCheckCircle,
      title: "Consultation completed",
      description: "A patient consultation was completed successfully.",
      time: "15 minutes ago",
    },
    {
      icon: FiFileText,
      title: "Medical record updated",
      description: "Patient medical notes were updated.",
      time: "35 minutes ago",
    },
    {
      icon: FiUserCheck,
      title: "Patient checked in",
      description: "Lerato Dlamini has checked in for consultation.",
      time: "50 minutes ago",
    },
    {
      icon: FiCalendar,
      title: "Appointment confirmed",
      description: "A new appointment was confirmed for today.",
      time: "1 hour ago",
    },
  ];

  const handleNavigation = (label) => {
    setActiveSection(label);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const renderAppointments = () => (
  <>
    <div className="doctor-section-header">
      <h2>Appointments</h2>
      <p>Manage your scheduled patient appointments for today.</p>
    </div>

    <section className="doctor-stats">
      <div className="doctor-stat-card">
        <div className="doctor-stat-icon">
          <FiCalendar />
        </div>
        <span>Today's Appointments</span>
        <h3>12</h3>
        <span className="doctor-stat-change">4 completed</span>
      </div>

      <div className="doctor-stat-card">
        <div className="doctor-stat-icon">
          <FiClock />
        </div>
        <span>Upcoming</span>
        <h3>8</h3>
        <span className="doctor-stat-change">Next at 09:30</span>
      </div>

      <div className="doctor-stat-card">
        <div className="doctor-stat-icon">
          <FiCheckCircle />
        </div>
        <span>Confirmed</span>
        <h3>9</h3>
        <span className="doctor-stat-change">Ready for consultation</span>
      </div>

      <div className="doctor-stat-card">
        <div className="doctor-stat-icon">
          <FiActivity />
        </div>
        <span>Pending</span>
        <h3>2</h3>
        <span className="doctor-stat-change">Requires attention</span>
      </div>
    </section>

    <section className="doctor-card">
      <div className="doctor-card-header">
        <div>
          <h3>Today's Appointment Schedule</h3>
          <p>30 September 2026 • General Medicine</p>
        </div>
      </div>

      <div className="doctor-table-wrapper">
        <table className="doctor-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Patient</th>
              <th>File Number</th>
              <th>Appointment Type</th>
              <th>Room</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>09:30</td>
              <td>Thabo Mokoena</td>
              <td>VH-2026-00421</td>
              <td>General Medicine</td>
              <td>Room 4</td>
              <td><span className="doctor-status confirmed">Confirmed</span></td>
            </tr>

            <tr>
              <td>10:30</td>
              <td>Lerato Dlamini</td>
              <td>VH-2026-00436</td>
              <td>Follow-up</td>
              <td>Room 4</td>
              <td><span className="doctor-status confirmed">Confirmed</span></td>
            </tr>

            <tr>
              <td>11:00</td>
              <td>Mpho Nkosi</td>
              <td>VH-2026-00452</td>
              <td>Routine Consultation</td>
              <td>Room 4</td>
              <td><span className="doctor-status pending">Pending</span></td>
            </tr>

            <tr>
              <td>13:30</td>
              <td>Karabo Molefe</td>
              <td>VH-2026-00467</td>
              <td>General Medicine</td>
              <td>Room 4</td>
              <td><span className="doctor-status confirmed">Confirmed</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </>
);

const renderPatients = () => (
  <>
    <div className="doctor-section-header">
      <h2>Patients</h2>
      <p>View and manage patients assigned to your clinical workspace.</p>
    </div>

    <section className="doctor-card">
      <div className="doctor-card-header">
        <div>
          <h3>Patient Directory</h3>
          <p>Registered patients with recent clinical activity.</p>
        </div>
      </div>

      <div className="doctor-table-wrapper">
        <table className="doctor-table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>File Number</th>
              <th>Age</th>
              <th>Gender</th>
              <th>Last Visit</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>Thabo Mokoena</td>
              <td>VH-2026-00421</td>
              <td>28</td>
              <td>Male</td>
              <td>12 Sep 2026</td>
              <td><span className="doctor-status waiting">Waiting</span></td>
            </tr>

            <tr>
              <td>Lerato Dlamini</td>
              <td>VH-2026-00436</td>
              <td>34</td>
              <td>Female</td>
              <td>18 Sep 2026</td>
              <td><span className="doctor-status checked">Checked In</span></td>
            </tr>

            <tr>
              <td>Mpho Nkosi</td>
              <td>VH-2026-00452</td>
              <td>41</td>
              <td>Male</td>
              <td>21 Sep 2026</td>
              <td><span className="doctor-status waiting">Waiting</span></td>
            </tr>

            <tr>
              <td>Karabo Molefe</td>
              <td>VH-2026-00467</td>
              <td>25</td>
              <td>Female</td>
              <td>25 Sep 2026</td>
              <td><span className="doctor-status confirmed">Scheduled</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </>
);

const renderQueue = () => (
  <>
    <div className="doctor-section-header">
      <h2>Patient Queue</h2>
      <p>Monitor patients currently waiting for consultation.</p>
    </div>

    <section className="doctor-stats">
      <div className="doctor-stat-card">
        <div className="doctor-stat-icon">
          <FiUsers />
        </div>
        <span>Patients Waiting</span>
        <h3>6</h3>
        <span className="doctor-stat-change">Across today's queue</span>
      </div>

      <div className="doctor-stat-card">
        <div className="doctor-stat-icon">
          <FiUserCheck />
        </div>
        <span>Checked In</span>
        <h3>4</h3>
        <span className="doctor-stat-change">Ready for consultation</span>
      </div>

      <div className="doctor-stat-card">
        <div className="doctor-stat-icon">
          <FiClock />
        </div>
        <span>Average Wait</span>
        <h3>18 min</h3>
        <span className="doctor-stat-change">Current estimate</span>
      </div>
    </section>

    <section className="doctor-card">
      <div className="doctor-card-header">
        <div>
          <h3>Live Consultation Queue</h3>
          <p>Patients currently waiting for Dr. Naledi Maseko.</p>
        </div>
      </div>

      <div className="doctor-workspace-list">
        <div className="doctor-workspace-row">
          <div>
            <strong>#01 • Thabo Mokoena</strong>
            <span>VH-2026-00421 • General consultation • Waiting 8 min</span>
          </div>
          <span className="doctor-status waiting">Waiting</span>
        </div>

        <div className="doctor-workspace-row">
          <div>
            <strong>#02 • Lerato Dlamini</strong>
            <span>VH-2026-00436 • Follow-up consultation • Waiting 12 min</span>
          </div>
          <span className="doctor-status checked">Checked In</span>
        </div>

        <div className="doctor-workspace-row">
          <div>
            <strong>#03 • Mpho Nkosi</strong>
            <span>VH-2026-00452 • Routine consultation • Waiting 17 min</span>
          </div>
          <span className="doctor-status waiting">Waiting</span>
        </div>

        <div className="doctor-workspace-row">
          <div>
            <strong>#04 • Karabo Molefe</strong>
            <span>VH-2026-00467 • General consultation • Waiting 21 min</span>
          </div>
          <span className="doctor-status waiting">Waiting</span>
        </div>
      </div>
    </section>
  </>
);

const renderConsultations = () => (
  <>
    <div className="doctor-section-header">
      <h2>Consultations</h2>
      <p>Review current and recently completed patient consultations.</p>
    </div>

    <section className="doctor-grid">
      <div className="doctor-card">
        <div className="doctor-card-header">
          <div>
            <h3>Current Consultation</h3>
            <p>Patient currently in consultation.</p>
          </div>
          <span className="doctor-status checked">In Consultation</span>
        </div>

        <div className="doctor-consultation">
          <div className="doctor-consultation-top">
            <div className="doctor-consultation-patient">
              <div className="doctor-consultation-avatar">JD</div>

              <div>
                <strong>John Dube</strong>
                <span>VH-2026-00418</span>
              </div>
            </div>

            <span className="doctor-consultation-time">09:00</span>
          </div>

          <div className="doctor-consultation-details">
            <div className="doctor-detail-item">
              <span>Reason</span>
              <strong>General Consultation</strong>
            </div>

            <div className="doctor-detail-item">
              <span>Room</span>
              <strong>Room 4</strong>
            </div>

            <div className="doctor-detail-item">
              <span>Duration</span>
              <strong>18 minutes</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="doctor-card">
        <div className="doctor-card-header">
          <div>
            <h3>Recent Consultations</h3>
            <p>Recently completed clinical consultations.</p>
          </div>
        </div>

        <div className="doctor-workspace-list">
          <div className="doctor-workspace-row">
            <div>
              <strong>Sarah Mthembu</strong>
              <span>VH-2026-00411 • Respiratory consultation</span>
            </div>
            <span className="doctor-status confirmed">Completed</span>
          </div>

          <div className="doctor-workspace-row">
            <div>
              <strong>David Ndlovu</strong>
              <span>VH-2026-00405 • Follow-up consultation</span>
            </div>
            <span className="doctor-status confirmed">Completed</span>
          </div>

          <div className="doctor-workspace-row">
            <div>
              <strong>Nomsa Khumalo</strong>
              <span>VH-2026-00398 • General consultation</span>
            </div>
            <span className="doctor-status confirmed">Completed</span>
          </div>
        </div>
      </div>
    </section>

    <section className="doctor-card">
      <div className="doctor-card-header">
        <div>
          <h3>Clinical Notes</h3>
          <p>Latest consultation notes recorded today.</p>
        </div>
      </div>

      <div className="doctor-workspace-list">
        <div className="doctor-workspace-row">
          <div>
            <strong>Sarah Mthembu</strong>
            <span>Symptoms reviewed and treatment plan recorded.</span>
          </div>
          <span>08:45</span>
        </div>

        <div className="doctor-workspace-row">
          <div>
            <strong>David Ndlovu</strong>
            <span>Follow-up assessment completed.</span>
          </div>
          <span>08:20</span>
        </div>
      </div>
    </section>
  </>
);

const renderMedicalRecords = () => (
  <>
    <div className="doctor-section-header">
      <h2>Medical Records</h2>
      <p>Review patient history and previously recorded clinical information.</p>
    </div>

    <section className="doctor-card">
      <div className="doctor-card-header">
        <div>
          <h3>Patient Medical History</h3>
          <p>Recently accessed patient records.</p>
        </div>
      </div>

      <div className="doctor-workspace-list">
        <div className="doctor-workspace-row">
          <div>
            <strong>Thabo Mokoena</strong>
            <span>VH-2026-00421 • Last visit: 12 Sep 2026</span>
            <span>History: General consultation • Prescription recorded</span>
          </div>
          <span className="doctor-status confirmed">Active</span>
        </div>

        <div className="doctor-workspace-row">
          <div>
            <strong>Lerato Dlamini</strong>
            <span>VH-2026-00436 • Last visit: 18 Sep 2026</span>
            <span>History: Follow-up • Review required</span>
          </div>
          <span className="doctor-status checked">Review</span>
        </div>

        <div className="doctor-workspace-row">
          <div>
            <strong>Mpho Nkosi</strong>
            <span>VH-2026-00452 • Last visit: 21 Sep 2026</span>
            <span>History: Routine consultation • No active prescription</span>
          </div>
          <span className="doctor-status confirmed">Active</span>
        </div>
      </div>
    </section>

    <section className="doctor-grid">
      <div className="doctor-card">
        <div className="doctor-card-header">
          <div>
            <h3>Current Record</h3>
            <p>Thabo Mokoena • VH-2026-00421</p>
          </div>
        </div>

        <div className="doctor-consultation-details">
          <div className="doctor-detail-item">
            <span>Last Diagnosis</span>
            <strong>Upper respiratory infection</strong>
          </div>

          <div className="doctor-detail-item">
            <span>Allergies</span>
            <strong>None recorded</strong>
          </div>

          <div className="doctor-detail-item">
            <span>Blood Group</span>
            <strong>O+</strong>
          </div>
        </div>
      </div>

      <div className="doctor-card">
        <div className="doctor-card-header">
          <div>
            <h3>Recent Prescriptions</h3>
            <p>Medication history for selected patients.</p>
          </div>
        </div>

        <div className="doctor-workspace-list">
          <div className="doctor-workspace-row">
            <div>
              <strong>Amoxicillin 500mg</strong>
              <span>Thabo Mokoena • 12 Sep 2026</span>
            </div>
            <span>3× daily</span>
          </div>

          <div className="doctor-workspace-row">
            <div>
              <strong>Paracetamol 500mg</strong>
              <span>Thabo Mokoena • 12 Sep 2026</span>
            </div>
            <span>As required</span>
          </div>
        </div>
      </div>
    </section>
  </>
);

const renderNotifications = () => (
  <>
    <div className="doctor-section-header">
      <h2>Notifications</h2>
      <p>Stay updated with appointments, queue activity and clinical events.</p>
    </div>

    <section className="doctor-card">
      <div className="doctor-card-header">
        <div>
          <h3>Recent Notifications</h3>
          <p>Latest updates from your doctor workspace.</p>
        </div>
      </div>

      <div className="doctor-activity-list">
        <div className="doctor-activity">
          <div className="doctor-activity-icon">
            <FiCalendar />
          </div>

          <div>
            <strong>Upcoming appointment</strong>
            <p>Thabo Mokoena is scheduled for 09:30 in Room 4.</p>
            <p>10 minutes ago</p>
          </div>
        </div>

        <div className="doctor-activity">
          <div className="doctor-activity-icon">
            <FiUserCheck />
          </div>

          <div>
            <strong>Patient checked in</strong>
            <p>Lerato Dlamini has checked in for the 10:30 appointment.</p>
            <p>18 minutes ago</p>
          </div>
        </div>

        <div className="doctor-activity">
          <div className="doctor-activity-icon">
            <FiUsers />
          </div>

          <div>
            <strong>Queue updated</strong>
            <p>There are currently 6 patients waiting for consultation.</p>
            <p>25 minutes ago</p>
          </div>
        </div>

        <div className="doctor-activity">
          <div className="doctor-activity-icon">
            <FiFileText />
          </div>

          <div>
            <strong>Medical record updated</strong>
            <p>Sarah Mthembu's consultation record was updated.</p>
            <p>42 minutes ago</p>
          </div>
        </div>
      </div>
    </section>
  </>
);

  const renderDashboard = () => (
    <>
      <div className="doctor-section-header">
        <h2>Doctor Overview</h2>
        <p>
          Manage today's appointments, patients and clinical activities.
        </p>
      </div>

      <section className="doctor-stats">
        <div className="doctor-stat-card">
          <div className="doctor-stat-top">
            <div className="doctor-stat-icon">
              <FiCalendar />
            </div>
          </div>

          <span>Today's Appointments</span>
          <h3>12</h3>
          <span className="doctor-stat-change">
            4 completed today
          </span>
        </div>

        <div className="doctor-stat-card">
          <div className="doctor-stat-top">
            <div className="doctor-stat-icon">
              <FiUsers />
            </div>
          </div>

          <span>Patients Today</span>
          <h3>18</h3>
          <span className="doctor-stat-change">
            6 patients currently waiting
          </span>
        </div>

        <div className="doctor-stat-card">
          <div className="doctor-stat-top">
            <div className="doctor-stat-icon">
              <FiClock />
            </div>
          </div>

          <span>Waiting Queue</span>
          <h3>6</h3>
          <span className="doctor-stat-change">
            Next patient: #04
          </span>
        </div>

        <div className="doctor-stat-card">
          <div className="doctor-stat-top">
            <div className="doctor-stat-icon">
              <FiCheckCircle />
            </div>
          </div>

          <span>Completed Consultations</span>
          <h3>46</h3>
          <span className="doctor-stat-change">
            This month
          </span>
        </div>
      </section>

      <section className="doctor-grid">
        <div className="doctor-card">
          <div className="doctor-card-header">
            <div>
              <h3>Patients Waiting</h3>
              <p>Patients currently waiting for consultation.</p>
            </div>

            <button
              className="doctor-card-link"
              onClick={() => handleNavigation("Queue")}
            >
              View queue
            </button>
          </div>

          <div className="doctor-patient-list">
            {patients.map((patient) => (
              <div
                className="doctor-patient-item"
                key={patient.fileNumber}
              >
                <div className="doctor-patient-avatar">
                  {patient.initials}
                </div>

                <div className="doctor-patient-info">
                  <strong>{patient.patient}</strong>
                  <span>
                    {patient.fileNumber} · {patient.reason}
                  </span>
                </div>

                <span className="doctor-patient-status">
                  {patient.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="doctor-card">
          <div className="doctor-card-header">
            <div>
              <h3>Current Consultation</h3>
              <p>Patient currently being attended to.</p>
            </div>
          </div>

          <div className="doctor-consultation">
            <div className="doctor-consultation-top">
              <div className="doctor-consultation-patient">
                <div className="doctor-consultation-avatar">
                  JD
                </div>

                <div>
                  <strong>John Dube</strong>
                  <span>VH-2026-00418</span>
                </div>
              </div>

              <span className="doctor-consultation-time">
                09:00
              </span>
            </div>

            <div className="doctor-consultation-details">
              <div className="doctor-detail-item">
                <span>Reason</span>
                <strong>General Consultation</strong>
              </div>

              <div className="doctor-detail-item">
                <span>Room</span>
                <strong>Room 4</strong>
              </div>

              <div className="doctor-detail-item">
                <span>Status</span>
                <strong>In Consultation</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="doctor-card">
        <div className="doctor-card-header">
          <div>
            <h3>Today's Appointments</h3>
            <p>
              Appointments scheduled for 30 September 2026.
            </p>
          </div>

          <button
            className="doctor-card-link"
            onClick={() => handleNavigation("Appointments")}
          >
            View all
          </button>
        </div>

        <div className="doctor-table-wrapper">
          <table className="doctor-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Time</th>
                <th>Appointment Type</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {appointments.map((appointment, index) => (
                <tr key={index}>
                  <td>{appointment.patient}</td>
                  <td>{appointment.time}</td>
                  <td>{appointment.type}</td>
                  <td>
                    <span
                      className={`doctor-status ${appointment.status.toLowerCase()}`}
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

      <section className="doctor-card">
        <div className="doctor-card-header">
          <div>
            <h3>Recent Clinical Activity</h3>
            <p>Latest activity from your medical workspace.</p>
          </div>
        </div>

        <div className="doctor-activity-list">
          {activities.map((activity, index) => {
            const Icon = activity.icon;

            return (
              <div className="doctor-activity" key={index}>
                <div className="doctor-activity-icon">
                  <Icon />
                </div>

                <div>
                  <strong>{activity.title}</strong>
                  <p>{activity.description}</p>
                  <p>{activity.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="doctor-card">
        <div className="doctor-card-header">
          <div>
            <h3>Quick Actions</h3>
            <p>Common doctor tasks.</p>
          </div>
        </div>

        <div className="doctor-quick-actions">
          <button
            className="doctor-action"
            onClick={() => handleNavigation("Appointments")}
          >
            <FiCalendar />
            <span>View Appointments</span>
          </button>

          <button
            className="doctor-action"
            onClick={() => handleNavigation("Patients")}
          >
            <FiUsers />
            <span>View Patients</span>
          </button>

          <button
            className="doctor-action"
            onClick={() => handleNavigation("Queue")}
          >
            <FiClock />
            <span>View Queue</span>
          </button>

          <button
            className="doctor-action"
            onClick={() => handleNavigation("Medical Records")}
          >
            <FiFileText />
            <span>Medical Records</span>
          </button>
        </div>
      </section>
    </>
  );

  return (
    <div className="doctor-dashboard">
      <aside
        className={`doctor-sidebar ${
          sidebarOpen ? "open" : ""
        }`}
      >
        <div className="doctor-brand">
          <div className="doctor-brand-icon">
            <img
              src="/images/logo/logo.jpeg"
              alt="Vhutec Med logo"
            />
          </div>

          <div>
            <h2>Vhutec Med</h2>
            <span>Doctor Portal</span>
          </div>
        </div>

        <nav className="doctor-nav">
          <p className="doctor-nav-label">
            Clinical Workspace
          </p>

          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                className={
                  activeSection === item.label
                    ? "active"
                    : ""
                }
                onClick={() =>
                  handleNavigation(item.label)
                }
              >
                <Icon />
                <span>{item.label}</span>
              </button>
            );
          })}

          <button
            className="doctor-logout"
            onClick={handleLogout}
          >
            <FiLogOut />
            <span>Logout</span>
          </button>
        </nav>
      </aside>

      <div
        className={`doctor-overlay ${
          sidebarOpen ? "show" : ""
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      <main className="doctor-main">
        <header className="doctor-header">
          <div>
            <button
              className="doctor-mobile-menu"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <FiMenu />
            </button>
          </div>

          <div>
            <h1>Doctor Dashboard</h1>
            <p>
              Welcome back. Manage your clinical activities.
            </p>
          </div>

          <div className="doctor-profile">
            <div className="doctor-profile-avatar">
              NM
            </div>

            <div className="doctor-profile-info">
              <strong>Dr. Naledi Maseko</strong>
              <span>General Medicine</span>
            </div>
          </div>
        </header>

        <section className="doctor-content">
          {activeSection === "Dashboard" && renderDashboard()}
{activeSection === "Appointments" && renderAppointments()}
{activeSection === "Patients" && renderPatients()}
{activeSection === "Queue" && renderQueue()}
{activeSection === "Consultations" && renderConsultations()}
{activeSection === "Medical Records" && renderMedicalRecords()}
{activeSection === "Notifications" && renderNotifications()}
        </section>
      </main>
    </div>
  );
};

export default DoctorDashboard;
