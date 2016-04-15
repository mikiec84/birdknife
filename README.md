# birdknife
[![Build Status](https://travis-ci.org/vanita5/birdknife.svg)](https://travis-ci.org/vanita5/birdknife) [![NPM Downloads](https://img.shields.io/npm/dt/birdknife.svg)](https://www.npmjs.com/package/birdknife) [![NPM Version](https://img.shields.io/npm/v/birdknife.svg)](https://www.npmjs.com/package/birdknife) [![Dependency Status](https://www.versioneye.com/user/projects/56d83d23d716950040a0f014/badge.svg?style=flat)](https://www.versioneye.com/user/projects/56d83d23d716950040a0f014)

> Twitter CLI

<p align="center">
  <img src="birdknife.png"/ width="360">
</p>

birdknife is a Twitter CLI based on [Vorpal](https://github.com/dthree/vorpal) inspired by [TTYtter](http://www.floodgap.com/software/ttytter/).
TTYtter hasn't been updated for some time now and doesn't support new features introduced by Twitter. This project aims to be a completely
functional Twitter client for your CLI.

## Features

* Full featured Twitter CLI
* Cross platform
* Update your status with location
* Read your timeline and interact with tweets
    * Reply, retweet, like (fav),...
* Interact with users
    * Follow, block, mute
* Search
* Hashtag and @screen_name autocompletion
* Notifications (Cross platform)

#### In the future

* Update status with media
* Work with lists
    * Follow, view, create, add/remove users,...
* Manage multiple accounts
* Open/View media and urls (browser or image viewer)

## Installation

Install `birdknife` globally via npm:

```bash
$ npm install birdknife -g
```

## Configuration

After initially calling birdknife, you should find a configuration file in your home directory.

**GNU/Linux, Mac OS X,...**
`~/.birdknife.json`

**Windows**
`C:\Users\user\.birdknife.json`

Example:
```json
{
  "version": 5,
  "auth": {
    "consumer_key": "XXXXXXXXXXXXXXXXXXXXXX",
    "consumer_secret": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "access_token": "00000000-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "access_token_secret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  },
  "preferences": {
    "debug": false,
    "notifications": true,
    "location": false,
    "tweet_protection": false
  }
}
```

**Only edit values under the `preferences` section!**

### Preferences

<table>
    <tr>
        <th>Preference</th>
        <th>Description</th>
        <th>Values</th>
        <th>Default</th>
    </tr>
    <tr>
        <td><code>debug</code></td>
        <td>Enable/Disable debug output and the like. Not in use at the moment.</td>
        <td><code>true</code>, <code>false</code></td>
        <td><code>false</code></td>
    </tr>
    <tr>
        <td><code>notifications</code></td>
        <td>Enable/Disable notifications. <i>birdknife</i> can display notifications for <i>mentions, likes, retweets, followings,...</i><br/>
        This is a cross platform feature running on <b>GNU/Linux</b> (<code>notify-osd</code> or <code>libnotify</code>),<br/>
        <b>Mac OS X</b> (NotificationCenter, since 10.8) and <b>Windows 8</b> (and newer).<br/>
        Alternatively it supports <b>Growl</b> in case nothing else works.
        </td>
        <td><code>true</code>, <code>false</code></td>
        <td><code>true</code></td>
    </tr>
    <tr>
        <td><code>location</code></td>
        <td>Enable/Disable posting your location. The location can be detected automatically.<br/>Alternatively you can provide coordinations.</td>
        <td><code>false</code>, <code>"auto"</code> (or <code>true</code>),<br/>
        <code>{ lat: 57.52936, lng:  -6.24176 }</code>
        </td>
        <td><code>false</code></td>
    </tr>
    <tr>
        <td><code>tweet_protection</code></td>
        <td>If set to true this should prevent accidentally posting a status update. To post a status, enter <code>/tweet</code> first.<br/>
        This command provides a new prompt where you can enter your status update.</td>
        <td><code>false</code>, <code>true</code></td>
        <td><code>false</code></td>
    </tr>
        <td><code>timestamp</code></td>
        <td>Set the time interval in minutes where birdknife will print out timestamps.<br/>
        To disable timestamps, set <code>timestamp</code> to <code>0</code>.</td>
        <td><code>0</code>-<code>59</code></td>
        <td><code>5</code></td>
    </tr>
</table>

#### Edit preferences

_Note: You can also directly edit the config file!_

##### List preferences

```
birdknife [---]> /preferences
|
|   debug:          false
|   notifications:  true
|   location:       "auto"
|
```

##### Set preference

```
birdknife [---]> /set notification false
notifications is now set to false

birdknife [---]> /set location { "lat": 57.52936, "lng": -6.24176 }
location is now set to [object Object]

birdknife [---]> /preferences
|
|   debug:          false
|   notifications:  false
|   location:       {"lat":57.52936,"lng":-6.24176}
|
```

## Information

##### Tweet prefix

Some tweets have a prefix before the username. Those prefixes indicate characteristics of a tweet.

Example: `b1> <*@username>: What a beautiful day!`

<table>
    <tr>
        <th>Prefix</th>
        <th>Description</th>
    </tr>
    <tr>
        <td>*</td>
        <td>Indicates that this tweet is a reply to another tweet. It is probably part of a conversation/thread.<br/>
        <b>Hint:</b> Run <code>/thread <id></code> to view the thread.</td>
    </tr>
    <tr>
        <td>↑</td>
        <td>This tweet is either a reply to the tweet above (only in conversations) or has been quoted by the tweet above.</td>
    </tr>
</table>

## Usage

##### Login (PIN authorization)

```
birdknife [---]> /login

Login and copy the PIN number: https://twitter.com/oauth/authorize?oauth_token=XXXX-XXXXXXXXXXXXXXXXXXXXXX
PIN:
```

To remove your account from birdknife: `/logout`

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
/user <screen_name>
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
