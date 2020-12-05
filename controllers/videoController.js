import routes from "../routes"; // default export : no { }
import Video from "../models/Video";
import Comment from "../models/Comment";
import { s3 } from "../middlewares"; // export 해준 middleware의 s3를 import

export const home = async (req, res) => {
  try {
    const videos = await Video.find({}).sort({ _id: -1 }); //await는 일단 에러가 생겨도 끝나기만 하면 ok
    res.render("home", { pageTitle: "Home", videos });
  } catch (error) {
    console.log(error);
    res.render("home", { pageTitle: "Home", videos: [] });
    //render 첫 번째 인자 = 템플릿, 두 번째 = 템플릿에 추가할 정보가 담긴 객체
  }
};

export const search = async (req, res) => {
  const {
    query: { term: searchingBy },
  } = req; // const searchingBy = req.query.term;
  let videos = [];
  try {
    videos = await Video.find({
      title: { $regex: searchingBy, $options: "i" },
    }); //regular expression, insensitive(대소문자 구분x)
  } catch (error) {
    res.redirect(routes.home);
  }
  res.render("search", { pageTitle: "Search", searchingBy, videos });
};

export const getUpload = (req, res) =>
  res.render("upload", { pageTitle: "Upload" });

export const postUpload = async (req, res) => {
  const {
    body: { title, description },
    file: { location },
  } = req;
  const newVideo = await Video.create({
    fileUrl: location,
    title,
    description,
    creator: req.user.id,
  });
  req.user.videos.push(newVideo.id);
  req.user.save();
  res.redirect(routes.videoDetail(newVideo.id));
};

export const videoDetail = async (req, res) => {
  const {
    params: { id },
  } = req;
  try {
    const video = await Video.findById(id)
      .populate("creator")
      .populate("comments");
    res.render("videoDetail", { pageTitle: video.title, video });
  } catch (error) {
    res.redirect(routes.home);
  }
};

export const getEditVideo = async (req, res) => {
  const {
    params: { id },
  } = req;
  try {
    const video = await Video.findById(id);
    if (video.creator.toString() !== req.user.id) {
      throw Error("Access denied");
    } else {
      res.render("editVideo", { pageTitle: `Edit ${video.title}`, video });
    }
  } catch (error) {
    console.error("getEedit", error);
    res.redirect(routes.home);
  }
};

export const postEditVideo = async (req, res) => {
  // const params = req.params.id
  // const body = { title: req.body.title, description: req.body.description }
  const {
    params: { id },
    body: { title, description },
  } = req;
  try {
    await Video.findOneAndUpdate({ _id: id }, { title, description });
    res.redirect(routes.videoDetail(id));
  } catch (error) {
    res.redirect(routes.home);
  }
};

// Register Video View
export const postRegisterView = async (req, res) => {
  const {
    params: { id },
  } = req;
  try {
    const video = await Video.findById(id);
    video.views += 1;
    video.save();
    res.status(200);
  } catch (error) {
    res.status(400);
  } finally {
    res.end();
  }
};

// Add Comment
export const postAddComment = async (req, res) => {
  const {
    params: { id },
    body: { comment },
    user,
  } = req;
  try {
    const video = await Video.findById(id);
    const newComment = await Comment.create({
      text: comment,
      creator: user.id,
    });
    video.comments.push(newComment.id);
    video.save();
  } catch (error) {
    res.status(400);
  } finally {
    res.end();
  }
};

// export const deleteVideo = async (req, res) => {
//   const {
//     params: { id },
//   } = req;
//   try {
//     const video = await Video.findById(id);
//     if (video.creator.toString() !== req.user.id) {
//       throw Error("Access denied");
//     } else {
//       await Video.findOneAndRemove({ _id: id });
//     }
//   } catch (error) {
//     console.log(error);
//   }
//   res.redirect(routes.home);
// };

// 게시글 삭제시 AWS S3 내의 파일 삭제
// 우리가 저장한 fileUrl은 AWS에 저장된 파일의 전체 링크를 갖고 있어요.
// 그리고 aws-sdk.S3의 deleteObject 함수는 Bucket과 Key를 받아요.
// 그런데 Key 값은 전체 주소가 아닌 그 Bucket 안의 directory/filename을 string 형태로 받아요.
// 그래서 우리가 가진 db 내에 fileUrl과 re(regular expression)을 이용해서 처리를 해야해요.
export const deleteVideo = async (req, res) => {
  const {
    params: { id },
  } = req;
  try {
    // 현재 비디오의 id에서 fileUrl을 받기 위해 현재의 비디오 db를 가져와요.
    const currentPost = await Video.findById(id);

    // 정규표현식을 만들어줍니다. 괄호로 그룹을 만들어줄 수 있어요.
    // group 1(첫 괄호 안의 값)은 프로토콜(http/https),
    // group 2는 서브도메인, 포트를 포함한 도메인 네임(프로토콜 이후~/path 전까지)
    // group 3는 path(도메인 네임 이후 path: 파일 경로 등)로 정의합니다.
    const regex = /(http[s]?:\/\/)?([^\/\s]+\/)(.*)/;

    // 현재 포스트의 fileUrl에서 정규식과 match되는 부분 중에 3번째 그룹을 변수로 선언해줘요.
    const filePath = await currentPost.fileUrl.match(regex)[3];

    // aws-sdk의 s3.deleteObject 함수는 지울 파일을 object로 받아요.
    // 그 obj는 Bucket과 Key를 String으로 갖고있어야해요.
    // Bucket은 생성한 버킷의 이름이예요. (e.g. we-tube)
    // Key는 버킷 안의 경로를 포함한 파일 이름이예요. (e.g. videos/filename)
    // 변수 이름은 potato가 되어도 된다는 것! 명심하세요!
    // 로컬 환경과, 빌드 환경에 따라 버킷을 다르게 하시고 싶은 분은 새로운 버킷 생성 후 dotenv를 이용하세요!
    // (e.g. process.env.PRODUCTION ? process.env.TEST_BUCKET: process.env.PRODUCT_BUCKET)
    const delFile = {
      Bucket: "wetubenomad",
      // filePath는 이전에 정규식을 통해 잘라낸 변수임을 명심하세요!
      Key: filePath,
    };

    // s3.deleteObject를 이용해서 s3 내의 파일을 지워줘요.
    // 우리가 만들어준 해당 파일에 대한 object와, callback을 인자로 받아요.
    // 에러를 출력할 수도 있고 성공 메시지를 출력할 수 있어요. 아무 메세지 없이 pass 해줘도 돼요.
    // await로 함수 실행 시 순차적이지 않는 비동기함수의 실행순서를 제어하기 위해 promise를 해줘야돼요.
    await s3
      .deleteObject(delFile, function (err, data) {
        if (err) console.log(err);
        else console.log(`The ${data} file has been removed`);
      })
      .promise();

    // 다 왔어요! 파일을 지웠으니, 이제 db에서 찾아서 지워줍시다!
    await Video.findByIdAndRemove({ _id: id });
    res.redirect(routes.home);
  } catch {
    res.status(400);
    res.redirect(routes.notFound);
  }
};
