const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const https = require("https");
const app = express();
const PORT = 5001;

// 增强版CORS配置
const allowedOrigins = [
  "http://localhost:5001",
  "http://ec2-43-199-70-185.ap-east-1.compute.amazonaws.com",
  "https://ec2-43-199-70-185.ap-east-1.compute.amazonaws.com",
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

// 获取所有图片接口
app.get("/images", (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) return res.status(500).send("Server error");
    const imageUrls = files.map((file) => `/images/${file}`);
    res.json(imageUrls);
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
    key: fs.readFileSync("goatrack.key"),
    cert: fs.readFileSync("goatrack_io.crt"),
  },
  app
);

httpsServer.listen(8443, (err) => {
  if (!err) {
    console.log("https server running !!");
  } else console.log(err);
});

// module.exports.handler = serverless(app);
