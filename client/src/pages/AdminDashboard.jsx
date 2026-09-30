import React from "react";

const AdminDashboard = () => {
    return (
        <div className="admin-dashboard">
            <header className="dashboard-header">
                <div>
                    <h1>Administrator Dashboard</h1>
                    <p>Welcome to the Vhutec Med administration portal.</p>
                </div>

                <div className="admin-profile">
                    <span>Administrator</span>
                </div>
            </header>

            <main className="dashboard-content">

                <section className="stats-grid">

                    <div className="stat-card">
                        <h3>Total Users</h3>
                        <p>0</p>
                    </div>

                    <div className="stat-card">
                        <h3>Appointments</h3>
                        <p>0</p>
                    </div>

                    <div className="stat-card">
                        <h3>Patients</h3>
                        <p>0</p>
                    </div>

                    <div className="stat-card">
                        <h3>Doctors</h3>
                        <p>0</p>
                    </div>

                </section>

                <section className="dashboard-section">
                    <h2>System Overview</h2>

                    <div className="overview-card">
                        <p>
                            Administrator access has been successfully
                            authenticated.
                        </p>

                        <p>
                            Dashboard analytics and system management
                            features will appear here.
                        </p>
                    </div>
                </section>

            </main>
        </div>
    );
};

export default AdminDashboard;