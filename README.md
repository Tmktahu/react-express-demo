# REACT + Express Tech Demo

This is a simple tech demo using a React front-end and an Express + PostgreSQL back-end.

The application connects to the defined PostgreSQL server, creates the required database and table, and then uses it to store a watchlist of stock symbols.

The FE makes a websocket connection that the BE uses to pipe updated stock prices through.

For this project, prices are randomized and have a 50% chance of being updated.

## Project Structure

The project is split into 2 parts.

**/app** - This is the front-end part of the application  
**/server** - This is the back-end part of the application

Theoretically, they could be separated and deployed independantly of each other without issue. But for this project they are both run simultaneously via the `concurrently` package as seen in the top level `package.json`.

## How to setup & run locally

Clone the repo and `yarn install`.

You will need to set up a PostgreSQL server that the application can access.

Create a `.env` file in the `/server` folder and populate it with the following values:

```yaml
POSTGRES_USER=apples # PostgreSQL user name to be used
POSTGRES_PASSWORD=oranges # PostgreSQL password to be used
POSTGRES_HOST=localhost # PostgreSQL hostname
POSTGRES_PORT=5432 # PostgreSQL port

# This is the URL of the FE client. Needed for CORs shenanigans
CLIENT_URL=http://localhost:5173
```

And finally, `yarn dev` to start it up.
