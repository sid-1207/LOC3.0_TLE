const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const DoctorSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  clinicAddress: {
    type: String,
    required: true,
  },
  contact: {
    type: Number,
    required: true,
  },
  specialisation: {
    type: String,
    required: true,
    lowercase: true,
  },
});

DoctorSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("Doctor", DoctorSchema);
