const express = require('express')
const { getUsers } = require('../controllers/usersControllers')

const router = express.Router()

router.get('/', getUsers)

module.exports = router
