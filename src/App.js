import React, {Component} from 'react';
import logo from './logo.svg';
import './App.css';

import { APIKEY, CUSTOMER_ID, SECRET, DEPOSIT } from "./secrets";

const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');


class App extends Component {
    constructor(props) {
        super(props);
        this.getValues = this.getValues.bind(this);
        this.state = {
            balance: {},
            btcusd: 0,
            ethusd: 0,
            ltcusd: 0,
            xrpusd: 0,
            rates: {
                'GBP': 0,
                'HUF': 0
            }
        };
    }

    generateNonce() {
        return new Date().getTime();
    }

    generateMessageFromNonce(nonce) {
        return nonce + CUSTOMER_ID + APIKEY;
    }

    generateSignatureFromMessage(message) {
        let signer = crypto.createHmac('sha256', SECRET);
        let signature = signer.update(message).digest('hex').toUpperCase();
        return signature;
    }

    getBalance() {
        let nonce = this.generateNonce();
        let message = this.generateMessageFromNonce(nonce);
        let signature = this.generateSignatureFromMessage(message);

        const postData = querystring.stringify({
            key: APIKEY,
            signature: signature,
            nonce: nonce
        });

        console.log('postData', postData);


        const options = {
            hostname: 'www.bitstamp.net',
            path: '/api/v2/balance/',
            method: 'POST',
            port: '443',
            headers: {
                'User-Agent': 'Mozilla/4.0 (compatible; Bitstamp node.js client)',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': postData.length
            }
        };

        const req = https.request(options, (res) => {
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                //console.log(`BODY: ${chunk}`);
                this.balanceR = JSON.parse(chunk);
            });
            res.on('end', () => {
                console.log('No more data in response.');
                //console.log('balance', this.balance.btc_balance);
                this.setState({balance: this.balanceR});
            });
        });

        req.on('error', (e) => {
            console.error(`problem with request: ${e.message}`);
        });

        // write data to request body
        //console.log('write data');
        req.write(postData);
        req.end();
    }

    getValue(currencyPair) {
        /*
        Options:
        btcusd
        ethusd
        ltcusd
        xrpusd
         */
        let url = 'https://cors.io/?https://www.bitstamp.net/api/v2/ticker/' + currencyPair + '/';
        https.get(url, (resp) => {
            let data = '';

            // A chunk of data has been recieved.
            resp.on('data', (chunk) => {
                data += chunk;
                console.log('ch', chunk);
            });

            // The whole response has been received. Print out the result.
            resp.on('end', () => {
                console.log(data);
                switch (currencyPair) {
                    case 'btcusd':
                        this.setState({btcusd: JSON.parse(data).last});
                        break;
                    case 'ethusd':
                        this.setState({ethusd: JSON.parse(data).last});
                        break;
                    case 'ltcusd':
                        this.setState({ltcusd: JSON.parse(data).last});
                        break;
                    default:
                        this.setState({xrpusd: JSON.parse(data).last});
                }
            });

        }).on("error", (err) => {
            console.log("Error: " + err.message);
        });
    }

    getRates() {
        fetch('https://api.fixer.io/latest?base=USD')
            .then((resp) => resp.json())
            .then((data) => this.setState({rates: data.rates}));
    }

    getSumGBP() {
        let USDSum =
            (this.state.balance.btc_balance * this.state.btcusd) +
            (this.state.balance.eth_balance * this.state.ethusd) +
            (this.state.balance.ltc_balance * this.state.ltcusd) +
            (this.state.balance.xrp_balance * this.state.xrpusd);
        return USDSum * this.state.rates['GBP'];
    }

    getSumHUF() {
        let USDSum =
            (this.state.balance.btc_balance * this.state.btcusd) +
            (this.state.balance.eth_balance * this.state.ethusd) +
            (this.state.balance.ltc_balance * this.state.ltcusd) +
            (this.state.balance.xrp_balance * this.state.xrpusd);
        return USDSum * this.state.rates['HUF'];
    }

    getNominalProfit() {
        return this.getSumGBP() - DEPOSIT;
    }

    getProfit() {
        let profit = (this.getNominalProfit() / this.getSumGBP()) * 100;
        console.log('profit', profit);
        return parseFloat(Math.round(profit * 100) / 100).toFixed(2);
    }

    getValues() {
        this.getValue('btcusd');
        this.getValue('ethusd');
        this.getValue('ltcusd');
        this.getValue('xrpusd');
        this.getRates();
    }

    componentWillMount() {
        this.getBalance();
        this.getValues();
    }

    render() {
        return (
            <div className="App">
                <header className="App-header">
                    <img src={logo} className="App-logo" alt="logo"/>
                    <h1 className="App-title">Welcome to React</h1>
                </header>
                <p className="App-intro">
                    <button onClick={this.getValues}>refresh value</button>
                </p>
                <table>
                    <tbody>
                    <tr>
                        <th></th>
                        <th>Amount</th>
                        <th>Value $</th>
                    </tr>
                    <tr>
                        <td>BTC</td>
                        <td>{this.state.balance.btc_balance}</td>
                        <td>{this.state.balance.btc_balance * this.state.btcusd}</td>
                    </tr>
                    <tr>
                        <td>ETH</td>
                        <td>{this.state.balance.eth_balance}</td>
                        <td>{this.state.balance.eth_balance * this.state.ethusd}</td>
                    </tr>
                    <tr>
                        <td>LTC</td>
                        <td>{this.state.balance.ltc_balance}</td>
                        <td>{this.state.balance.ltc_balance * this.state.ltcusd}</td>
                    </tr>
                    <tr>
                        <td>XRP</td>
                        <td>{this.state.balance.xrp_balance}</td>
                        <td>{this.state.balance.xrp_balance * this.state.xrpusd}</td>
                    </tr>
                    </tbody>
                </table>
                <p>total £: {this.getSumGBP()}</p>
                <p>total huf: {this.getSumHUF()}</p>
                <p>nominal profit: £{this.getNominalProfit()}</p>
                <p>% profit: {this.getProfit()} %</p>
            </div>
        );
    }
}

export default App;
