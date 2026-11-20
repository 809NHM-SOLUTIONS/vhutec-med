"use strict";

const { z } = require("zod");

const nameField = (label) =>
    z
        .string()
        .trim()
        .min(2, `${label} must be at least 2 characters`)
        .max(50, `${label} must be at most 50 characters`)
        .regex(
            /^\p{L}[\p{L}\s'’.-]*$/u,
            `${label} may only contain letters, spaces, hyphens and apostrophes`
        );

// Spaces and dashes are allowed while typing and removed before saving,
// e.g. "082 123-4567" is stored as "0821234567".
const phoneField = z
    .string()
    .trim()
    .transform((value) => value.replace(/[\s-]/g, ""))
    .pipe(
        z
            .string()
            .regex(/^\+?\d{10,15}$/, "Please provide a valid phone number")
    );

const addressField = z
    .string()
    .trim()
    .min(5, "Address must be at least 5 characters")
    .max(200, "Address must be at most 200 characters");

// Patients may change only these four fields. Everything else (id number,
// date of birth, patient number, email, userId, ...) is rejected outright
// by the strict object, so nothing can be slipped in through the request body.
const updateMyProfileSchema = z
    .strictObject({
        firstName: nameField("First name"),
        lastName: nameField("Last name"),
        phone: phoneField,
        address: addressField
    })
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: "Provide at least one field to update"
    });

const formatZodIssues = (issues) =>
    issues.map((issue) => {
        if (issue.code === "unrecognized_keys") {
            const keys = issue.keys.join(", ");
            return {
                field: keys,
                message: `${keys} cannot be changed here`
            };
        }

        return {
            field: issue.path.join("."),
            message: issue.message
        };
    });

module.exports = {
    updateMyProfileSchema,
    formatZodIssues
};