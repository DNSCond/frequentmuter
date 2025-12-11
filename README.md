# (Frequency Muter) u/FrequentMuter: a bot that mutes rapid replies in modmail

Since reddit moved fully to reddit chat, some users use modmail as chat.

for example;  
Hey  
will  
be  
short  
fast  
and  
feel  
spammy

This app will help with that by sending a (customizable) message to the user followed by a mute, stopping them from sending more messages. The app will mute users who send X messages in Y seconds, and will give them a Z mute.

You can set X, Y (in seconds) and Z in the settings of the app.

It resets once you've replied in modmail or Y time has passed. Note, the tracker overrules a manual unmute.

Some users type faster then the app can act, so note that at times the app may appear to respond slow.

[Source code can be found at: https://github.com/DNSCond/frequentmuter](https://github.com/DNSCond/frequentmuter)

## changelog

### 0.0.20: The Warning Before The Mute

- updated default mute and ban messages.
- the bot can now warn a user about rapid messaging before muting.
  - this warning is disabled by default.
  - the warning can be configured by the mods.

### 0.0.17: updated default mute message and readme.

- updated default mute message and readme.

### 0.0.12, to 0.0.16: Updated ReadME

thanks to [SampleOfNone](https://discord.com/users/894324211735199835)
and [KockaAdmiralac](https://discord.com/users/148231501413089280) in
the devvit discord for helping me write the readme.

### 0.0.10 - 0.0.11

Added feature: The app can now also ban users that are rapid posting (X posts in Y seconds will give them a Z ban)

### < 0.0.10

initial release
