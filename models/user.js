const mongoose =require('mongoose');
require('dotenv').config();

const mongoURI = process.env.MONGO_URI;


mongoose.connect(mongoURI)
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// mongoose.connect("mongodb+srv://khushalsharma122:UB0irbMOXbBAK4QK@cluster0.v8rvv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");


const userSchema= mongoose.Schema({
    username:String,
    name: String,
    age: Number,
    password: String,
    email: String,
    profilepic:{
        type:String,
        default:"default.webp"

    },
    posts:[{
        type: mongoose.Schema.Types.ObjectId,
        ref:"post"
    }]
})

module.exports = mongoose.model('user' , userSchema);