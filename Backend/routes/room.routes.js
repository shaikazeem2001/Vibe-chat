const express = require("express");
const router = express.Router();
const roomController = require("../controllers/room.controller");
const authMiddleware = require("../middleware/auth.middleware");

router.get("/", roomController.getRooms);
router.post("/", authMiddleware, roomController.createRoom);
router.get("/name/:name", roomController.getRoomByName);
router.get("/id/:id", roomController.getRoomById);
router.post("/join/invite", authMiddleware, roomController.joinByInviteCode);

module.exports = router;
