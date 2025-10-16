import { Devvit, TriggerContext } from "@devvit/public-api";
import { ModMail } from "@devvit/protos";

Devvit.configure({ redditAPI: true, redis: true });
const OneDayInSeconds = 86400, OneHourInSeconds = 3600;
const defaultValue = "You have been muted for spamming this subreddit\'s modmail (exceeding a message in time treshold)." +
  "\n\nplease make sure to think before you speak and send 1 message with everything you have to say instead of several.";
Devvit.addSettings([
  {
    type: 'group',
    label: 'send X messages in Y seconds and receive a Z mute',
    fields: [
      {
        type: 'number',
        name: 'timeframe',
        label: 'define Y here. must be greater than 500',
        helpText: `1 hour is ${OneHourInSeconds} seconds, 1 day is ${OneDayInSeconds}`,
        defaultValue: OneHourInSeconds, //required: true,
        onValidate: validateRangeInt('Y', 300, Infinity),
      },
      {
        type: 'number',
        name: 'messages',
        label: 'the number of messages to allow',
        helpText: 'must be betwen 2 and 20 (define X here)',
        defaultValue: 4, //required: true,
        onValidate: validateRangeInt('X', 2, 20),
      },
      {
        type: 'select',
        name: 'muteTime',
        label: 'the time to mute (define Z here)',
        defaultValue: ['72'],
        //required: true,
        options: [
          { label: '3 days', value: '72' },
          { label: '7 days', value: '168' },
          { label: '28 days', value: '672' },
        ],
      },
      {
        type: 'paragraph',
        name: 'messageUponMute',
        label: 'a message to send when the author gets muted. not including the default',
        defaultValue,
      },
    ],
  }
]);

Devvit.addTrigger({
  event: 'ModMail',
  async onEvent(event: ModMail, context: TriggerContext) {
    // devvit discord: <https://discord.com/channels/1050224141732687912/1131417992706674818/1428412048911503471>
    const messageHandledKey = `messageHandled:${event.messageId}`;
    if (await context.redis.exists(messageHandledKey)) {
      return;
    }
    await context.redis.set(messageHandledKey, "true", { expiration: ResolveSecondsAfter(OneDayInSeconds) });

    const conversationResponse = await context.reddit.modMail.getConversation({
      conversationId: event.conversationId,
    }), { conversation } = conversationResponse; // , date = new Date(event.createdAt ?? new Date);
    if (!conversation) return;
    if (!event.messageAuthor) return;

    const messagesInConversation = Object.values(conversation.messages);
    const firstMessage = messagesInConversation[0];
    if (!firstMessage.id) return;
    //const isFirstMessage = event.messageId.includes(firstMessage.id);
    const currentMessage = messagesInConversation.find(message => message.id && event.messageId.includes(message.id));
    if (!currentMessage) return;
    const isMod = Boolean(Object(currentMessage.author).isMod),
      isAdmin = Boolean(Object(currentMessage.author).isAdmin);
    const conversationId = event.conversationId.split(/_/)[1];
    const userId = event.messageAuthor.id;
    const key = `userId-${userId}`;
    const { redis } = context;
    if (isMod || isAdmin) {
      if (isMod) {
        // conversation.participant?.id = about 153573674696316

        const userName = conversation.participant?.name;
        if (userName) {
          const key = `userId-${(await context.reddit.getUserByUsername(userName))?.id}`;
          await redis.del(key);
        }
      }
      return;
    }
    const timeframe = await context.settings.get('timeframe');
    if (!timeframe) return;
    const messagesSent = await redis.incrBy(key, 1);
    await redis.expire(key, +timeframe);
    const messagesRequireMent = await context.settings.get('messages'),
      muteTime = (await context.settings.get('muteTime'))!;
    //console.log(printLn({ muteTime, messagesRequireMent, messagesSent, }));
    if (messagesRequireMent && +muteTime) {
      if (messagesSent > +messagesRequireMent) {
        const body = String((await context.settings.get('messageUponMute')) || defaultValue);
        await context.reddit.modMail.reply({
          body, conversationId,
          isAuthorHidden: true,
        });
        await context.reddit.modMail.muteConversation({
          conversationId, // @ts-expect-error
          numHours: +muteTime,
        });
      }
    }
  },
});



const usernameEvalForm = Devvit.createForm(
  {
    fields: [
      {
        type: 'string',
        name: 'username',
        label: 'Enter a username',
        helpText: 'the user you want to evaluate. (without u/)',
        required: true,
      },
    ],
    title: 'Evaluate User',
    acceptLabel: 'Submit',
  },
  async function (event, context) {
    const currentUsername = await context.reddit.getCurrentUsername();


    if (currentUsername === undefined) return;
    const username: string = event.values.username.trim().replace(/^u\//, '') ?? '[undefined]';
    if (/^[a-zA-Z0-9\-_]+$/.test(username)) {
      const id = (await context.reddit.getUserByUsername(username))?.id;
      if (id === undefined) {
        context.ui.showToast(`username does not exist or devvit couldnt find it`);
        return;
      }
      const messagesSent = await context.redis.get(`userId-${id}`);
      context.ui.showToast(`they send ${messagesSent} messages in the timeframe. speak to them as moderator to reset the timeframe`);
    } else if (username === '[undefined]') {
      context.ui.showToast({ text: `there was no username given` });
    } else {
      context.ui.showToast({ text: `that username is syntactically invalid` });
    }
  }
);

Devvit.addMenuItem({
  label: 'Query User RateLimit',
  description: 'check for a particular user',
  location: 'subreddit',
  forUserType: 'moderator',
  async onPress(_event, context) {
    context.ui.showForm(usernameEvalForm);
  }
});

export default Devvit; // validateRangeInt('', minInclusive, maxInclusives)
function validateRangeInt(variable: string, minInclusive: number, maxInclusive: number) {
  return function ({ value }) {
    try {
      // @ts-expect-error
      const b = BigInt(value);
      if (b < minInclusive) throw new RangeError(`${variable} must be greater than ${minInclusive}, received ${b}`);
      if (b > maxInclusive) throw new RangeError(`${variable} must be less than ${maxInclusive}, received ${b}`);
    } catch (err) {
      return String(err);
    } return undefined;
  } as ({ value }: { value: number | undefined }) => string | undefined;
}

function printLn(varaibles: any) {
  const result = [];
  for (const [keuy, value] of Object.entries(varaibles)) {
    let variable = String(keuy) + '=';
    if (value === null) {
      result.push(`${variable}null`);
      continue;
    }
    switch (typeof value) {
      case "string":
      case "symbol":
        variable += JSON.stringify(String(value));
        break;
      case "number":
        variable += JSON.stringify(value);
        break;
      case "bigint":
        variable += String(value) + 'n';
        break;
      case "boolean":
        variable += JSON.stringify(value);
        break;
      case "undefined":
        variable += "undefined";
        break;
      case "object":
        variable += JSON.stringify(value);
        break;
      case "function":
        variable += JSON.stringify(String(value));
        break;
      default:
        throw new TypeError(`typeof value is not recognized (${typeof value})`);
    }
    result.push(variable);
  }
  return result.join('; ');
}

function ResolveSecondsAfter(s: number = 0, now?: Date | string | number): Date {
  return new Date((new Date(now ?? Date.now())).setMilliseconds(0) + (+s) * 1000);
}
