const path = require("path");
const Module = require("module");
const ctrlPath = path.join(__dirname, "..", "controllers", "patientQueueController.js");
const { getTodayWindow } = (() => { // window helper without loading prisma
  const pad = n => String(n).padStart(2,"0"); return { getTodayWindow:(now=new Date())=>{const s=new Date(now);s.setHours(0,0,0,0);return {dayStart:s,nextDayStart:new Date(s.getTime()+864e5)}}}})();
const { dayStart } = getTodayWindow();
const today = new Date(dayStart.getTime() + 2*3600e3); // inside today's window

const doc = {name:"Dr", firstName:"A", lastName:"B", speciality:"GP"};
const dept = {name:"General"};
const mk = (id, patientId, qn, qstatus, astatus="CHECKED_IN", slot="09:00", date=today) => ({
  id, patientId, date, timeSlot: slot, status: astatus, doctor: doc, department: dept,
  queue: qn ? { id: id*10, queueNumber: qn, status: qstatus, checkedInAt: new Date(), calledAt: qstatus==="WAITING"?null:new Date() } : null,
});
const appts = [
  mk(1, 101, 1, "CALLED"),
  mk(2, 102, 2, "WAITING"),
  mk(3, 103, 3, "WAITING", "CANCELLED"),   // cancelled but still WAITING (call-next would still call it)
  mk(4, 104, 4, "WAITING"),
  mk(5, 105, null, null, "CONFIRMED"),      // not checked in
  mk(6, 106, 5, "IN_CONSULTATION", "IN_PROGRESS"),
  mk(7, 107, 6, "COMPLETED", "COMPLETED"),
  mk(8, 108, 7, "CALLED", "IN_PROGRESS"),   // stale CALLED but appointment in progress
  mk(9, 109, null, null, "PENDING", "08:00"),
  mk(9.5, 109, 8, "WAITING", "CHECKED_IN", "10:00"), // patient 109: two visits
];
const patients = {}; for (let p=101;p<=109;p++) patients[1000+p] = { id:p };
const fake = {
  patient: { findUnique: async ({where}) => patients[where.userId] || null },
  appointment: { findMany: async ({where}) => appts.filter(a => a.patientId===where.patientId) },
  queue: { findMany: async () => appts.filter(a=>a.queue&&a.queue.status==="WAITING")
      .sort((x,y)=>x.queue.queueNumber-y.queue.queueNumber||x.queue.id-y.queue.id).map(a=>({id:a.queue.id})) },
};
const orig = Module._load;
Module._load = function(req, parent, ...r){ return req==="../prisma" ? fake : orig.call(this, req, parent, ...r); };
const { getMyQueue } = require(ctrlPath);

const call = async (userId, role="PATIENT") => { let status=200, body; await getMyQueue({user:{userId,role}}, {status(c){status=c;return this}, json(b){body=b;return this}}); return {status, body}; };
let fail=0; const eq=(n,a,b)=>{const ok=JSON.stringify(a)===JSON.stringify(b); if(!ok)fail++; console.log(ok?"PASS":"FAIL",n,ok?"":`got ${JSON.stringify(a)} want ${JSON.stringify(b)}`)};
(async()=>{
  let r;
  r=await call(1101); eq("called patient", [r.body.data.state, r.body.data.position], ["CALLED", null]);
  r=await call(1102); eq("2nd waiting -> position 1", [r.body.data.state, r.body.data.position, r.body.data.ahead, r.body.data.waitingTotal], ["WAITING",1,0,4]);
  r=await call(1103); eq("cancelled shows CANCELLED, no position", [r.body.data.state, r.body.data.position], ["CANCELLED", null]);
  r=await call(1104); eq("behind a cancelled-but-waiting entry, Call Next still reaches it first -> position 3", [r.body.data.state, r.body.data.position, r.body.data.ahead], ["WAITING",3,2]);
  r=await call(1105); eq("not checked in", [r.body.data.state, r.body.data.queue], ["NOT_CHECKED_IN", null]);
  r=await call(1106); eq("in consultation", r.body.data.state, "IN_CONSULTATION");
  r=await call(1107); eq("completed", r.body.data.state, "COMPLETED");
  r=await call(1108); eq("stale CALLED + IN_PROGRESS -> IN_CONSULTATION", r.body.data.state, "IN_CONSULTATION");
  r=await call(1109); eq("two visits: waiting one shown, other counted", [r.body.data.state, r.body.data.appointment.id, r.body.data.otherVisitsToday, r.body.data.position], ["WAITING", 9.5, 1, 4]);
  r=await call(1999); eq("no patient profile -> 404", r.status, 404);
  r=await call(undefined); eq("no user -> 401", r.status, 401);
  r=await call(1102); eq("no other patient data in payload", /"patient"|101|103|104/.test(JSON.stringify(Object.keys(r.body.data))), false);
  console.log(fail? `${fail} FAILED` : "ALL PASS");
})();