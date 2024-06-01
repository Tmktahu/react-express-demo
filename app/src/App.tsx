import React, { useEffect, useState } from 'react';
import './App.css';

import { useStocks } from './models/useStocks.tsx';

// Not a fan of material, but it was the easiest plug-and-play option I could find given I
//   had to timebox this whole shenanigan
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

import moment from 'moment';

function App() {
  // I fell back on a pattern I've used in my previous projects where I move logic out to 'model' files
  //   and then import them in where I need them.
  const { stockData, stockOptions, snackbarData, setSnackbarData, setup: setupStocks, addSymbols, removeSymbol } = useStocks();
  useEffect(() => {
    setupStocks(); // we setup our stock BE stuff and only want it to run once
  }, []);

  // state for the currently selected stock so we can keep track of it
  const [currentlySelectedStock, setCurrentlySelectedStock] = useState('');

  const onStockSelected = (event: SelectChangeEvent) => {
    // this just updates the state
    setCurrentlySelectedStock(event.target.value);
  };

  const onAddStock = () => {
    // when they click to add the selected stock, we send it off to the BE and reset the state to blank
    addSymbols([currentlySelectedStock]);
    setCurrentlySelectedStock('');
  };

  const onDeleteStock = (symbol: string) => {
    // here we just forward the target symbol to the BE helpers
    removeSymbol(symbol);
  };

  const onSnackbarClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    // handles closing the snackbar/toast UI
    if (reason === 'clickaway') {
      return;
    }

    setSnackbarData(null);
  };

  return (
    <>
      <FormControl fullWidth style={{ paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', width: '100%' }}>
          <div style={{ flexGrow: 1, paddingRight: '1rem' }}>
            <InputLabel id="demo-simple-select-label">Stock Symbol</InputLabel>
            <Select labelId="demo-simple-select-label" style={{ display: 'block', flexGrow: 1 }} value={currentlySelectedStock} label="Stock Symbol" onChange={onStockSelected}>
              {stockOptions.map((entry) => (
                <MenuItem key={entry} value={entry}>
                  {entry}
                </MenuItem>
              ))}
            </Select>
          </div>

          <Button variant="contained" onClick={() => onAddStock()} disabled={currentlySelectedStock === ''}>
            Add Stock
          </Button>
        </div>
      </FormControl>

      <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 110px)' }}>
        <Table aria-label="simple table" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Stock Ticker</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell align="right">Last Updated</TableCell>
              <TableCell align="right"></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stockData.map((entry) => (
              <TableRow key={entry.symbol} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell component="th" scope="row">
                  {entry.symbol}
                </TableCell>
                <TableCell align="right" sx={{ minWidth: 40, width: 40 }}>
                  ${entry.price}
                </TableCell>
                <TableCell align="right" sx={{ minWidth: 160, width: 160 }}>
                  {moment(entry.updatedAt).format('MM/DD/YYYY hh:mm:ss a')}
                </TableCell>
                <TableCell align="right" sx={{ width: 40 }}>
                  <IconButton aria-label="delete" color="error" onClick={() => onDeleteStock(entry.symbol)}>
                    <DeleteIcon fontSize="inherit" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Not sure what to do about the type issue with the severity param here */}
      <Snackbar open={snackbarData !== null} autoHideDuration={3000} onClose={onSnackbarClose}>
        <Alert onClose={onSnackbarClose} severity={snackbarData ? snackbarData.severity : 'success'} variant="filled" sx={{ width: '100%' }}>
          {snackbarData ? snackbarData.text : 'Problem setting snackbar text'}
        </Alert>
      </Snackbar>
    </>
  );
}

export default App;
