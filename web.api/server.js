// Get dependencies
const express = require('express');
const session = require('express-session');
const expressJwt = require('express-jwt');
const expressJwtPermissions = require('express-jwt-permissions');

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const bodyParser = require('body-parser');

const { URL } = require('url');

const common = require('distributed-common');
common.Init();

const guard = expressJwtPermissions();
const app = express();

function RequireHTTPS(req, res, next) {
    // The 'x-forwarded-proto' check is for Heroku
    if (!req.secure && req.get('x-forwarded-proto') !== 'https' && process.env.NODE_ENV !== "development") {
        var rurl = new URL('https://' + req.headers.host + req.url);
        rurl.port = common.interface.GetPublicPort() || common.interface.GetHTTPSPort() || '443';

        return res.redirect(rurl.toString());
    }
    next();
}

app.use(RequireHTTPS);

// Parsers for POST data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(session({ secret: common.interface.GetSecret(), resave: false, saveUninitialized: true }));

// Point static path to dist
app.use(express.static(path.join(__dirname, '..', 'web.interface', 'dist')));

// use JWT auth to secure the api
app.use(
    '/api', 
    expressJwt({ 
        secret: common.interface.GetSecret() 
    }).unless({ 
        path: [
            '/api/users/authenticate', 
            '/api/users/register',
            new RegExp('/api/graph/*', 'i')
        ] 
    })
);

// Set our api routes
app.use('/api/executables', require('./server/routes/executables.api'));
app.use('/api/users', require('./server/routes/users.api'));
app.use('/api/tokens', require('./server/routes/tokens.api'));
app.use('/api/corpus', require('./server/routes/corpus.api'));
app.use('/api/infrastructure', require('./server/routes/infrastructure.api'));
app.use('/api/graph', require('./server/routes/graph.api'));
app.use('/api', require('./server/routes/api'));

// Catch all other routes and return the index file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

app.use(function (err, req, res, next) {
  if (err.name === 'UnauthorizedError') {
    res.status(401).send('Unauthorized');
  }

  if (err.code === 'permission_denied') {
    res.status(403).send('Forbidden');
  }
});

/**
 * Get port from environment and store in Express.
 */
const port = common.interface.GetHTTPSPort() || '443';
app.set('port', port);

/**
 * Get certificate and private key
 */
var privateKey  = fs.readFileSync('./server/ssl/server.key', 'utf8');
var certificate = fs.readFileSync('./server/ssl/server.crt', 'utf8');
var credentials = {key: privateKey, cert: certificate};

/**
 * Create HTTPS server.
 */
const server = https.createServer(credentials, app);

/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(port, () => console.log(`API running on localhost:${port}`));

/**
 * Create HTTP redirect server
 */
const unsecPort = common.interface.GetHTTPPort() || '80';
app.set('httpport', unsecPort);
http.createServer(app).listen(unsecPort, () => console.log(`Redirect running on localhost:${unsecPort}`));

