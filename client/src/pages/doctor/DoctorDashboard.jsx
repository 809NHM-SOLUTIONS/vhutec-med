import { useEffect, useMemo, useState } from "react";
import { fetchDoctorDashboard } from "../../api/api";
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

  
  const [doctor, setDoctor] = useState(null);
  const [appointmentsData, setAppointmentsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setLoadError("");

        const result = await fetchDoctorDashboard();

        if (!result?.success) {
          throw new Error(
            result?.message || "Failed to load doctor dashboard."
          );
        }

        if (!active) return;

        setDoctor(result.data);
        setAppointmentsData(
          Array.isArray(result.data?.appointments)
            ? result.data.appointments
            : []
        );
      } catch (error) {
        if (active) {
          setLoadError(
            error.message || "Unable to load dashboard data."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const formatDate = (value) => {
    if (!value) return "Not available";

    return new Date(value).toLocaleDateString("en-ZA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getLocalDateKey = (value) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const todayKey = getLocalDateKey(new Date());

  const todayAppointments = useMemo(
    () =>
      appointmentsData.filter(
        (appointment) =>
          getLocalDateKey(appointment.date) === todayKey
      ),
    [appointmentsData, todayKey]
  );

  const waitingAppointments = useMemo(
    () =>
      appointmentsData.filter(
        (appointment) =>
          appointment.queue?.status === "WAITING"
      ),
    [appointmentsData]
  );

  const completedAppointments = useMemo(
    () =>
      appointmentsData.filter(
        (appointment) =>
          appointment.status === "COMPLETED" ||
          appointment.queue?.status === "COMPLETED"
      ),
    [appointmentsData]
  );

  const uniquePatients = useMemo(() => {
    const patientMap = new Map();

    appointmentsData.forEach((appointment) => {
      if (appointment.patient) {
        patientMap.set(
          appointment.patient.id,
          appointment.patient
        );
      }
    });

    return Array.from(patientMap.values());
  }, [appointmentsData]);

  const getPatientName = (patient) =>
    patient
      ? `${patient.firstName || ""} ${patient.lastName || ""}`.trim()
      : "Unknown patient";

  const getPatientInitials = (patient) => {
    if (!patient) return "NA";

    return `${patient.firstName?.[0] || ""}${
      patient.lastName?.[0] || ""
    }`.toUpperCase() || "NA";
  };

  const getFileNumber = (patient) =>
    patient?.patientNumber || "Not assigned";

  const getStatusLabel = (status) => {
    if (!status) return "Not available";

    return status
      .toLowerCase()
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const getStatusClass = (status) => {
    const normalized = (status || "").toLowerCase();

    if (normalized === "completed") return "confirmed";
    if (normalized === "confirmed") return "confirmed";
    if (normalized === "pending") return "pending";
    if (normalized === "checked_in") return "checked";
    if (normalized === "in_progress") return "checked";
    if (normalized === "cancelled") return "pending";
    if (normalized === "waiting") return "waiting";
    if (normalized === "called") return "checked";
    if (normalized === "in_consultation") return "checked";

    return "pending";
  };

  const getAppointmentStatus = (appointment) => {
    if (appointment.queue?.status === "IN_CONSULTATION") {
      return "In Consultation";
    }

    if (appointment.queue?.status === "CALLED") {
      return "Called";
    }

    if (appointment.queue?.status === "WAITING") {
      return "Waiting";
    }

    return getStatusLabel(appointment.status);
  };

  const getAppointmentTime = (appointment) =>
    appointment.timeSlot || "Not set";


  const navigation = [
    { label: "Dashboard", icon: FiGrid },
    { label: "Appointments", icon: FiCalendar },
    { label: "Patients", icon: FiUsers },
    { label: "Queue", icon: FiClock },
    { label: "Consultations", icon: FiUserCheck },
    { label: "Medical Records", icon: FiFileText },
    { label: "Notifications", icon: FiMessageSquare },
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
        <p>Manage your scheduled patient appointments.</p>
      </div>

      <section className="doctor-stats">
        <div className="doctor-stat-card">
          <div className="doctor-stat-icon"><FiCalendar /></div>
          <span>Today's Appointments</span>
          <h3>{todayAppointments.length}</h3>
          <span className="doctor-stat-change">Based on scheduled dates</span>
        </div>

        <div className="doctor-stat-card">
          <div className="doctor-stat-icon"><FiClock /></div>
          <span>Upcoming</span>
          <h3>
            {appointmentsData.filter(
              (a) =>
                getLocalDateKey(a.date) > todayKey &&
                !["COMPLETED", "CANCELLED"].includes(a.status)
            ).length}
          </h3>
          <span className="doctor-stat-change">Future appointments</span>
        </div>

        <div className="doctor-stat-card">
          <div className="doctor-stat-icon"><FiCheckCircle /></div>
          <span>Confirmed</span>
          <h3>
            {appointmentsData.filter((a) => a.status === "CONFIRMED").length}
          </h3>
          <span className="doctor-stat-change">All scheduled dates</span>
        </div>

        <div className="doctor-stat-card">
          <div className="doctor-stat-icon"><FiActivity /></div>
          <span>Pending</span>
          <h3>
            {appointmentsData.filter((a) => a.status === "PENDING").length}
          </h3>
          <span className="doctor-stat-change">Awaiting confirmation</span>
        </div>
      </section>

      <section className="doctor-card">
        <div className="doctor-card-header">
          <div>
            <h3>Appointment Schedule</h3>
            <p>Appointments assigned to you, ordered by date and time.</p>
          </div>
        </div>

        <div className="doctor-table-wrapper">
          <table className="doctor-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Patient</th>
                <th>File Number</th>
                <th>Department</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {appointmentsData.map((appointment) => (
                <tr key={appointment.id}>
                  <td>{formatDate(appointment.date)}</td>
                  <td>{getAppointmentTime(appointment)}</td>
                  <td>{getPatientName(appointment.patient)}</td>
                  <td>{getFileNumber(appointment.patient)}</td>
                  <td>{appointment.department?.name || "Not assigned"}</td>
                  <td>
                    <span className={`doctor-status ${getStatusClass(appointment.status)}`}>
                      {getAppointmentStatus(appointment)}
                    </span>
                  </td>
                </tr>
              ))}

              {appointmentsData.length === 0 && (
                <tr>
                  <td colSpan="6">
                    No appointments have been assigned to you yet.
                  </td>
                </tr>
              )}
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
        <p>Patients associated with your appointments.</p>
      </div>

      <section className="doctor-card">
        <div className="doctor-card-header">
          <div>
            <h3>Patient Directory</h3>
            <p>Unique patients linked to your appointments.</p>
          </div>
        </div>

        <div className="doctor-table-wrapper">
          <table className="doctor-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>File Number</th>
                <th>Date of Birth</th>
                <th>Last Appointment</th>
                <th>Appointment Status</th>
              </tr>
            </thead>

            <tbody>
              {uniquePatients.map((patient) => {
                const patientAppointments = appointmentsData
                  .filter((a) => a.patient?.id === patient.id)
                  .sort(
                    (a, b) =>
                      new Date(b.date).getTime() -
                      new Date(a.date).getTime()
                  );

                const latestAppointment = patientAppointments[0];

                return (
                  <tr key={patient.id}>
                    <td>{getPatientName(patient)}</td>
                    <td>{getFileNumber(patient)}</td>
                    <td>{formatDate(patient.dob)}</td>
                    <td>
                      {latestAppointment
                        ? formatDate(latestAppointment.date)
                        : "Not available"}
                    </td>
                    <td>
                      {latestAppointment ? (
                        <span
                          className={`doctor-status ${getStatusClass(
                            latestAppointment.status
                          )}`}
                        >
                          {getAppointmentStatus(latestAppointment)}
                        </span>
                      ) : (
                        "Not available"
                      )}
                    </td>
                  </tr>
                );
              })}

              {uniquePatients.length === 0 && (
                <tr>
                  <td colSpan="5">No patients found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );



  const renderQueue = () => {
    const queuedAppointments = appointmentsData
      .filter((appointment) => appointment.queue)
      .sort(
        (a, b) =>
          (a.queue?.queueNumber ?? Infinity) -
          (b.queue?.queueNumber ?? Infinity)
      );

    return (
      <>
        <div className="doctor-section-header">
          <h2>Patient Queue</h2>
          <p>Monitor queue records linked to your appointments.</p>
        </div>

        <section className="doctor-stats">
          <div className="doctor-stat-card">
            <div className="doctor-stat-icon"><FiUsers /></div>
            <span>Patients Waiting</span>
            <h3>{waitingAppointments.length}</h3>
            <span className="doctor-stat-change">Current queue status</span>
          </div>

          <div className="doctor-stat-card">
            <div className="doctor-stat-icon"><FiUserCheck /></div>
            <span>In Consultation</span>
            <h3>
              {appointmentsData.filter(
                (a) => a.queue?.status === "IN_CONSULTATION"
              ).length}
            </h3>
            <span className="doctor-stat-change">Currently being attended</span>
          </div>

          <div className="doctor-stat-card">
            <div className="doctor-stat-icon"><FiCheckCircle /></div>
            <span>Completed</span>
            <h3>{completedAppointments.length}</h3>
            <span className="doctor-stat-change">Completed appointments</span>
          </div>
        </section>

        <section className="doctor-card">
          <div className="doctor-card-header">
            <div>
              <h3>Consultation Queue</h3>
              <p>Actual queue records from the database.</p>
            </div>
          </div>

          <div className="doctor-workspace-list">
            {queuedAppointments.map((appointment) => (
              <div className="doctor-workspace-row" key={appointment.id}>
                <div>
                  <strong>
                    #{String(appointment.queue.queueNumber).padStart(2, "0")}
                    {" • "}
                    {getPatientName(appointment.patient)}
                  </strong>

                  <span>
                    {getFileNumber(appointment.patient)}
                    {" • "}
                    {appointment.reason || "No reason provided"}
                    {" • "}
                    {getAppointmentTime(appointment)}
                  </span>
                </div>

                <span
                  className={`doctor-status ${getStatusClass(
                    appointment.queue.status
                  )}`}
                >
                  {getStatusLabel(appointment.queue.status)}
                </span>
              </div>
            ))}

            {queuedAppointments.length === 0 && (
              <p>No queue records are currently available.</p>
            )}
          </div>
        </section>
      </>
    );
  };


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
      {/* <div className="doctor-section-header">
        <h2>Doctor Overview</h2>
        <p>
          Manage today's appointments, patients and clinical activities.
        </p>
      </div> */}

      <section className="doctor-stats">
        <div className="doctor-stat-card">
          <div className="doctor-stat-top">
            <div className="doctor-stat-icon">
              <FiCalendar />
            </div>
          </div>

          <span>Today's Appointments</span>
          <h3>{todayAppointments.length}</h3>
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
          <h3>
  {new Set(todayAppointments.map((a) => a.patientId)).size}
</h3>
<span className="doctor-stat-change">
  {waitingAppointments.length} patients waiting
</span>
        </div>

        <div className="doctor-stat-card">
          <div className="doctor-stat-top">
            <div className="doctor-stat-icon">
              <FiClock />
            </div>
          </div>

          <span>Waiting Queue</span>
         <h3>{waitingAppointments.length}</h3>
<span className="doctor-stat-change">
  Patients currently waiting
</span>
        </div>

        <div className="doctor-stat-card">
          <div className="doctor-stat-top">
            <div className="doctor-stat-icon">
              <FiCheckCircle />
            </div>
          </div>

          <span>Completed Consultations</span>
         <h3>{completedAppointments.length}</h3>
<span className="doctor-stat-change">
  Completed appointments in your schedule
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
            {waitingAppointments.map((appointment) => (
              <div
                className="doctor-patient-item"
                key={appointment.id}
              >
                <div className="doctor-patient-avatar">
  {getPatientInitials(appointment.patient)}
</div>

<div className="doctor-patient-info">
  <strong>{getPatientName(appointment.patient)}</strong>
  <span>
    {getFileNumber(appointment.patient)} · {appointment.reason}
  </span>
</div>

<span className="doctor-patient-status">Waiting</span>
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
            <p>Appointments scheduled for today.</p>
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
  {todayAppointments.map((appointment) => (
    <tr key={appointment.id}>
      <td>{getPatientName(appointment.patient)}</td>
      <td>{getAppointmentTime(appointment)}</td>
      <td>{appointment.reason || "General consultation"}</td>
      <td>
        <span
          className={`doctor-status ${getStatusClass(
            appointment.status
          )}`}
        >
          {getAppointmentStatus(appointment)}
        </span>
      </td>
    </tr>
  ))}

  {todayAppointments.length === 0 && (
    <tr>
      <td colSpan="4">No appointments scheduled for today.</td>
    </tr>
  )}
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
    <p>
      Clinical activity history is not available yet.
      Activity tracking can be connected when the backend supports it.
    </p>
  </div>
</section>

      {/* <section className="doctor-card">
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
      </section> */}

  


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
        <div className="doctor-header-left">
          <button
            className="doctor-mobile-menu"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <FiMenu />
          </button>

          <div>
            <h1>Doctor Dashboard</h1>
            <p>
              Welcome back. Manage your clinical activities.
            </p>
          </div>
        </div>

          
          <div className="doctor-profile">
            <div className="doctor-profile-avatar">
              {doctor
                ? getPatientInitials(doctor)
                : "DR"}
            </div>

            <div className="doctor-profile-info">
              <strong>
                {doctor
                  ? `Dr. ${doctor.firstName} ${doctor.lastName}`
                  : "Loading doctor..."}
              </strong>

              <span>
                {doctor?.speciality || "Doctor"}
              </span>
            </div>
          </div>

        </header>

        <section className="doctor-content">

          {loading && (
  <p role="status">Loading your dashboard...</p>
)}

{!loading && !loadError && (
  <>
    {activeSection === "Dashboard" && renderDashboard()}
    {activeSection === "Appointments" && renderAppointments()}
    {activeSection === "Patients" && renderPatients()}
    {activeSection === "Queue" && renderQueue()}
    {activeSection === "Consultations" && renderConsultations()}
    {activeSection === "Medical Records" && renderMedicalRecords()}
    {activeSection === "Notifications" && renderNotifications()}
  </>
)}
        </section>
      </main>
    </div>
  );
};

export default DoctorDashboard;
