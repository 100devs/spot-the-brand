const express = require("express");
const app = express();
const multer = require("multer");
const upload = multer({
  storage: multer.diskStorage({}),
  fileFilter: (req, file, cb) => {
    let ext = path.extname(file.originalname);
    if (ext !== ".jpg" && ext !== ".jpeg" && ext !== ".png") {
      cb(new Error("File type is not supported"), false);
      return;
    }
    cb(null, true);
  },
});

//MS Specific
const axios = require("axios").default;
const async = require("async");
const fs = require("fs");
const https = require("https");
const path = require("path");
const createReadStream = require("fs").createReadStream;
const sleep = require("util").promisify(setTimeout);
const ComputerVisionClient =
  require("@azure/cognitiveservices-computervision").ComputerVisionClient;
const ApiKeyCredentials = require("@azure/ms-rest-js").ApiKeyCredentials;

require("dotenv").config({ path: "./config/.env" });

const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

const key = process.env.MS_COMPUTER_VISION_SUBSCRIPTION_KEY;
const endpoint = process.env.MS_COMPUTER_VISION_ENDPOINT;
const faceEndpoint = process.env.MS_FACE_ENDPOINT;
const subscriptionKey = process.env.MS_FACE_SUB_KEY;

const computerVisionClient = new ComputerVisionClient(
  new ApiKeyCredentials({ inHeader: { "Ocp-Apim-Subscription-Key": key } }),
  endpoint
);

//Server Setup
app.set("view engine", "ejs");
app.use(express.static("public"));

//Routes
app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.post("/", upload.single("file-to-upload"), async (req, res) => {
  try {
    // Upload image to cloudinary
    const result = await cloudinary.uploader.upload(req.file.path);
    const brandURLImage = result.secure_url;
    // Analyze URL image
    console.log("Analyzing brands in image...", brandURLImage.split("/").pop());
    const brands = (
      await computerVisionClient.analyzeImage(brandURLImage, {
        visualFeatures: ["Brands"],
      })
    ).brands;

    // Print the brands found
    if (brands.length) {
      console.log(
        `${brands.length} brand${brands.length != 1 ? "s" : ""} found:`
      );
      for (const brand of brands) {
        console.log(
          `    ${brand.name} (${brand.confidence.toFixed(2)} confidence)`
        );
      }
    } else {
      console.log(`No brands found.`);
    }
    res.render("result.ejs", { brands: brands, img: brandURLImage });
  } catch (err) {
    console.log(err);
  }
});

app.listen(process.env.PORT || 8000);
