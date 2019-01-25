const apiFetch = require('./utils/apiFetch');
const {
  FB_GRAPH_TRUE_ROOT,
  FB_APP_ID,
  FB_PAGE_ID,
  FB_ACTIVITIES_URL
} = require('./constants');

const fbEventNameFormat = name =>
  name.replace(/[^0-9a-zA-Z_-]/g, '').substr(0,39);


const logEvent = ({ userId, eventName, eventList }) => {
  if (!userId || (!eventName && !eventList)) return Promise.resolve();
  const custom_events = eventList ?
    JSON.stringify(eventList.map(name => ({
      _eventName: fbEventNameFormat(name),
      _app_user_id: userId,
      unique_user_id: userId,
    })))
    : JSON.stringify([{
      _eventName: fbEventNameFormat(eventName),
      _app_user_id: userId,
      unique_user_id: userId,
    }]);
  const uri = `${FB_GRAPH_TRUE_ROOT}${FB_APP_ID}${FB_ACTIVITIES_URL}`;
  const data = {
    event: 'CUSTOM_APP_EVENTS',
    custom_events,
    advertiser_tracking_enabled: 1,
    application_tracking_enabled: 1,
    extinfo: JSON.stringify(['mb1']),
    page_id: FB_PAGE_ID,
    page_scoped_user_id: userId,
  };
  return apiFetch({ method: 'POST', data, uri});
};

module.exports = {
  logEvent,
};
