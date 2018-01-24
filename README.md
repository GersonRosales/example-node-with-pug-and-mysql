# Prototipe
It app do 3 examples of report list, bars and pie; the data is out putted from a database in MySql, using Node and Pug

## Requirements

- Install Node
	- on OSX install [home brew](http://brew.sh/) and type `brew install node`
	- on Windows install [chocolatey](https://chocolatey.org/) 
    - Read here for some [tips on Windows](http://jpapa.me/winnode)
    - open command prompt as administrator
        - type `choco install nodejs`
        - type `choco install nodejs.install`
    - On OSX you can alleviate the need to run as sudo by [following these instructions](http://jpapa.me/nomoresudo). I highly recommend this step on OSX
        - Open terminal
        - Type `npm install -g node-inspector bower gulp`

- Install MySql
    - [instructions](https://dev.mysql.com/doc/refman/5.7/en/installing.html)

- Load the [Database](https://www.dropbox.com/s/05j300twtvsx42r/banco_de_dados.sql?dl=0) in SQL

## Quick Start
Clone this repo and run the content locally
```
$ npm install
$ nodemon ./bin/www
```
then open in your browser [http://localhost:3000](http://localhost:3000)

## Preview
![demo](https://user-images.githubusercontent.com/863330/35323789-25691f48-00c5-11e8-9866-fd56f4766e9b.gif)