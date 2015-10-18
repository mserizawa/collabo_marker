# CollaboMarker

A Collaborative real-time markdown editor.

This is *beta version* software.


[![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)

## Capture

![aa](https://raw.githubusercontent.com/wiki/mserizawa/collabo_marker/images/collabomarker_cap.png)

## Features

The current version of Collabo Marker provides a basic features below:

* Collaborative edit
* Live markdown preview
* Sync scroll between editor and preview
* Chat with collaborators

## Beta version caution

### Do not support IME input officially

If you want to input Japanese, Chinese or other language which needs IME, try to access Collabo Marker with request parameter `ime-enabled=true` . But please note that there are a lot of bugs...

```
http://localhost:4000/?ime-enabled=true
```


### Do not ensure  perfect document sync

When a lot of changes happens at the same time, documents may lose their Idempotence.


## How to start

### Your local

First of all, install softwares below.

* elixir
* phoenix
* npm

And then

```sh
$ git clone https://github.com/mserizawa/collabo_marker.git
$ cd collabo_marker/
$ npm install
$ mix deps.get
$ elixir --detached -S mix phoenix.server
```

Now you can use CollaboMarker on `http://localhost:4000/` .


### Heroku

Use Deploy to Heroku button and enjoy.

## Recommended browser

* Chrome: latest
* Firefox: latest
* Safari: latest

## TODO

- [x] Implement cursor rendering function
- [x] Substitute Angularjs for jQuery
- [x] Implement markdown preview function
- [x] Implement logined user management function
- [x] Implement login function
- [x] Implement content share function
- [x] Implement chat function
- [x] Fix layout
- [x] Synchronize scrollTop between editor and preview
- [x] Hide cursors on load
- [ ] Save login status to cookie
- [x] Keep user names unique
- [x] Improve login UX
- [ ] Show join / disconnected message
- [ ] Remove unnecessary files
- [x] Write README
- [x] Put 'Deploy to Heroku'
- [ ] Fix the bug of losing others inputs
- [ ] Support IME input officially
