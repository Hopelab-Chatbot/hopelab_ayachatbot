/**
 * Resolve An Array of Promises Sequentially
 *
 * @param {Array} functions
 * @return {Array}
*/
const promiseSerialKeepGoingOnError = funcs => {
  let results = [];
  return funcs.reduce((promise, func) => {
      return promise
        .then(result => {
          return func()
            .then(r => {
              results.push(r)
              return results;
            })
            .catch(error => {
              results.push({
                isError: true,
                error
              });
              return results;
            });
        })
    },
    Promise.resolve([])
  );
}

const promiseSerial = funcs =>
    funcs.reduce(
        (promise, func) =>
            promise.then(result =>
                func().then(Array.prototype.concat.bind(result))
            ),
        Promise.resolve([])
    );

module.exports = {
    promiseSerial,
    promiseSerialKeepGoingOnError,
};
