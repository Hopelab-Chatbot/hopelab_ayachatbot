/**
 * Resolve An Array of Promises Sequentially
 *
 * @param {Array} functions
 * @return {Array}
*/
const promiseSerial = funcs => {
  let results = [];
  return funcs.reduce((promise, func) => {
      return promise.then(result => func().then(r => results.concat(r)))
               .catch(error => {
                  return results.concat({
                    isError: true,
                    error
                  })
                });
    },
    Promise.resolve([])
  );
}

module.exports = {
    promiseSerial
};
