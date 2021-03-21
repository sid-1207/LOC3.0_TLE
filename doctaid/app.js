if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const express = require("express");
const app = express();
const session = require("express-session");
const path = require("path");
const mongoose = require("mongoose");
const ejsMate = require("ejs-mate");
const methodOverride = require("method-override");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user");
const Doctor = require("./models/doctor");
const Patient = require("./models/patient");
const Appointment = require("./models/appointment");
const { isLoggedIn } = require("./middleware");

const multer = require("multer");
const { storage } = require("./cloudinary");
const upload = multer({ storage });

const http = require("http");
const socketio = require("socket.io");
const formatMessage = require("./models/chat");
const mongoClient = require("mongodb").MongoClient;
const dbname = "chatApp";
const chatCollection = "chats"; //collection to store all chats
const userCollection = "onlineUsers";
const port = 3000;
const database = "mongodb://localhost:27017/";
const server = http.createServer(app);
const io = socketio(server);

var axios = require("axios").default;
var options = {
  method: "GET",
  url:
    "https://vaccovid-coronavirus-vaccine-and-treatment-tracker.p.rapidapi.com/api/news/get-health-news/1",
  headers: {
    "x-rapidapi-key": "3ef3970263msh517c5da37cfb184p129032jsnb15e8303f945",
    "x-rapidapi-host":
      "vaccovid-coronavirus-vaccine-and-treatment-tracker.p.rapidapi.com",
  },
};

mongoose.connect("mongodb://localhost:27017/DoctAid", {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Database connected");
});

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
const sessionConfig = {
  name: "session",
  secret: "thisshouldbeabettersecret!",
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
};

app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  //console.log(req.session);
  res.locals.currentUser = req.user;
  next();
});
//-----------------------------------------------------------------------VC
//const server = require("http").Server(app);
//const io = require("socket.io")(server);
const { v4: uuidv4 } = require("uuid");
const { ExpressPeerServer } = require("peer");
const peer = ExpressPeerServer(server, {
  debug: true,
});
app.use("/peerjs", peer);

//io.on("connection", (socket) => {
 // socket.on("newUser", (id, room) => {
 //   socket.join(room);
 //   socket.to(room).broadcast.emit("userJoined", id);
  //  socket.on('disconnect' , ()=>{
 //     socket.to(room).broadcast.emit('userDisconnect' , id);
 // });
 // });
//});

/// --------------------------------------------------chat
app.post("/chat", async (req, res) => {
  const { doctorusername,patientusername } = req.body;
  const username2 = req.user.username;
  if(username2==doctorusername)
  {
  const body = {
    sender: username2,
    reciever: patientusername,
  };
  res.render("chat", { body });
}
else{
  const body = {
    sender: username2,
    reciever: doctorusername,
  };
  res.render("chat", { body });
}
 
});

//============================================================================================
//=========================================ROUTES=============================================
//============================================================================================

app.get("/", (req, res) => {
  res.render("landing");
});

app.get("/home", isLoggedIn, async (req, res) => {
  const userId = req.user._id;
  var appointment1 = [];
  const user = await User.findById(userId);
  const username = user.username;
  if (user.isDoctor) {
    const doctor = await Doctor.find({ username });
    const appointments = await Appointment.find({})
      .populate({ path: "doctor", match: { username } })
      .populate("patient");
    for (let appointment of appointments) {
      if (appointment.doctor) {
        appointment1.push(appointment);
      }
    }
    //console.log(appointment1);
  } else {
    const patient = await Patient.find({ username });
    const appointments = await Appointment.find({})
      .populate({
        path: "patient",
        match: { username },
      })
      .populate("doctor");
    for (let appointment of appointments) {
      if (appointment.patient) {
        appointment1.push(appointment);
      }
    }
    console.log("---------------------------------------APP");
    console.log(appointment1);
  }
  axios
    .request(options)
    .then(function (response) {
      news = response.data.news;
      // for (i = 0; i < news.length; i++) {
      //   console.log(news[i].title);
      //   console.log(news[i].link);
      //   console.log(news[i].urlToImage);
      //   console.log(news[i].content);
      // }
      //console.log(news);
      res.render("home", { apt: appointment1, news });
    })
    .catch(function (error) {
      console.error(error);
    });
});

app.get("/finddoctors", async (req, res) => {
  const doctors = await Doctor.find({});
  res.render("finddoctors", { doctors: doctors });
});
app.post("/finddoctors", async (req, res) => {
  console.log(req.body.search);
  const search = req.body.search;
  const doctors = await Doctor.find({ username: search });
  console.log(doctors);
  res.render("finddoctors", { doctors: doctors });
});
app.get("/doctordetails/:id", function (req, res) {
  Doctor.findById(req.params.id, function (err, doc) {
    if (err) {
      consolde.log(err);
    } else {
      res.render("doctordetails", { doc: doc });
    }
  });
});

//to make appointment form
app.get("/doctor/:id/makeappointment", isLoggedIn, function (req, res) {
  Doctor.findById(req.params.id, function (err, fdoc) {
    if (err) {
      console.log(err);
    } else {
      res.render("doctors/Appointment", { doc: fdoc });
    }
  });
});

