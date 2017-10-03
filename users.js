/**
 * Create New User
 * 
 * @param {String} id
 * @return {Object}
*/
function createNewUser(id) {
    return {
        id,
        blockScope: [],
        history: [],
        progress: {
            prevMessage: '',
            nextMessage: ''
        }
    };
}

module.exports = {
    createNewUser
};
