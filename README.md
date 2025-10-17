# FrequentMuter: a bot that mutes spam in modmail

since reddit pms were moved to reddit chat, moderators have said that messages

wil  
be  
short,  
fast,  
and  
feel  
spammy

like that. which is why i built this thing. it mutes anyone who (sends `X` messages in `Y` seconds) to receive a `Z` mute.

oh yeah, you need to specify `Y` in seconds, but a quick google search will help.

[source code at: https://github.com/DNSCond/frequentmuter.git](https://github.com/DNSCond/frequentmuter.git)

to reset the tracker either wait Y seconds or speak to them in modmail. just unmuting them will not work.

note that it may not immdietly work if the user is fast

## changelog

### 0.0.6 (at 2025-10-17): Customizzed mutes

- you can now set a custom mute duration, which i mean the bot will try to unmute the user when it esaplses.
- if custom mute duration is set a line like `You will be automatically unmuted at about Fri Oct 17 2025 11:27 (Coordinated Universal Time)`
  will be added to inform the user. futher versions may disable it
- other things.


