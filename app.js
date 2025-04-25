const express = require('express');
const app = express();
const userModel =require("./models/user");
const postModel =require("./models/post");
const bcrypt = require('bcrypt');
const jwt= require ("jsonwebtoken"); 
const cookieParser= require('cookie-parser');
const path= require('path');

require('dotenv').config();

const jwtSecret = process.env.JWT_SECRET;
const PORT = process.env.PORT;

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.set("view engine" , "ejs" );
app.use(cookieParser());
app.use(express.static(path.join(__dirname,"public")))

app.get("/" , (req,res) => {
    res.render("index", { alertMessage: null });
})


app.post("/register", async (req,res)=>{

    let {name, username, age,password, email} = req.body;
    
    let user= await userModel.findOne({email});
    if (user) {
        return res.render('index', { alertMessage: 'User already registered' });
      }
      

    bcrypt.genSalt(10,(err,salt)=>{
        bcrypt.hash(password, salt ,async (err,hash) => {
            let user = await userModel.create({
                username,
                name,
                age,
                email,
                password:hash
        
            });

            let token = jwt.sign({email: email ,userid: user._id}, jwtSecret);
            res.cookie( "token" , token);
            res.redirect("/profile");
        } )
    })

});

app.get("/login" , (req,res) => { 
    res.render("login", { alertMessage: null });
});


app.post("/login", async (req,res)=>{
    let { password, email} = req.body;
    
    let user= await userModel.findOne({email});
    if(!user) return res.render("login" , { alertMessage :  "No User" });

    bcrypt.compare(password,user.password , (err,result)=>{
        if(result) {
            let token = jwt.sign({email: email ,userid: user._id}, jwtSecret);
            res.cookie( "token" , token);
            res.status(200).redirect("/profile")
        }
        else {
            res.render("login" , { alertMessage :  "Wrong Credentials" });
        }
    })

    

});

app.get("/profile" , isLoggedIn, async (req,res) =>{ 
    let user= await userModel.findOne({email: req.user.email}).populate("posts");
    
    res.render("profile", {user});
})

app.get("/like/:id" , isLoggedIn , async (req,res) =>{
    let post = await postModel.findOne({_id : req.params.id}).populate("user");

    if(post.likes.indexOf(req.user.userid) === -1){
        post.likes.push(req.user.userid);
    }
    else{
        post.likes.splice (post.likes.indexOf(req.user.userid),1 );
    }
    
    post.save();
    res.redirect("/profile");

})

app.get("/edit/:id" , isLoggedIn , async (req,res) =>{
    let post = await postModel.findOne({_id : req.params.id}).populate("user");

    let user=post.user;
    res.render("edit",{post,user});

})


app.post("/update/:id" ,async (req,res)=>{
    let post = await postModel.findOneAndUpdate({_id:req.params.id} ,{content:req.body.content});
    res.redirect("/profile")

})

app.get("/allposts", isLoggedIn, async (req, res) => {
    try {
        let curruser = await userModel.findOne({ email: req.user.email });
        let allposts = await postModel.find().populate("user");
        allposts = allposts.filter(post => post.user); // Remove posts with missing user

        res.render("posts", { allposts, curruser });
    } catch (err) {
        console.error(err);
        res.status(500).send("An error occurred");
    }
});




app.post("/edit/:id", isLoggedIn, async (req, res) => {
    const postId = req.params.id;
    const { content } = req.body; 

    try {
        
        const updatedPost = await postModel.findByIdAndUpdate(
            postId,
            { content }, 
            { new: true } 
        );

        if (!updatedPost) {
            return res.status(404).send("Post not found");
        }

        res.redirect("/profile"); 
    } catch (error) {
        console.error("Error updating post:", error);
        res.status(500).send("Error updating post");
    }
});



app.post("/post" ,isLoggedIn, async(req,res)=>{
    let user= await userModel.findOne({email:req.user.email});

    let {content} = req.body;

    let post = await postModel.create({
        user:user._id,
        content
    })
    user.posts.push(post._id);
    await user.save();
    res.redirect("/profile")
    
})

app.get("/logout" , (req,res) => {
    res.cookie("token" , "");
    res.redirect("/login");
}) 

app.get("/delete/:id",async (req,res) =>{
let id=req.params.id;

await postModel.findOneAndDelete({_id:id});
res.redirect("/profile");

})




function isLoggedIn(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        return res.redirect("/login");
    }

    try {
        const data = jwt.verify(token, "Secret");
        req.user = data;
        next();
    } catch (err) {
        console.error("JWT verification failed:", err);
        res.redirect("/login");
    }
}



app.listen(PORT,()=>{
    console.log("Running in PORT");
});