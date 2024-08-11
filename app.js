const express = require('express');
const app = express();
const usermodel = require('./models/user');
const postmodel = require('./models/post');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const user = require('./models/user');
const post = require('./models/post');

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/', (req, res) => {
    res.render("index");
});

app.get('/login', (req, res) => {
    res.render("login");
});

app.get('/profile', isloggedIn, async (req, res) => {
    let user=await usermodel.findOne({email:req.user.email}).populate("posts")

    res.render("profile",{user});
});

app.get("/like/:id", isloggedIn, async (req, res) => {
    let post=await postmodel.findOne({_id:req.params.id}).populate("user")

    if(post.likes.indexOf(req.user.userid) === -1){
        post.likes.push(req.user.userid) 
    }
    else{
        post.likes.splice(post.likes.indexOf(req.user.userid),1)
    }
    await post.save()
    res.redirect("/profile");
});

app.post("/post",isloggedIn,async (req,res)=>{
    let user=await usermodel.findOne({email:req.user.email})
    let {content}=req.body;
    let post = await postmodel.create({
        user:user._id,
        content:content
    })
    user.posts.push(post._id)
    await user.save()
    res.redirect("/profile")
})
app.get('/logout', (req, res) => {
    res.cookie("token", "", { expires: new Date(0) });  // Ensuring the cookie is expired
    res.redirect("/login");
});

app.post('/login', async (req, res) => {
    let { email, password } = req.body;
    let user = await usermodel.findOne({ email });
    if (!user) {
        return res.status(500).send("Something went wrong");
    }
    bcrypt.compare(password, user.password, (err, result) => {
        if (result) {
            let token = jwt.sign({ email: email, userid: user._id }, "shhhh");
            res.cookie("token", token);
            res.status(200).redirect("/profile");
        } else {
            res.redirect("/login");
        }
    });
});

app.post('/register', async (req, res) => {
    let { email, password, username, name, age } = req.body;
    let user = await usermodel.findOne({ email });
    if (user) {
        return res.status(500).send("User already registered");
    }
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            let user = await usermodel.create({
                username,
                email,
                age,
                name,
                password: hash
            });
            let token = jwt.sign({ email: email, userid: user._id }, "shhhh");
            res.cookie("token", token);
            // res.send("Registered");
            res.redirect("/profile")
        });
    });
});

function isloggedIn(req, res, next) {
    if (req.cookies.token=="") {
        return res.redirect("/login");
    }
    try {
        let data = jwt.verify(req.cookies.token, "shhhh");
        req.user = data;
        next();
    } catch (err) {
        return res.redirect("/login");
    }

}

app.listen(3000, function () {
    console.log("Server has been started");
});
