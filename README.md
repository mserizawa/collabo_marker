# CollaboMarker

---

A Collaborative real-time markdown editor.

[![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)

## Features

The current version of Collabo Marker provides a basic features below:

* Collaborative edit
* Live markdown preview
* Sync scroll between editor and preview
* Chat with collaborators

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
