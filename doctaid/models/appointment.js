const mongoose = require("mongoose");
const Doctor = require("./doctor");
const Patient = require("./patient");
const Schema = mongoose.Schema;

const appointmentSchema = new Schema({
  body: String,
  date: String,
  time: String,
  link: String,
  records: [
    {
      type: String,
    },
  ],
  doctor: {
    type: Schema.Types.ObjectId,
    ref: "Doctor",
  },
  patient: {
    type: Schema.Types.ObjectId,
    ref: "Patient",
  },
});

module.exports = mongoose.model("Appointment", appointmentSchema);
