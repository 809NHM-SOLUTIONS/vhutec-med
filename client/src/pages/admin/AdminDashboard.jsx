import React, { useEffect, useState } from "react";
import axios from "axios";
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

const [dashboardStats, setDashboardStats] = useState(null);
const [dashboardLoading, setDashboardLoading] = useState(true);
const [dashboardError, setDashboardError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [showDoctorForm, setShowDoctorForm] = useState(false);
  const [showReceptionistForm, setShowReceptionistForm] = useState(false);

  const [departments, setDepartments] = useState([]);
const [doctors, setDoctors] = useState([]);
const [doctorsLoading, setDoctorsLoading] = useState(true);

const [selectedDoctor, setSelectedDoctor] = useState(null);
const [showDoctorDetails, setShowDoctorDetails] = useState(false);
const [doctorModalMode, setDoctorModalMode] = useState("view");
const [doctorActionLoading, setDoctorActionLoading] = useState(false);
const [doctorMessage, setDoctorMessage] = useState(null);

const [editDoctorForm, setEditDoctorForm] = useState({
  firstName: "",
  lastName: "",
  phone: "",
  speciality: "",
  licenseNo: "",
});

const [receptionists, setReceptionists] = useState([]);
const [receptionistsLoading, setReceptionistsLoading] = useState(true);
const [selectedReceptionist, setSelectedReceptionist] = useState(null);
const [showReceptionistDetails, setShowReceptionistDetails] = useState(false);
const [receptionistModalMode, setReceptionistModalMode] = useState("view");
const [receptionistActionLoading, setReceptionistActionLoading] = useState(false);
const [receptionistMessage, setReceptionistMessage] = useState(null);
const [registeredUsers, setRegisteredUsers] = useState([]);
const [usersLoading, setUsersLoading] = useState(true);
const [usersError, setUsersError] = useState("");

const [editReceptionistForm, setEditReceptionistForm] = useState({
  firstName: "",
  lastName: "",
  phone: "",
});

  const [doctorForm, setDoctorForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    speciality: "",
    licenseNo: "",
    departmentId: ""
  });

  const [receptionistForm, setReceptionistForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: ""
  });

  const [staffLoading, setStaffLoading] = useState(false);
  const [staffMessage, setStaffMessage] = useState(null);


  const navigation = [
    { label: "Dashboard", icon: FiGrid },
    { label: "Users", icon: FiUsers },
    { label: "Doctors", icon: FiUserCheck },
    { label: "Receptionists", icon: FiUsers },
    { label: "Patients", icon: FiUsers },
    { label: "Appointments", icon: FiCalendar },
    { label: "Reports", icon: FiFileText },
    { label: "Settings", icon: FiSettings }
  ];

  const [patients, setPatients] = useState([]);
const [patientsLoading, setPatientsLoading] = useState(true);
const [patientsError, setPatientsError] = useState("");
const [selectedPatient, setSelectedPatient] = useState(null);
const [showPatientForm, setShowPatientForm] = useState(false);
const [patientForm, setPatientForm] = useState({
    firstName: "",
    lastName: "",
    dob: "",
    phone: "",
    address: "",
});
const [patientSaving, setPatientSaving] = useState(false);
const [patientMessage, setPatientMessage] = useState(null);
const [patientModalMode, setPatientModalMode] = useState("view");


