import React, { useState } from "react";
import {
  FiActivity,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiClipboard,
  FiFileText,
  FiGrid,
  FiLogOut,
  FiMenu,
  FiSettings,
  FiUserCheck,
  FiUsers,
  FiX
} from "react-icons/fi";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { label: "Dashboard", icon: FiGrid },
    { label: "Users", icon: FiUsers },
    { label: "Doctors", icon: FiUserCheck },
    { label: "Patients", icon: FiUsers },
    { label: "Appointments", icon: FiCalendar },
    { label: "Reports", icon: FiFileText },
    { label: "Settings", icon: FiSettings }
  ];

  const recentAppointments = [
    {
      patient: "Thabo Mokoena",
      doctor: "Dr. Naledi Maseko",
      time: "09:30",
      department: "General Medicine",
      status: "Confirmed"
    },
    {
      patient: "Lerato Dlamini",
      doctor: "Dr. Kabelo Dlamini",
      time: "10:30",
      department: "Dental Care",
      status: "Pending"
    },
    {
      patient: "Mpho Nkosi",
      doctor: "Dr. Lerato Nkosi",
      time: "11:00",
      department: "Dermatology",
      status: "Checked In"
    },
    {
      patient: "Karabo Molefe",
      doctor: "Dr. Naledi Maseko",
      time: "13:30",
      department: "General Medicine",
      status: "Cancelled"
    }
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const handleNavigation = (section) => {
    setActiveSection(section);
    setSidebarOpen(false);
  };

  const renderDashboard = () => (
    <>
      <div className="admin-section-header">
        <div>
          <h2>Dashboard Overview</h2>
          <p>Monitor Vhutec Med operations and system activity.</p>
        </div>
      </div>

      <section className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon">
            <FiUsers />
          </div>
          <div>
            <span>Total Users</span>
            <strong>248</strong>
            <small>+12 this month</small>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon">
            <FiCalendar />
          </div>
          <div>
            <span>Appointments</span>
            <strong>86</strong>
            <small>+8 this week</small>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon">
            <FiUserCheck />
          </div>
          <div>
            <span>Patients</span>
            <strong>192</strong>
            <small>+7 this month</small>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon">
            <FiActivity />
          </div>
          <div>
            <span>Doctors</span>
            <strong>24</strong>
            <small>20 active today</small>
          </div>
        </div>
      </section>

      <div className="admin-dashboard-grid">
        <section className="admin-card">
          <div className="admin-card-header">
            <div>
              <h3>Recent Appointments</h3>
              <p>Latest hospital appointments.</p>
            </div>
            <FiCalendar />
          </div>

          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {recentAppointments.map((appointment) => (
                  <tr key={`${appointment.patient}-${appointment.time}`}>
                    <td>{appointment.patient}</td>
                    <td>{appointment.doctor}</td>
                    <td>{appointment.time}</td>
                    <td>
                      <span
                        className={`admin-status ${appointment.status
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

        <section className="admin-card">
          <div className="admin-card-header">
            <div>
              <h3>Recent Activity</h3>
              <p>Latest system activity.</p>
            </div>
            <FiActivity />
          </div>

          <div className="admin-activity-list">
            <div className="admin-activity">
              <div className="admin-activity-icon">
                <FiUsers />
              </div>
              <div>
                <strong>New patient registered</strong>
                <span>Thabo Mokoena joined Vhutec Med.</span>
              </div>
            </div>

            <div className="admin-activity">
              <div className="admin-activity-icon">
                <FiCalendar />
              </div>
              <div>
                <strong>Appointment booked</strong>
                <span>A new General Medicine appointment was created.</span>
              </div>
            </div>

            <div className="admin-activity">
              <div className="admin-activity-icon">
                <FiClipboard />
              </div>
              <div>
                <strong>Appointment completed</strong>
                <span>A consultation was marked as completed.</span>
              </div>
            </div>

            <div className="admin-activity">
              <div className="admin-activity-icon">
                <FiActivity />
              </div>
              <div>
                <strong>System activity</strong>
                <span>Queue information was updated.</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="admin-card admin-quick-actions">
        <div className="admin-card-header">
          <div>
            <h3>Quick Actions</h3>
            <p>Common administrator tasks.</p>
          </div>
        </div>

        <div className="admin-action-grid">
          <button onClick={() => handleNavigation("Users")}>
            <FiUsers />
            <span>Manage Users</span>
          </button>

          <button onClick={() => handleNavigation("Doctors")}>
            <FiUserCheck />
            <span>Manage Doctors</span>
          </button>

          <button onClick={() => handleNavigation("Appointments")}>
            <FiCalendar />
            <span>Appointments</span>
          </button>

          <button onClick={() => handleNavigation("Reports")}>
            <FiFileText />
            <span>View Reports</span>
          </button>
        </div>
      </section>
    </>
  );

  const renderUsers = () => (
    <>
      <div className="admin-section-header">
        <h2>User Management</h2>
        <p>Manage registered users and their system roles.</p>
      </div>

      <section className="admin-card">
        <div className="admin-card-header">
          <div>
            <h3>Registered Users</h3>
            <p>Current Vhutec Med system users.</p>
          </div>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>Thabo Mokoena</td>
                <td>thabo.mokoena@example.com</td>
                <td>Patient</td>
                <td><span className="admin-status active">Active</span></td>
              </tr>

              <tr>
                <td>Dr. Naledi Maseko</td>
                <td>naledi.maseko@vhutecmed.co.za</td>
                <td>Doctor</td>
                <td><span className="admin-status active">Active</span></td>
              </tr>

              <tr>
                <td>Lerato Dlamini</td>
                <td>lerato.dlamini@example.com</td>
                <td>Patient</td>
                <td><span className="admin-status active">Active</span></td>
              </tr>

              <tr>
                <td>Sipho Nkosi</td>
                <td>sipho.nkosi@vhutecmed.co.za</td>
                <td>Receptionist</td>
                <td><span className="admin-status inactive">Inactive</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );

  const renderDoctors = () => (
    <>
      <div className="admin-section-header">
        <h2>Doctor Management</h2>
        <p>View doctors, departments and current availability.</p>
      </div>

      <section className="admin-card">
        <div className="admin-card-header">
          <div>
            <h3>Medical Staff</h3>
            <p>Doctors registered at Vhutec Med.</p>
          </div>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Department</th>
                <th>Room</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>Dr. Naledi Maseko</td>
                <td>General Medicine</td>
                <td>Room 4</td>
                <td><span className="admin-status active">Available</span></td>
              </tr>

              <tr>
                <td>Dr. Kabelo Dlamini</td>
                <td>Dental Care</td>
                <td>Room 2</td>
                <td><span className="admin-status active">Available</span></td>
              </tr>

              <tr>
                <td>Dr. Lerato Nkosi</td>
                <td>Dermatology</td>
                <td>Room 6</td>
                <td><span className="admin-status busy">In Consultation</span></td>
              </tr>

              <tr>
                <td>Dr. Musa Khumalo</td>
                <td>Paediatrics</td>
                <td>Room 8</td>
                <td><span className="admin-status inactive">Off Duty</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );

  const renderPatients = () => (
    <>
      <div className="admin-section-header">
        <h2>Patient Management</h2>
        <p>View registered patients and their recent activity.</p>
      </div>

      <section className="admin-card">
        <div className="admin-card-header">
          <div>
            <h3>Patient Directory</h3>
            <p>Registered patients using Vhutec Med.</p>
          </div>
          <span className="admin-card-count">192 Patients</span>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>File Number</th>
                <th>Department</th>
                <th>Last Visit</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>Thabo Mokoena</td>
                <td>VH-2026-00421</td>
                <td>General Medicine</td>
                <td>12 Sep 2026</td>
                <td><span className="admin-status active">Active</span></td>
              </tr>

              <tr>
                <td>Lerato Dlamini</td>
                <td>VH-2026-00436</td>
                <td>Dental Care</td>
                <td>18 Sep 2026</td>
                <td><span className="admin-status active">Active</span></td>
              </tr>

              <tr>
                <td>Mpho Nkosi</td>
                <td>VH-2026-00452</td>
                <td>Dermatology</td>
                <td>21 Sep 2026</td>
                <td><span className="admin-status active">Active</span></td>
              </tr>

              <tr>
                <td>Karabo Molefe</td>
                <td>VH-2026-00467</td>
                <td>General Medicine</td>
                <td>25 Sep 2026</td>
                <td><span className="admin-status pending">Scheduled</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );

  const renderAppointments = () => (
    <>
      <div className="admin-section-header">
        <h2>Appointment Management</h2>
        <p>Monitor appointments across the hospital.</p>
      </div>

      <section className="admin-card">
        <div className="admin-card-header">
          <div>
            <h3>Today's Appointments</h3>
            <p>Hospital appointment schedule.</p>
          </div>
          <span className="admin-card-count">86 Total</span>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
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
              {recentAppointments.map((appointment) => (
                <tr key={`${appointment.patient}-${appointment.time}-admin`}>
                  <td>{appointment.time}</td>
                  <td>{appointment.patient}</td>
                  <td>{appointment.doctor}</td>
                  <td>{appointment.department}</td>
                  <td>
                    <span
                      className={`admin-status ${appointment.status
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
    </>
  );

  const renderReports = () => (
    <>
      <div className="admin-section-header">
        <h2>Reports & Analytics</h2>
        <p>Review hospital activity and operational performance.</p>
      </div>

      <section className="admin-info-grid">
        <div className="admin-info-item">
          <span>Total Appointments</span>
          <strong>86</strong>
        </div>

        <div className="admin-info-item">
          <span>Completed</span>
          <strong>64</strong>
        </div>

        <div className="admin-info-item">
          <span>Patients Served</span>
          <strong>58</strong>
        </div>

        <div className="admin-info-item">
          <span>Average Wait</span>
          <strong>22 min</strong>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-header">
          <div>
            <h3>Department Performance</h3>
            <p>Appointment activity by department.</p>
          </div>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Appointments</th>
                <th>Completed</th>
                <th>Waiting</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>General Medicine</td>
                <td>34</td>
                <td>26</td>
                <td>5</td>
              </tr>

              <tr>
                <td>Dental Care</td>
                <td>18</td>
                <td>13</td>
                <td>3</td>
              </tr>

              <tr>
                <td>Dermatology</td>
                <td>16</td>
                <td>12</td>
                <td>2</td>
              </tr>

              <tr>
                <td>Paediatrics</td>
                <td>18</td>
                <td>13</td>
                <td>4</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );

  const renderSettings = () => (
    <>
      <div className="admin-section-header">
        <h2>System Settings</h2>
        <p>Configure core Vhutec Med administration settings.</p>
      </div>

      <section className="admin-card">
        <div className="admin-card-header">
          <div>
            <h3>Platform Configuration</h3>
            <p>Current system configuration.</p>
          </div>
          <FiSettings />
        </div>

        <div className="admin-settings-list">
          <div className="admin-settings-row">
            <div>
              <strong>Patient registration</strong>
              <span>Allow new patients to create accounts.</span>
            </div>
            <span className="admin-status active">Enabled</span>
          </div>

          <div className="admin-settings-row">
            <div>
              <strong>Online appointments</strong>
              <span>Allow patients to book appointments online.</span>
            </div>
            <span className="admin-status active">Enabled</span>
          </div>

          <div className="admin-settings-row">
            <div>
              <strong>Queue notifications</strong>
              <span>Notify patients when queue information changes.</span>
            </div>
            <span className="admin-status active">Enabled</span>
          </div>
        </div>
      </section>
    </>
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case "Users":
        return renderUsers();
      case "Doctors":
        return renderDoctors();
      case "Patients":
        return renderPatients();
      case "Appointments":
        return renderAppointments();
      case "Reports":
        return renderReports();
      case "Settings":
        return renderSettings();
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="admin-dashboard">
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="admin-brand">
          <div className="admin-brand-icon">
            <img src="/images/logo/logo.jpeg" alt="Vhutec Med logo" />
          </div>

          <div>
            <strong>Vhutec Med</strong>
            <span>Administration</span>
          </div>

          <button
            className="admin-mobile-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <FiX />
          </button>
        </div>

        <nav className="admin-nav">
          {navigation.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`admin-nav-item ${
                activeSection === label ? "active" : ""
              }`}
              onClick={() => handleNavigation(label)}
            >
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <button className="admin-logout" onClick={handleLogout}>
          <FiLogOut />
          <span>Logout</span>
        </button>
      </aside>

      {sidebarOpen && (
        <button
          className="admin-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation overlay"
        />
      )}

      <main className="admin-main">
        <header className="admin-header">
          <div className="admin-header-left">
            <button
              className="admin-mobile-menu"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <FiMenu />
            </button>

            <div>
              <span className="admin-header-label">Administrator</span>
              <h1>{activeSection}</h1>
            </div>
          </div>

          <div className="admin-profile">
            <div className="admin-profile-avatar">A</div>
            <div>
              <strong>Administrator</strong>
              <span>System Admin</span>
            </div>
          </div>
        </header>

        <div className="admin-content">
          {renderActiveSection()}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
