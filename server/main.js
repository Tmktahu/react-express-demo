/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');
const WebSocket = require('ws');
const cors = require('cors');
const moment = require('moment');

const app = express();
const port = 3000;

let pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT,
});

app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  }),
);

const setupDatabase = async () => {
  const client = await pool.connect();
  try {
    const result = await client.query(`SELECT 1 FROM pg_database WHERE datname = 'stock_demo_database'`);
    if (result.rowCount === 0) {
      await client.query('CREATE DATABASE stock_demo_database');
      console.log('Database "stock_demo_database" created');
    }
  } catch (err) {
    console.error('Error checking/creating database', err.stack);
  } finally {
    client.release();
  }
};

const setupTable = async () => {
  pool = new Pool({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    password: process.env.POSTGRES_PASSWORD,
    port: process.env.POSTGRES_PORT,
    database: 'stock_demo_database',
  });

  try {
    const result = await pool.query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_watchlist'`);
    if (result.rowCount === 0) {
      await pool.query(`
        CREATE TABLE stock_watchlist (
          id SERIAL PRIMARY KEY,
          symbol VARCHAR(10) NOT NULL
        )
      `);
      console.log('Table "stock_watchlist" created');
    }
  } catch (err) {
    console.error('Error checking/creating table', err.stack);
  }
};

const initializeDatabase = async () => {
  await setupDatabase();
  await setupTable();
};

app.get('/get-stock-options', async (req, res) => {
  // In an actual environment we'd prolly get the list of possible stock options from some external source
  //   but for this I just hardcode it
  const stockOptions = [
    'AAPL',
    'MSFT',
    'AMZN',
    'GOOGL',
    'FB',
    'TSLA',
    'BRK.B',
    'NVDA',
    'JPM',
    'JNJ',
    'V',
    'PG',
    'UNH',
    'HD',
    'MA',
    'DIS',
    'PYPL',
    'BAC',
    'VZ',
    'ADBE',
    'NFLX',
    'KO',
    'CMCSA',
    'PFE',
    'INTC',
    'CSCO',
    'PEP',
    'T',
    'XOM',
    'ABT',
  ];

  try {
    res.json(stockOptions);
  } catch (err) {
    console.error('Error getting stock options', err.stack);
    res.status(500).send('Error getting stock options');
  }
});

// I rigged this up to work with an array of symbols because it's more robust for possible feature tweaks later
app.post('/add-symbols', async (req, res) => {
  const symbols = req.body;

  if (!Array.isArray(symbols)) {
    return res.status(400).send('Symbols should be an array');
  }

  try {
    const client = await pool.connect();
    await client.query('BEGIN'); // building queries programatically is pretty cool

    for (const symbol of symbols) {
      // we check if the symbol already exists
      // is this a performance concern? wasn't sure how else to ignore already-added symbols
      const result = await client.query('SELECT 1 FROM stock_watchlist WHERE symbol = $1', [symbol]);
      if (result.rowCount === 0) {
        // if it doesn't exist yet then we want to save it
        await client.query('INSERT INTO stock_watchlist (symbol) VALUES ($1)', [symbol]);
      }
    }

    // commit and release
    await client.query('COMMIT');
    client.release();

    broadcastPrices(); // we broadcast right away

    res.status(201).send('Symbols added');
  } catch (err) {
    console.error('Error adding symbols', err.stack);
    res.status(500).send('Error adding symbols');
  }
});

app.delete('/remove-symbol', async (req, res) => {
  const { symbol } = req.body;

  if (typeof symbol !== 'string') {
    return res.status(400).send('Symbol should be a string');
  }

  try {
    const result = await pool.query('DELETE FROM stock_watchlist WHERE symbol = $1 RETURNING *', [symbol]);

    if (result.rowCount === 0) {
      return res.status(404).send('Symbol not found');
    }

    broadcastPrices(); // we broadcast right away

    res.status(200).send(`Symbol ${symbol} removed`);
  } catch (err) {
    console.error('Error removing symbol', err.stack);
    res.status(500).send('Error removing symbol');
  }
});

let previousRows = [];
const getStockPrices = async () => {
  try {
    const result = await pool.query('SELECT * FROM stock_watchlist');

    // So my instinct is that if I were really setting this up, I would have a separate process that updates
    //  the stock prices for a given stock into the database so at any given time
    //  the database would contain updated stock price information. Then here
    //  we are just getting the data to send to the FE, that way we don't have to run additional
    //  logic to reach out and get prices for every watchlisted stock, which would potentially slow things down

    // so my code here assumes that the database contains updated stock prices already.
    // I may try to write a worker to run async and like tap into some public stock pricing thing to update the db...
    //   we'll see if I have the time

    // I manually insert a random price here for the POC
    // I also did a bit of hacky 'previous data' stuff to simulate stocks being updated at different times
    let updatedRows = result.rows.map((row, index) => {
      let randomChance = Math.random();
      if (randomChance > 0.5 && previousRows.length === result.rows.length) {
        return previousRows[index];
      } else {
        return {
          ...row,
          price: (Math.random() * 50).toFixed(2),
          updatedAt: moment().toISOString(),
        };
      }
    });

    previousRows = updatedRows;

    // sort the data by alphabetical symbol
    let sortedData = structuredClone(updatedRows);
    sortedData.sort((a, b) => a.symbol.localeCompare(b.symbol));
    const data = JSON.stringify(sortedData);
    return data;
  } catch (err) {
    console.error('Error executing getStockPrices query', err.stack);
    return null;
  }
};

const broadcastPrices = async () => {
  let stockData = await getStockPrices();

  // we could prolly add some performace logic here, like checking if the list is empty or something
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(stockData);
    }
  });
};

let server = null;
let wss = null;
initializeDatabase().then(() => {
  server = app.listen(port, () => {
    console.log(`BE Server is running on http://localhost:${port}`);
  });

  wss = new WebSocket.Server({ server });
  wss.on('connection', (ws) => {
    broadcastPrices(); // gotta send initial data

    // for this POC I just use an interval, but in other cases we'd prolly trigger this off other things too?
    const interval = setInterval(broadcastPrices, 1000);

    ws.on('close', () => {
      clearInterval(interval);
    });
  });
});
