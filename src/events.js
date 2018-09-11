const apiFetch = require('./utils/apiFetch');
const {
  FB_GRAPH_TRUE_ROOT,
  FB_APP_ID,
  FB_PAGE_ID,
  FB_ACTIVITIES_URL
} = require('./constants');

const logEvent = ({ userId, eventName }) => {
  const uri = `${FB_GRAPH_TRUE_ROOT}${FB_APP_ID}${FB_ACTIVITIES_URL}`;
  const data = {
    event: 'CUSTOM_APP_EVENTS',
    custom_events: JSON.stringify([{
      _eventName: eventName,
    }]),
    advertiser_tracking_enabled: 0,
    application_tracking_enabled: 1,
    extinfo: JSON.stringify(['mb1']),
    page_id: FB_PAGE_ID,
    page_scoped_user_id: userId,
    app_user_id: userId,
  };
  return apiFetch({ method: 'POST', data, uri});
};

module.exports = {
  logEvent,
};
