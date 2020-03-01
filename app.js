const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');

const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");


const app = express();
app.use(bodyParser.json({
    limit: '50mb'
}));
app.use(bodyParser.urlencoded({
    limit: '50mb',
    extended: true,
    parameterLimit: 50000
}));


// use cors
app.use((req, res, next) => {
    res.append('Access-Control-Allow-Origin', ["http://localhost:3000"]);
    res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.append("Access-Control-Allow-Credentials", 'true');
    res.append('Access-Control-Allow-Headers', 'Content-Type,Cache-Control');
    next();
});

// app.use(cors({
//     'allowedHeaders': ['sessionId', 'Content-Type','Cache'],
//     'exposedHeaders': ['sessionId'],
//     'credentials': true,
//     'origin': ['http://localhost:3000'], // here goes Frontend IP
// }))

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(express.static(path.join(__dirname, 'build')));

// ----------------------Database-------------------------------------------------------------------------
mongoose.connect('mongodb+srv://admin-hieu:text123@cluster0-pyfc0.mongodb.net/shopDB?retryWrites=true&w=majority', {
    useNewUrlParser: true,useUnifiedTopology: true
});

// mongoose.connect('mongodb://localhost:27017/shopDB', {
//     useNewUrlParser: true,useUnifiedTopology: true
// });


mongoose.set('useCreateIndex', true);
const userShema = new mongoose.Schema({
    username: String,
    priority: Number,
    password: String,
});

// add more feature add hased password and salt value
userShema.plugin(passportLocalMongoose);

const User = mongoose.model('user', userShema);
// -------------------------------------------------------------------------------------------------------

passport.use(User.createStrategy());
passport.serializeUser(function (user, done) {
    done(null, user.id);
});


passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    })
})

app.use(session({
    secret: 'hehehe',
    resave: false,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

app.get('/*', function (req, res) {
       res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.post('/login', function (req, res) {
    console.log(req.body);
    const user = new User({
        username: req.body.username,
        password: req.body.password,
        priority: req.body.username == 'admin' ? 0 : 1
    });
    
    req.login(user, function (err) {
        if (err) {
            console.log(err);
            res.send(JSON.stringify("Failed"));
        } else {
            passport.authenticate("local")(req, res, function () {
                res.send(JSON.stringify("OK"));
            });
        }
    })
});

app.post('/register',function(req,res){
    User.register({
        username:req.body.username
    },req.body.password, function(err,user){
        if(err){
            res.send(JSON.stringify('failed'));
            console.log(err);
        } else {
            passport.authenticate("local")(req,res,function(){
                res.send(JSON.stringify("OK"));
            })
        }
    })
});

app.get('/checkAuth',function(req,res){
    console.log('authenticate....');
    if (req.isAuthenticated()){
        res.send(JSON.stringify("OK"));
    } else {
        res.send(JSON.stringify("ERROR"));
    } 
});

app.get('/logout',function(req,res){
    console.log("logout here");
    req.logout();
    req.session.destroy(function (err) {
        if (err) { return next(err); }
    });
});

app.listen(process.env.PORT || 5000, () => {
    console.log("server running ....");
});