const express = require("express");
const router = express.Router();
const axios = require("axios");

const renderLayout = require("../../utils/renderLayout");
const { objToParamQuery } = require("../../utils/converter");

// GET /
router.get("/", async (req, res) => {
  const { host, token, accessKey } = req.session;
  try {
    let accessKeyData = null;

    if (accessKey) {
      accessKeyData = accessKey;
    }
    else {
      const timestamp = Date.now();
      const data = {
        createdBy: `Login-${timestamp}`,
        friendlyName: `friendlyName-${timestamp}`,
        ttl: 2592000000, // Thời gian có hiệu lực 30d
        description: `Login-${timestamp}`,
        isSession: true,
      };

      const body = objToParamQuery(data);
      const responseAccessKey = await axios.post(`${host}/accessKeys`, body, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        }
      });

      if (responseAccessKey.status !== 200) {
        await renderLayout(req, res, "home/index", {
          accessKey: null,
          errorAccessKey: `Error cannot get accessKey from: ${host}`
        });
        return;
      }

      // Set accessKey từ codepush server
      req.session.accessKey = responseAccessKey.data.accessKey;
      accessKeyData = responseAccessKey.data.accessKey;
    }

    const responseApps = await axios.get(`${host}/apps`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (responseApps.status !== 200) {
      await renderLayout(req, res, "home/index", {
        accessKey: accessKeyData,
        apps: [],
        errors: `Error get apps status code: ${responseApps.status}`
      });
      return;
    }

    if (responseApps?.data?.status !== undefined && responseApps?.data?.status !== 200) {
      await renderLayout(req, res, "home/index", {
        accessKey: accessKeyData,
        apps: [],
        errors: `Error: ${JSON.stringify(responseApps?.data)}`
      });
      return;
    }

    const apps = responseApps.data.apps;
    await renderLayout(req, res, "home/index", {
      accessKey: accessKeyData,
      apps,
    });
  } catch (error) {
    await renderLayout(req, res, "home/index", {
      accessKey: '',
      errors: `Internal error: ${error}`
    });
  }
});

module.exports = router;
