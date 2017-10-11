# Interface

This is the distributed river web interface and REST API repo.
This project was generated with [angular-cli](https://github.com/angular/angular-cli) version 1.0.0-beta.28.3.

## Prerequisites

- Angular-cli `sudo npm install -g angular-cli`
- PM2 `sudo npm install -g pm2`

## Building

- Get all dependencies using `npm install`.
- Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `-prod` flag for a production build.
- For a first time build; register the node application in PM2 `pm2 start server.js -n "webapi" -x -- --config <path_to_config_file>`
- Subsequent builds need only a server restart `pm2 webapi restart`

## Interacting with the REST API

Most API interaction require a valid API token. API tokens are actually JWT tokens (see https://jwt.io for details) and can be generated from the web interface using the **User menu/Token manager** page.
After obtaining a token all HTTP requests must provide the `Authorization: Bearer <api_token>` header.

### Adding a new binary
Adding a new binary requires two mandatory and three optional requests.
- A **POST** request to */api/executables* with the following JSON body
```javascript
{
    'executableName' : <string>,
    'platform' : 'Windows' | 'Linux',
    'execution' : 'Inprocess' | 'Extern'
}
```
Upon success this will return the following JSON
```javascript
{
    'id' : <string>
}
```
- A **POST** request to */api/executables/\<id>/uploadexecutable* containing the binary file.
- (optionally) A **POST** request to */api/executables/\<id>/uploadmempatch* containing the memory patch file.
- (optionally) A **POST** request to */api/executables/\<id>/uploadcorpus* containing an initial corpus archive.
- (optionally) A **POST** request to */api/executables/\<id>/uploadfuzzer* containing a test generator.