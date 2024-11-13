const express = require('express');
const app = express();
const userModel =require("./models/user");
const postModel =require("./models/post");
const bcrypt = require('bcrypt');
const jwt= require ("jsonwebtoken"); 
const cookieParser= require('cookie-parser');
const multer =require("./config/multerconfig");
const path= require('path');


app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.set("view engine" , "ejs" );
app.use(cookieParser());
app.use(express.static(path.join(__dirname,"public")))

app.get("/" , (req,res) => {
    res.render("index");
})

app.post("/register", async (req,res)=>{

    let {name, username, age,password, email} = req.body;
    
    let user= await userModel.findOne({email});
    if(user) return res.status(500).send("User already Registered");

    bcrypt.genSalt(10,(err,salt)=>{
        bcrypt.hash(password, salt ,async (err,hash) => {
            let user = await userModel.create({
                username,
                name,
                age,
                email,
                password:hash
        
            });

            let token = jwt.sign({email: email ,userid: user._id}, "Secret");
            res.cookie( "token" , token);
            res.redirect("/profile");
        } )
    })

});

app.get("/login" , (req,res) => { 
    res.render("login");
})

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

// app.post("/edit/:id" ,isLoggedIn, async(req,res)=>{
//     let id = req.params.id;
//     await postModel.findOneAndUpdate({_id: id},{content: content},{new:true}) ;
    
//     res.redirect("/profile")
    
// })

app.post("/update/:id" ,async (req,res)=>{
    let post = await postModel.findOneAndUpdate({_id:req.params.id} ,{content:req.body.content});
    res.redirect("/profile")

})

app.post("/edit/:id", isLoggedIn, async (req, res) => {
    const postId = req.params.id;
    const { content } = req.body; // Retrieve the updated content from the request body

    try {
        // Update the content of the existing post by ID
        const updatedPost = await postModel.findByIdAndUpdate(
            postId,
            { content }, // Set the new content
            { new: true } // Return the updated document
        );

        if (!updatedPost) {
            return res.status(404).send("Post not found");
        }

        res.redirect("/profile"); // Redirect back to the profile after successful update
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
app.post("/login", async (req,res)=>{
    let { password, email} = req.body;
    
    let user= await userModel.findOne({email});
    if(!user) return res.status(500).send("Something went wrong");

    bcrypt.compare(password,user.password , (err,result)=>{
        if(result) {
            let token = jwt.sign({email: email ,userid: user._id}, "Secret");
            res.cookie( "token" , token);
            res.status(200).redirect("/profile")
        }
        else {
            res.redirect("/login")
        }
    })

    

});



function isLoggedIn(req,res,next){
     if(req.cookies.token === "") res.redirect("/login");
     else{
        let data = jwt.verify(req.cookies.token,"Secret");
        req.user = data
     }
     next(); 
}


app.listen(3000);