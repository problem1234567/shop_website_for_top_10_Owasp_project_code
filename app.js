const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const GoogleAuthenticator = require('passport-2fa-totp').GoogeAuthenticator;
const TwoFAStartegy = require('passport-2fa-totp').Strategy;

const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");


const app = express();
app.use(bodyParser.json({
    limit: '50mb'
}));
app.use(bodyParser.urlencoded({
    limit: '50mb',
    extended: false,
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

app.use(express.static(path.join(__dirname, 'build')));

// ----------------------Database-------------------------------------------------------------------------
// mongoose.connect('mongodb+srv://admin-hieu:text123@cluster0-pyfc0.mongodb.net/shopDB?retryWrites=true&w=majority', {
//     useNewUrlParser: true,useUnifiedTopology: true
// });

mongoose.connect('mongodb://localhost:27017/shopDB', {
    useNewUrlParser: true,useUnifiedTopology: true
});


mongoose.set('useCreateIndex', true);
const kbaShema = new mongoose.Schema({
    ask:String,
    answer:String
});

const userShema = new mongoose.Schema({
    username: String,
    priority: Number,
    KBA:kbaShema,
    password: String,
    secret:String
});

// add more feature add hased password and salt value
userShema.plugin(passportLocalMongoose);

const User = mongoose.model('user', userShema);
const Kba = mongoose.model('kba',kbaShema);
// -------------------------------------------------------------------------------------------------------

passport.use(User.createStrategy());
passport.use(new TwoFAStartegy(function (username, password, done) {
    // 1st step verification: username and password
    User.findOne({ username: username }, function (err, user) {
        if (err) { return done(err); }
        if (!user) { return done(null, false); }
        if (!user.authenticate(password)) { return done(null, false); }
        console.log(user);
        return done(null, user);
    });
}, function (user, done) {
    // 2nd step verification: TOTP code from Google Authenticator

    if (!user.secret) {
        done(new Error("Google Authenticator is not setup yet."));
    } else {
        // Google Authenticator uses 30 seconds key period
        // https://github.com/google/google-authenticator/wiki/Key-Uri-Format
        console.log("Hello");
        var secret = GoogleAuthenticator.decodeSecret(user.secret);
        done(null, secret, 30);
    }
}));



passport.serializeUser(function (user, done) {
    done(null, user.id);
});


passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    })
})

// passport.serializeUser(function(user, done) {
//     done(null, user); 
// });

// passport.deserializeUser(function(user, done) {
//     done(null, user); 
// });

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

app.post('/login',function(req,res){

    const user = new User({
        username: req.body.username,
        password: req.body.password,
        priority: req.body.username == 'admin' ? 0 : 1
    });

    // passport.authenticate('2fa-totp')(req,res,function(){
    //     res.send(JSON.stringify("OK"));
    // })
    
    req.login(user, function (err) {
        if (err) {
            console.log(err);
            res.send(JSON.stringify("Failed"));
        } else {
            passport.authenticate("2fa-totp")(req, res, function () {
                res.send(JSON.stringify("OK"));
            });
        }
    })
});

app.post('/register',function(req,res){
    const kba = new Kba({
        ask:'Where did you meet your spouse?',
        answer:"in high school in their hometown of wasilla, alaska"
    });
    kba.save();
    const GooObj = GoogleAuthenticator.register(req.body.username);
    User.register({
        username:req.body.username,
        secret:GooObj.secret,
        KBA: kba,
        priority: req.body.username == 'admin' ? 0 : 1
    },req.body.password, function(err,user){
        if(err){
            res.send(JSON.stringify('failed'));
            console.log(err);
        } else {
            passport.authenticate("local")(req,res,function(){
                res.send(JSON.stringify(GooObj.qr));
            })
        }
    })
});

app.post('/checkAuth',function(req,res){
    if (req.isAuthenticated()){
        res.send(JSON.stringify("OK"));
    } else {
        res.send(JSON.stringify("ERROR"));
    } 
});

app.post('/logout',function(req,res){
    req.logout();
    req.session.destroy(function (err) {
        if (err) { return next(err); }
    });
});

app.post('/forgotpassword',function(req,res){
    const {username,answer} = req.body;
    User.findOne({username:username},function(err,user){
        if(!err){
            if(user.KBA.answer===answer){
                res.send(JSON.stringify("OK"));
            } else {
                res.send(JSON.stringify("ERROR"));
            }
        }
    })
});

app.post('/resetpassword',function(req,res){
    const {username, password} = req.body;
    User.findOneAndDelete({username:username},function(err){
        if(err){
            console.log(err);
            return ;
        }
    });
    const kba = new Kba({
        ask:'Where did you meet your spouse?',
        answer:"in high school in their hometown of wasilla, alaska"
    });

    kba.save();
    User.register({
        username:username,
        KBA: kba,
        priority: username == 'admin' ? 0 : 1
    },password, function(err,user){
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

app.listen(process.env.PORT || 5000, () => {
    console.log("server running ....");
});