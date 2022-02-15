const Sequelize = require('sequelize')
const chatlogModel = require('./models/chat_log')

var sequelize_db;

if (process.env.DATABASE_URL === undefined) {
	sequelize_db = new Sequelize('sw-kata', 'postgres', 'R@hasia', {
	  host: 'localhost',
	  dialect: 'postgres'
	});
} else {
	sequelize_db = new Sequelize(process.env.DATABASE_URL, {
		logging: false,
		dialectOptions: {
			ssl: {
				require: true,
				rejectUnauthorized: false,
		    },
		    keepAlive: true,
		},      
		ssl: true
	})
}

const chatlog_model = chatlogModel(sequelize_db, Sequelize)

sequelize_db.sync({ alter: true })
  .then(() => {
    console.log(`Database & tables created!`)
    })

module.exports = {
    chatlog_model
}