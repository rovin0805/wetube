import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config(); //.env 파일 안에 있는 정보 불러옴

mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useFindAndModify: false,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

const handleOpen = () => console.log("✔ Connected to DB");
const handleError = (error) => console.log(`Error on DB connection : ${error}`);

db.once("open", handleOpen);
db.on("error", handleError);
