const format = require('string-template');

const { ACTIONS, introQRActionPrefix } = require('./actions');
const { INTENTS } = require('./intents');

// find the set of messages to display to
// the user for the given supplied action
function getActionMessages(action, user) {
    return MESSAGES[action].messages.map(m => {
        if (m.type === 0 && m.speech.indexOf('{name}') > -1) {
            m.speech = format(m.speech, { name: user.first_name });
        }

        return m;
    });
}

// list of all messages for a given action
// that will be called from the webhook
const MESSAGES = {
    [ACTIONS.intro]: {
        messages: [
            { type: 0, speech: 'Hey {name} I\'m Cancer Mindshift! I was created by young adults with cancer to help make the shitty days less shitty 💩 and the good days better 🤗' },
            { type: 0, speech: 'I\'ll prompt you with activities and excercises that help you rediscover who you are outside of cancer' },
            { type: 4, payload: { facebook: {
                text: 'And when you vent, I\'ll help you figure out what you can control so you can feel more comfortable with uncertainty',
                'quick_replies': [
                    {
                        'content_type': 'text',
                        title: 'Sounds good',
                        payload: INTENTS.introQuickReplyOne
                    },
                    {
                        'content_type': 'text',
                        title: 'Tell me more',
                        payload: INTENTS.introQuickReplyTwo
                    },
                ]
            }}}
        ]
    },
    [ACTIONS[`${introQRActionPrefix}1`]]: {
        messages: [
            { type: 0, speech: 'Sweet! Excited to learn a little about you {name}'}
        ]
    },
    [ACTIONS[`${introQRActionPrefix}2`]]: {
        messages: [
            { type: 0, speech: 'I have a bunch of tips from young cancer patients who have been through it' },
            { type: 0, speech: 'So if you\'re down, I\'ll check in on how you\'re feeling and give you ideas that could help in the moment' },
            { type: 0, speech: 'Before we get into it, a quick but important note about privacy:' },
            { type: 0, speech: 'I\'m run by HopeLab, a nonprofit out to improve the health of young people, and they really value your privacy' },
            { type: 0, speech: 'So anything that you say is confidential and won\'t be shared outside HopeLab...' },
            { type: 0, speech: '...and they will only be looking at the data to see how they can make me more helpful to you and other young adults with cancer.' },
            { type: 4, payload: { facebook: {
                text: 'The only exception is if we think that you or someone else might be in danger, in which case we\'ll try to get you help ASAP.',
                'quick_replies': [
                    {
                        'content_type': 'text',
                        title: 'Sounds good',
                        payload: INTENTS.introQuickReplyThree
                    },
                ]
            }}}
        ]
    },
    [ACTIONS[`${introQRActionPrefix}3`]]: {
        messages: [
            { type: 4, payload: { facebook: {
                text: 'Great, let\'s get started. First question for you: are you currently in treatment?',
                'quick_replies': [
                    {
                        'content_type': 'text',
                        title: 'Yep',
                        payload: INTENTS.introQuickReplyFour
                    },
                    {
                        'content_type': 'text',
                        title: 'Not anymore',
                        payload: INTENTS.introQuickReplyFour
                    },
                    {
                        'content_type': 'text',
                        title: 'Not yet',
                        payload: INTENTS.introQuickReplyFour
                    },
                ]
            }}}
        ]
    },
    [ACTIONS[`${introQRActionPrefix}4`]]: {
        messages: [
            { type: 4, payload: { facebook: {
                text: 'Ok thanks for letting me know. You\'re definitely in the right spot',
                'quick_replies': [
                    {
                        'content_type': 'text',
                        title: 'YW',
                        payload: INTENTS.introQuickReplyFive
                    },
                ]
            }}}
        ]
    },
    [ACTIONS[`${introQRActionPrefix}5`]]: {
        messages: [
            { type: 4, payload: { facebook: {
                text: 'So FYI, a lot of the stuff we\'ll be talking about is about what others in your shoes and the experts know helps people _________. Which of these sounds like the best place to start for you?',
                'quick_replies': [
                    {
                        'content_type': 'text',
                        title: 'Reframing your thoughts',
                        payload: INTENTS.introQuickReplySix
                    },
                    {
                        'content_type': 'text',
                        title: 'Connecting via relationships',
                        payload: INTENTS.introQuickReplySix
                    },
                    {
                        'content_type': 'text',
                        title: 'Doing stuff you enjoy',
                        payload: INTENTS.introQuickReplySix
                    },
                    {
                        'content_type': 'text',
                        title: 'Feeling healthy',
                        payload: INTENTS.introQuickReplySix
                    }
                ]
            }}}
        ]
    },
    [ACTIONS[`${introQRActionPrefix}6`]]: {
        messages: [
            { type: 0, speech: 'That\'s a great place to start :-)' },
            { type: 4, payload: { facebook: {
                text: 'K we\'ll get right into that right after this little check in..',
                'quick_replies': [
                    {
                        'content_type': 'text',
                        title: 'Okay...',
                        payload: INTENTS.introQuickReplySeven
                    },
                ]
            }}}
        ]
    },
    [ACTIONS[`${introQRActionPrefix}7`]]: {
        messages: [
            { type: 0, speech: 'So...' },
        ]
    },
};

module.exports = {
    MESSAGES,
    getActionMessages
};