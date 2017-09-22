const express = require('express');
const bodyParser = require('body-parser');

const { REST_PORT } = require('./constants');

const app = express();
app.use(bodyParser.text({type: 'application/json'}));

require('./routes')(app);

app.listen(REST_PORT, () => {
    console.log('Rest service ready on port ' + REST_PORT);
});