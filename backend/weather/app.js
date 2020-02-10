
const apiKey = '';
const mapURI = "http://api.openweathermap.org/data/2.5";
const targetCity = process.env.TARGET_CITY || "Helsinki,fi";
const fetch = require('node-fetch');


const fetchWeather = async () => {
    const endpoint = `${mapURI}/weather?q=${targetCity}&appid=${apiKey}&units=metric`;
    const response = await fetch(endpoint);  
    return response ? response.json() : {}
  };


exports.lambdaHandler = async (event, context) => {
    let response;
    try {
        const weatherData = await fetchWeather();
        
        const body = weatherData;

        response = {
            'statusCode': 200,
            'body': JSON.stringify(body),
            'headers': {
                "Access-Control-Allow-Origin": "*"
            }
        }
    } catch (err) {
        console.log(err)
        response = {
            'statusCode': 500,
            'body': JSON.stringify(err),
            'headers': {
                "Access-Control-Allow-Origin": "*"
            }
        }
    }

    return response
};
