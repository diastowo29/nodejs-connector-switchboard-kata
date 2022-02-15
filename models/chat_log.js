module.exports = (sequelize, type) => {
    return sequelize.define('chat_log', {
        id: {
          type: type.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        chat_type: type.STRING(20),
        user_id: type.STRING(100),
        chat_content: type.TEXT
    })
}