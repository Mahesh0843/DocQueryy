const express = require("express");
const connectDb=require("./config/database");
const dotenv=require("dotenv");
const app=express();
const cookieparser=require("cookie-parser");
dotenv.config();

const cors = require("cors");

const FRONTEND_URL = "http://localhost:3000";

app.use(express.json());
app.use(cookieparser());

app.use(cors({ origin: FRONTEND_URL, credentials: true }));

// Simple preflight handling for older path-to-regexp versions
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', FRONTEND_URL);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    return res.sendStatus(200);
  }
  next();
});

const authRouter = require("./routes/auth");
const documentRouter = require("./routes/document");
const Ragrouter = require("./routes/rag");


app.use("/", authRouter);
app.use("/", documentRouter);
app.use("/", Ragrouter);

connectDb()
  .then(()=>{
    console.log("Database connected!!");
    console.log('Database URL:', process.env.DATABASE_URL);
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err)=>{
    console.error("MongoDb connection failed!");
  });