const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

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
    res.append('Access-Control-Allow-Origin', ['*']);
    res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.append('Access-Control-Allow-Headers', 'Content-Type');
    next();
});
app.use(bodyParser.urlencoded({
    extended: true
}));

// ----------------------Database-------------------------------------------------------------------------
mongoose.connect('mongodb://localhost:27017/shopDB', {
    useNewUrlParser: true,useUnifiedTopology: true
});


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

app.post('/login', function (req, res) {
    const user = new User({
        name: req.body.username,
        password: req.body.password,
        priority: req.body.username == 'admin' ? 0 : 1
    });

    req.login(user, function (err) {
        if (err) {
            console.log(err);
            res.send(JSON.stringify("Failed"));
        } else {
            passport.authenticate("local")(req, res, function () {
                res.send(JSON.stringify("login roi nha"));
            })
        }
    })
});

app.post('/register',function(req,res){
    User.register({
        username:req.body.username
    },req.body.password, function(err,user){
        if(err){
            res.send(JSON.stringify('failed'));
            console.log("error me roi");
            console.log(err);
        } else {
            passport.authenticate("local")(req,res,function(){
                res.send(JSON.stringify("OK"));
            })
        }
    })
});

app.get('/checkAuth',function(req,res){
    if (req.isAuthenticated()){
        res.send("OK");
    } else {
        res.send("ERROR");
    } 
})

app.listen(5000 || process.env.PORT, () => {
    console.log("server running ....");
});