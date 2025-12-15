const express = require("express");
const multer = require("multer");
const {userAuth} = require("../middleware/auth");
const {
  uploadDocument,
  listDocuments,
} = require("../controllers/documentController");

const documentRouter = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter(req, file, cb) {
    if (
      file.mimetype === "application/pdf" ||
      file.mimetype.includes("text") ||
      /\.(txt|md|html)$/i.test(file.originalname)
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF or text files allowed"));
    }
  }
});

documentRouter.post("/upload", userAuth, upload.single("file"), uploadDocument);

documentRouter.get("/docs", userAuth, listDocuments);

module.exports = documentRouter;
