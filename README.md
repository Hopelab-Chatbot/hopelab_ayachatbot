# hopelab_ayachatbot

## Getting Started

To install dependencies:

```bash
yarn
```

Running application Locally:

## Environment Variables

These are obtained from `https://developers.facebook.com`. They are required.

```
FB_VERIFY_TOKEN
FB_PAGE_ACCESS_TOKEN
```


These are obtained from the Facebook App and the Facebook Page you create below. They are required
for logging facebook events (ie the event logging intro conversation complete). They aren't required for anything else yet, so don't worry about them on the development environment unless you are specifically developing custom events. They are optional.
```
FB_APP_ID
FB_PAGE_ID
```


These are set locally. They are required.
`CHAT_API_ENDPOINT` and `CHAT_API_VERSION` are requiered for integration with GRYT, these variables are used to send the messages responses.

```
REDIS_HOST
REDIS_PORT
CHAT_API_ENDPOINT
CHAT_API_VERSION
```

## getting app Setup

You can use
```
yarn mock-db
```
to create a small local test db.

## Running app locally with Facebook Messenger:

There are a few steps needed to get the Bot to communicate with Messenger locally. For testing purposes, I created a facebook page solely for testing purposes. I then used this page to generate the `Page Access Token` which is the `FB_PAGE_ACCESS_TOKEN` variable.

