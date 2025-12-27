const supabase = require('../config/supabase')

const getUsers = async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')

  if (error) return res.status(400).json({ error: error.message })

  res.json(data)
}

module.exports = { getUsers }
