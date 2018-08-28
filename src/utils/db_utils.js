const {
  getUserById,
  setUserInCache,
} = require('../database');

const setUserAsInvalid = id => {
  getUserById(id).then(res => {
    const updatedUser = Object.assign({}, res, {invalidUser: true});
    return setUserInCache(updatedUser);
  });
};

module.exports = {
  setUserAsInvalid
};
