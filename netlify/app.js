require("dotenv").config();
const express = require("express");
const serverless = require("serverless-http");
const app = express();
const router = express.Router();
const {marked} = require("marked");
const axios = require('axios');

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

app.use(express.static('public'));

// Custom renderer for marked
const renderer = new marked.Renderer();

const resMakeDownView = (res, htmlContent) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Markdown Viewer</title>
        <style>
            body {
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                padding: 20px;
                font-family: Arial, sans-serif;
                background-color: #f8f9fa;
            }
            .content {
                width: 210mm; /* Equivalent to A4 width */
                max-width: 100%;
                background: white;
                padding: 20px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                border-radius: 5px;
            }
        </style>
    </head>
    <body>
        <div class="content">
            ${htmlContent}
        </div>
    </body>
    </html>
  `);
}

app.get('/policies/*', async (req, res) => {
  try {
    const host = req.headers.host;
    const originalUrl = req.originalUrl;
    const parts = originalUrl.split('/');
    const lastPart = parts[parts.length - 1];
    const url = `http://${host}/${lastPart}.md`;
    // const url = `https://${host}${originalUrl}.md`;
    const response = await axios.get(url);
    const markdownData = response.data;
    const htmlContent = marked(markdownData, { renderer });

    resMakeDownView(res, htmlContent);
  } catch (error) {
    console.error('Error fetching the Markdown file:', error);
    res.status(500).send('Error fetching the Markdown file.');
  }
});

app.use("/.well-known/assetlinks.json", (req, res) => {
  const jsonString = [{
    "target": {
      "package_name": "com.maisonjsc.online",
      "sha256_cert_fingerprints": [
        "42:36:9C:23:4F:D8:BE:B3:F5:34:C7:29:42:B6:3E:4E:94:B7:8A:3B:A8:43:CE:AC:14:DF:83:FC:EB:34:24:F6",
        "E1:8B:57:D1:23:C5:23:15:66:64:18:55:AB:CF:F0:0B:07:3C:7D:23:08:AC:16:C7:BE:C3:73:AD:89:A8:8E:E9"
      ],
      "namespace": "android_app"
    },
    "relation": ["delegate_permission/common.handle_all_urls"]
  }];

  res.set('Content-Type', 'application/json; charset=utf-8');
  res.send(jsonString);
});

app.use("/apple-app-site-association", (req, res) => {
  const jsonString ={
    "applinks": {
      "apps": [],
      "details": [
        {
          "appID": "H57RZ2Y5ZS.com.maisonjsc.online",
          "paths": [
            "*",
            "/"
          ]
        }
      ]
    }
  };

  res.set('Content-Type', 'application/json; charset=utf-8');
  res.send(jsonString);
});

app.use("/", router);
module.exports = serverless(app);
