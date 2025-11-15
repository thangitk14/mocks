const path = require("path");
const ejs = require("ejs");

const viewsPath = path.join(__dirname, "../views");

async function renderLayout(req, res, viewPath, data = {}) {
  if (!viewPath.endsWith(".ejs")) viewPath += ".ejs";
  
  const params = {...data, ...{host: req.session.host}}

  const viewFullPath = path.join(viewsPath, viewPath);
  
  // Render nội dung con
  const body = await ejs.renderFile(viewFullPath, params, {
    async: true,
    root: viewsPath,
    filename: viewFullPath, // ✅ EJS cần cái này để resolve include
  });

  // Render layout
  res.render("layout/base", {
    ...params,
    body,
  });
}

module.exports = renderLayout;
