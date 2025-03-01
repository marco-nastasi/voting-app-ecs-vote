const express = require('express');
const async = require('async');
const { Pool } = require('pg');
const cookieParser = require('cookie-parser');
const path = require('path');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

// Environment variables with defaults
const port = process.env.PORT || 4000;
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || 'postgres';
const dbHost = process.env.DB_HOST || 'db';
const dbName = process.env.DB_NAME || 'postgres';
const dbPort = process.env.DB_PORT || 5432;

// Socket.io setup
io.on('connection', (socket) => {
  socket.emit('message', { text: 'Welcome!' });
  socket.on('subscribe', (data) => {
    socket.join(data.channel);
  });
});

// Database configuration
const pool = new Pool({
  // connectionString: `postgres://${dbUser}:${dbPassword}@${dbHost}/${dbName}`
  user: dbUser,
	password: dbPassword,
	host: dbHost,
	port: dbPort,
	database: dbName,
});

// Database connection retry logic
async.retry(
  { times: 1000, interval: 1000 },
  (callback) => {
    pool.connect((err, client, done) => {
      if (err) {
        console.error("Waiting for db");
      }
      callback(err, client);
    });
  },
  (err, client) => {
    if (err) {
      return console.error("Giving up");
    }
    console.log("Connected to db");
    getVotes(client);
  }
);

function getVotes(client) {
  client.query(
    'SELECT vote, COUNT(id) AS count FROM votes GROUP BY vote',
    [],
    (err, result) => {
      if (err) {
        console.error("Error performing query: " + err);
      } else {
        const votes = collectVotesFromResult(result);
        io.sockets.emit("scores", JSON.stringify(votes));
      }
      setTimeout(() => getVotes(client), 1000);
    }
  );
}

function collectVotesFromResult(result) {
  const votes = { a: 0, b: 0 };
  result.rows.forEach((row) => {
    votes[row.vote] = parseInt(row.count);
  });
  return votes;
}

// Express middleware
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));  // Updated to include 'extended' option
app.use(express.static(__dirname + '/views'));

// Routes
app.get('/', function (req, res) {
  res.sendFile(path.resolve(__dirname + '/views/index.html'));
});

// New route for /result
app.get('/result', function (req, res) {
  res.sendFile(path.resolve(__dirname + '/views/index.html'));
});

// Start server
server.listen(port, function () {
  var port = server.address().port;
  console.log('App running on port ' + port);
});