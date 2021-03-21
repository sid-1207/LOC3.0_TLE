const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const PatientSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
});

PatientSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("Patient", PatientSchema);
