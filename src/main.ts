import { Devvit, TriggerContext } from "@devvit/public-api";
import { ModMail } from "@devvit/protos";
import { EXMAScript, jsonEncode } from "anthelpers";

Devvit.configure({ redditAPI: true, redis: true });
const OneDayInSeconds = 86400, OneHourInSeconds = 3600;
const defaultValue = "You have been temporarily muted for flooding this subreddit's modmail with messages.\n\nPlease " +
  "make sure to send 1 message with everything you have to say or ask and give mods the time and opportunity to reply",
  messageUponBanPost = 'You have been Banned for spamming this subreddit.',
  defaultwarning = 'Hi, the modmail interface has migrated to Reddit Chat recently. ' +
    'Despite this change, **treating modmail as a chatroom is generally frowned upon.** ' +
    'Please form your full message before sending it to the moderators, because it would otherwise be seen as modmail spam.' +
    ' If you\'re on desktop, you can use Ctrl+Enter to write a new line before sending your message. '
    + 'or use another app to format your messages';
Devvit.addSettings([
  {
    type: 'group',
    label: 'send X messages in modmail in Y seconds and receive a Z mute',
    fields: [
      {
        type: 'boolean',
        name: 'modmailEnabled',
        label: 'whether to take action for spamming modmail',
        helpText: `whether to take action for flooding modmail, if turned off, no muting will occur`,
        defaultValue: true,
      },
      {
        type: 'number',
        name: 'timeframe',
        label: 'Set the time in seconds to calculate if a user is sending more the X messages in Y time (Must be greater then 300)',
        helpText: `1 hour is ${OneHourInSeconds} seconds, 1 day is ${OneDayInSeconds}`,
        defaultValue: OneHourInSeconds, //required: true,
        onValidate: validateRangeInt('Y', 300, Infinity),
      },
      {
        type: 'number',
        name: 'messages',
        label: 'Set the number of messages that a user can send in succession before the bot mutes the user',
        helpText: 'must be a number between 1 and 20',
        defaultValue: 4, //required: true,
        onValidate: validateRangeInt('X', 1, 40),
      },
      {
        type: 'select',
        name: 'muteTime',
        label: 'Set the duration of the mute',
        helpText: 'When a mod replies to the user, the count will reset',
        defaultValue: ['72'],
        //required: true,
        options: [
          { label: '3 days (about 259 200s)', value: '72' },
          { label: '7 days (about 604 800s)', value: '168' },
          { label: '28 days (about 2 419 200s)', value: '672' },
        ],
      },
      {
        type: 'number',
        name: 'muteTimeCustom',
        label: 'Set the number of seconds to automatically unmute (needs to be less then the duration of the mute)',
        helpText: `if the Reddit default mute options are too long, use this setting to shorten the mute,`
          + `must be between 17 and ${OneDayInSeconds * 27} inclusive, or 0 to not automatically unmute`,
        defaultValue: 0, //required: true,
        onValidate: validateRangeInt('X', 17, OneDayInSeconds * 27, true),
      },
      {
        type: 'paragraph',
        name: 'messageUponMute',
        label: 'The message that will be send when the user is muted',
        helpText: 'supports modmail markdown',
        defaultValue,
      },
      {
        type: 'group',
        label: 'Additional settings to warn a user first',
        helpText: 'send X messages in modmail in Y seconds and receive a warning. (make sure these settings'
          + ' happen earlier than the mute settings as otherwise themwarn will not ahppen)',
        fields: [
          {
            type: 'boolean',
            name: 'warningModmailEnabled',
            label: 'whether to warn the user for spamming modmail',
            helpText: `if turned off, no warning will occur, but the count will happen`,
            defaultValue: false,
          },
          {
            type: 'number',
            name: 'timeframeWarning',
            label: 'define Y here. must be greater than 300',
            helpText: `1 hour is ${OneHourInSeconds} seconds, 1 day is ${OneDayInSeconds}`,
            defaultValue: OneHourInSeconds * 2, //required: true,
            onValidate: validateRangeInt('Y', 300, Infinity),
          },
          {
            type: 'number',
            name: 'messagesWarning',
            label: 'Set the number of messages that a user can send in succession before the bot sends a warning',
            helpText: 'must be a number between 1 and 20',
            defaultValue: 3, //required: true,
            onValidate: validateRangeInt('X', 1, 20),
          },
          {
            type: 'number',
            name: 'warningLastsFor',
            label: 'how long the warning should last for',
            helpText: 'in seconds',
            defaultValue: 6 * 60, //required: true,
            onValidate: validateRangeInt('X', 1 * 60, 20 * 60),
          },
          {
            type: 'paragraph',
            name: 'messageUponWarn',
            label: 'a message to send when the author gets muted. not including the default',
            helpText: 'supports modmail markdown',
            defaultValue: defaultwarning,
          },
        ],
      },
    ],
  },
  {
    type: 'group',
    label: 'create X Posts in Y seconds and receive a Z Ban',
    helpText:'these settings are intented to handle egregious cases (like 25 posts in 10 seconds), other bots can be used for less punishing cases.',
    fields: [
      {
        type: 'boolean',
        name: 'postsEnabled',
        label: 'whether to take action for spamming posts',
        helpText: `If turned off, the bot will not ban`,
        defaultValue: false,
      },
      {
        type: 'number',
        name: 'timeframePosts',
        label: 'Set the time in seconds to calculate if a user is ssubmitting more the X posts in Y time ( Must be greater then 100)',
        helpText: `1 hour is ${OneHourInSeconds} seconds, 1 day is ${OneDayInSeconds}`,
        defaultValue: OneHourInSeconds, //required: true,
        onValidate: validateRangeInt('PostY', 100, Infinity),
      },
      {
        type: 'number',
        name: 'numberOfPosts',
        label: 'Set the number of posts to allow within the set time (must be a number between 1 and 1000)',
        helpText: 'must be betwen 1 and 100 (define X here)',
        defaultValue: 12, //required: true,
        onValidate: validateRangeInt('PostX', 1, 1000),
      },
      {
        type: 'number',
        name: 'BanTimePosts',
        label: 'the time to Ban in days (define Z here)',
        helpText: 'Set the duration of the ban in days(must be a number between 1 and 20) Set to 0 to not ban',
        defaultValue: 2, //required: true,
        onValidate: validateRangeInt('PostZ', 1, 20, true),
      },
      {
        type: 'paragraph',
        name: 'messageUponBanPost',
        label: 'The message that will be send when the user is banned',
        helpText: 'supports modmail markdown',
        defaultValue: messageUponBanPost,
      },
    ],
  }
]);

