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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [showDoctorForm, setShowDoctorForm] = useState(false);
  const [showReceptionistForm, setShowReceptionistForm] = useState(false);

  const [departments, setDepartments] = useState([]);
const [doctors, setDoctors] = useState([]);
const [doctorsLoading, setDoctorsLoading] = useState(true);

const [receptionists, setReceptionists] = useState([]);
const [receptionistsLoading, setReceptionistsLoading] = useState(true);

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


  useEffect(() => {
    loadDoctors();
}, []);

useEffect(() => {
  loadReceptionists();
}, []);

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
              <tr>
                <td>Thabo Mokoena</td>
                <td>thabo.mokoena@example.com</td>
                <td>Patient</td>
                <td>
                  <span className="admin-status active">
                    Active
                  </span>
                </td>
              </tr>

              <tr>
                <td>Dr. Naledi Maseko</td>
                <td>naledi.maseko@vhutecmed.co.za</td>
                <td>Doctor</td>
                <td>
                  <span className="admin-status active">
                    Active
                  </span>
                </td>
              </tr>

              <tr>
                <td>Lerato Dlamini</td>
                <td>lerato.dlamini@example.com</td>
                <td>Patient</td>
                <td>
                  <span className="admin-status active">
                    Active
                  </span>
                </td>
              </tr>

              <tr>
                <td>Sipho Nkosi</td>
                <td>sipho.nkosi@vhutecmed.co.za</td>
                <td>Receptionist</td>
                <td>
                  <span className="admin-status inactive">
                    Inactive
                  </span>
                </td>
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
            </tr>
        ))
    )}
</tbody>
          </table>
        </div>
      </section>
    </>
  );


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
                </tr>
              ))
            )}
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
