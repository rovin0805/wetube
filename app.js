import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import passport from "passport";
import mongoose from "mongoose";
import session from "express-session";
import MongoStore from "connect-mongo";
import { localsMiddleware } from "./middlewares";
import routes from "./routes";
import userRouter from "./routers/userRouter";
import videoRouter from "./routers/videoRouter";
import globalRouter from "./routers/globalRouter";
import apiRouter from "./routers/apiRouter";
import "./passport";

const app = express();

const CokieStore = MongoStore(session);

//middleware
app.use(helmet()); //보안관련. application이 더 안전하도록 해줌
app.set("view engine", "pug");
app.use("/uploads", express.static("uploads")); // directory에서 file을 보내줌
app.use("/static", express.static("static"));
app.use(cookieParser()); //cookies를 전달받아서 쓸 수 있도록 만들어줌. 사용자 인증 같은 곳에서 쿠키 검사할 때 필요.
app.use(bodyParser.json()); //사용자가 웹사이트로 전달하는 정보들을 검사. request 정보에서 form이나 json 형태로 된 body를 검사함
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan("dev")); //application에서 발생하는 모든 일들을 logging
app.use(
  session({
    secret: process.env.COOKIE_SECRET,
    resave: true,
    saveUninitialized: false,
    store: new CokieStore({ mongooseConnection: mongoose.connection }),
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(localsMiddleware); //local변수를 global변수로 템플릿에서 사용할 수 있도록 해줌

app.use(routes.home, globalRouter);
app.use(routes.users, userRouter);
app.use(routes.videos, videoRouter);
app.use(routes.api, apiRouter);

export default app;
