# hopelab_ayachatbot

## Getting Started

To install dependencies:

```bash
yarn
```

Running application:

## Environment Variables

These are obtained from `https://developers.facebook.com`.

```
FB_VERIFY_TOKEN
FB_PAGE_ACCESS_TOKEN
```

## Running app locally with Facebook Messenger:

There are a few steps needed to get the Bot to communicate with Messenger locally. For testing purposes, I created a page solely for testing purposes. I then used this page to generate the `Page Access Token` which is the `FB_PAGE_ACCESS_TOKEN` variable.

A second thing needed is when running this Bot locally, it needs to be exposed publicly to a URL that Facebook can resolve so that it can sync with it. You can do this several different ways, one way is to use [ngrok](https://ngrok.com/). Once installed, running `ngrok http 5000` should expose the running app (assuming the Bot is running on Port 5000). You should see something like `Forwarding https://5c8c992b.ngrok.io -> localhost:5000` in the terminal. *IMPORTANT*: Facebook Messenger needs the `https` URL because they are running TLS. You then use this URL back on the `https://developers.facebook.com` dashboard under webhooks. There should be a button on this page called `Edit Subscription`. Once you click this button, enter in the URL you generated and add the `/webhook` route listener that the Bot is running. So like `https://5c8c992b.ngrok.io/webhook`. Then, the `Verify Token` is the `FB_VERIFY_TOKEN`. It can be anything you want. It just has to be set in your environment and it has to match what you enter here. With those in place, hit `Verify and Save` and then it should be synced with the Bot you have running locally. If you message the Page for which the Bot was registered to, it should start receiving messages locally to your Bot.

You'll also need to do this again when the Bot is running on the Prod environment.

### Setup a Mock DB with some fake data:

This doesn't actually load fake data, but it can be used to reset the data for the Bot so that the message data structure is fresh.

```bash
yarn run mock-db
```

## Code Structure

TODO: add details about code structure

## Application Architecture

TODO: add details about application architecture
