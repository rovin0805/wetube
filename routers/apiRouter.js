import express from "express";
import routes from "../routes";
import {
  postRegisterView,
  postAddComment,
} from "../controllers/videoController";

const apiRouter = express.Router();

// post request : db 내용을 변경해야할 때
// get request : db 내용을 변경할 필요가 없을 때
apiRouter.post(routes.registerView, postRegisterView);
apiRouter.post(routes.addComment, postAddComment);

export default apiRouter;