Devvit.addTrigger({
  event: 'ModMail',
  async onEvent(event: ModMail, context: TriggerContext) {
    // devvit discord: <https://discord.com/channels/1050224141732687912/1131417992706674818/1428412048911503471>
    const messageHandledKey = `messageHandled:${event.messageId}`, now = new Date;
    if (await context.redis.exists(messageHandledKey)) {
      return;
    }
    await context.redis.set(messageHandledKey, "true", { expiration: ResolveSecondsAfter(OneDayInSeconds) });

    const conversationResponse = await context.reddit.modMail.getConversation({
      conversationId: event.conversationId,
    }), { conversation } = conversationResponse;
    // , date = new Date(event.createdAt ?? new Date);
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
    const userId = event.messageAuthor.id, username = event.messageAuthor.name;
    const { key, muteDurationRedisKey, warningKey } = getKeyFromUserId(userId);
    const { redis } = context;
    if (isMod || isAdmin) {
      if (isMod) {
        // conversation.participant?.id = about 153573674696316
        const userName = conversation.participant?.name;
        if (userName && username !== 'frequentmuter') {
          await removeRedisKey((await context.reddit.getUserByUsername(userName))?.id, context);
        }
      }
      return;
    }

    const hasReceivedWarning = !!await redis.get(warningKey);
    const timeframe = hasReceivedWarning ? (await context.settings.get('timeframe'))
      : (await context.settings.get('timeframeWarning')); if (!timeframe) return;
    const messagesSent = await redis.incrBy(key, 1);
    await redis.expire(key, +timeframe);
    const messagesRequireMent = await context.settings.get<number>('messages'),
      muteTimeCustom = +(await context.settings.get<number>('muteTimeCustom') as number),
      muteTime = +(await context.settings.get('muteTime'))!, hasCustom = !!(muteTimeCustom),
      modmailEnabled = (await context.settings.get<boolean>('modmailEnabled'));

    if (await context.settings.get('warningModmailEnabled')) {
      const messagesRequireMent = await context.settings.get<number>('messages'),
        warningLastsFor = (await context.settings.get<number>('warningLastsFor')) || (6 * 60);
      if (messagesRequireMent && !hasReceivedWarning) {
        if (messagesSent > messagesRequireMent) {
          await redis.set(warningKey, now.toISOString(), { expiration: ResolveSecondsAfter(warningLastsFor, now) })
          const body = (await context.settings.get<string>('messageUponWarn')) || defaultwarning;
          await context.reddit.modMail.reply({
            body, conversationId,
            isAuthorHidden: true,
          }); return;
        }
      }
    }
    if (messagesRequireMent && muteTime) {
      if (messagesSent > messagesRequireMent && modmailEnabled) {
        const now = Date.now(), runAt = ResolveSecondsAfter(muteTimeCustom, now);
        let body = String((await context.settings.get('messageUponMute')) || defaultValue);
        if (hasCustom) {
          body += `\n\nYou will be automatically unmuted at about ${sliceOut(String(runAt), 21, 33, true)}`;
        }
        await context.reddit.modMail.reply({
          body, conversationId,
          isAuthorHidden: true,
        });
        await context.reddit.modMail.muteConversation({
          conversationId, // @ts-expect-error
          numHours: muteTime,
        });
        if (hasCustom) {
          const jobId = await context.scheduler.runJob({
            name: 'unmuteTimeCustom', runAt,
            data: { userId, conversationId, },
          });
          const expiration = runAt;// being set here
          await context.redis.set(muteDurationRedisKey, jsonEncode({ expiration, jobId }), { expiration });
        }
      }
    }
  },
});

