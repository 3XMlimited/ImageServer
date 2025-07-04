const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const https = require("https");
const app = express();
const PORT = 5001;
const axios = require("axios");
// const path = require("path");

// 增强版CORS配置
const allowedOrigins = [
  "http://localhost:5001",
  "http://ec2-43-199-70-185.ap-east-1.compute.amazonaws.com",
  "https://ec2-43-199-70-185.ap-east-1.compute.amazonaws.com",
  "http://ec2-43-199-230-173.ap-east-1.compute.amazonaws.com",
  "https://ec2-43-199-230-173.ap-east-1.compute.amazonaws.com",
  "http://www.lyxstream.live",
  "https://www.lyxstream.live",
  "https://lyxstream.live",
  "http://lyxstream.live",
  "lyxstream.live",
  "http://www.lyxstream.live",
  "https://bitcoin-livestream.vercel.app",
  "https://bitcoin-livestream.vercel.app/",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400, // 预检请求缓存时间（秒）
};

// 创建图片存储目录 （如果不存在）
const uploadDir = path.join(__dirname, "public/images");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置multer存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
  allowedTypes.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error("Image Format Error,Only access(.jpeg, .jpg, .png, .gif)"));
};

// Get Bitcoin Price
const getPrice = async (symbol) => {
  // let coinId = '';
  symbol = symbol.toUpperCase();
  // console.log(symbol);
  if (symbol === "BTC") {
    coinId = "btc_usd";
  } else {
    if (symbol === "ETH") {
      coinId = "eth_usd";
    } else {
      if (symbol === "SOL") {
        coinId = "sol_usd";
      }
    }
  }
  const req = await axios.get(
    `https://www.deribit.com/api/v2/public/get_index_price?index_name=${coinId}`
  );
  try {
    const obj = req?.data;
    // console.log(obj.result.index_price);
    return obj.result.index_price.toFixed(0);
  } catch (error) {
    console.error(error);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, //5MB限制
  files: 1, //单次只允许1个文件
});

// 中间件
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // 处理所有OPTIONS请求
app.use(express.static("public"));
app.use(express.json());

app.get("/index/:url", (req, res) => {
  const url = req.params.url;
  console.log(url);
  res.redirect(url ? url : "https://bitcoin-livestream.vercel.app");
  // res.redirect("https://bitcoin-livestream.vercel.app");
});

// 获取所有图片接口
app.get("/images", (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) return res.status(500).send("Server error");
    const imageUrls = files.map((file) => `/images/${file}`);
    res.json(imageUrls);
  });
});

//  bitcoin price
app.get("/api/price/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const price = await getPrice(symbol);
    return res.json({ result: price });
  } catch (error) {
    return res.status(501).send("Not implemented yet");
  }

  // fs.readdir(uploadDir, (err, files) => {
  //   if (err) return res.status(500).send("Server error");
  //   const imageUrls = files.map((file) => `/images/${file}`);
  //   res.json(imageUrls);
  // });
});

app.use(express.static("build"));
app.get("*", function (req, res, next) {
  res.sendFile(path.resolve(__dirname, "build", "index.html"));
});

// 上传接口
app.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file)
    return res.status(400).json({
      error: "Image Format Error,Only access(.jpeg, .jpg, .png, .gif)",
    });
  res.json({
    url: `/images/${req.file.filename}`,
    message: "Upload Success!",
  });
});

// 删除图片
app.delete("/images/:filename", (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);
  fs.unlink(filePath, (err) => {
    if (err) return res.status(400).send("Not found File");
    res.send("Deleted!");
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

// 添加API密钥验证中间件
// const apiKeys = new Set(process.env.API_KEYS.split(","));

// app.use((req, res, next) => {
//   const apiKey = req.headers["x-api-key"];
//   if (!apiKeys.has(apiKey)) {
//     return res.status(403).json({ error: "无效API密钥" });
//   }
//   next();
// });

// server;
// app.listen(PORT, () => {
//   console.log(`Server is running on localhost:${PORT}`);
// });

const server = async () => {
  try {
    app.listen(5001, () => {
      // connectDB(url);

      console.log("server is running");
    });
  } catch (error) {
    console.log(error.message);
  }
};
server();

const httpsServer = https.createServer(
  {
    key: fs.readFileSync("live.key"),
    cert: fs.readFileSync("live.crt"),
  },
  app
);

httpsServer.listen(8443, (err) => {
  if (!err) {
    console.log("https server running !!");
  } else console.log(err);
});

// module.exports.handler = serverless(app);

// ec2-43-199-230-173.ap-east-1.compute.amazonaws.com
// 43.199.230.173

// eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjFkNmlmTUlzRlpTcU5GTzdkWDBkeTltanBqX21qX1NnZ084bng2ektQTHcifQ.eyJpc3MiOiJodHRwczovL2V4dGVybmFsYXV0b3NzbC5zZXJ2aWNlLnNwYWNlc2hpcC5jb20iLCJuYmYiOjE3NDU4MjM2NTAsImlhdCI6MTc0NTgyMzY1MCwiZXhwIjoxNzQ1OTEwMDUwLCJhdWQiOlsiZXh0ZXJuYWxhdXRvc3NsIl0sInNjb3BlIjpbImV4dGVybmFsYXV0b3NzbC5leHRlcm5hbGF1dG9zc2wiLCJleHRlcm5hbGF1dG9zc2wudXNlci1pbnRlZ3JhdGlvbi1jcmVhdGUiXSwiY2xpZW50X2lkIjoiZXh0ZXJuYWwtc3NsLWNsaWVudCIsInN1YiI6ImFiOTk2MjQyLTExOTQtNGJjMC05MGUzLTc4ZWRlYjUwNDk0MSJ9.OHLVA8ixhjNXaMMK7nzS89O7mtmNmzmXP-55LEKpyheV7H6ZTse6ffoZheG6lKrnqekAnDMcKm1zEME0rPXr4uydR1IFR53mqSUIoPPv3_x_5EZTxEqx2HkgJaScKj4sF3dAUjYAjBrQ2oVNjosSdeToNi8vjMYg_BdPE_Wx1XcXMWTULlV-TGe9o_4XHnhptrdirzEJ2xjoWUAHMofXY0uaAa592EUIS5UnbC8jBNU64MbD8ERZo-2ZrvszwyHiGvhvkpuaHTjTuoQJ1C77TVUkEGUhVgMgKKrWQLhZeSDjJ7BQBUrIncWBpFn_CL6bhTYS5xBESEPurqlG49kkkw
