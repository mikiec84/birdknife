# birdknife
[![Build Status](https://travis-ci.org/vanita5/birdknife.svg)](https://github.com/vanita5/birdknife) [![NPM Downloads](https://img.shields.io/npm/dt/birdknife.svg)](https://www.npmjs.com/package/birdknife) [![NPM Version](https://img.shields.io/npm/v/birdknife.svg)](https://www.npmjs.com/package/birdknife) [![Dependency Status](https://www.versioneye.com/user/projects/56d83d23d716950040a0f014/badge.svg?style=flat)](https://www.versioneye.com/user/projects/56d83d23d716950040a0f014)

> Twitter CLI

```text
  `                   `-:/+++/:-`   `..                                                              ___
  //.                :+++++++++++///+-                                                              |_  |
 .+++/-`            /++++++++++++++/:::`                                                              | |
 `++++++/-`        .++++++++++++++++:.        __                      ____                            | |
  -+++++++++/:-.```-+++++++++++++++/          \ ````''''----....____.'\   ````''''--------------------| |--.               _____      .-.
 ``./++++++++++++++++++++++++++++++/           :.                      `-._                           | |   `''-----''''```     ``''|`: :|
 `++/++++++++++++++++++++++++++++++-            '::.                       `'--.._____________________| |                           | : :|
  -++++++++++++++++++++++++++++++++`              '::..       ----....._______________________________| |                           | : :|
   `:+++++++++++++++++++++++++++++-                 `'-::...__________________________________________| |   .-''-..-'`-..-'`-..-''-.cjr :|
    `.:/+++++++++++++++++++++++++-                       ```'''---------------------------------------| |--'                         `'-'
     :++++++++++++++++++++++++++-                                                                     | |
      .:++++++++++++++++++++++/.                                                                     _| |
         ..:++++++++++++++++/-                                                                      |___| cjr
       `-:/+++++++++++++++/.                  
`.:///++++++++++++++++/:-`                    
   `.--:///++++//::-.`                        
```



> Ascii Art from ascii-code.com by `cjr`

birdknife is a Twitter CLI based on [Vorpal](https://github.com/dthree/vorpal) inspired by [TTYtter](http://www.floodgap.com/software/ttytter/).
TTYtter hasn't been updated for some time now and doesn't support new features introduced by Twitter. This project aims to be a completely
functional Twitter client for your CLI.

## Installation

Install `birdknife` globally via npm:

```bash
$ npm install birdknife -g
```

## Usage

##### Login (PIN authorization)

```
birdknife [---]> /login

Login and copy the PIN number: https://twitter.com/oauth/authorize?oauth_token=XXXX-XXXXXXXXXXXXXXXXXXXXXX
PIN:
```

##### Tweet

```
birdknife [128]> Hello World!
```

##### View threads / conversations

```
birdknife [---]> /thread <id>
```

##### Reply to a tweet

```
a1> <@twitter>: #birdknife is kinda nice!

birdknife [133]> /reply a1 FAAAKE!
```

##### Quote a tweet

```
a1> <@twitter>: #birdknife is kinda nice!

birdknife [133]> /quote a1 FAAAKE!

a2> <@_vanita5>: FAAAKE! https://twitter.com/twitter/status/12345678901234

a3> |   <↑@twitter>: #birdknife is kinda nice!
```

##### Retweet

```
birdknife [---]> /retweet <id>
```
Alias: ```/rt```

##### Like / Favorite

```
birdknife [---]> /like <id>
```
Alias: ```/fav```

##### Remove from likes / favorites

```
birdknife [---]> /unlike <id>
```
Alias: ```/unfav```

##### Follow / Unfollow

```
birdknife [---]> /follow _vanita5
```

```
birdknife [---]> /unfollow _vanita5
```

##### Block / Unblock

```
birdknife [---]> /block _vanita5
```

```
birdknife [---]> /unblock _vanita5
```

##### Mute / Unmute

```
birdknife [---]> /mute _vanita5
```

```
birdknife [---]> /unmute _vanita5
```

##### Mentions / Replies

```
birdknife [---]> /replies
```
Show recent mentions.

##### Direct messages

**Note: You can reply to dms directly with the ```/reply <id>``` command!** 

```
birdknife [---]> /dms
```
Display direct messages inbox.

```
birdknife [---]> /dm _vanita5 Hello, this is a test from birdknife.
```
Send DMs to a user.

##### Search

```
birdknife [---]> /search <query>
```
Search for tweets.

##### Quit

```
birdknife [---]> /exit
```

##### Other commands

```
/again [screen_name]
```
Reloads your timeline or loads recent tweets of a user if screen_name is given.


```
/delete <id>
```
Delete a tweet.

```
/user [screen_name]
```
Display user information

```
/show <id>
```
Display a tweet with additional information.


## Development

Fork, clone, `npm install`, code, pull request. :)


## License

```
(The MIT License)

Copyright (c) 2016 vanita5 <mail@vanit.as>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```
