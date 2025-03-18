const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const exp = require("constants");

const app = express();
const PORT = 5001;

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
});

// 中间件
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

// server
app.listen(PORT, () => {
  console.log(`Server is running on localhost:${PORT}`);
});
