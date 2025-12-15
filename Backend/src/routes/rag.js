const express = require("express");
const {userAuth} = require("../middleware/auth");
const { queryRAG } = require("../controllers/ragController");

const Ragrouter = express.Router();

Ragrouter.post("/chat", userAuth, queryRAG);

module.exports = Ragrouter;
