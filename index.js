const express = require('express');
const bodyParser = require('body-parser');

const { REST_PORT } = require('./src/constants');

const app = express();
app.use(bodyParser.text({ type: 'application/json' }));

require('./src/routes')(app);
require('./src/pushMessageQueue').start();
require('./src/studyMessageQueue').start();

app.listen(REST_PORT, () => {
  console.log(`Rest service ready on port ${REST_PORT}`); // eslint-disable-line no-console
});
