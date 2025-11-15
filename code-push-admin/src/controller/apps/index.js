const express = require("express");
const router = express.Router();
const axios = require("axios");

const renderLayout = require("../../utils/renderLayout");
const moment = require('moment');

router.get("/:appName/deployments", async (req, res) => {
  try {
    const { host, token } = req.session;
    const { appName } = req.params;

    const responseAppDeployments = await axios.get(`${host}/apps/${appName}/deployments`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (responseAppDeployments.status !== 200) {
      await renderLayout(req, res, "apps/deployments", {
        errors: `Error get apps status code: ${responseAppDeployments.status}`
      });
      return;
    }
    await renderLayout(req, res, "apps/deployments", {
      moment,
      // appName,
      deployments: responseAppDeployments.data?.deployments ?? [],
      error: null,
    });
  } catch (error) {
    await renderLayout(req, res, "apps/deployments", {
      errors: `Internal error: ${error}`
    });
  }
});

router.get("/:appName/deployments/:deploymentName/history", async (req, res) => {
  try {
    const { host, token } = req.session;
    const { appName, deploymentName } = req.params;

    const responseAppHistories = await axios.get(`${host}/apps/${appName}/deployments/${deploymentName}/history`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (responseAppHistories.status !== 200) {
      await renderLayout(req, res, "apps/deployments_history", {
        errors: `Error get apps status code: ${responseAppHistories.status}`
      });
      return;
    }
    await renderLayout(req, res, "apps/deployments_history", {
      moment,
      history: responseAppHistories.data?.history ?? [],
      error: null,
    });
  } catch (error) {
    await renderLayout(req, res, "apps/deployments_history", {
      errors: `Internal error: ${error}`
    });
  }
});

router.get("/:appName/deployments/:deploymentName/mandatory/:label/:isMandatory", async (req, res) => {
  try {
    const { host, token } = req.session;
    const { appName, deploymentName, label, isMandatory } = req.params;
    const responseUpdateMandatory = await axios.patch(`${host}/apps/${appName}/deployments/${deploymentName}/release`, {
      packageInfo: {
        appVersion: null,
        description: null,
        isMandatory: isMandatory === 'true',
        isDisabled: null,
        rollout: null,
        label: label,
      },
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
    });

    if (responseUpdateMandatory.status !== 200) {
      await renderLayout(req, res, "apps/deployments_mandatory", {
        errors: `Error get apps status code: ${responseUpdateMandatory.status}`
      });
      return;
    }
    res.redirect(`/apps/${appName}/deployments/${deploymentName}/history`);
  } catch (error) {
    console.log(error);

    await renderLayout(req, res, "apps/deployments_mandatory", {
      errors: `Internal error: ${error}`
    });
  }
});

module.exports = router;
