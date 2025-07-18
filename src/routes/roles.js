const express = require("express");
const rolesController = require("../controllers/rolesController");

const router = express.Router();

router.get("/", rolesController.listRoles);

router.get("/:roleName", rolesController.listRoleById);

router.put("/:roleName", rolesController.updateRole);

router.post("/", rolesController.createRole);

router.delete("/:roleName", rolesController.deleteRole);

module.exports = router;
