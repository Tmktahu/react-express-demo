// So in previous and personal projects, I'm use to placing JS logic in model files structured like this.
// I'm not sure what the best practice is for Typescript, or what pattern you guys use. Of course I can adapt as needed without issue.

import { useState } from 'react';

interface StockEntry {
  symbol: string;
  price: number;
  updatedAt: string;
}

interface SnackbarData {
  text: string;
  severity: string;
}

export const useStocks = () => {
  // various states for the stock data, options, and snackbard/toast info
  const [stockData, setStockData] = useState<StockEntry[]>([]);
  const [stockOptions, setStockOptions] = useState<string[]>([]);
  const [snackbarData, setSnackbarData] = useState<SnackbarData | null>(null);
  let allStockOptions: string[] = [];

  // this setup function should only be run once and it handles setting stuff up
  const setup = () => {
    const socket = new WebSocket('ws://localhost:3000');

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setStockData(data);

      // We filter out currently watched stock tickers from the list of stock options
      const currentlyWatchedSymbols = (() => data.map((entry: StockEntry) => entry.symbol))();
      const filteredData = allStockOptions.filter((entry: string) => {
        return !currentlyWatchedSymbols.includes(entry);
      });

      setStockOptions(filteredData);
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    // here we want to get the list of acceptable stock options from the BE
    getStockOptions();
  };

  const getStockOptions = async () => {
    // so I opted to operate off the idea that the user selects a stock to watch from a predefined list...
    //   A text input seemed like a bad idea. So we get the list of valid stock options from the BE here
    try {
      const response = await fetch('http://localhost:3000/get-stock-options', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        allStockOptions = data; // save the list of all stock options for later
        setStockOptions(data); // and save it for initial UI
      } else {
        console.error('Failed to remove symbol');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // this function handles sending stock symbols off to the BE for adding
  // it functions off an array because that seemed more robust for future UI use cases/tweaks
  const addSymbols = async (symbolsArray: Array<string>) => {
    try {
      await fetch('http://localhost:3000/add-symbols', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(symbolsArray),
      });

      // for now I set this up to assume 1 stock per call
      setSnackbarData({ text: `${symbolsArray[0]} stock added successfully.`, severity: 'success' });
    } catch (error) {
      console.error('Error:', error);
      setSnackbarData({ text: 'Could not add stocks. Please try again.', severity: 'error' });
    }
  };

  // this function handles sending a target stock symbol for removal from the BE
  const removeSymbol = async (symbol: string) => {
    try {
      await fetch('http://localhost:3000/remove-symbol', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbol }),
      });

      setSnackbarData({ text: 'Removed stock successfully.', severity: 'success' });
    } catch (error) {
      console.error('Error:', error);
      setSnackbarData({ text: 'Could not remove stock. Please try again.', severity: 'error' });
    }
  };

  return {
    stockData,
    stockOptions,
    snackbarData,
    setSnackbarData,
    setup,
    getStockOptions,
    addSymbols,
    removeSymbol,
  };
};