To create this page, just find wherever facebook has the 'create page' button currently, and then follow the prompts, filling in some address/phone number(don't worry too much, this will never go live).

For the next steps, you need to have the app running at localhost 5000, with a ngrok https url pointed at :5000.

You then have to go to developers.facebook.com/apps and create a new app. After you've got a new facebook app, in the dashboard add the 'webhooks' product and the 'messenger' product. In the webhooks product click 'Edit Subscription' and here enter the ngrok url (https), and the FB_VERIFY_TOKEN you've loaded into your app as an env var. If this returns as successful, you've successfully returned the response facebook expects.

In 'Messenger', you generate a 'token' under 'Token Generation'. This is your FB_PAGE_ACCESS_TOKEN
that needs to be loaded into your env vars as well.

Click 'Edit Events' in the 'Webhooks' section of the 'Messenger Platform', and check 'messages, messaging_postbacks, messaging_optins, and message_deliveries'. You must then 'select a page to subscribe your webhook events to the page events'. Select the page you created before. If this works, and you get a green checkmark then you are ready to communicate with your bot.

Go to the page you've created and write a message to it. If you have a database instantiated with a response, then the bot will reply.

A second thing needed is when running this Bot locally, it needs to be exposed publicly to a URL that Facebook can resolve so that it can sync with it. You can do this several different ways, one way is to use [ngrok](https://ngrok.com/). Once installed, running `ngrok http 5000` should expose the running app (assuming the Bot is running on Port 5000). You should see something like `Forwarding https://5c8c992b.ngrok.io -> localhost:5000` in the terminal. *IMPORTANT*: Facebook Messenger needs the `https` URL because they are running TLS. You then use this URL back on the `https://developers.facebook.com` dashboard under webhooks. There should be a button on this page called `Edit Subscription`. Once you click this button, enter in the URL you generated and add the `/webhook` route listener that the Bot is running. So like `https://5c8c992b.ngrok.io/webhook`. Then, the `Verify Token` is the `FB_VERIFY_TOKEN`. It can be anything you want. It just has to be set in your environment and it has to match what you enter here. With those in place, hit `Verify and Save` and then it should be synced with the Bot you have running locally. If you message the Page for which the Bot was registered to, it should start receiving messages locally to your Bot.

A second thing needed is when running this Bot locally, is that it needs to be exposed publicly to a URL that Facebook can resolve so that it can sync with it. You can do this several different ways, one way is to use [ngrok](https://ngrok.com/). Once installed, running `ngrok http 5000` should expose the running app (assuming the Bot is running on Port 5000). You should see something like `Forwarding https://5c8c992b.ngrok.io -> localhost:5000` in the terminal. *IMPORTANT*: Facebook Messenger needs the `https` URL because they are running TLS.

You then use this URL back on the `https://developers.facebook.com` dashboard under webhooks. There should be a button on this page called `Edit Subscription`. Once you click this button, enter in the URL you generated and add the `/webhook` route listener that the Bot is running. So like `https://5c8c992b.ngrok.io/webhook`. Then, the `Verify Token` is `FB_VERIFY_TOKEN`. It can be anything you want. It just has to be set in your environment and it has to match what you enter here. With those in place, hit `Verify and Save` and then it should be synced with the Bot you have running locally. If you message the Page for which the Bot was registered to, it should start receiving messages locally to your Bot.

You'll also need to do this again when the Bot is running on the Prod environment.

Facebook Bot Selected Events:

- messages
- messaging_postbacks
- messaging_optins
- message_deliveries

### Setup a Mock DB with some fake data:

This doesn't actually load fake data, but it can be used to reset the data for the Bot so that the message data structure is fresh.

```bash
yarn run mock-db
```

## Code Structure

TODO: add details about code structure

## Application Architecture

The main premise is that there is a hierarchy of nested structures.

`conversation` -> `collection` -> `series` -> `block` -> `message`

Each of these types can be a list of the given type. Each entity can have a parent with an `id` that points to it's parent. So, a `collectio`n will have a parent with an `id` that points to a `conversation`.

The main pieces ultimately are the `message` which have the content that is displayed to the user when interacting with the Bot. The messages have a `messageType` because there are different types of messages that can be sent to the user.

Message Types:

```
const TYPE_QUESTION = 'question';
const TYPE_QUESTION_WITH_REPLIES = 'questionWithReplies';
const TYPE_TEXT = 'text';
const TYPE_IMAGE = 'image';
const TYPE_VIDEO = 'video';
```

Messages are chained together with a `next` pointer that point to the `id` of another `message` or `collection`. *IMPORTANT*: Messages are nested inside of `block` but can also appear at the top level under a `conversation`. So a `conversatio`n really can have `collection` and `message`. Also, a `message` points to another `message` and also can point to a `collection` and vice-versa.

When nesting a `collection` inside of a `conversation`, the Bot will follow the nested structure and find the child `series` and `block` that match the given parent id. Once the Bot finds the `block`, it can search the `message` list and find which message it should show the user. One thing to note here is that `collection` and `series` can both have `logic` rules which say what order they should be followed when displaying content. To do this, we have to keep track of what `collection` and `series` have been `seen` for a given unique `user`. With this information, we can tell which entities they should see next.

## User Entity

Each user that messages the Bot will automatically have a unique ID that is their facebook ID. We use this to store the user. The user has properties which are important to tracking how the Bot interacts with the user once the message the Bot.

Progress Tracking Keys:

```
const COLLECTION_SCOPE = 'collection-scope';
const BLOCK_SCOPE = 'block-scope';
const COLLECTION_PROGRESS = 'collection-progress';
const SERIES_PROGRESS = 'series-progress';
const SERIES_SEEN = 'series-seen';
const BLOCKS_SEEN = 'blocks-seen';
```
## Helpful Development tips:

### Database management

#### Visualization
In order to see what's going on the database I recommend downloading a redis gui client. My preferred tool is the Redsmin app. I've found it's the easiest for ssh tunneling to inspect the production/staging database. It also seems to crash less than the others I've tried.

#### Redis-Server tools and database dump
In order to get a bot talking back to you, you'll need to create a conversation database. The easiest (and most helpful for debugging) way to do this is to simply import the production or staging database. Download a backup from staging or production (downloaded from s3 bucket). Then use the command:

```bash
cp ~/downloads/dump.rdb /usr/local/var/db/redis/dump.rdb
```
The second path is the location of the dump that the redis server expects to find when it boots up. This is set in your redis.conf file, which is probably at the path listed in the second command below:

If your redis server is already running use:
```
redis-cli shutdown
```

to turn off your server.

Then, reboot your server while it is pointing at the correct redis.conf file, which ideally has a file_dir var pointing at the dump location we copied the database dump to above.


```
redis-server /usr/local/etc/redis.conf
```

Tada! Now you have all the production data locally.

### Bot Helpful tools/tricks/troubleshooting

#### Reset your user:

Send the bot the string value listed at RESET_USER_KEY_MESSAGE in the constants.js file. Currently that value is: '#oz8mu[M7h9C6rsrNza9' (don't include the apostrophes). The bot will prompt, and if you answer affirmatively your user key will be reset to nominal state.

#### Why isn't my local bot talking back to me?

1) Check that your subscription is live. You should have gotten a positive affirmation from facebook when you set up the 'Webhooks Subscription' in the modal. If it fails, make sure you are using https, and that your app is running...  Test this by curling the url directly with a get request to /webhook and make sure that it responds complaining about the correct token.

2) Do you have data in your db? Your bot wants to talk to you, but she's gotta have something to say! Get the prod db downloaded and in your local server ASAP. Check the cms app to make sure you have collections/conversations/messages.

## Doing something complicated on production/staging, eh?

### Best Practices

1) I think it's a good idea to tunnel into the redis DB so you can inspect it if necessary:

After STOPPING your local redis server (`redis-cli shutdown`),

```bash something like
ssh -i "~/.ssh/safe_pem.pem" -L 6379:redis_host:6379 ubuntu@ec2_instance_endpoint
```

replace the appropriate values above. Now use your redis gui to inspect your local 6379 port, which is now the remote redis db.

2) Back up the DB you are doing operations on. Easiest to do in the AWS dashboard.

3) Ensure that the required technology (node, redis, etc) have the same version on the remote version as your local env.

4) If you update a env variable on the instance, modify it in ~.profile, `exit` the ssh session, re-enter to reload the environmental vars in your new shell session, and run
```bash
pm2 reload index (or cms) --update-env
```