Devvit.addTrigger({
  event: 'PostSubmit',
  async onEvent(event, context) {
    const now = new Date, author = event.author;
    if (author) {
      const authorId = author.id, username = author.name;
      const timeframe = await context.settings.get<number>('timeframePosts'),
        expiration = ResolveSecondsAfter(timeframe, now);
      if (!await context.redis.exists(`allotedPostsInTime-${authorId}`))
        await context.redis.set(`allotedPostsInTime-${authorId}`, '0', { expiration });
      const posts = await context.redis.incrBy(`allotedPostsInTime-${authorId}`, 1),
        maxAllottedPosts = (await context.settings.get<number>('numberOfPosts'))!,
        duration = (await context.settings.get<number>('BanTimePosts'))!;
      // if its NaN, its guaraenteed to be false.
      if (posts >= maxAllottedPosts && (await context.settings.get<number>('postsEnabled') && duration)) {
        const message = (await context.settings.get<string>('numberOfPosts')) || messageUponBanPost,
          reason = `Send More than ${maxAllottedPosts} in ${timeframe} seconds`;
        await (await context.reddit.getCurrentSubreddit()).banUser({
          reason, username, message, duration, note: reason,
        });
      }
    }
  },
});

Devvit.addSchedulerJob({
  name: 'unmuteTimeCustom', async onRun(event, context) {
    if (event.data) {
      const { userId, conversationId }: { userId: string, conversationId: string } = event.data as any;
      const conversation = await context.reddit.modMail.getConversation({ conversationId });
      if (conversation?.conversation) {
        await context.reddit.modMail.unmuteConversation(conversationId);
        console.log(`userId=(${userId}) is unmuted`);
        await removeRedisKey(userId, context);
      }
    }
  },
});

