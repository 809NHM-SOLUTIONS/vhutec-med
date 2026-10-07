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
  FiSearch,
  FiUserCheck,
  FiUsers,
  FiX,
} from "react-icons/fi";

import "./ReceptionistDashboard.css";

const ReceptionistDashboard = () => {
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const navigation = [
    { label: "Dashboard", icon: FiGrid },
    { label: "Appointments", icon: FiCalendar },
    { label: "Queue", icon: FiClock },
    { label: "Patients", icon: FiUsers },
    { label: "Check-In", icon: FiUserCheck },
    { label: "Notifications", icon: FiMessageSquare },
    { label: "Reports", icon: FiFileText },
  ];

  const queuePatients = [
    {
      number: "01",
      patient: "Thabo Mokoena",
      doctor: "Dr. Naledi Maseko",
      status: "Waiting",
    },
    {
      number: "02",
      patient: "Lerato Dlamini",
      doctor: "Dr. Kabelo Dlamini",
      status: "Checked In",
    },
    {
      number: "03",
      patient: "Mpho Nkosi",
      doctor: "Dr. Lerato Nkosi",
      status: "Waiting",
    },
    {
      number: "04",
      patient: "Karabo Molefe",
      doctor: "Dr. Naledi Maseko",
      status: "Waiting",
    },
  ];

  const appointments = [
    {
      patient: "Thabo Mokoena",
      doctor: "Dr. Naledi Maseko",
      time: "09:30",
      type: "General Medicine",
      status: "Confirmed",
    },
    {
      patient: "Lerato Dlamini",
      doctor: "Dr. Kabelo Dlamini",
      time: "10:30",
      type: "Dental Care",
      status: "Pending",
    },
    {
      patient: "Mpho Nkosi",
      doctor: "Dr. Lerato Nkosi",
      time: "11:00",
      type: "Dermatology",
      status: "Checked",
    },
    {
      patient: "Karabo Molefe",
      doctor: "Dr. Naledi Maseko",
      time: "13:30",
      type: "General Medicine",
      status: "Confirmed",
    },
  ];

  const activities = [
    {
      icon: FiUserCheck,
      title: "Patient checked in",
      description: "Lerato Dlamini was checked in successfully.",
      time: "10 minutes ago",
    },
    {
      icon: FiCalendar,
      title: "Appointment confirmed",
      description: "Thabo Mokoena's appointment was confirmed.",
      time: "25 minutes ago",
    },
    {
      icon: FiClock,
      title: "Queue updated",
      description: "Patient queue position was updated.",
      time: "40 minutes ago",
    },
    {
      icon: FiCheckCircle,
      title: "Patient served",
      description: "A consultation was marked as completed.",
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

  const filteredPatients = queuePatients.filter((patient) =>
    `${patient.patient} ${patient.doctor}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

 const renderAppointments = () => (
  <>
    <div className="reception-section-header">
      <h2>Appointments</h2>
      <p>Manage today's hospital appointment schedule and patient arrivals.</p>
    </div>

    <section className="reception-stats">
      <div className="reception-stat-card">
        <div className="reception-stat-icon">
          <FiCalendar />
        </div>
        <span>Today's Appointments</span>
        <h3>32</h3>
        <span className="reception-stat-change">8 appointments remaining</span>
      </div>

      <div className="reception-stat-card">
        <div className="reception-stat-icon">
          <FiCheckCircle />
        </div>
        <span>Confirmed</span>
        <h3>24</h3>
        <span className="reception-stat-change">Ready for today's schedule</span>
      </div>

      <div className="reception-stat-card">
        <div className="reception-stat-icon">
          <FiClock />
        </div>
        <span>Pending</span>
        <h3>5</h3>
        <span className="reception-stat-change">Requires confirmation</span>
      </div>

      <div className="reception-stat-card">
        <div className="reception-stat-icon">
          <FiUserCheck />
        </div>
        <span>Checked In</span>
        <h3>18</h3>
        <span className="reception-stat-change">Patients arrived today</span>
      </div>
    </section>

    <section className="reception-card">
      <div className="reception-card-header">
        <div>
          <h3>Today's Appointment Schedule</h3>
          <p>30 September 2026 • Reception desk schedule</p>
        </div>
      </div>

      <div className="reception-table-wrapper">
        <table className="reception-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Patient</th>
              <th>Doctor</th>
              <th>Department</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>09:30</td>
              <td>Thabo Mokoena</td>
              <td>Dr. Naledi Maseko</td>
              <td>General Medicine</td>
              <td>
                <span className="reception-status confirmed">Confirmed</span>
              </td>
            </tr>

            <tr>
              <td>10:30</td>
              <td>Lerato Dlamini</td>
              <td>Dr. Kabelo Dlamini</td>
              <td>Dental Care</td>
              <td>
                <span className="reception-status pending">Pending</span>
              </td>
            </tr>

            <tr>
              <td>11:00</td>
              <td>Mpho Nkosi</td>
              <td>Dr. Lerato Nkosi</td>
              <td>Dermatology</td>
              <td>
                <span className="reception-status checked">Checked In</span>
              </td>
            </tr>

            <tr>
              <td>13:30</td>
              <td>Karabo Molefe</td>
              <td>Dr. Naledi Maseko</td>
              <td>General Medicine</td>
              <td>
                <span className="reception-status confirmed">Confirmed</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </>
);

const renderQueue = () => (
  <>
    <div className="reception-section-header">
      <h2>Patient Queue</h2>
      <p>Monitor and manage patients currently waiting at the hospital.</p>
    </div>

    <section className="reception-stats">
      <div className="reception-stat-card">
        <div className="reception-stat-icon">
          <FiUsers />
        </div>
        <span>Patients Waiting</span>
        <h3>14</h3>
        <span className="reception-stat-change">Across today's queue</span>
      </div>

      <div className="reception-stat-card">
        <div className="reception-stat-icon">
          <FiUserCheck />
        </div>
        <span>Checked In</span>
        <h3>18</h3>
        <span className="reception-stat-change">Patients currently checked in</span>
      </div>

      <div className="reception-stat-card">
        <div className="reception-stat-icon">
          <FiClock />
        </div>
        <span>Average Wait</span>
        <h3>22 min</h3>
        <span className="reception-stat-change">Current estimated wait</span>
      </div>
    </section>

    <section className="reception-card">
      <div className="reception-card-header">
        <div>
          <h3>Live Patient Queue</h3>
          <p>Current queue position and consultation status.</p>
        </div>
      </div>

      <div className="reception-workspace-list">
        <div className="reception-workspace-row">
          <div>
            <strong>#01 • Thabo Mokoena</strong>
            <span>VH-2026-00421 • Dr. Naledi Maseko • Room 4</span>
          </div>
          <span className="reception-status waiting">Waiting</span>
        </div>

        <div className="reception-workspace-row">
          <div>
            <strong>#02 • Lerato Dlamini</strong>
            <span>VH-2026-00436 • Dr. Kabelo Dlamini • Room 2</span>
          </div>
          <span className="reception-status checked">Checked In</span>
        </div>

        <div className="reception-workspace-row">
          <div>
            <strong>#03 • Mpho Nkosi</strong>
            <span>VH-2026-00452 • Dr. Lerato Nkosi • Room 6</span>
          </div>
          <span className="reception-status waiting">Waiting</span>
        </div>

        <div className="reception-workspace-row">
          <div>
            <strong>#04 • Karabo Molefe</strong>
            <span>VH-2026-00467 • Dr. Naledi Maseko • Room 4</span>
          </div>
          <span className="reception-status waiting">Waiting</span>
        </div>
      </div>
    </section>
  </>
);

const renderPatients = () => (
  <>
    <div className="reception-section-header">
      <h2>Patients</h2>
      <p>Search and view registered patient information.</p>
    </div>

    <section className="reception-card">
      <div className="reception-card-header">
        <div>
          <h3>Patient Directory</h3>
          <p>Registered patients currently using Vhutec Med.</p>
        </div>

        <div className="reception-search">
          <FiSearch />
          <input
            type="text"
            placeholder="Search patient..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
      </div>

      <div className="reception-table-wrapper">
        <table className="reception-table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>File Number</th>
              <th>Phone</th>
              <th>Last Appointment</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {filteredPatients.map((patient) => (
              <tr key={patient.number}>
                <td>{patient.patient}</td>
                <td>{patient.fileNumber}</td>
                <td>071 456 7821</td>
                <td>30 Sep 2026</td>
                <td>
                  <span
                    className={`reception-status ${
                      patient.status.toLowerCase().replace(" ", "-")
                    }`}
                  >
                    {patient.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  </>
);

const renderCheckIn = () => (
  <>
    <div className="reception-section-header">
      <h2>Patient Check-In</h2>
      <p>Manage arriving patients and verify today's appointments.</p>
    </div>

    <section className="reception-stats">
      <div className="reception-stat-card">
        <div className="reception-stat-icon">
          <FiUserCheck />
        </div>
        <span>Checked In Today</span>
        <h3>18</h3>
        <span className="reception-stat-change">56% of appointments</span>
      </div>

      <div className="reception-stat-card">
        <div className="reception-stat-icon">
          <FiClock />
        </div>
        <span>Expected Arrivals</span>
        <h3>14</h3>
        <span className="reception-stat-change">Remaining today</span>
      </div>

      <div className="reception-stat-card">
        <div className="reception-stat-icon">
          <FiCalendar />
        </div>
        <span>Late Arrivals</span>
        <h3>3</h3>
        <span className="reception-stat-change">Needs attention</span>
      </div>
    </section>

    <section className="reception-card">
      <div className="reception-card-header">
        <div>
          <h3>Today's Patient Arrivals</h3>
          <p>Appointment verification and check-in status.</p>
        </div>
      </div>

      <div className="reception-workspace-list">
        <div className="reception-workspace-row">
          <div>
            <strong>Thabo Mokoena</strong>
            <span>09:30 • General Medicine • Dr. Naledi Maseko</span>
          </div>
          <span className="reception-status checked">Checked In</span>
        </div>

        <div className="reception-workspace-row">
          <div>
            <strong>Lerato Dlamini</strong>
            <span>10:30 • Dental Care • Dr. Kabelo Dlamini</span>
          </div>
          <span className="reception-status waiting">Arriving</span>
        </div>

        <div className="reception-workspace-row">
          <div>
            <strong>Mpho Nkosi</strong>
            <span>11:00 • Dermatology • Dr. Lerato Nkosi</span>
          </div>
          <span className="reception-status checked">Checked In</span>
        </div>

        <div className="reception-workspace-row">
          <div>
            <strong>Karabo Molefe</strong>
            <span>13:30 • General Medicine • Dr. Naledi Maseko</span>
          </div>
          <span className="reception-status pending">Not Arrived</span>
        </div>
      </div>
    </section>
  </>
);

const renderNotifications = () => (
  <>
    <div className="reception-section-header">
      <h2>Notifications</h2>
      <p>Important appointment, queue and patient updates.</p>
    </div>

    <section className="reception-card">
      <div className="reception-card-header">
        <div>
          <h3>Recent Notifications</h3>
          <p>Latest activity from the reception workspace.</p>
        </div>
      </div>

      <div className="reception-activity-list">
        <div className="reception-activity">
          <div className="reception-activity-icon">
            <FiCalendar />
          </div>
          <div>
            <strong>Appointment confirmed</strong>
            <p>Thabo Mokoena's 09:30 appointment has been confirmed.</p>
            <p>8 minutes ago</p>
          </div>
        </div>

        <div className="reception-activity">
          <div className="reception-activity-icon">
            <FiUserCheck />
          </div>
          <div>
            <strong>Patient checked in</strong>
            <p>Mpho Nkosi has checked in for the 11:00 appointment.</p>
            <p>15 minutes ago</p>
          </div>
        </div>

        <div className="reception-activity">
          <div className="reception-activity-icon">
            <FiClock />
          </div>
          <div>
            <strong>Queue updated</strong>
            <p>There are currently 14 patients waiting across the queues.</p>
            <p>22 minutes ago</p>
          </div>
        </div>

        <div className="reception-activity">
          <div className="reception-activity-icon">
            <FiMessageSquare />
          </div>
          <div>
            <strong>Patient notification sent</strong>
            <p>Queue position update sent to Lerato Dlamini.</p>
            <p>31 minutes ago</p>
          </div>
        </div>
      </div>
    </section>
  </>
);

const renderReports = () => (
  <>
    <div className="reception-section-header">
      <h2>Reports</h2>
      <p>Review daily reception and patient-flow statistics.</p>
    </div>

    <section className="reception-stats">
      <div className="reception-stat-card">
        <div className="reception-stat-icon">
          <FiCalendar />
        </div>
        <span>Total Appointments</span>
        <h3>32</h3>
        <span className="reception-stat-change">30 September 2026</span>
      </div>

      <div className="reception-stat-card">
        <div className="reception-stat-icon">
          <FiCheckCircle />
        </div>
        <span>Completed</span>
        <h3>24</h3>
        <span className="reception-stat-change">75% completion rate</span>
      </div>

      <div className="reception-stat-card">
        <div className="reception-stat-icon">
          <FiUsers />
        </div>
        <span>Patients Served</span>
        <h3>24</h3>
        <span className="reception-stat-change">Across all departments</span>
      </div>

      <div className="reception-stat-card">
        <div className="reception-stat-icon">
          <FiClock />
        </div>
        <span>Average Wait</span>
        <h3>22 min</h3>
        <span className="reception-stat-change">Today's average</span>
      </div>
    </section>

    <section className="reception-card">
      <div className="reception-card-header">
        <div>
          <h3>Daily Department Summary</h3>
          <p>Appointment and patient-flow overview.</p>
        </div>
      </div>

      <div className="reception-table-wrapper">
        <table className="reception-table">
          <thead>
            <tr>
              <th>Department</th>
              <th>Appointments</th>
              <th>Checked In</th>
              <th>Completed</th>
              <th>Waiting</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>General Medicine</td>
              <td>14</td>
              <td>10</td>
              <td>8</td>
              <td>4</td>
            </tr>

            <tr>
              <td>Dental Care</td>
              <td>7</td>
              <td>4</td>
              <td>5</td>
              <td>2</td>
            </tr>

            <tr>
              <td>Dermatology</td>
              <td>6</td>
              <td>3</td>
              <td>4</td>
              <td>3</td>
            </tr>

            <tr>
              <td>Paediatrics</td>
              <td>5</td>
              <td>1</td>
              <td>3</td>
              <td>2</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </>
);
  const renderDashboard = () => (
    <>
      <div className="reception-section-header">
        <h2>Reception Overview</h2>
        <p>
          Manage today's appointments, patient check-ins and the hospital queue.
        </p>
      </div>

      <section className="reception-stats">
        <div className="reception-stat-card">
          <div className="reception-stat-top">
            <div className="reception-stat-icon">
              <FiCalendar />
            </div>
          </div>
          <span>Today's Appointments</span>
          <h3>32</h3>
          <span className="reception-stat-change">
            8 remaining today
          </span>
        </div>

        <div className="reception-stat-card">
          <div className="reception-stat-top">
            <div className="reception-stat-icon">
              <FiUsers />
            </div>
          </div>
          <span>Patients Waiting</span>
          <h3>14</h3>
          <span className="reception-stat-change">
            4 checked in recently
          </span>
        </div>

        <div className="reception-stat-card">
          <div className="reception-stat-top">
            <div className="reception-stat-icon">
              <FiUserCheck />
            </div>
          </div>
          <span>Checked In</span>
          <h3>18</h3>
          <span className="reception-stat-change">
            6 currently in queue
          </span>
        </div>

        <div className="reception-stat-card">
          <div className="reception-stat-top">
            <div className="reception-stat-icon">
              <FiCheckCircle />
            </div>
          </div>
          <span>Completed Today</span>
          <h3>24</h3>
          <span className="reception-stat-change">
            75% of scheduled visits
          </span>
        </div>
      </section>

      <section className="reception-grid">
        <div className="reception-card">
          <div className="reception-card-header">
            <div>
              <h3>Today's Queue</h3>
              <p>Current patients waiting for consultation.</p>
            </div>

            <button
              className="reception-card-link"
              onClick={() => handleNavigation("Queue")}
            >
              Manage queue
            </button>
          </div>

          <div className="reception-queue">
            {queuePatients.map((patient) => (
              <div className="reception-queue-item" key={patient.number}>
                <div className="reception-queue-number">
                  {patient.number}
                </div>

                <div className="reception-queue-patient">
                  <strong>{patient.patient}</strong>
                  <span>{patient.doctor}</span>
                </div>

                <span className="reception-queue-status">
                  {patient.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="reception-card">
          <div className="reception-card-header">
            <div>
              <h3>Recent Activity</h3>
              <p>Latest reception activity.</p>
            </div>
          </div>

          <div className="reception-activity-list">
            {activities.map((activity, index) => {
              const Icon = activity.icon;

              return (
                <div className="reception-activity" key={index}>
                  <div className="reception-activity-icon">
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
        </div>
      </section>

      <section className="reception-card">
        <div className="reception-card-header">
          <div>
            <h3>Today's Appointments</h3>
            <p>Appointments scheduled for 30 September 2026.</p>
          </div>

          <button
            className="reception-card-link"
            onClick={() => handleNavigation("Appointments")}
          >
            View all
          </button>
        </div>

        <div className="reception-table-wrapper">
          <table className="reception-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Time</th>
                <th>Department</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {appointments.map((appointment, index) => (
                <tr key={index}>
                  <td>{appointment.patient}</td>
                  <td>{appointment.doctor}</td>
                  <td>{appointment.time}</td>
                  <td>{appointment.type}</td>
                  <td>
                    <span
                      className={`reception-status ${
                        appointment.status === "Checked"
                          ? "checked"
                          : appointment.status.toLowerCase()
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
      </section>

      <section className="reception-card">
        <div className="reception-card-header">
          <div>
            <h3>Find Patient</h3>
            <p>Search the current queue by patient or doctor.</p>
          </div>
        </div>

        <div className="reception-search">
          <div className="reception-search-box">
            <FiSearch />
            <input
              type="text"
              placeholder="Search patient or doctor..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <button className="reception-search-button">
            Search
          </button>
        </div>

        {searchTerm && (
          <div className="reception-queue">
            {filteredPatients.length > 0 ? (
              filteredPatients.map((patient) => (
                <div
                  className="reception-queue-item"
                  key={patient.number}
                >
                  <div className="reception-queue-number">
                    {patient.number}
                  </div>

                  <div className="reception-queue-patient">
                    <strong>{patient.patient}</strong>
                    <span>{patient.doctor}</span>
                  </div>

                  <span className="reception-queue-status">
                    {patient.status}
                  </span>
                </div>
              ))
            ) : (
              <p style={{ color: "var(--reception-muted)", fontSize: "12px" }}>
                No patients found.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="reception-card">
        <div className="reception-card-header">
          <div>
            <h3>Quick Actions</h3>
            <p>Common receptionist tasks.</p>
          </div>
        </div>

        <div className="reception-quick-actions">
          <button
            className="reception-action"
            onClick={() => handleNavigation("Check-In")}
          >
            <FiUserCheck />
            <span>Check In Patient</span>
          </button>

          <button
            className="reception-action"
            onClick={() => handleNavigation("Appointments")}
          >
            <FiCalendar />
            <span>Manage Appointments</span>
          </button>

          <button
            className="reception-action"
            onClick={() => handleNavigation("Queue")}
          >
            <FiClock />
            <span>Manage Queue</span>
          </button>

          <button
            className="reception-action"
            onClick={() => handleNavigation("Patients")}
          >
            <FiUsers />
            <span>Find Patient</span>
          </button>
        </div>
      </section>
    </>
  );

  return (
    <div className="reception-dashboard">
      <aside
        className={`reception-sidebar ${
          sidebarOpen ? "open" : ""
        }`}
      >
        <div className="reception-brand">
          <div className="reception-brand-icon">
            <img
              src="/images/logo/logo.jpeg"
              alt="Vhutec Med logo"
            />
          </div>

          <div>
            <h2>Vhutec Med</h2>
            <span>Reception</span>
          </div>
        </div>

        <nav className="reception-nav">
          <p className="reception-nav-label">
            Reception
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
            className="reception-logout"
            onClick={handleLogout}
          >
            <FiLogOut />
            <span>Logout</span>
          </button>
        </nav>
      </aside>

      <div
        className={`reception-overlay ${
          sidebarOpen ? "show" : ""
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      <main className="reception-main">
        <header className="reception-header">
          <div>
            <button
              className="reception-mobile-menu"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <FiMenu />
            </button>
          </div>

          <div>
            <h1>Receptionist Dashboard</h1>
            <p>
              Welcome back. Manage today's hospital reception
              activities.
            </p>
          </div>

          <div className="reception-profile">
            <div className="reception-profile-avatar">
              RS
            </div>

            <div className="reception-profile-info">
              <strong>Reception Staff</strong>
              <span>Receptionist</span>
            </div>
          </div>
        </header>

        <section className="reception-content">
          {activeSection === "Dashboard" && renderDashboard()}
{activeSection === "Appointments" && renderAppointments()}
{activeSection === "Queue" && renderQueue()}
{activeSection === "Patients" && renderPatients()}
{activeSection === "Check-In" && renderCheckIn()}
{activeSection === "Notifications" && renderNotifications()}
{activeSection === "Reports" && renderReports()}
        </section>
      </main>
    </div>
  );
};

export default ReceptionistDashboard;
