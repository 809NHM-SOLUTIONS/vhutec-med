const express = require("express");

const {
    assignDoctorToDepartment,
    getDoctorDepartments,
    getDoctorDepartment,
    removeDoctorFromDepartment
} = require("../controllers/doctorDepartmentController");

const router = express.Router();

router.get("/", getDoctorDepartments);

router.get(
    "/:doctorId/:departmentId",
    getDoctorDepartment
);

router.post("/", assignDoctorToDepartment);

router.delete(
    "/:doctorId/:departmentId",
    removeDoctorFromDepartment
);

module.exports = router;