function getKeyFromUserId(userId?: string) {
  const key = `userId-${userId}`, warningKey = `${userId}-warning`,
    muteDurationRedisKey = key + '-muteDuration';
  return { key, muteDurationRedisKey, warningKey }; // = getKeyFromUserId(userId);
}

async function removeRedisKey(userId: string | undefined, { redis, scheduler }: TriggerContext) {
  const { key, muteDurationRedisKey, warningKey } = getKeyFromUserId(userId);
  console.log('removed', printLn({ userId }), 'from redis');

  const jobIdJson = await redis.get(muteDurationRedisKey);
  await redis.del(key); await redis.del(muteDurationRedisKey);
  await redis.del(warningKey);
  if (jobIdJson) {
    const jobId = JSON.parse(jobIdJson)['jobId'];
    await scheduler.cancelJob(jobId);
  }
  return { key, muteDurationRedisKey };
}

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
  }, async function (event, context) {
    const currentUsername = await context.reddit.getCurrentUsername();
    if (currentUsername === undefined) return;
    const username: string = event.values.username.trim().replace(/^u\//, '') ?? '[undefined]';
    if (/^[a-zA-Z0-9\-_]+$/.test(username)) {
      const id = (await context.reddit.getUserByUsername(username))?.id;
      if (id === undefined) {
        context.ui.showToast(`username does not exist or devvit couldnt find it`);
        return;
      }
      const { key, muteDurationRedisKey } = getKeyFromUserId(id);
      const messagesSent = await context.redis.get(key);
      const muteDuration = await context.redis.get(muteDurationRedisKey);

      let text = `they send ${messagesSent ?? 0} messages in the timeframe. speak to them as moderator to reset the timeframe.`;
      if (muteDuration) {
        const d = new Date(JSON.parse(muteDuration)['expiration']);
        text = `they are currently muted and will be unmuted by the bot at ${d}`;
      }
      context.ui.showToast({ text });
    } else if (username === '[undefined]') {
      context.ui.showToast({ text: `there was no username given` });
    } else {
      context.ui.showToast(`that username is syntactically invalid`);
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
function validateRangeInt(variable: string, minInclusive: number, maxInclusive: number, allow0: boolean = false) {
  return function ({ value }) {
    try {
      // @ts-expect-error
      const b = BigInt(value); if (allow0) if (b === 0n) return undefined;
      if (b < minInclusive) throw RangeError(`${variable} must be greater than ${minInclusive}, received ${b}`);
      if (b > maxInclusive) throw RangeError(`${variable} must be less than ${maxInclusive}, received ${b}`);
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

function sliceOut(string: string, start?: number, end?: number, strict: boolean = false) {
  if (string === undefined || string === null) throw new TypeError('sliceOut RequireObjectCoercible is false');
  string = `${string}`;
  const len = string.length;
  const intStart = EXMAScript.toIntegerOrInfinity(start);
  let from;
  if (strict) {
    from = intStart;
  } else {
    if (intStart === -Infinity) {
      from = 0;
    } else if (intStart < 0) {
      from = Math.max(len + intStart, 0);
    } else {
      from = Math.min(intStart, len);
    }
  }
  let intEnd;
  if (end === undefined) {
    intEnd = len;
  } else {
    intEnd = EXMAScript.toIntegerOrInfinity(end);
  }
  let to;
  if (strict) {
    to = intEnd;
  } else {
    if (intEnd === -Infinity) {
      to = 0;
    } else if (intEnd < 0) {
      to = Math.max(len + intEnd, 0);
    } else {
      to = Math.min(intEnd, len);
    }
  }
  if (from >= to) {
    if (strict) {
      throw new RangeError(`the normalized value of start (${from}) is greater than the normalized value of end (${to}) in sliceOut_String\'s strict mode`);
    } else {
      return "";
    }
  }
  if (strict) {
    if (from < 0) {
      throw new RangeError(`start is less than 0 in sliceOut_String\'s strict mode (got ${from})`);
    }
    if (to > len) {
      throw new RangeError(`end is greater than ${len} in sliceOut_String\'s strict mode (got ${to})`);
    }
  }
  return (string.slice(0, from) + string.slice(to));
}
