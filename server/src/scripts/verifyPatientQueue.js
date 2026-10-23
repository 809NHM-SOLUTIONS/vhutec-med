/* Verifies GET /api/patients/me/queue against real database rows.
 *
 * Run from the server folder (needs the same .env as the server):
 *   node src/scripts/verifyPatientQueue.js
 *
 * Optional HTTP checks against a running server (set tokens from real logins):
 *   API_URL=http://localhost:5000/api PATIENT_A_TOKEN=... PATIENT_B_TOKEN=... \
 *   STAFF_TOKEN=... node src/scripts/verifyPatientQueue.js
 *
 * Read-only: it never writes to the database.
 */
const prisma = require("../prisma");
const { getMyQueue, getTodayWindow, WAITING_ORDER } = require("../controllers/patientQueueController");

let failures = 0;
const check = (name, ok, extra = "") => {
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  ${extra}`}`);
    if (!ok) failures++;
};

const callHandler = async (userId) => {
    let status = 200;
    let body;
    const res = {
        status(code) { status = code; return this; },
        json(payload) { body = payload; return this; }
    };
    await getMyQueue({ user: { userId, role: "PATIENT" } }, res);
    return { status, body };
};

(async () => {
    const { dayStart, nextDayStart } = getTodayWindow();

    const todays = await prisma.appointment.findMany({
        where: { date: { gte: dayStart, lt: nextDayStart } },
        include: { queue: true, patient: { select: { id: true, userId: true, firstName: true, lastName: true } } }
    });
    console.log(`Appointments today in DB: ${todays.length}\n`);

    // Independent expectation of the waiting order.
    const waiting = await prisma.queue.findMany({
        where: {
            status: "WAITING",
            appointment: { date: { gte: dayStart, lt: nextDayStart } }
        },
        select: { id: true, queueNumber: true, appointment: { select: { patientId: true } } },
        orderBy: WAITING_ORDER
    });

    // 1. Every patient with a queue entry today gets matching data.
    for (const a of todays.filter((x) => x.queue)) {
        const { status, body } = await callHandler(a.patient.userId);
        const label = `patient ${a.patient.id} / appointment ${a.id}`;
        check(`${label}: 200 OK`, status === 200, `got ${status}`);
        if (status !== 200) continue;

        const d = body.data;
        const sameQueue = d.appointment && d.appointment.id === a.id;

        // Patients with several appointments today may be shown another one; only compare when it's this one.
        if (sameQueue) {
            check(`${label}: queue number matches`, d.queue.queueNumber === a.queue.queueNumber);

            // What the patient should see, written out independently of the controller.
            let expected;
            if (a.status === "CANCELLED") expected = "CANCELLED";
            else if (a.status === "COMPLETED") expected = "COMPLETED";
            else if (a.status === "IN_PROGRESS" && a.queue.status !== "COMPLETED") expected = "IN_CONSULTATION";
            else expected = a.queue.status;

            check(`${label}: state ${expected}`, d.state === expected, `got ${d.state}`);

            if (expected === "WAITING") {
                const idx = waiting.findIndex((w) => w.id === a.queue.id);
                check(`${label}: position = ${idx + 1}`, d.position === idx + 1, `got ${d.position}`);
                check(`${label}: ahead = ${idx}`, d.ahead === idx, `got ${d.ahead}`);
            } else {
                check(`${label}: no position when not waiting`, d.position === null, `got ${d.position}`);
            }
        }
    }

    // 2. Isolation: a patient's response never mentions another patient's data.
    const withQueue = todays.filter((x) => x.queue);
    if (withQueue.length >= 2) {
        const a = withQueue[0];
        const b = withQueue.find((x) => x.patient.id !== a.patient.id);

        if (b) {
            const { body } = await callHandler(a.patient.userId);
            const text = JSON.stringify(body);
            check("response for A has no patient object", !("patient" in body.data));
            check("response for A never reports B's appointment", body.data.appointment?.id !== b.id);
            check(
                "response for A never contains B's name",
                !(text.includes(b.patient.firstName) && text.includes(b.patient.lastName))
            );
        } else {
            console.log("SKIP  isolation check needs two different patients with queue entries today");
        }
    } else {
        console.log("SKIP  isolation check needs two patients with queue entries today");
    }

    // 3. A user with no patient profile gets 404, not someone else's data.
    const orphan = await callHandler(-1);
    check("unknown user is rejected (401)", orphan.status === 401, `got ${orphan.status}`);
    const missing = await callHandler(2147483647);
    check("user without patient profile gets 404", missing.status === 404, `got ${missing.status}`);

    // 4. Optional HTTP checks (route guards).
    const { API_URL, PATIENT_A_TOKEN, STAFF_TOKEN } = process.env;
    if (API_URL) {
        const get = (token) =>
            fetch(`${API_URL}/patients/me/queue`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

        check("no token => 401", (await get()).status === 401);
        if (STAFF_TOKEN) check("staff token => 403", (await get(STAFF_TOKEN)).status === 403);
        if (PATIENT_A_TOKEN) check("patient token => 200", (await get(PATIENT_A_TOKEN)).status === 200);
    } else {
        console.log("SKIP  HTTP route-guard checks (set API_URL and tokens to run them)");
    }

    console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks passed");
    await prisma.$disconnect();
    process.exit(failures ? 1 : 0);
})().catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
});