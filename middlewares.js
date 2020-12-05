import routes from "./routes";
import multer from "multer"; // 파일의 location url을 알려줌
import multerS3 from "multer-s3";
import aws from "aws-sdk";

export const s3 = new aws.S3({
  accessKeyId: process.env.AWS_KEY,
  secretAccessKey: process.env.AWS_PRIVATE_KEY,
  region: "ap-northeast-1",
});

const multerVideo = multer({
  storage: multerS3({
    s3,
    acl: "public-read",
    bucket: "wetubenomad/video",
  }),
});

const multerAvatar = multer({
  storage: multerS3({
    s3,
    acl: "public-read",
    bucket: "wetubenomad/avatar",
  }),
});

export const uploadVideo = multerVideo.single("videoFile"); //single=오직 하나의 파일만 업로드
export const uploadAvatar = multerAvatar.single("avatar");

//locals에 로컬 변수 저장시, 템플릿에서 사용 가능
export const localsMiddleware = (req, res, next) => {
  res.locals.siteName = "WeTube";
  res.locals.routes = routes;
  res.locals.loggedUser = req.user || null;
  next();
};

export const onlyPublic = (req, res, next) => {
  if (req.user) {
    res.redirect(routes.home);
  } else {
    next();
  }
};

export const onlyPrivate = (req, res, next) => {
  if (req.user) {
    next();
  } else {
    res.redirect(routes.home);
  }
};
