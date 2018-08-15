# hopelab_ayachatbot

## Getting Started

To install dependencies:

```bash
yarn
```

Running application Locally:

## Environment Variables

These are obtained from `https://developers.facebook.com`.

```
FB_VERIFY_TOKEN
FB_PAGE_ACCESS_TOKEN
```

These are set locally.
```
REDIS_HOST
REDIS_PORT
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
