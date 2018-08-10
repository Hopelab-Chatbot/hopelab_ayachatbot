const {
  getUsers
} = require('./database');

const { sendStudyMessageToUsers } = require('./facebook');


module.exports = () => {
  return getUsers().then(users => {
    sendStudyMessageToUsers(users);
  });
}