const recentAppointments = dashboardStats?.recentAppointments || [];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const handleNavigation = (section) => {
    setActiveSection(section);
    setSidebarOpen(false);
  };

    const handleDoctorChange = (event) => {
    const { name, value } = event.target;

    setDoctorForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleReceptionistChange = (event) => {
    const { name, value } = event.target;

    setReceptionistForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

    const handleCreateDoctor = async (event) => {
    event.preventDefault();

    setStaffLoading(true);
    setStaffMessage(null);

    try {
      const token = localStorage.getItem("token");

      const response = await axios.post(
        "http://localhost:5000/api/admin/staff/doctor",
        {
          ...doctorForm,
          departmentId: Number(doctorForm.departmentId)
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const result = response.data;

      setStaffMessage({
        type: "success",
        title: "Doctor account created",
        message: result.message,
        temporaryPassword:
          result.development
            ? result.data?.temporaryPassword
            : null
      });

      setDoctorForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        speciality: "",
        licenseNo: "",
        departmentId: ""
      });
      await loadDoctors();

    } catch (error) {
      console.error("Create doctor error:", error);

      setStaffMessage({
        type: "error",
        title: "Unable to create doctor",
        message:
          error.response?.data?.message ||
          "Something went wrong while creating the doctor account."
      });

    } finally {
      setStaffLoading(false);
    }
  };

    const handleCreateReceptionist = async (event) => {
    event.preventDefault();

    setStaffLoading(true);
    setStaffMessage(null);

    try {
      const token = localStorage.getItem("token");

      const response = await axios.post(
        "http://localhost:5000/api/admin/staff/receptionist",
        receptionistForm,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const result = response.data;

      setStaffMessage({
        type: "success",
        title: "Receptionist account created",
        message: result.message,
        temporaryPassword:
          result.development
            ? result.data?.temporaryPassword
            : null
      });

     setReceptionistForm({
  firstName: "",
  lastName: "",
  email: "",
  phone: ""
});

await loadReceptionists();
await loadUsers();

    } catch (error) {
      console.error("Create receptionist error:", error);

      setStaffMessage({
        type: "error",
        title: "Unable to create receptionist",
        message:
          error.response?.data?.message ||
          "Something went wrong while creating the receptionist account."
      });

    } finally {
      setStaffLoading(false);
    }

  };




    useEffect(() => {
    const loadDepartments = async () => {
      try {
        const token = localStorage.getItem("token");

        const response = await axios.get(
          "http://localhost:5000/api/departments",
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const departmentData =
          response.data?.data ||
          response.data?.departments ||
          response.data ||
          [];

        setDepartments(departmentData);
      } catch (error) {
        console.error("Failed to load departments:", error);
      }
    };

    loadDepartments();
  }, []);



const loadDashboardStats = async () => {
  setDashboardLoading(true);
  setDashboardError("");

  try {
    const token = localStorage.getItem("token");

    const response = await axios.get(
      "http://localhost:5000/api/admin/dashboard/stats",
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    setDashboardStats(response.data?.data || null);
  } catch (error) {
    console.error("Failed to load dashboard statistics:", error);

    setDashboardError(
      error.response?.data?.message ||
      "Unable to load dashboard statistics."
    );
  } finally {
    setDashboardLoading(false);
  }
};

  const loadDoctors = async () => {
  try {
    const token = localStorage.getItem("token");

    const response = await axios.get(
      "http://localhost:5000/api/doctors",
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const doctorData =
      response.data?.data || [];

    setDoctors(doctorData);

  } catch (error) {
    console.error(
      "Failed to load doctors:",
      error
    );
  } finally {
    setDoctorsLoading(false);
  }
};


const loadUsers = async () => {
  setUsersLoading(true);
  setUsersError("");

  try {
    const token = localStorage.getItem("token");

    const response = await fetch("http://localhost:5000/api/admin/staff", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to load registered users.");
    }

    setRegisteredUsers(result.data || []);
  } catch (error) {
    console.error("Load registered users error:", error);
    setUsersError(error.message || "Unable to load registered users.");
  } finally {
    setUsersLoading(false);
  }
};

const loadReceptionists = async () => {
  try {
    const token = localStorage.getItem("token");

    const response = await axios.get(
      "http://localhost:5000/api/receptionists",
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const receptionistData =
      response.data?.data || [];

    setReceptionists(receptionistData);

  } catch (error) {
    console.error(
      "Failed to load receptionists:",
      error
    );
  } finally {
    setReceptionistsLoading(false);
  }
};

const loadPatients = async () => {
  setPatientsLoading(true);
  setPatientsError("");

  try {
    const token = localStorage.getItem("token");

    const response = await axios.get(
      "http://localhost:5000/api/patients",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setPatients(response.data.data || []);
  } catch (error) {
    console.error("Failed to load patients:", error);

    setPatientsError(
      error.response?.data?.message ||
        "Failed to load patients. Please try again."
    );
  } finally {
    setPatientsLoading(false);
  }
};



useEffect(() => {
  loadDashboardStats();
}, []);

  useEffect(() => {
    loadDoctors();
}, []);

useEffect(() => {
  loadReceptionists();
}, []);

useEffect(() => {
  loadPatients();
}, []);

useEffect(() => {
  loadUsers();
}, []);

  const renderDashboard = () => (
    <>
      <div className="admin-section-header">
        {/* <div>
          <h2>Dashboard Overview</h2>
          <p>Monitor Vhutec Med operations and system activity.</p>
        </div> */}
      </div>


<section className="admin-stats-grid">
  <div className="admin-stat-card">
    <div className="admin-stat-icon">
      <FiUsers />
    </div>
    <div>
      <span>Total Users</span>
      <strong>
        {dashboardLoading ? "..." : dashboardStats?.users ?? 0}
      </strong>
      <small>Registered patient, doctor and receptionist profiles</small>
    </div>
  </div>

  <div className="admin-stat-card">
    <div className="admin-stat-icon">
      <FiCalendar />
    </div>
    <div>
      <span>Appointments</span>
      <strong>
        {dashboardLoading ? "..." : dashboardStats?.appointments ?? 0}
      </strong>
      <small>
        {dashboardStats?.appointmentStatuses?.PENDING ?? 0} pending
      </small>
    </div>
  </div>

  <div className="admin-stat-card">
    <div className="admin-stat-icon">
      <FiUserCheck />
    </div>
    <div>
      <span>Patients</span>
      <strong>
        {dashboardLoading ? "..." : dashboardStats?.patients ?? 0}
      </strong>
      <small>Registered patients</small>
    </div>
  </div>

  <div className="admin-stat-card">
    <div className="admin-stat-icon">
      <FiActivity />
    </div>
    <div>
      <span>Doctors</span>
      <strong>
        {dashboardLoading ? "..." : dashboardStats?.doctors ?? 0}
      </strong>
      <small>Registered medical staff</small>
    </div>
  </div>

  <div className="admin-stat-card">
    <div className="admin-stat-icon">
      <FiUsers />
    </div>
    <div>
      <span>Receptionists</span>
      <strong>
        {dashboardLoading ? "..." : dashboardStats?.receptionists ?? 0}
      </strong>
      <small>Registered receptionists</small>
    </div>
  </div>

  <div className="admin-stat-card">
    <div className="admin-stat-icon">
      <FiClipboard />
    </div>
    <div>
      <span>Queue Records</span>
      <strong>
        {dashboardLoading ? "..." : dashboardStats?.queues ?? 0}
      </strong>
      <small>
        {dashboardStats?.queueStatuses?.WAITING ?? 0} waiting
      </small>
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
  {dashboardLoading ? (
    <tr>
      <td colSpan="4">Loading appointments...</td>
    </tr>
  ) : dashboardError ? (
    <tr>
      <td colSpan="4">{dashboardError}</td>
    </tr>
  ) : recentAppointments.length === 0 ? (
    <tr>
      <td colSpan="4">No appointments found.</td>
    </tr>
  ) : (
    recentAppointments.map((appointment) => (
      <tr key={appointment.id}>
        <td>
          {appointment.patient?.firstName || ""}{" "}
          {appointment.patient?.lastName || "Unknown patient"}
        </td>

        <td>
          Dr. {appointment.doctor?.firstName || ""}{" "}
          {appointment.doctor?.lastName || "Unknown doctor"}
        </td>

        <td>
          {appointment.timeSlot || "Not specified"}
        </td>

        <td>
          <span
            className={`admin-status ${String(appointment.status || "")
              .toLowerCase()
              .replace(/_/g, "-")}`}
          >
            {String(appointment.status || "Unknown")
              .replace(/_/g, " ")}
          </span>
        </td>
      </tr>
    ))
  )}
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
        <div>
          <h2>User Management</h2>
          <p>Manage registered users and create receptionist accounts.</p>
        </div>

        <button
          className="admin-primary-button"
          onClick={() => {
            setShowReceptionistForm((previous) => !previous);
            setShowDoctorForm(false);
            setStaffMessage(null);
          }}
        >
          <FiUsers />
          {showReceptionistForm
            ? "Close Form"
            : "Add Receptionist"}
        </button>
      </div>

      {showReceptionistForm && (
        <section className="admin-card admin-form-card">
          <div className="admin-card-header">
            <div>
              <h3>Create Receptionist Account</h3>
              <p>
                Create a receptionist login and send their access details.
              </p>
            </div>

            <FiUsers />
          </div>

          <form
            className="admin-staff-form"
            onSubmit={handleCreateReceptionist}
          >
            <div className="admin-form-grid">
              <div className="admin-form-group">
                <label>First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={receptionistForm.firstName}
                  onChange={handleReceptionistChange}
                  placeholder="Enter first name"
                  required
                />
              </div>

              <div className="admin-form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={receptionistForm.lastName}
                  onChange={handleReceptionistChange}
                  placeholder="Enter last name"
                  required
                />
              </div>

              <div className="admin-form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={receptionistForm.email}
                  onChange={handleReceptionistChange}
                  placeholder="receptionist@example.com"
                  required
                />
              </div>

              <div className="admin-form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={receptionistForm.phone}
                  onChange={handleReceptionistChange}
                  placeholder="0712345678"
                  required
                />
              </div>
            </div>

            <div className="admin-form-actions">
              <button
                type="button"
                className="admin-secondary-button"
                onClick={() => setShowReceptionistForm(false)}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="admin-primary-button"
                disabled={staffLoading}
              >
                {staffLoading
                  ? "Creating..."
                  : "Create Receptionist"}
              </button>
            </div>
          </form>

          {staffMessage && (
            <div
              className={`admin-form-message ${staffMessage.type}`}
            >
              <strong>{staffMessage.title}</strong>
              <span>{staffMessage.message}</span>

              {staffMessage.temporaryPassword && (
                <div className="admin-development-password">
                  <span>Development temporary password</span>
                  <strong>
                    {staffMessage.temporaryPassword}
                  </strong>
                </div>
              )}
            </div>
          )}
        </section>
      )}

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
  {usersLoading ? (
    <tr>
      <td colSpan="4" className="admin-empty-state">
        Loading registered users...
      </td>
    </tr>
  ) : usersError ? (
    <tr>
      <td colSpan="4" className="admin-empty-state">
        <p>{usersError}</p>
        <button
          type="button"
          className="admin-secondary-button"
          onClick={loadUsers}
        >
          Retry
        </button>
      </td>
    </tr>
  ) : registeredUsers.length === 0 ? (
    <tr>
      <td colSpan="4" className="admin-empty-state">
        No registered users found.
      </td>
    </tr>
  ) : (
    registeredUsers.map((user) => (
      <tr key={user.id}>
        <td>
          <div className="admin-user-cell">
            <strong>{user.fullName || "Name unavailable"}</strong>
            <small>ID: {user.id}</small>
          </div>
        </td>

        <td>{user.email}</td>

        <td>
          <span className="admin-role-badge">
            {user.role}
          </span>
        </td>

        <td>
          <span className="admin-status active">
            Registered
          </span>
        </td>
      </tr>
    ))
  )}
</tbody>
          </table>
        </div>
      </section>
    </>
  );

  const handleViewDoctor = (doctor) => {
  setSelectedDoctor(doctor);
  setDoctorModalMode("view");
  setDoctorMessage(null);
  setShowDoctorDetails(true);
};

const handleEditDoctor = (doctor) => {
  setSelectedDoctor(doctor);

  setEditDoctorForm({
    firstName: doctor.firstName || "",
    lastName: doctor.lastName || "",
    phone: doctor.phone || "",
    speciality: doctor.speciality || "",
    licenseNo: doctor.licenseNo || "",
  });

  setDoctorModalMode("edit");
  setDoctorMessage(null);
  setShowDoctorDetails(true);
};

const handleUpdateDoctor = async (event) => {
  event.preventDefault();

  if (!selectedDoctor) return;

  setDoctorActionLoading(true);
  setDoctorMessage(null);

  try {
    const token = localStorage.getItem("token");

    const response = await axios.put(
      `http://localhost:5000/api/doctors/${selectedDoctor.id}`,
      editDoctorForm,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setDoctorMessage({
      type: "success",
      text: response.data.message || "Doctor updated successfully.",
    });

    await loadDoctors();

    setShowDoctorDetails(false);
    setSelectedDoctor(null);
  } catch (error) {
    console.error("Update doctor error:", error);

    setDoctorMessage({
      type: "error",
      text:
        error.response?.data?.message ||
        "Failed to update doctor. Please try again.",
    });
  } finally {
    setDoctorActionLoading(false);
  }
};

const handleDeleteDoctor = async (doctor) => {
  const confirmed = window.confirm(
    `Are you sure you want to delete Dr. ${doctor.firstName} ${doctor.lastName}?`
  );

  if (!confirmed) return;

  setDoctorActionLoading(true);
  setDoctorMessage(null);

  try {
    const token = localStorage.getItem("token");

    const response = await axios.delete(
      `http://localhost:5000/api/doctors/${doctor.id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setDoctorMessage({
      type: "success",
      text: response.data.message || "Doctor deleted successfully.",
    });

    await loadDoctors();
  } catch (error) {
    console.error("Delete doctor error:", error);

    setDoctorMessage({
      type: "error",
      text:
        error.response?.data?.message ||
        "Failed to delete doctor. Check whether linked records prevent deletion.",
    });
  } finally {
    setDoctorActionLoading(false);
  }
};

   const renderDoctors = () => (
    <>
      <div className="admin-section-header">
        <div>
          <h2>Doctor Management</h2>
          <p>
            Manage doctors, departments and medical staff accounts.
          </p>
        </div>

        <button
          className="admin-primary-button"
          onClick={() => {
            setShowDoctorForm((previous) => !previous);
            setShowReceptionistForm(false);
            setStaffMessage(null);
          }}
        >
          <FiUserCheck />
          {showDoctorForm ? "Close Form" : "Add Doctor"}
        </button>
      </div>

      {showDoctorForm && (
        <section className="admin-card admin-form-card">
          <div className="admin-card-header">
            <div>
              <h3>Create Doctor Account</h3>
              <p>
                Register a doctor and assign them to a department.
              </p>
            </div>

            <FiUserCheck />
          </div>

          <form
            className="admin-staff-form"
            onSubmit={handleCreateDoctor}
          >
            <div className="admin-form-grid">
              <div className="admin-form-group">
                <label>First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={doctorForm.firstName}
                  onChange={handleDoctorChange}
                  placeholder="Enter first name"
                  required
                />
              </div>

              <div className="admin-form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={doctorForm.lastName}
                  onChange={handleDoctorChange}
                  placeholder="Enter last name"
                  required
                />
              </div>

              <div className="admin-form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={doctorForm.email}
                  onChange={handleDoctorChange}
                  placeholder="doctor@example.com"
                  required
                />
              </div>

              <div className="admin-form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={doctorForm.phone}
                  onChange={handleDoctorChange}
                  placeholder="0712345678"
                  required
                />
              </div>

              <div className="admin-form-group">
                <label>Speciality</label>
                <input
                  type="text"
                  name="speciality"
                  value={doctorForm.speciality}
                  onChange={handleDoctorChange}
                  placeholder="e.g. General Practitioner"
                  required
                />
              </div>

              <div className="admin-form-group">
                <label>License Number</label>
                <input
                  type="text"
                  name="licenseNo"
                  value={doctorForm.licenseNo}
                  onChange={handleDoctorChange}
                  placeholder="Enter license number"
                  required
                />
              </div>

              <div className="admin-form-group admin-form-full">
                <label>Department</label>

                <select
                  name="departmentId"
                  value={doctorForm.departmentId}
                  onChange={handleDoctorChange}
                  required
                >
                  <option value="">
                    Select department
                  </option>

                  {departments.map((department) => (
                    <option
                      key={department.id}
                      value={department.id}
                    >
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="admin-form-actions">
              <button
                type="button"
                className="admin-secondary-button"
                onClick={() => setShowDoctorForm(false)}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="admin-primary-button"
                disabled={staffLoading}
              >
                {staffLoading
                  ? "Creating..."
                  : "Create Doctor"}
              </button>
            </div>
          </form>

          {staffMessage && (
            <div
              className={`admin-form-message ${staffMessage.type}`}
            >
              <strong>{staffMessage.title}</strong>
              <span>{staffMessage.message}</span>

              {staffMessage.temporaryPassword && (
                <div className="admin-development-password">
                  <span>Development temporary password</span>
                  <strong>
                    {staffMessage.temporaryPassword}
                  </strong>
                </div>
              )}
            </div>
          )}
        </section>
      )}

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
        <th>Speciality</th>
        <th>Email</th>
    </tr>
</thead>

<tbody>
    {doctorsLoading ? (
        <tr>
            <td colSpan="4">
                Loading medical staff...
            </td>
        </tr>
    ) : doctors.length === 0 ? (
        <tr>
            <td colSpan="4">
                No doctors have been registered yet.
            </td>
        </tr>
    ) : (
        doctors.map((doctor) => (
            <tr key={doctor.id}>
                <td>
                    Dr. {doctor.firstName} {doctor.lastName}
                </td>

                <td>
                    {doctor.departments?.length > 0
                        ? doctor.departments
                            .map(
                                (item) =>
                                    item.department?.name
                            )
                            .filter(Boolean)
                            .join(", ")
                        : "Not assigned"}
                </td>

                <td>
                    {doctor.speciality}
                </td>

                <td>
                    {doctor.user?.email || "No email"}
                </td>
                <td>
  <div className="admin-action-group">
    <button
      type="button"
      className="admin-action-button"
      onClick={() => handleViewDoctor(doctor)}
    >
      View
    </button>

    <button
      type="button"
      className="admin-action-button"
      onClick={() => handleEditDoctor(doctor)}
    >
      Edit
    </button>

    <button
      type="button"
      className="admin-action-button danger"
      onClick={() => handleDeleteDoctor(doctor)}
      disabled={doctorActionLoading}
    >
      Delete
    </button>
  </div>
</td>
            </tr>
        ))
    )}
</tbody>
          </table>
        </div>
      </section>

      {doctorMessage && (
  <div
    className={`admin-message ${doctorMessage.type}`}
    role="alert"
  >
    {doctorMessage.text}
  </div>
)}

{showDoctorDetails && selectedDoctor && (
  <div className="admin-modal-overlay">
    <section
      className="admin-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="doctor-modal-title"
    >
      <div className="admin-modal-header">
        <div>
          <h3 id="doctor-modal-title">
            {doctorModalMode === "view"
              ? "Doctor Details"
              : "Edit Doctor"}
          </h3>
          <p>Manage the selected doctor's profile.</p>
        </div>

        <button
          type="button"
          className="admin-action-button"
          onClick={() => {
            setShowDoctorDetails(false);
            setSelectedDoctor(null);
          }}
        >
          Close
        </button>
      </div>

      {doctorModalMode === "view" ? (
        <div className="admin-patient-details">
          <p>
            <strong>Doctor ID:</strong> {selectedDoctor.id}
          </p>

          <p>
            <strong>Name:</strong> Dr. {selectedDoctor.firstName}{" "}
            {selectedDoctor.lastName}
          </p>

          <p>
            <strong>Email:</strong>{" "}
            {selectedDoctor.user?.email || "Not available"}
          </p>

          <p>
            <strong>Phone:</strong>{" "}
            {selectedDoctor.phone || "Not provided"}
          </p>

          <p>
            <strong>Speciality:</strong>{" "}
            {selectedDoctor.speciality || "Not specified"}
          </p>

          <p>
            <strong>Licence Number:</strong>{" "}
            {selectedDoctor.licenseNo || "Not provided"}
          </p>

          <p>
            <strong>Departments:</strong>{" "}
            {selectedDoctor.departments?.length
              ? selectedDoctor.departments
                  .map((item) => item.department?.name)
                  .filter(Boolean)
                  .join(", ")
              : "No departments assigned"}
          </p>

          <button
            type="button"
            className="admin-action-button"
            onClick={() => handleEditDoctor(selectedDoctor)}
          >
            Edit Doctor
          </button>
        </div>
      ) : (
        <form
          className="admin-patient-form"
          onSubmit={handleUpdateDoctor}
        >
          <label>
            First Name
            <input
              type="text"
              value={editDoctorForm.firstName}
              onChange={(event) =>
                setEditDoctorForm({
                  ...editDoctorForm,
                  firstName: event.target.value,
                })
              }
              required
            />
          </label>

          <label>
            Last Name
            <input
              type="text"
              value={editDoctorForm.lastName}
              onChange={(event) =>
                setEditDoctorForm({
                  ...editDoctorForm,
                  lastName: event.target.value,
                })
              }
              required
            />
          </label>

          <label>
            Phone Number
            <input
              type="tel"
              value={editDoctorForm.phone}
              onChange={(event) =>
                setEditDoctorForm({
                  ...editDoctorForm,
                  phone: event.target.value,
                })
              }
              required
            />
          </label>

          <label>
            Speciality
            <input
              type="text"
              value={editDoctorForm.speciality}
              onChange={(event) =>
                setEditDoctorForm({
                  ...editDoctorForm,
                  speciality: event.target.value,
                })
              }
              required
            />
          </label>

          <label>
            Licence Number
            <input
              type="text"
              value={editDoctorForm.licenseNo}
              onChange={(event) =>
                setEditDoctorForm({
                  ...editDoctorForm,
                  licenseNo: event.target.value,
                })
              }
              required
            />
          </label>

          <div className="admin-modal-actions">
            <button
              type="button"
              className="admin-action-button"
              disabled={doctorActionLoading}
              onClick={() => {
                setShowDoctorDetails(false);
                setSelectedDoctor(null);
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="admin-action-button"
              disabled={doctorActionLoading}
            >
              {doctorActionLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      )}
    </section>
  </div>
)}

    </>
  );


  const handleViewReceptionist = (receptionist) => {
  setSelectedReceptionist(receptionist);
  setReceptionistModalMode("view");
  setReceptionistMessage(null);
  setShowReceptionistDetails(true);
};

const handleEditReceptionist = (receptionist) => {
  setSelectedReceptionist(receptionist);

  setEditReceptionistForm({
    firstName: receptionist.firstName || "",
    lastName: receptionist.lastName || "",
    phone: receptionist.phone || "",
  });

  setReceptionistModalMode("edit");
  setReceptionistMessage(null);
  setShowReceptionistDetails(true);
};

const handleUpdateReceptionist = async (event) => {
  event.preventDefault();

  if (!selectedReceptionist) return;

  setReceptionistActionLoading(true);
  setReceptionistMessage(null);

  try {
    const token = localStorage.getItem("token");

    const response = await axios.put(
      `http://localhost:5000/api/receptionists/${selectedReceptionist.id}`,
      editReceptionistForm,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setReceptionistMessage({
      type: "success",
      text: response.data.message || "Receptionist updated successfully.",
    });

    await loadReceptionists();

    setShowReceptionistDetails(false);
    setSelectedReceptionist(null);
  } catch (error) {
    console.error("Update receptionist error:", error);

    setReceptionistMessage({
      type: "error",
      text:
        error.response?.data?.message ||
        "Failed to update receptionist. Please try again.",
    });
  } finally {
    setReceptionistActionLoading(false);
  }
};

const handleDeleteReceptionist = async (receptionist) => {
  const confirmed = window.confirm(
    `Are you sure you want to delete ${receptionist.firstName} ${receptionist.lastName}? This will also delete their associated account.`
  );

  if (!confirmed) return;

  setReceptionistActionLoading(true);
  setReceptionistMessage(null);

  try {
    const token = localStorage.getItem("token");

    const response = await axios.delete(
      `http://localhost:5000/api/receptionists/${receptionist.id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setReceptionistMessage({
      type: "success",
      text: response.data.message || "Receptionist deleted successfully.",
    });

    await loadReceptionists();
  } catch (error) {
    console.error("Delete receptionist error:", error);

    setReceptionistMessage({
      type: "error",
      text:
        error.response?.data?.message ||
        "Failed to delete receptionist. Please try again.",
    });
  } finally {
    setReceptionistActionLoading(false);
  }
};

  const renderReceptionists = () => (
  <>
    <div className="admin-section-header">
      <div>
        <h2>Receptionist Management</h2>
        <p>
          Manage receptionists registered at Vhutec Med.
        </p>
      </div>

      <button
        className="admin-primary-button"
        onClick={() => {
          setShowReceptionistForm((previous) => !previous);
          setShowDoctorForm(false);
          setStaffMessage(null);
        }}
      >
        <FiUsers />
        {showReceptionistForm
          ? "Close Form"
          : "Add Receptionist"}
      </button>
    </div>

    {showReceptionistForm && (
      <section className="admin-card admin-form-card">
        <div className="admin-card-header">
          <div>
            <h3>Create Receptionist Account</h3>
            <p>
              Create a receptionist login and send their access details.
            </p>
          </div>

          <FiUsers />
        </div>

        <form
          className="admin-staff-form"
          onSubmit={handleCreateReceptionist}
        >
          <div className="admin-form-grid">
            <div className="admin-form-group">
              <label>First Name</label>

              <input
                type="text"
                name="firstName"
                value={receptionistForm.firstName}
                onChange={handleReceptionistChange}
                placeholder="Enter first name"
                required
              />
            </div>

            <div className="admin-form-group">
              <label>Last Name</label>

              <input
                type="text"
                name="lastName"
                value={receptionistForm.lastName}
                onChange={handleReceptionistChange}
                placeholder="Enter last name"
                required
              />
            </div>

            <div className="admin-form-group">
              <label>Email Address</label>

              <input
                type="email"
                name="email"
                value={receptionistForm.email}
                onChange={handleReceptionistChange}
                placeholder="receptionist@example.com"
                required
              />
            </div>

            <div className="admin-form-group">
              <label>Phone Number</label>

              <input
                type="tel"
                name="phone"
                value={receptionistForm.phone}
                onChange={handleReceptionistChange}
                placeholder="0712345678"
                required
              />
            </div>
          </div>

          <div className="admin-form-actions">
            <button
              type="button"
              className="admin-secondary-button"
              onClick={() => setShowReceptionistForm(false)}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="admin-primary-button"
              disabled={staffLoading}
            >
              {staffLoading
                ? "Creating..."
                : "Create Receptionist"}
            </button>
          </div>
        </form>

        {staffMessage && (
          <div
            className={`admin-form-message ${staffMessage.type}`}
          >
            <strong>{staffMessage.title}</strong>
            <span>{staffMessage.message}</span>

            {staffMessage.temporaryPassword && (
              <div className="admin-development-password">
                <span>Development temporary password</span>

                <strong>
                  {staffMessage.temporaryPassword}
                </strong>
              </div>
            )}
          </div>
        )}
      </section>
    )}

    <section className="admin-card">
      <div className="admin-card-header">
        <div>
          <h3>Registered Receptionists</h3>
          <p>
            Receptionists currently registered at Vhutec Med.
          </p>
        </div>

        <span className="admin-card-count">
          {receptionists.length}{" "}
          {receptionists.length === 1
            ? "Receptionist"
            : "Receptionists"}
        </span>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Receptionist</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {receptionistsLoading ? (
              <tr>
                <td colSpan="4">
                  Loading receptionists...
                </td>
              </tr>
            ) : receptionists.length === 0 ? (
              <tr>
                <td colSpan="4">
                  No receptionists have been registered yet.
                </td>
              </tr>
            ) : (
              receptionists.map((receptionist) => (
                <tr key={receptionist.id}>
                  <td>
                    {receptionist.firstName}{" "}
                    {receptionist.lastName}
                  </td>

                  <td>
                    {receptionist.user?.email ||
                      "No email"}
                  </td>

                  <td>
                    {receptionist.phone || "No phone"}
                  </td>

                  <td>
                    <span className="admin-status active">
                      Registered
                    </span>
                  </td>
                  <td>
  <div className="admin-action-group">
    <button
      type="button"
      className="admin-action-button"
      onClick={() => handleViewReceptionist(receptionist)}
    >
      View
    </button>

    <button
      type="button"
      className="admin-action-button"
      onClick={() => handleEditReceptionist(receptionist)}
    >
      Edit
    </button>

    <button
      type="button"
      className="admin-action-button danger"
      onClick={() => handleDeleteReceptionist(receptionist)}
      disabled={receptionistActionLoading}
    >
      Delete
    </button>
  </div>
</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>

  </>
);

const handleViewPatient = (patient) => {
  setSelectedPatient(patient);
  setPatientModalMode("view");
  setPatientMessage(null);
  setShowPatientForm(true);
};

const handleEditPatient = (patient) => {
  setSelectedPatient(patient);

  setPatientForm({
    firstName: patient.firstName || "",
    lastName: patient.lastName || "",
    dob: patient.dob
      ? new Date(patient.dob).toISOString().slice(0, 10)
      : "",
    phone: patient.phone || "",
    address: patient.address || "",
  });

  setPatientModalMode("edit");
  setPatientMessage(null);
  setShowPatientForm(true);
};

const handleUpdatePatient = async (event) => {
  event.preventDefault();

  if (!selectedPatient) return;

  setPatientSaving(true);
  setPatientMessage(null);

  try {
    const token = localStorage.getItem("token");

    const response = await axios.put(
      `http://localhost:5000/api/patients/${selectedPatient.id}`,
      patientForm,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setPatientMessage({
      type: "success",
      text: response.data.message || "Patient updated successfully.",
    });

    await loadPatients();

    setShowPatientForm(false);
    setSelectedPatient(null);
  } catch (error) {
    console.error("Failed to update patient:", error);

    setPatientMessage({
      type: "error",
      text:
        error.response?.data?.message ||
        "Failed to update patient. Please try again.",
    });
  } finally {
    setPatientSaving(false);
  }
};

const handleDeletePatient = async (patient) => {
  const confirmed = window.confirm(
    `Are you sure you want to delete ${patient.firstName} ${patient.lastName}?`
  );

  if (!confirmed) return;

  setPatientMessage(null);

  try {
    const token = localStorage.getItem("token");

    const response = await axios.delete(
      `http://localhost:5000/api/patients/${patient.id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setPatientMessage({
      type: "success",
      text: response.data.message || "Patient deleted successfully.",
    });

    await loadPatients();
  } catch (error) {
    console.error("Failed to delete patient:", error);

    setPatientMessage({
      type: "error",
      text:
        error.response?.data?.message ||
        "Failed to delete patient. Please try again.",
    });
  }
};

  const renderPatients = () => (
  <>
    <div className="admin-section-header">
      <h2>Patient Management</h2>
      <p>View and manage registered patients in Vhutec Med.</p>
    </div>

    {patientMessage && (
      <div
        className={`admin-message ${patientMessage.type}`}
        role="alert"
      >
        {patientMessage.text}
      </div>
    )}

    <section className="admin-card">
      <div className="admin-card-header">
        <div>
          <h3>Patient Directory</h3>
          <p>Patient information retrieved from the database.</p>
        </div>

        <span className="admin-card-count">
          {patients.length} {patients.length === 1 ? "Patient" : "Patients"}
        </span>
      </div>

      {patientsLoading ? (
        <div className="admin-empty-state">
          Loading patients...
        </div>
      ) : patientsError ? (
        <div className="admin-empty-state">
          <p>{patientsError}</p>
          <button
            type="button"
            onClick={loadPatients}
            className="admin-action-button"
          >
            Retry
          </button>
        </div>
      ) : patients.length === 0 ? (
        <div className="admin-empty-state">
          No registered patients were found in the database.
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Date of Birth</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {patients.map((patient) => (
                <tr key={patient.id}>
                  <td>
                    {patient.firstName} {patient.lastName}
                  </td>

                  <td>{patient.user?.email || "Not available"}</td>

                  <td>{patient.phone || "Not provided"}</td>

                  <td>
                    {patient.dob
                      ? new Date(patient.dob).toLocaleDateString(
                          "en-ZA",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            timeZone: "UTC",
                          }
                        )
                      : "Not provided"}
                  </td>

                  <td>
                    <div className="admin-action-group">
                      <button
                        type="button"
                        className="admin-action-button"
                        onClick={() => handleViewPatient(patient)}
                      >
                        View
                      </button>

                      <button
                        type="button"
                        className="admin-action-button"
                        onClick={() => handleEditPatient(patient)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="admin-action-button danger"
                        onClick={() => handleDeletePatient(patient)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>

    {showPatientForm && selectedPatient && (
      <div className="admin-modal-overlay">
        <section
          className="admin-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="patient-modal-title"
        >
          <div className="admin-modal-header">
            <div>
              <h3 id="patient-modal-title">
                {patientModalMode === "view"
                  ? "Patient Details"
                  : "Edit Patient"}
              </h3>

              <p>
                {patientModalMode === "view"
                  ? "Review the registered patient information."
                  : "Update the patient's information below."}
              </p>
            </div>

            <button
              type="button"
              className="admin-action-button"
              onClick={() => {
                setShowPatientForm(false);
                setSelectedPatient(null);
              }}
            >
              Close
            </button>
          </div>

          {patientModalMode === "view" ? (
            <div className="admin-patient-details">
              <p>
                <strong>Patient ID:</strong> {selectedPatient.id}
              </p>

              <p>
                <strong>Full Name:</strong>{" "}
                {selectedPatient.firstName} {selectedPatient.lastName}
              </p>

              <p>
                <strong>Email:</strong>{" "}
                {selectedPatient.user?.email || "Not available"}
              </p>

              <p>
                <strong>Phone:</strong>{" "}
                {selectedPatient.phone || "Not provided"}
              </p>

              <p>
                <strong>Date of Birth:</strong>{" "}
                {selectedPatient.dob
                  ? new Date(selectedPatient.dob).toLocaleDateString(
                      "en-ZA",
                      { timeZone: "UTC" }
                    )
                  : "Not provided"}
              </p>

              <p>
                <strong>Address:</strong>{" "}
                {selectedPatient.address || "Not provided"}
              </p>

              <button
                type="button"
                className="admin-action-button"
                onClick={() => handleEditPatient(selectedPatient)}
              >
                Edit Patient
              </button>
            </div>
          ) : (
            <form
              className="admin-patient-form"
              onSubmit={handleUpdatePatient}
            >
              <label>
                First Name
                <input
                  type="text"
                  value={patientForm.firstName}
                  onChange={(event) =>
                    setPatientForm({
                      ...patientForm,
                      firstName: event.target.value,
                    })
                  }
                  required
                />
              </label>

              <label>
                Last Name
                <input
                  type="text"
                  value={patientForm.lastName}
                  onChange={(event) =>
                    setPatientForm({
                      ...patientForm,
                      lastName: event.target.value,
                    })
                  }
                  required
                />
              </label>

              <label>
                Date of Birth
                <input
                  type="date"
                  value={patientForm.dob}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(event) =>
                    setPatientForm({
                      ...patientForm,
                      dob: event.target.value,
                    })
                  }
                  required
                />
              </label>

              <label>
                Phone Number
                <input
                  type="tel"
                  value={patientForm.phone}
                  onChange={(event) =>
                    setPatientForm({
                      ...patientForm,
                      phone: event.target.value,
                    })
                  }
                  required
                />
              </label>

              <label>
                Address
                <textarea
                  value={patientForm.address}
                  onChange={(event) =>
                    setPatientForm({
                      ...patientForm,
                      address: event.target.value,
                    })
                  }
                  required
                />
              </label>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-action-button"
                  onClick={() => {
                    setShowPatientForm(false);
                    setSelectedPatient(null);
                  }}
                  disabled={patientSaving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="admin-action-button"
                  disabled={patientSaving}
                >
                  {patientSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    )}
  </>
);


const renderAppointments = () => {
  const appointments = dashboardStats?.recentAppointments || [];
  const totalAppointments = dashboardStats?.appointments ?? 0;

  const formatDate = (dateValue) => {
    if (!dateValue) return "Not specified";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "Invalid date";

    return date.toLocaleDateString("en-ZA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatStatus = (status) => {
    if (!status) return "Unknown";

    return status
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  return (
    <>
      <div className="admin-section-header">
        <div>
          <h2>Appointment Management</h2>
          <p>Monitor appointments across the hospital.</p>
        </div>
      </div>

      <section className="admin-card">
        <div className="admin-card-header">
          <div>
            <h3>Hospital Appointments</h3>
            <p>Appointment records retrieved from the database.</p>
          </div>

          <span className="admin-card-count">
            {dashboardLoading
              ? "Loading..."
              : `${totalAppointments} Total`}
          </span>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Department</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {dashboardLoading ? (
                <tr>
                  <td colSpan="6" className="admin-empty-state">
                    Loading appointments...
                  </td>
                </tr>
              ) : dashboardError ? (
                <tr>
                  <td colSpan="6" className="admin-empty-state">
                    <p>{dashboardError}</p>
                    <button
                      type="button"
                      className="admin-secondary-button"
                      onClick={loadDashboardStats}
                    >
                      Retry
                    </button>
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="admin-empty-state">
                    No appointments found.
                  </td>
                </tr>
              ) : (
                appointments.map((appointment) => {
                  const status = appointment.status || "UNKNOWN";

                  const patientName = [
                    appointment.patient?.firstName,
                    appointment.patient?.lastName,
                  ]
                    .filter(Boolean)
                    .join(" ");

                  const doctorName = [
                    appointment.doctor?.firstName,
                    appointment.doctor?.lastName,
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <tr key={appointment.id}>
                      <td>{formatDate(appointment.date)}</td>

                      <td>{appointment.timeSlot || "Not specified"}</td>

                      <td>
                        {patientName || "Patient unavailable"}
                      </td>

                      <td>
                        {doctorName || "Doctor unavailable"}
                      </td>

                      <td>
                        {appointment.department?.name ||
                          "Not assigned"}
                      </td>

                      <td>
                        <span
                          className={`admin-status ${status
                            .toLowerCase()
                            .replace(/_/g, "-")}`}
                        >
                          {formatStatus(status)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
};


const renderReports = () => {
  const appointments = dashboardStats?.recentAppointments || [];
  const appointmentStatuses = dashboardStats?.appointmentStatuses || {};

  const completedAppointments =
    appointmentStatuses.COMPLETED ?? 0;

  const totalAppointments = dashboardStats?.appointments ?? 0;

  // Summarise the recent appointments returned by the dashboard API.
  const departmentStats = appointments.reduce((groups, appointment) => {
    const departmentName =
      appointment.department?.name || "Unassigned";

    if (!groups[departmentName]) {
      groups[departmentName] = {
        name: departmentName,
        appointments: 0,
        completed: 0,
        otherStatuses: 0,
      };
    }

    groups[departmentName].appointments += 1;

    if (appointment.status?.toUpperCase() === "COMPLETED") {
      groups[departmentName].completed += 1;
    } else {
      groups[departmentName].otherStatuses += 1;
    }

    return groups;
  }, {});

  const departmentRows = Object.values(departmentStats);

  return (
    <>
      <div className="admin-section-header">
        <div>
          <h2>Reports & Analytics</h2>
          <p>
            Review hospital activity and operational performance
            using database records.
          </p>
        </div>
      </div>

      <section className="admin-info-grid">
        <div className="admin-info-item">
          <span>Total Appointments</span>
          <strong>
            {dashboardLoading
              ? "..."
              : dashboardError
                ? "—"
                : totalAppointments}
          </strong>
        </div>

        <div className="admin-info-item">
          <span>Completed Appointments</span>
          <strong>
            {dashboardLoading
              ? "..."
              : dashboardError
                ? "—"
                : completedAppointments}
          </strong>
        </div>

        <div className="admin-info-item">
          <span>Patients Served</span>
          <strong>Not available</strong>
        </div>

        <div className="admin-info-item">
          <span>Average Wait Time</span>
          <strong>Not available</strong>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-header">
          <div>
            <h3>Department Performance</h3>
            <p>
              Breakdown of appointments returned by the dashboard API.
              These figures represent recent records, not necessarily
              every appointment in the database.
            </p>
          </div>

          <span className="admin-card-count">
            {departmentRows.length} Departments
          </span>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Recent Appointments</th>
                <th>Completed</th>
                <th>Other Statuses</th>
              </tr>
            </thead>

            <tbody>
              {dashboardLoading ? (
                <tr>
                  <td colSpan="4" className="admin-empty-state">
                    Loading report data...
                  </td>
                </tr>
              ) : dashboardError ? (
                <tr>
                  <td colSpan="4" className="admin-empty-state">
                    {dashboardError}
                    <button
                      type="button"
                      className="admin-secondary-button"
                      onClick={loadDashboardStats}
                    >
                      Retry
                    </button>
                  </td>
                </tr>
              ) : departmentRows.length === 0 ? (
                <tr>
                  <td colSpan="4" className="admin-empty-state">
                    No recent appointment records available.
                  </td>
                </tr>
              ) : (
                departmentRows.map((department) => (
                  <tr key={department.name}>
                    <td>{department.name}</td>
                    <td>{department.appointments}</td>
                    <td>{department.completed}</td>
                    <td>{department.otherStatuses}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
};

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

    case "Receptionists":
      return renderReceptionists();

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
              {/* <span className="admin-header-label">Administrator</span> */}
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
