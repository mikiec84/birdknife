# birdknife
[![Build Status](https://travis-ci.org/vanita5/birdknife.svg)](https://github.com/vanita5/birdknife) [![NPM Downloads](https://img.shields.io/npm/dt/birdknife.svg)](https://www.npmjs.com/package/birdknife) [![NPM Version](https://img.shields.io/npm/v/birdknife.svg)](https://www.npmjs.com/package/birdknife)

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
TTYtter hasn't been updated for some time now and doesn't support some new features introduced by Twitter. This project aims to be a completely
functional Twitter client for your CLI.

## Installation

Install `birdknife` globally via npm:

```bash
$ npm install birdknife -g
```

## Usage

##### Login (PIN authorization)

```bash
birdknife [---]> /login

Login and copy the PIN number: https://twitter.com/oauth/authorize?oauth_token=XXXX-XXXXXXXXXXXXXXXXXXXXXX
PIN:
```

##### Tweet

```bash
birdknife [128]> Hello World!
```

##### View threads / conversations

```bash
birdknife [---]> /thread <id>
```

##### Reply to a tweet

```bash
a1> <@twitter>: #birdknife is kinda nice!

birdknife [133]> /reply a1 FAAAKE!
```

##### Retweet

```bash
birdknife [---]> /retweet <id>
```
Alias: ```/rt```

##### Like / Favorite

```bash
birdknife [---]> /like <id>
```
Alias: ```/fav```

##### Remove from likes / favorites

```bash
birdknife [---]> /unlike <id>
```
Alias: ```/unfav```

##### Follow / Unfollow

```bash
birdknife [---]> /follow _vanita5
```

```bash
birdknife [---]> /unfollow _vanita5
```

##### Mentions / Replies

```bash
birdknife [---]> /replies
```
Show recent mentions.

##### Direct messages

**Note: You can reply to dms directly with the ```/reply <id>``` command!** 

```bash
birdknife [---]> /dms
```
Display direct messages inbox.

```bash
birdknife [---]> /dm _vanita5 Hello, this is a test from birdknife.
```
Send DMs to a user.

##### Search

```bash
birdknife [---]> /search <query>
```
Search for tweets.

##### Quit

```bash
birdknife [---]> /exit
```

##### Other commands

```bash
/again [screen_name]
```
Reloads your timeline or loads recent tweets of a user if screen_name is given.


```bash
/delete <id>
```
Delete a tweet.

```bash
/user [screen_name]
```
Display user information

```bash
/show <id>
```
Display a tweet with additional information.


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