// DB me entry dalo appotmnt ka.
app.post(
  "/doctor/:id/makeappointment",
  upload.single("report"),
  isLoggedIn,
  async (req, res, next) => {
    const data = req.params;
    //console.log(data);
    var date = req.body.date;
    var time = req.body.time;
    var body = req.body.body;
    const userId = req.user._id;
    const doctor = await Doctor.findById(req.params.id);
    const user = await User.findById(userId);
    const username = user.username;
    const patient = await Patient.find({ username });
    var link = uuidv4().toString();
    console.log("-------------------------------------------LINK");
    console.log(link);
    const appointment = new Appointment({
      body,
      date,
      time,
      link,
      doctor: doctor,
      patient: patient[0],
    });
    await appointment.save();
    res.redirect("/home");
  }
);

app.delete("/delete/:appointmentId", isLoggedIn, async (req, res) => {
  const { appointmentId } = req.params;
  const userId = req.user._id;
  await User.findByIdAndUpdate(userId, {
    $pull: { appointment: appointmentId },
  });
  await Appointment.findByIdAndDelete(appointmentId);
  res.redirect("/home");
});

//------------------------------------------------------------------------------------------ AUTH

//Register form
app.get("/register", (req, res) => {
  const logger = req.query;
  if (logger.user) {
    res.render("users/register-doctor");
  } else {
    res.render("users/register");
  }
});
//Login
app.get("/login", async (req, res) => {
  res.render("users/login");
});

//register as doctor
app.post("/register-doctor", async (req, res) => {
  try {
    const {
      email,
      username,
      password,
      specialisation,
      clinicAddress,
      contact,
    } = req.body;
    const user = new Doctor({
      email,
      username,
      contact,
      specialisation,
      clinicAddress,
    });
    const registered = await Doctor.register(user, password);
    const user1 = new User({ email, username, isDoctor: true });
    const registeredUser = await User.register(user1, password);
    req.login(registeredUser, (err) => {
      if (err) return next(err);

      res.redirect("/home");
    });
  } catch (e) {
    res.redirect("/register");
  }
});
//register
app.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const user = new Patient({ email, username });
    const registered = await Patient.register(user, password);
    const user1 = new User({ email, username, isDoctor: false });
    const registeredUser = await User.register(user1, password);
    req.login(registeredUser, (err) => {
      if (err) return next(err);

      res.redirect("/home");
    });
  } catch (e) {
    res.redirect("/register");
  }
});
//login
app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/login",
  }),
  (req, res) => {
    res.redirect("/home");
  }
);
//logout
app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});
app.get("/:room", (req, res) => {
  res.render("index", { RoomId: req.params.room });
});

//====================================================================================
//////////////// socket
  io.on("connection", (socket) => {
    console.log("New User Logged In with ID " + socket.id);

  //Collect message and insert into database
  socket.on("chatMessage", (data) => {
  //recieves message from client-end along with sender's and reciever's details
       var dataElement = formatMessage(data);
       mongoClient.connect(database, (err, db) => {
        if (err) throw err;
        else {
           var onlineUsers = db.db(dbname).collection(userCollection);
          var chat = db.db(dbname).collection(chatCollection);
         chat.insertOne(dataElement, (err, res) => {
             //inserts message to into the database
             if (err) throw err;
            socket.emit("message", dataElement); //emits message back to the user for display
          });
           onlineUsers.findOne({ name: data.toUser }, (err, res) => {
             //checks if the recipient of the message is online
             if (err) throw err;
            if (res != null)
               //if the recipient is found online, the message is emmitted to him/her
             socket.to(res.ID).emit("message", dataElement);
           });
         }
         db.close();
     });
     });

   socket.on("userDetails", (data) => {
      //checks if a new user has logged in and recieves the established chat details
       mongoClient.connect(database, (err, db) => {
         if (err) throw err;
         else {
          var onlineUser = {
           //forms JSON object for the user details
           ID: socket.id,
           name: data.fromUser,
         };
          var currentCollection = db.db(dbname).collection(chatCollection);
          var online = db.db(dbname).collection(userCollection);
          online.insertOne(onlineUser, (err, res) => {
            //inserts the logged in user to the collection of online users
           if (err) throw err;
           console.log(onlineUser.name + " is online...");
         });
          currentCollection
            .find(
              {
                //finds the entire chat history between the two people
                 from: { $in: [data.fromUser, data.toUser] },
                 to: { $in: [data.fromUser, data.toUser] },
              },
               { projection: { _id: 0 } }
            )
             .toArray((err, res) => {
              if (err) throw err;
               else {
                 //console.log(res);
                 socket.emit("output", res); //emits the entire chat history to client
              }
            });
         }
         db.close();
       });
     });
     var userID = socket.id;
     socket.on("disconnect", () => {
      mongoClient.connect(database, function (err, db) {
         if (err) throw err;
        var onlineUsers = db.db(dbname).collection(userCollection);
       var myquery = { ID: userID };
        onlineUsers.deleteOne(myquery, function (err, res) {
           //if a user has disconnected, he/she is removed from the online users' collection
           if (err) throw err;
           console.log("User " + userID + "went offline...");
          db.close();
        });
       });
     });
   });
//---------------------------------------------------------------------------------

server.listen(port, () => {
  console.log(`Chat Server listening to port ${port}...`);
});
