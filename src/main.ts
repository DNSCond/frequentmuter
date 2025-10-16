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
        defaultValue: OneDayInSeconds, //required: true,
        onValidate: validateRangeInt('Y', 500, Infinity),
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
        type: 'string',
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
    const conversationResponse = await context.reddit.modMail.getConversation({
      conversationId: event.conversationId,
    }), date = new Date(event.createdAt ?? new Date);
    if (!conversationResponse.conversation) return;
    if (!event.messageAuthor) return;

    const messagesInConversation = Object.values(conversationResponse.conversation.messages);
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
    if (isMod || isAdmin) return;
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
