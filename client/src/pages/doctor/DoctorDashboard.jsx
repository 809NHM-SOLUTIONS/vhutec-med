import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  fetchDoctorDashboard,
  fetchNotifications,
  fetchUnreadNotificationCount,
  markNotificationAsRead,
  fetchConsultations,
  createConsultation,     // <-- ADD THIS
  updateConsultation,
} from "../../api/api";
import { io } from "socket.io-client";
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
  FiBell,
} from "react-icons/fi";

import "./DoctorDashboard.css";

import useNotifications from "../../components/notifications/useNotifications";
import NotificationBell from "../../components/notifications/NotificationBell";


const DoctorDashboard = () => {
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);


  const [doctor, setDoctor] = useState(null);
  const [appointmentsData, setAppointmentsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [consultations, setConsultations] = useState([]);
const [consultationsLoading, setConsultationsLoading] = useState(true);
const [consultationsError, setConsultationsError] = useState("");
const [consultationNotes, setConsultationNotes] = useState("");

const [activeConsultationAppointment, setActiveConsultationAppointment] =
  useState(null);

const [clinicalForm, setClinicalForm] = useState({
  symptoms: "",
  examination: "",
  diagnosis: "",
  treatment: "",
  followUp: "",
});

const refreshConsultationData = async () => {
  const [dashboardResult, consultationResult] = await Promise.all([
    fetchDoctorDashboard(),
    fetchConsultations(),
  ]);

  if (!dashboardResult?.success) {
    throw new Error(
      dashboardResult?.message || "Failed to refresh the doctor dashboard."
    );
  }

  if (!consultationResult?.success) {
    throw new Error(
      consultationResult?.message || "Failed to refresh consultations."
    );
  }

  setDoctor(dashboardResult.data);

  setAppointmentsData(
    Array.isArray(dashboardResult.data?.appointments)
      ? dashboardResult.data.appointments
      : []
  );

  setConsultations(
    Array.isArray(consultationResult.data)
      ? consultationResult.data
      : []
  );
};

  const {
  notifications,
  unreadCount: unreadNotificationCount,
  loading: notificationsLoading,
  error: notificationsError,
  loadNotifications,
  markAsRead: handleMarkNotificationAsRead,
} = useNotifications();




useEffect(() => {
  let active = true;
  let requestInProgress = false;

  const loadDashboard = async (showLoading = false) => {
    if (requestInProgress) return;

    requestInProgress = true;

    try {
      if (showLoading) {
        setLoading(true);
      }

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
      requestInProgress = false;

      if (active && showLoading) {
        setLoading(false);
      }
    }
  };

  // Load dashboard data immediately.
  loadDashboard(true);

  // Refresh automatically every five seconds.
  const refreshInterval = setInterval(() => {
    loadDashboard(false);
  }, 5000);

  return () => {
    active = false;
    clearInterval(refreshInterval);
  };
}, []);


  useEffect(() => {
  let active = true;

  const loadConsultations = async () => {
    try {
      setConsultationsLoading(true);
      setConsultationsError("");

      const result = await fetchConsultations();

      if (!result?.success) {
        throw new Error(
          result?.message || "Failed to load consultations."
        );
      }

      if (active) {
        setConsultations(
          Array.isArray(result.data) ? result.data : []
        );
      }
    } catch (error) {
      if (active) {
        setConsultationsError(
          error.message || "Unable to load consultations."
        );
      }
    } finally {
      if (active) setConsultationsLoading(false);
    }
  };

  loadConsultations();

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
    { label: "Notifications", icon: FiBell },
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

  const calledAppointments = appointmentsData.filter(
  (appointment) =>
    getLocalDateKey(appointment.date) === todayKey &&
    appointment.queue?.status === "CALLED"
);


const handleStartConsultation = async (appointment) => {
  if (!doctor) {
    return alert("Doctor profile not loaded yet.");
  }

  if (appointment.queue?.status !== "CALLED") {
    return alert(
      "This patient must be checked in and called by Reception before the consultation can start."
    );
  }

  try {
    const existingConsultation =
      consultations.find(
        (consultation) =>
          Number(consultation.appointmentId) === Number(appointment.id)
      ) || appointment.consultation;

    let consultationId = existingConsultation?.id;

    if (!consultationId) {
      const result = await createConsultation({
        appointmentId: appointment.id,
        doctorId: doctor.id,
        notes: "Consultation started.",
      });

      if (!result?.success || !result?.data?.id) {
        throw new Error(
          result?.message || "Failed to create consultation."
        );
      }

      consultationId = result.data.id;
    }

    const updateResult = await updateConsultation(consultationId, {
      startedAt: new Date().toISOString(),
    });

    if (updateResult?.success === false) {
      throw new Error(
        updateResult.message || "Failed to start consultation."
      );
    }

    await refreshConsultationData();

setConsultationNotes("");
setClinicalForm({
  symptoms: "",
  examination: "",
  diagnosis: "",
  treatment: "",
  followUp: "",
});

setActiveConsultationAppointment(appointment);
setActiveSection("Consultations");
  } catch (error) {
    alert(
      error.response?.data?.message ||
        error.message ||
        "Failed to start consultation."
    );
  }
};

const handleSaveConsultationNotes = async (appointment, notes) => {
  const clinicalNotes = typeof notes === "string" ? notes.trim() : "";

  if (!clinicalNotes) {
    return alert("Please enter clinical notes before saving.");
  }

  const existingConsultation =
    consultations.find(
      (consultation) =>
        Number(consultation.appointmentId) === Number(appointment.id)
    ) || appointment.consultation;

  if (!existingConsultation?.id) {
    return alert(
      "Consultation record not found. Please start the consultation first."
    );
  }

  try {
    const result = await updateConsultation(existingConsultation.id, {
      notes: clinicalNotes,
    });

    if (result?.success === false) {
      throw new Error(
        result.message || "Failed to save clinical notes."
      );
    }

    await refreshConsultationData();
    alert("Clinical notes saved successfully.");
  } catch (error) {
    alert(
      error.response?.data?.message ||
        error.message ||
        "Failed to save clinical notes."
    );
  }
};

const handleCompleteConsultation = async (appointment, notes) => {
  const clinicalNotes = typeof notes === "string" ? notes.trim() : "";

  if (!clinicalNotes) {
    return alert("Please enter clinical notes before completing.");
  }

  const existingConsultation =
    consultations.find(
      (consultation) =>
        Number(consultation.appointmentId) === Number(appointment.id)
    ) || appointment.consultation;

  if (!existingConsultation?.id) {
    return alert(
      "Consultation record missing. Please refresh and try again."
    );
  }

  try {
    const result = await updateConsultation(existingConsultation.id, {
      notes: clinicalNotes,
      completedAt: new Date().toISOString(),
    });

    if (result?.success === false) {
      throw new Error(
        result.message || "Failed to complete consultation."
      );
    }

    await refreshConsultationData();
    setConsultationNotes("");
  } catch (error) {
    alert(
      error.response?.data?.message ||
        error.message ||
        "Failed to complete consultation."
    );
  }
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
                    {" | "}
                    {getPatientName(appointment.patient)}
                  </strong>

                  <span>
                    {getFileNumber(appointment.patient)}
                    {" | "}
                    {appointment.reason || "No reason provided"}
                    {" | "}
                    {getAppointmentTime(appointment)}
                  </span>
                </div>

                
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    className={`doctor-status ${getStatusClass(
                      appointment.queue.status
                    )}`}
                  >
                    {getStatusLabel(appointment.queue.status)}
                  </span>

                  {appointment.queue.status === "CALLED" && (
                    <button
                      type="button"
                      className="primary-button"
                      style={{
                        padding: "8px 12px",
                        fontSize: "12px",
                        height: "auto",
                      }}
                      onClick={() =>
                        handleStartConsultation(appointment)
                      }
                    >
                      Start Consultation
                    </button>
                  )}
                </div>

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



const renderConsultations = () => {
  const currentAppointment = appointmentsData.find(
    (appointment) =>
      appointment.queue?.status === "IN_CONSULTATION"
  );

  const getConsultationPatient = (consultation) =>
    consultation.appointment?.patient;

  const getConsultationDate = (consultation) => {
    const value =
      consultation.startedAt ||
      consultation.appointment?.date ||
      consultation.createdAt;

    if (!value) return "Date unavailable";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }


    return date.toLocaleDateString("en-ZA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const recentConsultations = [...consultations]
    .filter((consultation) => consultation.completedAt)
    .sort(
      (a, b) =>
        new Date(b.completedAt) - new Date(a.completedAt)
    );

  return (
    <>
      <div className="doctor-section-header">
        <h2>Consultations</h2>
        <p>Review current and recently completed patient consultations.</p>
      </div>

      <section className="doctor-card" style={{ marginBottom: "20px" }}>
  <div className="doctor-card-header">
    <div>
      <h3>Patients Ready for Consultation</h3>
      <p>Start consultations for patients called by Reception.</p>
    </div>
    <span className="doctor-status checked">
      {calledAppointments.length} Called
    </span>
  </div>

  {calledAppointments.length === 0 ? (
    <p>No called patients are waiting to begin a consultation.</p>
  ) : (
    <div className="doctor-workspace-list">
      {calledAppointments.map((appointment) => (
        <div className="doctor-workspace-row" key={appointment.id}>
          <div>
            <strong>{getPatientName(appointment.patient)}</strong>
            <span>
              File: {getFileNumber(appointment.patient)} · Queue #
              {appointment.queue?.queueNumber ?? "—"}
            </span>
            <span>
              {appointment.reason || "General consultation"}
            </span>
          </div>

          <button
            type="button"
            className="primary-button"
            disabled={Boolean(currentAppointment)}
            onClick={() => handleStartConsultation(appointment)}
          >
            Start Consultation
          </button>
        </div>
      ))}
    </div>
  )}

  {currentAppointment && (
    <p style={{ marginTop: "12px" }}>
      Complete the current consultation before starting another patient.
    </p>
  )}
</section>

      <section className="doctor-grid">
        <div className="doctor-card">
          <div className="doctor-card-header">
            <div>
              <h3>Current Consultation</h3>
              <p>Patient currently in consultation.</p>
            </div>

            <span className="doctor-status checked">
              {currentAppointment ? "In Consultation" : "No Active Consultation"}
            </span>
          </div>

          {currentAppointment ? (
            <div className="doctor-consultation">
              <div className="doctor-consultation-top">
                <div className="doctor-consultation-patient">
                  <div className="doctor-consultation-avatar">
                    {getPatientInitials(currentAppointment.patient)}
                  </div>

                  <div>
                    <strong>
                      {getPatientName(currentAppointment.patient)}
                    </strong>
                    <span>
                      {getFileNumber(currentAppointment.patient)}
                    </span>
                  </div>
                </div>

                <span className="doctor-consultation-time">
                  {currentAppointment.timeSlot || "Time unavailable"}
                </span>
              </div>

              <div className="doctor-consultation-details">
                <div className="doctor-detail-item">
                  <span>Reason</span>
                  <strong>
                    {currentAppointment.reason || "General consultation"}
                  </strong>
                </div>

                <div className="doctor-detail-item">
                  <span>Department</span>
                  <strong>
                    {currentAppointment.department?.name || "Not assigned"}
                  </strong>
                </div>

                <div className="doctor-detail-item">
                  <span>Queue</span>
                  <strong>
                    {currentAppointment.queue?.queueNumber ?? "Not assigned"}
                  </strong>
                </div>
              </div>


<div className="clinical-form">
  <h3>Clinical Consultation Form</h3>
  <p>Complete the clinical information before ending the consultation.</p>

  <div className="clinical-form-grid">
    <div className="clinical-form-field">
      <label htmlFor="clinical-symptoms">Symptoms and History *</label>
      <textarea
        id="clinical-symptoms"
        value={clinicalForm.symptoms}
        onChange={(event) =>
          setClinicalForm((previous) => ({
            ...previous,
            symptoms: event.target.value,
          }))
        }
        placeholder="Record the patient's reported symptoms and relevant history..."
        rows={4}
        required
      />
    </div>

    <div className="clinical-form-field">
      <label htmlFor="clinical-examination">Examination Findings *</label>
      <textarea
        id="clinical-examination"
        value={clinicalForm.examination}
        onChange={(event) =>
          setClinicalForm((previous) => ({
            ...previous,
            examination: event.target.value,
          }))
        }
        placeholder="Record examination findings..."
        rows={4}
        required
      />
    </div>

    <div className="clinical-form-field">
      <label htmlFor="clinical-diagnosis">Diagnosis *</label>
      <textarea
        id="clinical-diagnosis"
        value={clinicalForm.diagnosis}
        onChange={(event) =>
          setClinicalForm((previous) => ({
            ...previous,
            diagnosis: event.target.value,
          }))
        }
        placeholder="Enter the clinical diagnosis..."
        rows={3}
        required
      />
    </div>

    <div className="clinical-form-field">
      <label htmlFor="clinical-treatment">Treatment and Plan *</label>
      <textarea
        id="clinical-treatment"
        value={clinicalForm.treatment}
        onChange={(event) =>
          setClinicalForm((previous) => ({
            ...previous,
            treatment: event.target.value,
          }))
        }
        placeholder="Record treatment, medication plan, or other clinical actions..."
        rows={3}
        required
      />
    </div>

    <div className="clinical-form-field clinical-form-field-full">
      <label htmlFor="clinical-follow-up">Follow-up Instructions *</label>
      <textarea
        id="clinical-follow-up"
        value={clinicalForm.followUp}
        onChange={(event) =>
          setClinicalForm((previous) => ({
            ...previous,
            followUp: event.target.value,
          }))
        }
        placeholder="Record follow-up arrangements and patient instructions..."
        rows={3}
        required
      />
    </div>
  </div>

  <div className="clinical-form-actions">
    <button
      type="button"
      className="primary-button"
      onClick={() => {
        const values = [
          clinicalForm.symptoms,
          clinicalForm.examination,
          clinicalForm.diagnosis,
          clinicalForm.treatment,
          clinicalForm.followUp,
        ];

        if (values.some((value) => !value.trim())) {
          alert("Please complete all required clinical fields.");
          return;
        }

        const combinedNotes = [
          `Symptoms and History:\n${clinicalForm.symptoms.trim()}`,
          `Examination Findings:\n${clinicalForm.examination.trim()}`,
          `Diagnosis:\n${clinicalForm.diagnosis.trim()}`,
          `Treatment and Plan:\n${clinicalForm.treatment.trim()}`,
          `Follow-up Instructions:\n${clinicalForm.followUp.trim()}`,
        ].join("\n\n");

        handleSaveConsultationNotes(
          currentAppointment,
          combinedNotes
        );
      }}
    >
      Save Clinical Record
    </button>

    <button
      type="button"
      className="clinical-end-button"
      onClick={() => {
        const values = [
          clinicalForm.symptoms,
          clinicalForm.examination,
          clinicalForm.diagnosis,
          clinicalForm.treatment,
          clinicalForm.followUp,
        ];

        if (values.some((value) => !value.trim())) {
          alert("Complete all required clinical fields before ending the consultation.");
          return;
        }

        const combinedNotes = [
          `Symptoms and History:\n${clinicalForm.symptoms.trim()}`,
          `Examination Findings:\n${clinicalForm.examination.trim()}`,
          `Diagnosis:\n${clinicalForm.diagnosis.trim()}`,
          `Treatment and Plan:\n${clinicalForm.treatment.trim()}`,
          `Follow-up Instructions:\n${clinicalForm.followUp.trim()}`,
        ].join("\n\n");

        if (
          window.confirm(
            "Are you sure you want to end this consultation? This action completes the appointment."
          )
        ) {
          handleCompleteConsultation(
            currentAppointment,
            combinedNotes
          );
        }
      }}
    >
      End Consultation
    </button>
  </div>
</div>



            </div>
          ) : (
            <p>
              No patient is currently in consultation. Patients must be
              called before their consultations can start.
            </p>
          )}
        </div>

        <div className="doctor-card">
          <div className="doctor-card-header">
            <div>
              <h3>Recent Consultations</h3>
              <p>Recently completed clinical consultations.</p>
            </div>
          </div>

          {consultationsLoading ? (
            <p>Loading consultations...</p>
          ) : consultationsError ? (
            <p role="alert">{consultationsError}</p>
          ) : recentConsultations.length === 0 ? (
            <p>No completed consultations are available yet.</p>
          ) : (
            <div className="doctor-workspace-list">
              {recentConsultations.slice(0, 5).map((consultation) => {
                const patient = getConsultationPatient(consultation);

                return (
                  <div
                    className="doctor-workspace-row"
                    key={consultation.id}
                  >
                    <div>
                      <strong>
                        {patient
                          ? getPatientName(patient)
                          : "Patient information unavailable"}
                      </strong>
                      <span>
                        {getFileNumber(patient)} ·{" "}
                        {getConsultationDate(consultation)}
                      </span>
                    </div>

                    <span className="doctor-status confirmed">
                      Completed
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="doctor-card">
        <div className="doctor-card-header">
          <div>
            <h3>Clinical Notes</h3>
            <p>Notes saved with consultation records.</p>
          </div>
        </div>

        {consultationsLoading ? (
          <p>Loading clinical notes...</p>
        ) : consultationsError ? (
          <p role="alert">{consultationsError}</p>
        ) : consultations.filter(
            (consultation) => consultation.notes?.trim()
          ).length === 0 ? (
          <p>No clinical notes are available yet.</p>
        ) : (
          <div className="doctor-workspace-list">
            {[...consultations]
              .filter((consultation) => consultation.notes?.trim())
              .sort(
                (a, b) =>
                  new Date(
                    b.completedAt || b.startedAt || b.createdAt || 0
                  ) -
                  new Date(
                    a.completedAt || a.startedAt || a.createdAt || 0
                  )
              )
              .slice(0, 5)
              .map((consultation) => {
                const patient = getConsultationPatient(consultation);

                return (
                  <div
                    className="doctor-workspace-row"
                    key={consultation.id}
                  >
                    <div>
                      <strong>
                        {patient
                          ? getPatientName(patient)
                          : "Patient information unavailable"}
                      </strong>
                      <span>{consultation.notes}</span>
                    </div>

                    <span>
                      {getConsultationDate(consultation)}
                    </span>
                  </div>
                );
              })}
          </div>
        )}
      </section>
    </>
  );
};


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
      <span>VH-2026-00421 | Last visit: 12 Sep 2026</span>
      <span>History: General consultation | Prescription recorded</span>
    </div>
    <span className="doctor-status confirmed">Active</span>
  </div>

  <div className="doctor-workspace-row">
    <div>
      <strong>Lerato Dlamini</strong>
      <span>VH-2026-00436 | Last visit: 18 Sep 2026</span>
      <span>History: Follow-up | Review required</span>
    </div>
    <span className="doctor-status checked">Review</span>
  </div>

  <div className="doctor-workspace-row">
    <div>
      <strong>Mpho Nkosi</strong>
      <span>VH-2026-00452 | Last visit: 21 Sep 2026</span>
      <span>History: Routine consultation | No active prescription</span>
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
            <p>Thabo Mokoena | VH-2026-00421</p>
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
              <span>Thabo Mokoena | 12 Sep 2026</span>
            </div>
            <span>3x daily</span>
          </div>

          <div className="doctor-workspace-row">
            <div>
              <strong>Paracetamol 500mg</strong>
              <span>Thabo Mokoena | 12 Sep 2026</span>
            </div>
            <span>As required</span>
          </div>
        </div>
      </div>
    </section>
  </>
);




const renderNotifications = () => (
  <section className="doctor-card doctor-notifications-page">
    <div className="doctor-card-header doctor-notifications-header">
      <div>
        <h2>Notifications</h2>
        <p>Your latest updates from Vhutec Med.</p>
      </div>

      <span className="doctor-notifications-count">
        {unreadNotificationCount} unread
      </span>
    </div>

    {notificationsLoading ? (
      <p className="doctor-notifications-state" role="status">
        Loading notifications...
      </p>
    ) : notificationsError ? (
      <div className="doctor-notifications-state">
        <p role="alert">{notificationsError}</p>
        <button
          type="button"
          className="doctor-notifications-button"
          onClick={loadNotifications}
        >
          Try again
        </button>
      </div>
    ) : notifications.length === 0 ? (
      <p className="doctor-notifications-state">
        You're all caught up. New updates will appear here.
      </p>
    ) : (
      <div className="doctor-notifications-list">
        {notifications.map((notification) => (
          <article
            className={`doctor-notification-row ${
              notification.readAt ? "is-read" : "is-unread"
            }`}
            key={notification.id}
          >
            <div className="doctor-notification-content">
              <strong>{notification.title}</strong>

              <p>{notification.message}</p>

              <small>
                {notification.createdAt
                  ? new Date(notification.createdAt).toLocaleString(
                      "en-ZA",
                      {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }
                    )
                  : ""}
              </small>

              {!notification.readAt && (
                <button
                  type="button"
                  className="doctor-notifications-button"
                  onClick={() =>
                    handleMarkNotificationAsRead(notification)
                  }
                >
                  Mark as read
                </button>
              )}
            </div>

            {!notification.readAt && (
              <span
                className="doctor-notification-unread-indicator"
                aria-label="Unread notification"
              />
            )}
          </article>
        ))}
      </div>
    )}
  </section>
);


      const renderDashboard = () => {
    // Find the patient currently in consultation
    const currentAppointment = appointmentsData.find(
      (a) => a.queue?.status === "IN_CONSULTATION"
    );

    // Show ALL of today's active appointments in the waiting box

const readyAppointments = appointmentsData.filter(
  (appointment) =>
    getLocalDateKey(appointment.date) === todayKey &&
    ["WAITING", "CALLED", "IN_CONSULTATION"].includes(
      appointment.queue?.status
    )
);


const activeTodayAppointments = todayAppointments.filter(
  (appointment) => {
    const queueStatus = appointment.queue?.status;

    // Keep patients who are still waiting or being attended to.
    if (
      ["WAITING", "CALLED", "IN_CONSULTATION"].includes(
        queueStatus
      ) ||
      ["CHECKED_IN", "IN_PROGRESS"].includes(appointment.status)
    ) {
      return true;
    }

    // Completed and cancelled appointments belong in history.
    if (
      ["COMPLETED", "CANCELLED"].includes(appointment.status) ||
      queueStatus === "COMPLETED"
    ) {
      return false;
    }

    // Keep future appointments on the dashboard.
    const dateKey = getLocalDateKey(appointment.date);

    if (dateKey > todayKey) return false;
    if (dateKey < todayKey) return false;

    if (!appointment.timeSlot) return true;

    const match = /(\d{1,2}):(\d{2})/.exec(
      appointment.timeSlot
    );

    if (!match) return true;

    const appointmentMinutes =
      Number(match[1]) * 60 + Number(match[2]);

    const currentMinutes =
      new Date().getHours() * 60 + new Date().getMinutes();

    return appointmentMinutes >= currentMinutes;
  }
);



   const handleStartConsultation = async (appointment) => {
  if (!doctor) {
    return alert("Doctor profile not loaded yet.");
  }

  if (appointment.queue?.status !== "CALLED") {
    return alert(
      "This patient must be checked in and called by Reception before the consultation can start."
    );
  }

  try {
    const existingConsultation =
      consultations.find(
        (consultation) =>
          consultation.appointmentId === appointment.id
      ) || appointment.consultation;

    let consultationId = existingConsultation?.id;

    if (!consultationId) {
      const result = await createConsultation({
        appointmentId: appointment.id,
        doctorId: doctor.id,
        notes: "Consultation started.",
      });

      if (!result?.success || !result?.data?.id) {
        throw new Error(
          result?.message || "Failed to create consultation."
        );
      }

      consultationId = result.data.id;
    }

    await updateConsultation(consultationId, {
      startedAt: new Date().toISOString(),
    });

   await refreshConsultationData();
setConsultationNotes("");
  } catch (error) {
    alert(
      error.response?.data?.message ||
      error.message ||
      "Failed to start consultation."
    );
  }
};

const handleSaveConsultationNotes = async (appointment, notes) => {
  const clinicalNotes = typeof notes === "string" ? notes.trim() : "";

  if (!clinicalNotes) {
    alert("Please enter clinical notes before saving.");
    return;
  }

  const existingConsultation =
    consultations.find(
      (consultation) =>
        Number(consultation.appointmentId) === Number(appointment.id)
    ) || appointment.consultation;

  if (!existingConsultation?.id) {
    alert("Consultation record not found. Please start the consultation first.");
    return;
  }

  try {
    const result = await updateConsultation(existingConsultation.id, {
      notes: clinicalNotes,
    });

    if (result?.success === false) {
      throw new Error(result.message || "Failed to save clinical notes.");
    }

    await refreshConsultationData();
    alert("Clinical notes saved successfully.");
  } catch (error) {
    alert(
      error.response?.data?.message ||
      error.message ||
      "Failed to save clinical notes."
    );
  }
};


const handleCompleteConsultation = async (appointment, notes) => {
  const clinicalNotes = typeof notes === "string" ? notes.trim() : "";

  if (!clinicalNotes) {
    return alert("Please enter clinical notes before completing.");
  }

  const existingConsultation =
    consultations.find(
      (consultation) =>
        Number(consultation.appointmentId) === Number(appointment.id)
    ) || appointment.consultation;

  const consultationId = existingConsultation?.id;

  if (!consultationId) {
    return alert("Consultation record missing. Please refresh and try again.");
  }

  try {
    const result = await updateConsultation(consultationId, {
      notes: clinicalNotes,
      completedAt: new Date().toISOString(),
    });

    if (result?.success === false) {
      throw new Error(result.message || "Failed to complete consultation.");
    }

    await refreshConsultationData();
setConsultationNotes("");
  } catch (error) {
    alert(
      error.response?.data?.message ||
      error.message ||
      "Failed to complete consultation."
    );
  }
};


    return (
      <>
        <section className="doctor-stats">
          <div className="doctor-stat-card">
            <div className="doctor-stat-top"><div className="doctor-stat-icon"><FiCalendar /></div></div>
            <span>Today's Appointments</span>
            <h3>{todayAppointments.length}</h3>
            <span className="doctor-stat-change">
            {todayAppointments.filter(
              (appointment) =>
                appointment.status === "COMPLETED" ||
                appointment.queue?.status === "COMPLETED"
            ).length} completed today
          </span>
          </div>
          <div className="doctor-stat-card">
            <div className="doctor-stat-top"><div className="doctor-stat-icon"><FiUsers /></div></div>
            <span>Patients Today</span>
            <h3>{new Set(todayAppointments.map((a) => a.patientId)).size}</h3>
            <span className="doctor-stat-change">{readyAppointments.length} patients waiting</span>
          </div>
          <div className="doctor-stat-card">
            <div className="doctor-stat-top"><div className="doctor-stat-icon"><FiClock /></div></div>
            <span>Waiting Queue</span>
            <h3>{readyAppointments.length}</h3>
            <span className="doctor-stat-change">Patients currently waiting</span>
          </div>
          <div className="doctor-stat-card">
            <div className="doctor-stat-top"><div className="doctor-stat-icon"><FiCheckCircle /></div></div>
            <span>Completed Consultations</span>
            <h3>{completedAppointments.length}</h3>
            <span className="doctor-stat-change">Completed appointments</span>
          </div>
        </section>

        <section className="doctor-grid">
          {/* PATIENTS WAITING BOX */}
          <div className="doctor-card">
            <div className="doctor-card-header">
              <div>
                <h3>Patients Waiting</h3>
                <p>Patients currently waiting for consultation.</p>
              </div>
              <button className="doctor-card-link" onClick={() => handleNavigation("Queue")}>
                View queue
              </button>
            </div>

            <div className="doctor-patient-list">
              {readyAppointments.length === 0 && <p>No patients waiting right now.</p>}
              {readyAppointments.map((appointment) => (
                <div className="doctor-patient-item" key={appointment.id}>
                  <div className="doctor-patient-avatar">
                    {getPatientInitials(appointment.patient)}
                  </div>
                  <div className="doctor-patient-info">
                    <strong>{getPatientName(appointment.patient)}</strong>
                    <span>{getFileNumber(appointment.patient)} · {appointment.reason}</span>
                  </div>

                  {/* Show Start button only when Reception has called the patient */}
                  {appointment.queue?.status === "CALLED" && (
                    <button
                      className="primary-button"
                      style={{
                        padding: "6px 12px",
                        fontSize: "12px",
                        height: "auto",
                      }}
                      onClick={() => handleStartConsultation(appointment)}
                    >
                      Start Consultation
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* CURRENT CONSULTATION BOX */}
          <div className="doctor-card">
            <div className="doctor-card-header">
              <div>
                <h3>Current Consultation</h3>
                <p>Patient currently being attended to.</p>
              </div>
            </div>

            {currentAppointment ? (
              <div className="doctor-consultation">
                <div className="doctor-consultation-top">
                  <div className="doctor-consultation-patient">
                    <div className="doctor-consultation-avatar">
                      {getPatientInitials(currentAppointment.patient)}
                    </div>
                    <div>
                      <strong>{getPatientName(currentAppointment.patient)}</strong>
                      <span>{getFileNumber(currentAppointment.patient)}</span>
                    </div>
                  </div>
                  <span className="doctor-consultation-time">
                    {currentAppointment.timeSlot}
                  </span>
                </div>

                <div className="doctor-consultation-details">
                  <div className="doctor-detail-item">
                    <span>Reason</span>
                    <strong>{currentAppointment.reason || "General Consultation"}</strong>
                  </div>
                  <div className="doctor-detail-item">
                    <span>Department</span>
                    <strong>{currentAppointment.department?.name}</strong>
                  </div>
                  <div className="doctor-detail-item">
                    <span>Status</span>
                    <strong>In Consultation</strong>
                  </div>
                </div>

                <div style={{ marginTop: "16px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "bold", display: "block", marginBottom: "8px" }}>
                    Clinical Notes
                  </label>
                    <textarea
                    id="consultation-notes"
                    rows="3"
                    placeholder="Enter symptoms, diagnosis, and treatment..."
                    value={consultationNotes}
                    onChange={(event) => setConsultationNotes(event.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid var(--doctor-border)",
                      fontFamily: "inherit",
                      fontSize: "13px",
                      marginBottom: "10px"
                    }}
                  />

                  {currentAppointment.queue?.status === "IN_CONSULTATION" && (
                    <button
                      className="primary-button"
                      style={{
                        padding: "6px 12px",
                        fontSize: "12px",
                        height: "auto",
                      }}
                      onClick={() =>
                        handleCompleteConsultation(currentAppointment, consultationNotes)
                      }
                    >
                      Complete Consultation
                    </button>
                  )}

                </div>

                <div style={{ marginTop: "18px" }}>
                <label
                  htmlFor="consultation-page-notes"
                  style={{
                    display: "block",
                    fontWeight: 600,
                    marginBottom: "8px",
                  }}
                >
                  Clinical Notes
                </label>

                <textarea
                  id="consultation-page-notes"
                  rows={7}
                  value={consultationNotes}
                  onChange={(event) => setConsultationNotes(event.target.value)}
                  placeholder="Record symptoms, examination findings, diagnosis, treatment, and follow-up..."
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid var(--doctor-border)",
                    fontFamily: "inherit",
                    fontSize: "14px",
                    resize: "vertical",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                    marginTop: "12px",
                  }}
                >
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() =>
                      handleSaveConsultationNotes(currentAppointment, consultationNotes)
                    }
                  >
                    Save Notes
                  </button>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={() =>
                      handleCompleteConsultation(currentAppointment, consultationNotes)
                    }
                  >
                    Complete Consultation
                  </button>
                </div>
              </div>
              </div>
            ) : (
               <p>No patient is currently in consultation. Please start a consultation from the waiting list.</p>
            )}
          </div>
        </section>

        <section className="doctor-card">
          <div className="doctor-card-header">
            <div>
              <h3>Today's Appointments</h3>
              <p>Appointments scheduled for today.</p>
            </div>
            <button className="doctor-card-link" onClick={() => handleNavigation("Appointments")}>
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
                {activeTodayAppointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td>{getPatientName(appointment.patient)}</td>
                    <td>{getAppointmentTime(appointment)}</td>
                    <td>{appointment.reason || "General consultation"}</td>
                    <td>
                      <span className={`doctor-status ${getStatusClass(appointment.status)}`}>
                        {getAppointmentStatus(appointment)}
                      </span>
                    </td>
                  </tr>
                ))}
                {activeTodayAppointments.length === 0 && (
                  <tr>
                    <td colSpan="4">No appointments scheduled for today.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </>
    );
  };

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


          <div className="doctor-header-actions">
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadNotificationCount}
            loading={notificationsLoading}
            error={notificationsError}
            onRefresh={loadNotifications}
            onMarkAsRead={handleMarkNotificationAsRead}
            onViewAll={() => setActiveSection("Notifications")}
          />

          <div className="doctor-profile">
            <div className="doctor-profile-avatar">
              {doctor ? getPatientInitials(doctor) : "DR"}
            </div>

            <div className="doctor-profile-info">
              <strong>
                {doctor
                  ? `Dr. ${doctor.firstName} ${doctor.lastName}`
                  : "Loading doctor..."}
              </strong>

              <span>{doctor?.speciality || "Doctor"}</span>
            </div>
          </div>
        </div>

        </header>

        <section className="doctor-content">

          {loading && (
  <p role="status">Loading your dashboard...</p>
)}

{!loading && loadError && (
  <div className="doctor-card" role="alert">
    <h3>Unable to load your dashboard</h3>
    <p>{loadError}</p>
    <button
      type="button"
      onClick={() => window.location.reload()}
    >
      Try again
    </button>
  </div>
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
