const express = require('express'); // uses express
const fetch = require('node-fetch'); // uses node fetch to fetch requests
const redis = require('redis'); // uses redis as cache service

const PORT = process.env.port || 5000; // server runs on 5000
const REDIS_PORT = process.env.port || 6379;// redis port set to 6379

const client = redis.createClient({
    host: 'redis-server',
    port: 6379
}); // creates redis client to cache data

const app = express(); // instantiate express app


app.use(function (req, res, next) {
    // this function allows Cross Origin Access control since running on localhost
    res.setHeader('Access-Control-Allow-Origin', '*');

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    res.setHeader('Access-Control-Allow-Credentials', true);

    next();
});

app.get('/', cacheContinent, getContinent); // send continent data newly or cached verson
app.get('/continent/:continent', cacheCountries, getCountries); // send country data of a continent newly or cached version

// function which get contries of a continent through GraphQL
async function getCountries(req, res) {
    try {
        const { continent } = req.params;
        const query = `
    {
        countries(filter:{
        continent:{eq:"${continent}"}
        }){
          name
          code
          phone
          capital
          currency
          languages{
            name
          }
        }
      }
    `; // the GraphQL query to get countries for a certain continent

        const url = "https://countries.trevorblades.com/"; // Api link
        const opts = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query })
        }; // options for GraphQL Query
        const response = await fetch(url, opts); //gets response
        const data = await response.json(); // sets response
        client.setex(continent, 3600, JSON.stringify(data)); // sets in the result in cache as text for 1 hour (3600 seconds)
        res.send(JSON.stringify(data)); // sends response as a text

    } catch (err) {
        console.error(err); // catches any error
    }


}
// gets data of continents
async function getContinent(req, res) {
    try {

        const query = `
            query {
                continents{
                code
                name
                }
            }
            `; // GraphQL query to get all the contients
        const url = "https://countries.trevorblades.com/";
        const opts = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query })
        };
        const response = await fetch(url, opts);
        const data = await response.json();
        client.setex('Continents', 3600, JSON.stringify(data));
        res.send(JSON.stringify(data));


    } catch (err) {
        console.error(err);
        res.status(500);
    }

}
// middleware that handles that will check cache data of continents in the cache. If not fetched form the server
function cacheContinent(req, res, next) {


    client.get('Continents', (err, data) => {
        if (err) throw err;

        if (data !== null) {
            res.send(data);
        }

        else {
            next();
        }
    })

}

// middleware that handles that will check cache data of countries in the cache. If not fetched form the server
function cacheCountries(req, res, next) {

    const { continent } = req.params;
    client.get(continent, (err, data) => {
        if (err) throw err;

        if (data !== null) {
            res.send(data);
        }

        else {
            next();
        }
    })

}
// listens to prt 5000
app.listen(5000, () => {
    console.log(`Listening to port ${PORT}`)
})


